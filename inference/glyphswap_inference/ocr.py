import importlib.util
import math
import os
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from glyphswap_inference.settings import settings

Point = tuple[float, float]

PADDLE_REC = {
    "en": "en_PP-OCRv5_mobile_rec",
    "latin": "latin_PP-OCRv5_mobile_rec",
    "hi": "devanagari_PP-OCRv5_mobile_rec",
    "te": "te_PP-OCRv5_mobile_rec",
}
LATIN_LANGS = {"en", "latin"}


@dataclass(frozen=True)
class Line:
    text: str
    polygon: list[Point]
    angle: float
    confidence: float


Engine = Callable[[np.ndarray, str], list[Line]]


class OcrUnavailableError(RuntimeError):
    pass


def quad(points: Sequence[Sequence[float]]) -> tuple[list[Point], float]:
    box = cv2.boxPoints(cv2.minAreaRect(np.asarray(points, dtype=np.float32)))
    first, second = box[1] - box[0], box[2] - box[1]
    vx, vy = first if np.hypot(*first) >= np.hypot(*second) else second
    if vx < 0:
        vx, vy = -vx, -vy
    rad = math.atan2(vy, vx)
    center = box.mean(axis=0)
    local = (box - center) @ np.array(
        [[math.cos(rad), -math.sin(rad)], [math.sin(rad), math.cos(rad)]]
    )
    order = [
        int(np.argmin(local[:, 0] + local[:, 1])),
        int(np.argmax(local[:, 0] - local[:, 1])),
        int(np.argmax(local[:, 0] + local[:, 1])),
        int(np.argmax(local[:, 1] - local[:, 0])),
    ]
    corners = [(round(float(box[i][0]), 1), round(float(box[i][1]), 1)) for i in order]
    return corners, round(-math.degrees(rad), 2)


def line(text: str, points: Sequence[Sequence[float]], confidence: float) -> Line:
    corners, angle = quad(points)
    return Line(text=text, polygon=corners, angle=angle, confidence=round(confidence, 4))


def height(item: Line) -> float:
    return math.dist(item.polygon[0], item.polygon[3])


def extent(item: Line, axis: np.ndarray) -> tuple[float, float]:
    projected = np.asarray(item.polygon) @ axis
    return float(projected.min()), float(projected.max())


def joins(left: Line, right: Line) -> bool:
    rad = math.radians(left.angle)
    along, across = (
        np.array([math.cos(rad), -math.sin(rad)]),
        np.array([math.sin(rad), math.cos(rad)]),
    )
    size = height(left)
    centers = [float(np.mean(item.polygon, axis=0) @ across) for item in (left, right)]
    return (
        abs(left.angle - right.angle) < 10
        and 0.7 < height(right) / size < 1.4
        and abs(centers[0] - centers[1]) < 0.4 * size
        and -0.2 * size < extent(right, along)[0] - extent(left, along)[1] < 1.2 * size
    )


def merge_words(lines: list[Line]) -> list[Line]:
    merged: list[Line] = []
    for item in sorted(lines, key=lambda candidate: min(x for x, _ in candidate.polygon)):
        index = next((i for i, group in enumerate(merged) if joins(group, item)), None)
        if index is None:
            merged.append(item)
            continue
        group = merged[index]
        merged[index] = line(
            f"{group.text} {item.text}",
            group.polygon + item.polygon,
            min(group.confidence, item.confidence),
        )
    return sorted(merged, key=lambda item: (item.polygon[0][1], item.polygon[0][0]))


def models_path(name: str) -> str:
    return str((Path(settings.models_dir) / name).resolve())


@cache
def paddle_pipeline(lang: str, detector: str) -> Any:
    os.environ.setdefault("PADDLE_PDX_CACHE_HOME", models_path("paddlex"))
    os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
    from paddleocr import PaddleOCR

    return PaddleOCR(
        text_detection_model_name=detector,
        text_recognition_model_name=PADDLE_REC.get(lang, PADDLE_REC["latin"]),
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        enable_mkldnn=False,
    )


def paddle_engine(detector: str) -> Engine:
    def run(image: np.ndarray, lang: str) -> list[Line]:
        result = paddle_pipeline(lang, detector).predict(image)[0]
        return [
            line(text, poly, float(score))
            for text, poly, score in zip(
                result["rec_texts"], result["rec_polys"], result["rec_scores"], strict=True
            )
            if text.strip()
        ]

    return run


@cache
def doctr_predictor() -> Any:
    os.environ.setdefault("DOCTR_CACHE_DIR", models_path("doctr"))
    from doctr.models import ocr_predictor

    return ocr_predictor(
        pretrained=True, assume_straight_pages=False, export_as_straight_boxes=False
    )


def doctr_engine(image: np.ndarray, lang: str) -> list[Line]:
    if lang not in LATIN_LANGS:
        raise OcrUnavailableError(f"doctr does not support lang {lang}")
    height, width = image.shape[:2]
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    page = doctr_predictor()([rgb]).pages[0]
    lines = []
    for block in page.blocks:
        for row in block.lines:
            points = [(x * width, y * height) for word in row.words for x, y in word.geometry]
            score = float(np.mean([word.confidence for word in row.words]))
            lines.append(line(" ".join(word.value for word in row.words), points, score))
    return lines


ENGINES: dict[str, tuple[str, Callable[[], Engine]]] = {
    "paddle": ("paddleocr", lambda: paddle_engine("PP-OCRv5_mobile_det")),
    "paddle-server": ("paddleocr", lambda: paddle_engine("PP-OCRv5_server_det")),
    "doctr": ("doctr", lambda: doctr_engine),
}
AUTO_ORDER = ["paddle", "doctr"]


def available_engines() -> list[str]:
    return [name for name, (module, _) in ENGINES.items() if importlib.util.find_spec(module)]


def get_engine(name: str = "auto") -> tuple[str, Engine]:
    available = available_engines()
    if name == "auto":
        name = next((candidate for candidate in AUTO_ORDER if candidate in available), "")
    if name not in available:
        raise OcrUnavailableError(f"ocr engine {name or 'auto'} is not installed")
    return name, ENGINES[name][1]()


def recognize(image: np.ndarray, lang: str = "en") -> tuple[str, list[Line]]:
    name, engine = get_engine(settings.ocr_engine)
    return name, merge_words(engine(image, lang))
