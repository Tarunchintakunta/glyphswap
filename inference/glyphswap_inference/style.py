import math
from collections.abc import Sequence
from dataclasses import dataclass
from functools import cache
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, features

from glyphswap_inference.ocr import Point
from glyphswap_inference.settings import settings

Font = ImageFont.FreeTypeFont | ImageFont.ImageFont
LAYOUT = ImageFont.Layout.RAQM if features.check("raqm") else ImageFont.Layout.BASIC
PROBE_SIZE = 64
BLURS = (0.0, 0.4, 0.7, 1.0, 1.4, 1.8)
SCRIPT_FONTS = {"deva": "Devanagari", "telu": "Telugu"}


@dataclass(frozen=True)
class FontChoice:
    path: str
    variation: str = ""


@dataclass(frozen=True)
class Style:
    font: FontChoice
    size: float
    color: tuple[int, int, int]
    ink: tuple[int, int, int, int]
    baseline: float
    blur: float
    noise: float
    score: float


def script_of(text: str) -> str:
    if any("ऀ" <= char <= "ॿ" for char in text):
        return "deva"
    if any("ఀ" <= char <= "౿" for char in text):
        return "telu"
    return "latn"


def load_font(choice: FontChoice, size: float) -> Font:
    if not choice.path:
        return ImageFont.load_default(size)
    font = ImageFont.truetype(choice.path, size, layout_engine=LAYOUT)
    if choice.variation:
        font.set_variation_by_name(choice.variation)
    return font


def variations(path: Path) -> list[str]:
    try:
        names = {name.decode() for name in ImageFont.truetype(str(path)).get_variation_names()}
    except OSError:
        return [""]
    return [name for name in ("Regular", "Bold") if name in names] or [""]


@cache
def candidates(script: str) -> list[FontChoice]:
    marker = SCRIPT_FONTS.get(script)
    paths = sorted((Path(settings.models_dir) / "fonts").glob("*.ttf"))
    if marker:
        paths = [path for path in paths if marker in path.name]
    else:
        paths = [path for path in paths if not path.name.startswith("Noto")]
    choices = [FontChoice(str(path), name) for path in paths for name in variations(path)]
    return choices or [FontChoice("")]


def rectify(image: np.ndarray, polygon: Sequence[Point]) -> tuple[np.ndarray, np.ndarray]:
    top, left = math.dist(polygon[0], polygon[1]), math.dist(polygon[0], polygon[3])
    bottom, right = math.dist(polygon[3], polygon[2]), math.dist(polygon[1], polygon[2])
    width, height = max(1, round((top + bottom) / 2)), max(1, round((left + right) / 2))
    target = np.array([(0, 0), (width, 0), (width, height), (0, height)], np.float32)
    matrix = cv2.getPerspectiveTransform(np.array(polygon, np.float32), target)
    crop = cv2.warpPerspective(
        image, matrix, (width, height), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE
    )
    return crop, matrix


def colors(crop: np.ndarray, background: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    bg = np.median(background.reshape(-1, 3), axis=0)
    pixels = crop.reshape(-1, 3).astype(np.float32)
    k = min(3, len(pixels))
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 0.5)
    _, labels, centers = cv2.kmeans(
        pixels, k, np.zeros((len(pixels), 1), np.int32), criteria, 3, cv2.KMEANS_PP_CENTERS
    )
    counts = np.bincount(labels.ravel(), minlength=k)
    usable = [i for i in range(k) if counts[i] >= 0.03 * len(pixels)] or list(range(k))
    text = max(usable, key=lambda i: float(np.linalg.norm(centers[i] - bg)))
    return centers[text], bg


def ink_alpha(crop: np.ndarray, text: np.ndarray, bg: np.ndarray) -> np.ndarray:
    direction = text - bg
    span = float(direction @ direction)
    if span < 1:
        return np.zeros(crop.shape[:2], np.float32)
    alpha: np.ndarray = np.clip((crop.astype(np.float32) - bg) @ direction / span, 0, 1)
    return alpha.astype(np.float32)


