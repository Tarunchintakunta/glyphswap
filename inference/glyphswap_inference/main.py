from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from glyphswap_inference.settings import settings

app = FastAPI(title="Glyphswap inference", version="0.0.0")

ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp"}


def require_token(authorization: Annotated[str | None, Header()] = None) -> None:
    if authorization != f"Bearer {settings.inference_token}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid inference token")


class Health(BaseModel):
    ok: bool
    device: str


class OcrLine(BaseModel):
    id: str
    text: str
    polygon: list[tuple[float, float]] = Field(min_length=4, max_length=4)
    angle: float
    confidence: float


class OcrResponse(BaseModel):
    engine: str
    lines: list[OcrLine]


class EditItem(BaseModel):
    polygon: list[tuple[float, float]] = Field(min_length=4, max_length=4)
    new_text: str = ""
    remove: bool = False


class JobRequest(BaseModel):
    image_key: str
    edits: list[EditItem] = Field(min_length=1)
    results: list[Literal["A", "B", "C"]] = ["B"]


class JobAccepted(BaseModel):
    job_id: str
    status: Literal["queued"]


@app.get("/healthz")
def healthz() -> Health:
    return Health(ok=True, device=settings.torch_device)


@app.post("/ocr", dependencies=[Depends(require_token)])
async def ocr(image: Annotated[UploadFile, File()]) -> OcrResponse:
    if image.content_type not in ALLOWED_MIME:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "unsupported image type")
    data = await image.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "image too large")
    return OcrResponse(engine="stub", lines=[])


@app.post("/jobs", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_token)])
def create_job(request: JobRequest) -> JobAccepted:
    return JobAccepted(job_id=uuid4().hex, status="queued")
