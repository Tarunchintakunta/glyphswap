import json
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from glyphswap_inference.settings import settings

OUT = Path(__file__).resolve().parents[2] / "samples"
FONTS = Path(settings.models_dir) / "fonts"
W, H = 800, 480


@dataclass
class Text:
    text: str
    font: str
    size: int
    color: tuple[int, int, int]
    x: int
    y: int
    angle: float = 0.0
    weight: str = ""


def gradient(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    t = np.linspace(0, 1, H)[:, None, None]
    rows = np.array(top) * (1 - t) + np.array(bottom) * t
    return Image.fromarray(np.repeat(rows, W, axis=1).astype(np.uint8))


def texture() -> Image.Image:
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 1, (H // 4, W // 4))
    base = Image.fromarray(((noise - noise.min()) / np.ptp(noise) * 255).astype(np.uint8))
    base = base.resize((W, H), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(2))
    grain = rng.normal(0, 10, (H, W))
    paper = np.array(base, dtype=float) * 0.35 + 150 + grain
    tint = np.stack([paper * 1.0, paper * 0.88, paper * 0.7], axis=-1)
    return Image.fromarray(np.clip(tint, 0, 255).astype(np.uint8))


def flat(color: tuple[int, int, int]) -> Image.Image:
    return Image.new("RGB", (W, H), color)


def draw(background: Image.Image, texts: list[Text]) -> tuple[Image.Image, list[dict[str, object]]]:
    image = background.convert("RGBA")
    lines: list[dict[str, object]] = []
    for item in texts:
        font = ImageFont.truetype(str(FONTS / item.font), item.size)
        if item.weight:
            font.set_variation_by_name(item.weight)
        left, top, right, bottom = font.getbbox(item.text)
        pad = item.size
        layer = Image.new("RGBA", (right + 2 * pad, bottom + 2 * pad), (0, 0, 0, 0))
        ImageDraw.Draw(layer).text((pad, pad), item.text, font=font, fill=item.color)
        rotated = layer.rotate(item.angle, resample=Image.Resampling.BICUBIC, expand=True)
        cx, cy = layer.width / 2, layer.height / 2
        rx, ry = rotated.width / 2, rotated.height / 2
        rad = math.radians(-item.angle)
        corners = []
        for px, py in [(left, top), (right, top), (right, bottom), (left, bottom)]:
            dx, dy = px + pad - cx, py + pad - cy
            qx = dx * math.cos(rad) - dy * math.sin(rad) + rx + item.x - pad
            qy = dx * math.sin(rad) + dy * math.cos(rad) + ry + item.y - pad
            corners.append([round(qx, 1), round(qy, 1)])
        image.alpha_composite(rotated, (item.x - pad, item.y - pad))
        lines.append({"text": item.text, "polygon": corners})
    return image.convert("RGB"), lines


SAMPLES: dict[str, tuple[Image.Image, list[Text], int, str]] = {
    "screenshot.png": (
        flat((248, 249, 251)),
        [
            Text("Account settings", "Inter[opsz,wght].ttf", 34, (17, 24, 39), 40, 40, 0, "Bold"),
            Text("Email address", "Inter[opsz,wght].ttf", 20, (75, 85, 99), 40, 130),
            Text("jane@example.com", "Inter[opsz,wght].ttf", 22, (17, 24, 39), 40, 170),
            Text("Save changes", "Roboto[wdth,wght].ttf", 24, (37, 99, 235), 40, 300),
        ],
        3,
        "Update profile",
    ),
    "poster.jpg": (
        gradient((255, 94, 98), (60, 40, 140)),
        [
            Text("SUMMER", "BebasNeue-Regular.ttf", 120, (255, 255, 255), 60, 40),
            Text("Music Festival 2026", "Montserrat[wght].ttf", 44, (255, 236, 179), 60, 210, 0, "SemiBold"),
            Text("Tickets on sale now", "PlayfairDisplay[wght].ttf", 36, (255, 255, 255), 60, 320),
        ],
        0,
        "WINTER",
    ),
    "textured.jpg": (
        texture(),
        [
            Text("Handmade Bread", "Lora[wght].ttf", 64, (60, 35, 20), 60, 80, 0, "Bold"),
            Text("baked fresh every morning", "Caveat[wght].ttf", 48, (80, 45, 25), 60, 220),
        ],
        0,
        "Daily Pastries",
    ),
    "rotated.png": (
        gradient((230, 244, 234), (200, 230, 210)),
        [
            Text("Grand Opening", "Oswald[wght].ttf", 70, (20, 83, 45), 80, 60, 12),
            Text("Open daily 9 to 5", "OpenSans[wdth,wght].ttf", 36, (30, 30, 30), 120, 300, -8),
        ],
        1,
        "Closed on Sunday",
    ),
    "hindi.png": (
        flat((255, 250, 240)),
        [
            Text("नमस्ते दुनिया", "NotoSansDevanagari[wdth,wght].ttf", 64, (153, 27, 27), 60, 80),
            Text("आज का मौसम अच्छा है", "NotoSansDevanagari[wdth,wght].ttf", 40, (31, 41, 55), 60, 240),
        ],
        0,
        "शुभ प्रभात",
    ),
    "telugu.png": (
        flat((240, 248, 255)),
        [
            Text("స్వాగతం", "NotoSansTelugu[wdth,wght].ttf", 64, (30, 64, 175), 60, 80),
            Text("తెలుగు భాష చాలా అందమైనది", "NotoSansTelugu[wdth,wght].ttf", 40, (31, 41, 55), 60, 240),
        ],
        0,
        "నమస్కారం",
    ),
}


def main() -> None:
    OUT.mkdir(exist_ok=True)
    truth: dict[str, object] = {}
    for name, (background, texts, edit_line, new_text) in SAMPLES.items():
        image, lines = draw(background, texts)
        image.save(OUT / name, quality=92)
        truth[name] = {"lines": lines, "edit": {"line": edit_line, "new_text": new_text}}
    (OUT / "truth.json").write_text(json.dumps(truth, ensure_ascii=False, indent=1) + "\n")


if __name__ == "__main__":
    main()
