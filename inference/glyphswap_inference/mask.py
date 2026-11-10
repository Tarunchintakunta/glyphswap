import math
from collections.abc import Sequence

import cv2
import numpy as np

from glyphswap_inference.ocr import Point


def polygon_height(polygon: Sequence[Point]) -> float:
    return (math.dist(polygon[0], polygon[3]) + math.dist(polygon[1], polygon[2])) / 2


def dilation(height: float) -> int:
    return int(np.clip(round(height * 0.12), 3, 6))


def text_mask(shape: tuple[int, ...], polygons: Sequence[Sequence[Point]]) -> np.ndarray:
    mask = np.zeros(shape[:2], np.uint8)
    for polygon in polygons:
        single = np.zeros_like(mask)
        cv2.fillPoly(single, [np.round(np.asarray(polygon)).astype(np.int32)], 255)
        radius = dilation(polygon_height(polygon))
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * radius + 1, 2 * radius + 1))
        mask = np.maximum(mask, cv2.dilate(single, kernel))
    return mask
