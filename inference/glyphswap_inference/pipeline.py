import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass, replace
from pathlib import Path

import numpy as np

from glyphswap_inference import inpaint, mask, ocr, render, style
from glyphswap_inference.metrics import iou

Progress = Callable[[str, int], None]


@dataclass(frozen=True)
class Edit:
    polygon: list[ocr.Point]
    new_text: str = ""
    remove: bool = False
    old_text: str | None = None
    font_family: str | None = None
    font_size: float | None = None
    color: str | None = None
    angle: float | None = None


def fill_old_text(image: np.ndarray, edits: Sequence[Edit], lang: str) -> list[Edit]:
    if all(edit.remove or edit.old_text for edit in edits):
        return list(edits)
    try:
        _, lines = ocr.recognize(image, lang)
    except ocr.OcrUnavailableError:
        lines = []
    filled = []
    for edit in edits:
        if edit.remove or edit.old_text:
            filled.append(edit)
            continue
        best = max(lines, key=lambda item: iou(edit.polygon, item.polygon), default=None)
        found = best.text if best and iou(edit.polygon, best.polygon) > 0.3 else edit.new_text
        filled.append(replace(edit, old_text=found))
    return filled


def hex_bgr(value: str) -> tuple[int, int, int]:
    raw = value.removeprefix("#")
    red, green, blue = int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16)
    return blue, green, red


def orient(polygon: list[ocr.Point], angle: float) -> list[ocr.Point]:
    points = np.asarray(polygon, np.float32)
    center = points.mean(axis=0)
    width = float(np.linalg.norm(points[1] - points[0]))
    height = float(np.linalg.norm(points[3] - points[0]))
    rad = math.radians(angle)
    ux, uy = math.cos(rad), math.sin(rad)
    vx, vy = -uy, ux
    half_w, half_h = width / 2, height / 2
    corners: list[ocr.Point] = []
    for sx, sy in ((-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)):
        corners.append(
            (
                float(center[0] + sx * half_w * ux + sy * half_h * vx),
                float(center[1] + sx * half_w * uy + sy * half_h * vy),
            )
        )
    return corners


def styled(edit: Edit, found: style.Style) -> style.Style:
    choice = found.font
    if edit.font_family:
        needle = edit.font_family.lower()
        sample = edit.new_text or edit.old_text or "A"
        for item in style.candidates(style.script_of(sample)):
            if needle in Path(item.path).stem.lower():
                choice = item
                break
    color = hex_bgr(edit.color) if edit.color else found.color
    size = edit.font_size if edit.font_size else found.size
    return replace(found, font=choice, color=color, size=size)


def result_b(image: np.ndarray, edits: Sequence[Edit], lang: str, progress: Progress) -> np.ndarray:
    progress("ocr", 10)
    edits = fill_old_text(image, edits, lang)
    edits = [
        replace(edit, polygon=orient(edit.polygon, edit.angle)) if edit.angle is not None else edit
        for edit in edits
    ]
    progress("masking", 25)
    holes = mask.text_mask(image.shape, [edit.polygon for edit in edits])
    progress("inpainting", 40)
    clean = inpaint.inpaint(image, holes)
    progress("rendering", 70)
    layers = []
    for edit in edits:
        if edit.remove or not edit.new_text.strip():
            continue
        found = styled(
            edit, style.analyze(image, clean, edit.polygon, edit.old_text or edit.new_text)
        )
        layers.append((render.text_alpha(image.shape, edit.polygon, edit.new_text, found), found))
    progress("blending", 85)
    result = clean
    for index, (alpha, found) in enumerate(layers):
        result = render.blend(result, alpha, found, seed=index)
    return result
