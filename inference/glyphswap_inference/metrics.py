from collections.abc import Sequence

import cv2
import numpy as np

from glyphswap_inference.ocr import Line, Point


def edit_distance(a: str, b: str) -> int:
    previous = list(range(len(b) + 1))
    for i, char_a in enumerate(a, 1):
        current = [i]
        for j, char_b in enumerate(b, 1):
            current.append(
                min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (char_a != char_b))
            )
        previous = current
    return previous[-1]


def iou(a: Sequence[Point], b: Sequence[Point]) -> float:
    first, second = np.asarray(a, dtype=np.float32), np.asarray(b, dtype=np.float32)
    inter, _ = cv2.intersectConvexConvex(first, second)
    union = cv2.contourArea(first) + cv2.contourArea(second) - inter
    return float(inter / union) if union > 0 else 0.0


def score(truth: list[tuple[str, list[Point]]], lines: list[Line]) -> tuple[float, float]:
    errors, chars, overlaps = 0, 0, []
    for text, polygon in truth:
        best = max(lines, key=lambda item: iou(polygon, item.polygon), default=None)
        overlap = iou(polygon, best.polygon) if best else 0.0
        predicted = best.text if best and overlap > 0.3 else ""
        errors += edit_distance(text, predicted)
        chars += len(text)
        overlaps.append(overlap)
    return errors / max(chars, 1), float(np.mean(overlaps))
