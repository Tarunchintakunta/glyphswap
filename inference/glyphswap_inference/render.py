from collections.abc import Sequence

import cv2
import numpy as np
from PIL import Image, ImageDraw

from glyphswap_inference.ocr import Point
from glyphswap_inference.style import Font, Style, load_font, rectify, script_of

TRACKING_RANGE = (0.85, 1.15)
SUPERSAMPLE = 2


def draw_line(font: Font, text: str, tracking: float, height: int, baseline: float) -> np.ndarray:
    left, _, right, _ = font.getbbox(text, anchor="ls")
    width = int(right - left + tracking * max(len(text) - 1, 0)) + 2
    canvas = Image.new("L", (max(1, width), height))
    draw = ImageDraw.Draw(canvas)
    if tracking:
        for index, char in enumerate(text):
            x = font.getlength(text[:index]) + index * tracking - left
            draw.text((x, baseline), char, fill=255, font=font, anchor="ls")
    else:
        draw.text((-left, baseline), text, fill=255, font=font, anchor="ls")
    return np.asarray(canvas, np.float32) / 255


def layout(text: str, style: Style, shape: tuple[int, int], margin: int) -> np.ndarray:
    scale = SUPERSAMPLE
    height, width = (shape[0] + 2 * margin) * scale, (shape[1] + 2 * margin) * scale
    font = load_font(style.font, style.size * scale)
    left, _, right, _ = font.getbbox(text, anchor="ls")
    x0, _, x1, _ = ((v + margin) * scale for v in style.ink)
    target, natural = x1 - x0, max(right - left, 1)
    ratio = target / natural
    tracking = 0.0
    if (
        script_of(text) == "latn"
        and len(text) > 1
        and TRACKING_RANGE[0] <= ratio <= TRACKING_RANGE[1]
    ):
        tracking = (target - natural) / (len(text) - 1)
    line = draw_line(font, text, tracking, height, (style.baseline + margin) * scale)
    if line.shape[1] > target and ratio < TRACKING_RANGE[0]:
        line = cv2.resize(line, (max(1, int(target)), height), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((height, width), np.float32)
    end = min(width, x0 + line.shape[1])
    canvas[:, x0:end] = line[:, : end - x0]
    small = cv2.resize(canvas, (width // scale, height // scale), interpolation=cv2.INTER_AREA)
    return cv2.GaussianBlur(small, (0, 0), style.blur) if style.blur else small


def text_alpha(
    image_shape: tuple[int, ...], polygon: Sequence[Point], text: str, style: Style
) -> np.ndarray:
    blank = np.zeros((*image_shape[:2], 3), np.uint8)
    crop, matrix = rectify(blank, polygon)
    margin = crop.shape[0]
    local = layout(text, style, crop.shape[:2], margin)
    shift = np.array([[1, 0, margin], [0, 1, margin], [0, 0, 1]], np.float64)
    size = (image_shape[1], image_shape[0])
    return cv2.warpPerspective(local, np.linalg.inv(shift @ matrix), size, flags=cv2.INTER_LINEAR)


def blend(background: np.ndarray, alpha: np.ndarray, style: Style, seed: int = 0) -> np.ndarray:
    if not alpha.any():
        return background
    color = np.full(background.shape, style.color, np.float32)
    if style.noise > 0.5:
        color += np.random.default_rng(seed).normal(0, style.noise, background.shape[:2])[..., None]
    weight = alpha[..., None]
    composite: np.ndarray = np.clip(background * (1 - weight) + color * weight, 0, 255).astype(
        np.uint8
    )
    points = cv2.findNonZero((alpha > 0.01).astype(np.uint8))
    if points is None:
        return composite
    hull = np.zeros(alpha.shape, np.uint8)
    cv2.fillConvexPoly(hull, cv2.convexHull(points), (255,))
    region = cv2.dilate(hull, np.ones((9, 9), np.uint8))
    region[[0, -1], :] = 0
    region[:, [0, -1]] = 0
    x, y, w, h = cv2.boundingRect(region)
    if w < 3 or h < 3:
        return composite
    return np.asarray(
        cv2.seamlessClone(composite, background, region, (x + w // 2, y + h // 2), cv2.NORMAL_CLONE)
    )
