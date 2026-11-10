import asyncio
import time
from collections import OrderedDict
from typing import Literal
from uuid import uuid4

import cv2
import numpy as np
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from glyphswap_inference.pipeline import Edit, result_b
from glyphswap_inference.settings import settings

Kind = Literal["A", "B", "C"]
Stage = Literal["queued", "ocr", "masking", "inpainting", "rendering", "blending", "done", "failed"]


class ResultInfo(BaseModel):
    status: Literal["pending", "ready", "unavailable"]
    reason: str | None = None
    width: int | None = None
    height: int | None = None


class JobStatus(BaseModel):
    job_id: str
    status: Literal["queued", "running", "done", "failed"]
    stage: Stage
    progress: int
    results: dict[Kind, ResultInfo]
    error: str | None = None


def unavailable(kind: Kind) -> ResultInfo | None:
    if kind == "A":
        reason = (
            "needs GPU host" if settings.enable_diffusion else "disabled (ENABLE_DIFFUSION=false)"
        )
        return ResultInfo(status="unavailable", reason=reason)
    if kind == "C":
        reason = (
            "needs Real-ESRGAN host"
            if settings.enable_upscale
            else "disabled (ENABLE_UPSCALE=false)"
        )
        return ResultInfo(status="unavailable", reason=reason)
    return None


class Job:
    def __init__(self, image: np.ndarray, edits: list[Edit], kinds: list[Kind], lang: str) -> None:
        self.id = uuid4().hex
        self.image, self.edits, self.lang = image, edits, lang
        self.status = JobStatus(
            job_id=self.id,
            status="queued",
            stage="queued",
            progress=0,
            results={kind: unavailable(kind) or ResultInfo(status="pending") for kind in kinds},
        )
        self.outputs: dict[Kind, bytes] = {}
        self.created = time.monotonic()

    def report(self, stage: str, progress: int) -> None:
        self.status = self.status.model_copy(
            update={"status": "running", "stage": stage, "progress": progress}
        )

    def run(self) -> None:
        if "B" in self.status.results:
            result = result_b(self.image, self.edits, self.lang, self.report)
            ok, png = cv2.imencode(".png", result)
            if not ok:
                raise RuntimeError("png encoding failed")
            self.outputs["B"] = png.tobytes()
            height, width = result.shape[:2]
            self.status.results["B"] = ResultInfo(status="ready", width=width, height=height)
        self.status = self.status.model_copy(
            update={"status": "done", "stage": "done", "progress": 100}
        )


class JobQueue:
    def __init__(self) -> None:
        self.jobs: OrderedDict[str, Job] = OrderedDict()
        self.tasks: set[asyncio.Task[None]] = set()
        self.slots: asyncio.Semaphore | None = None

    def submit(self, job: Job) -> None:
        self.jobs[job.id] = job
        while len(self.jobs) > settings.max_jobs_kept:
            self.jobs.popitem(last=False)
        task = asyncio.create_task(self.execute(job))
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

    async def execute(self, job: Job) -> None:
        self.slots = self.slots or asyncio.Semaphore(settings.max_concurrent_jobs)
        async with self.slots:
            try:
                await run_in_threadpool(job.run)
            except Exception as error:
                job.status = job.status.model_copy(
                    update={
                        "status": "failed",
                        "stage": "failed",
                        "error": f"{type(error).__name__}: {error}",
                    }
                )
            finally:
                job.image = np.empty(0)


queue = JobQueue()