def ink_box(alpha: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(alpha > 0.5)
    if len(xs) == 0:
        return 0, 0, alpha.shape[1], alpha.shape[0]
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def render_tight(font: Font, text: str) -> np.ndarray:
    left, top, right, bottom = (int(v) for v in font.getbbox(text, anchor="ls"))
    canvas = Image.new("L", (max(1, right - left), max(1, bottom - top)))
    ImageDraw.Draw(canvas).text((-left, -top), text, fill=255, font=font, anchor="ls")
    return np.asarray(canvas, np.float32) / 255


def blur(image: np.ndarray) -> np.ndarray:
    return cv2.GaussianBlur(image, (7, 7), 1.5)


def ssim(a: np.ndarray, b: np.ndarray) -> float:
    c1, c2 = 0.01**2, 0.03**2
    mu_a, mu_b = blur(a), blur(b)
    var_a, var_b = blur(a * a) - mu_a**2, blur(b * b) - mu_b**2
    cov = blur(a * b) - mu_a * mu_b
    num = (2 * mu_a * mu_b + c1) * (2 * cov + c2)
    den = (mu_a**2 + mu_b**2 + c1) * (var_a + var_b + c2)
    return float(np.mean(num / den))


def soft_fraction(alpha: np.ndarray) -> float:
    return float(np.mean((alpha > 0.1) & (alpha < 0.9)))


def match_font(text: str, target: np.ndarray) -> tuple[FontChoice, float, float, np.ndarray]:
    height, width = target.shape
    best: tuple[float, FontChoice, np.ndarray] | None = None
    for choice in candidates(script_of(text)):
        rendered = render_tight(load_font(choice, PROBE_SIZE), text)
        resized = cv2.resize(rendered, (width, height), interpolation=cv2.INTER_AREA)
        aspect = (rendered.shape[1] / rendered.shape[0]) / (width / height)
        score = ssim(resized, target) - 0.5 * abs(math.log(aspect))
        if best is None or score > best[0]:
            best = (score, choice, rendered)
    assert best is not None
    score, choice, rendered = best
    size = PROBE_SIZE * height / rendered.shape[0]
    resized = cv2.resize(rendered, (width, height), interpolation=cv2.INTER_AREA)
    return choice, size, score, resized


def match_blur(rendered: np.ndarray, target: np.ndarray) -> float:
    goal = soft_fraction(target)
    return min(
        BLURS,
        key=lambda sigma: abs(
            soft_fraction(cv2.GaussianBlur(rendered, (0, 0), sigma) if sigma else rendered) - goal
        ),
    )


def noise_level(crop: np.ndarray, alpha: np.ndarray) -> float:
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
    residual = gray - cv2.medianBlur(gray, 3)
    background = residual[
        cv2.dilate((alpha > 0.05).astype(np.uint8), np.ones((5, 5), np.uint8)) == 0
    ]
    return float(np.std(background)) if background.size > 16 else 0.0


def analyze(image: np.ndarray, clean: np.ndarray, polygon: Sequence[Point], old_text: str) -> Style:
    crop, matrix = rectify(image, polygon)
    background, _ = rectify(clean, polygon)
    text_color, bg = colors(crop, background)
    alpha = ink_alpha(crop, text_color, bg)
    x0, y0, x1, y1 = ink_box(alpha)
    target = alpha[y0:y1, x0:x1]
    choice, size, score, rendered = match_font(old_text, target)
    top = load_font(choice, size).getbbox(old_text, anchor="ls")[1]
    color = (int(text_color[0]), int(text_color[1]), int(text_color[2]))
    return Style(
        font=choice,
        size=size,
        color=color,
        ink=(x0, y0, x1, y1),
        baseline=y0 - top,
        blur=match_blur(rendered, target),
        noise=noise_level(crop, alpha),
        score=score,
    )
