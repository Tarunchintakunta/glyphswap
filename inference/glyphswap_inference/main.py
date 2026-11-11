import asyncio
from collections.abc import AsyncIterator
from io import BytesIO
from pathlib import Path
from typing import Annotated, Literal

import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field, ValidationError
from starlette.concurrency import run_in_threadpool

from glyphswap_inference import ocr
from glyphswap_inference.jobs import Job, JobStatus, Kind, queue
from glyphswap_inference.pipeline import Edit
from glyphswap_inference.settings import settings

app = FastAPI(title="Glyphswap inference", version="0.1.0")

ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp"}
Lang = Literal["en", "latin", "hi", "te"]
Polygon = Annotated[list[tuple[float, float]], Field(min_length=4, max_length=4)]


def require_token(authorization: Annotated[str | None, Header()] = None) -> None:
    if authorization != f"Bearer {settings.inference_token}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid inference token")


class Health(BaseModel):
    ok: bool
    device: str


class OcrLine(BaseModel):
    id: str
    text: str
    polygon: Polygon
    angle: float
    confidence: float


class OcrResponse(BaseModel):
    engine: str
    width: int
    height: int
    lines: list[OcrLine]


class EditItem(BaseModel):
    polygon: Polygon
    new_text: str = Field(default="", max_length=500)
    old_text: str | None = Field(default=None, max_length=500)
    remove: bool = False
    font_family: str | None = Field(default=None, max_length=80)
    font_size: float | None = Field(default=None, gt=0, le=400)
    color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    angle: float | None = Field(default=None, ge=-180, le=180)


class JobRequest(BaseModel):
    image_key: str | None = None
    edits: list[EditItem] = Field(min_length=1, max_length=100)
    results: list[Kind] = Field(default=["B"], min_length=1)
    lang: Lang = "en"


class JobAccepted(BaseModel):
    job_id: str
    status: Literal["queued"]


def decode(data: bytes) -> np.ndarray:
    if len(data) > settings.max_input_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "image too large")
    try:
        with Image.open(BytesIO(data)) as opened:
            oriented = ImageOps.exif_transpose(opened)
            if oriented is None:
                raise UnidentifiedImageError("empty image")
            if oriented.mode == "CMYK":
                rgb = oriented.convert("RGB")
            elif oriented.mode in {"RGBA", "LA", "P"}:
                rgba = oriented.convert("RGBA")
                rgb = Image.new("RGB", rgba.size, (255, 255, 255))
                rgb.paste(rgba, mask=rgba.getchannel("A"))
            else:
                rgb = oriented.convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "image could not be decoded") from error
    image = cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2BGR)
    height, width = image.shape[:2]
    if min(height, width) < settings.min_input_side:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "image is smaller than 32 px")
    if max(height, width) > settings.max_input_side:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "image is larger than 8000 px")
    scale = settings.max_side / max(height, width)
    if scale < 1:
        size = (round(width * scale), round(height * scale))
        image = cv2.resize(image, size, interpolation=cv2.INTER_AREA)
    return np.asarray(image)


async def read_upload(image: UploadFile) -> np.ndarray:
    if image.content_type not in ALLOWED_MIME:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "unsupported image type")
    return decode(await image.read())


def read_stored(key: str) -> np.ndarray:
    root = Path(settings.local_storage_dir).resolve()
    path = (root / key).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "image_key not found")
    return decode(path.read_bytes())


def find_job(job_id: str) -> Job:
    job = queue.jobs.get(job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not found")
    return job


@app.get("/healthz")
def healthz() -> Health:
    return Health(ok=True, device=settings.torch_device)


@app.post("/ocr", dependencies=[Depends(require_token)])
async def run_ocr(
    image: Annotated[UploadFile, File()], lang: Annotated[Lang, Form()] = "en"
) -> OcrResponse:
    pixels = await read_upload(image)
    try:
        engine, lines = await run_in_threadpool(ocr.recognize, pixels, lang)
    except ocr.OcrUnavailableError as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(error)) from error
    height, width = pixels.shape[:2]
    return OcrResponse(
        engine=engine,
        width=width,
        height=height,
        lines=[
            OcrLine(
                id=f"l{index}",
                text=item.text,
                polygon=item.polygon,
                angle=item.angle,
                confidence=item.confidence,
            )
            for index, item in enumerate(lines)
        ],
    )


@app.post("/jobs", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_token)])
async def create_job(
    payload: Annotated[str, Form()], image: Annotated[UploadFile | None, File()] = None
) -> JobAccepted:
    try:
        request = JobRequest.model_validate_json(payload)
    except ValidationError as error:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, error.errors(include_url=False)
        ) from error
    if image is not None:
        pixels = await read_upload(image)
    elif request.image_key:
        pixels = read_stored(request.image_key)
    else:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "image or image_key is required")
    edits = [
        Edit(
            item.polygon,
            item.new_text,
            item.remove,
            item.old_text,
            item.font_family,
            item.font_size,
            item.color,
            item.angle,
        )
        for item in request.edits
    ]
    job = Job(pixels, edits, list(dict.fromkeys(request.results)), request.lang)
    queue.submit(job)
    return JobAccepted(job_id=job.id, status="queued")


@app.get("/jobs/{job_id}", dependencies=[Depends(require_token)])
def get_job(job_id: str) -> JobStatus:
    return find_job(job_id).status


@app.get("/jobs/{job_id}/events", dependencies=[Depends(require_token)])
async def job_events(job_id: str) -> StreamingResponse:
    job = find_job(job_id)

    async def stream() -> AsyncIterator[str]:
        last = ""
        while True:
            current = job.status.model_dump_json()
            if current != last:
                last = current
                yield f"event: progress\ndata: {current}\n\n"
            if job.status.status in {"done", "failed"}:
                return
            await asyncio.sleep(0.2)

    return StreamingResponse(
        stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"}
    )


@app.get("/jobs/{job_id}/result/{kind}", dependencies=[Depends(require_token)])
def job_result(job_id: str, kind: Kind) -> Response:
    job = find_job(job_id)
    data = job.outputs.get(kind)
    if data is None:
        info = job.status.results.get(kind)
        detail = info.model_dump() if info else {"status": "not requested"}
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail)
    return Response(data, media_type="image/png")
