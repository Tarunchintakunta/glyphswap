from collections.abc import Callable, Sequence
from dataclasses import dataclass

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
        filled.append(Edit(edit.polygon, edit.new_text, edit.remove, found))
    return filled


def result_b(image: np.ndarray, edits: Sequence[Edit], lang: str, progress: Progress) -> np.ndarray:
    progress("ocr", 10)
    edits = fill_old_text(image, edits, lang)
    progress("masking", 25)
    holes = mask.text_mask(image.shape, [edit.polygon for edit in edits])
    progress("inpainting", 40)
    clean = inpaint.inpaint(image, holes)
    progress("rendering", 70)
    layers = []
    for edit in edits:
        if edit.remove or not edit.new_text.strip():
            continue
        found = style.analyze(image, clean, edit.polygon, edit.old_text or edit.new_text)
        layers.append((render.text_alpha(image.shape, edit.polygon, edit.new_text, found), found))
    progress("blending", 85)
    result = clean
    for index, (alpha, found) in enumerate(layers):
        result = render.blend(result, alpha, found, seed=index)
    return result
