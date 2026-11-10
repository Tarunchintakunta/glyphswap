from pathlib import Path

import cv2
import numpy as np
import pytest
from PIL import Image, ImageDraw

from glyphswap_inference import inpaint, mask, render, style
from glyphswap_inference.pipeline import Edit, result_b
from glyphswap_inference.settings import settings

BOX = [(20.0, 20.0), (140.0, 20.0), (140.0, 50.0), (20.0, 50.0)]
FONTS = sorted((Path(settings.models_dir) / "fonts").glob("*.ttf"))


def sample(text: str = "Hello", font: style.Font | None = None) -> np.ndarray:
    canvas = Image.new("RGB", (200, 80), (245, 240, 230))
    ImageDraw.Draw(canvas).text(
        (22, 22), text, fill=(20, 40, 160), font=font or style.load_font(style.FontChoice(""), 26)
    )
    return cv2.cvtColor(np.asarray(canvas), cv2.COLOR_RGB2BGR)


def test_text_mask_dilates_by_text_height() -> None:
    holes = mask.text_mask((80, 200), [BOX])
    assert holes[35, 80] == 255
    assert holes[17, 80] == 255
    assert holes[10, 80] == 0
    assert mask.dilation(10) == 3 and mask.dilation(200) == 6


def test_inpaint_fills_masked_region() -> None:
    image = sample()
    clean = inpaint.inpaint(image, mask.text_mask(image.shape, [BOX]))
    assert np.abs(clean.astype(int) - [230, 240, 245]).max() < 40
    assert np.array_equal(clean[70:], image[70:])


def test_colors_pick_text_cluster() -> None:
    crop = sample()[20:50, 20:140]
    text, bg = style.colors(crop, np.full_like(crop, (230, 240, 245)))
    assert np.abs(text - [160, 40, 20]).max() < 60
    assert np.abs(bg - [230, 240, 245]).max() < 1


def test_ssim_identity() -> None:
    image = np.random.default_rng(0).random((20, 30)).astype(np.float32)
    assert style.ssim(image, image) == pytest.approx(1)


def test_script_detection() -> None:
    assert style.script_of("नमस्ते") == "deva"
    assert style.script_of("స్వాగతం") == "telu"
    assert style.script_of("Hello") == "latn"


def test_result_b_replaces_text_only_inside_box() -> None:
    image = sample()
    result = result_b(image, [Edit(BOX, "World", old_text="Hello")], "en", lambda *_: None)
    assert np.array_equal(result[65:], image[65:])
    region = result[20:50, 20:140].reshape(-1, 3).astype(int)
    assert (np.abs(region - [160, 40, 20]).sum(1) < 120).sum() > 30
    assert not np.array_equal(result, image)


def test_remove_only_returns_inpainted() -> None:
    image = sample()
    result = result_b(image, [Edit(BOX, remove=True)], "en", lambda *_: None)
    assert np.abs(result.astype(int) - [230, 240, 245]).max() < 40


def test_blend_noop_for_empty_alpha() -> None:
    image = sample()
    found = style.Style(style.FontChoice(""), 20, (0, 0, 0), (0, 0, 10, 10), 10, 0, 0, 1)
    assert render.blend(image, np.zeros(image.shape[:2], np.float32), found) is image


@pytest.mark.models
@pytest.mark.skipif(not FONTS, reason="fonts not downloaded")
def test_match_font_finds_rendering_font() -> None:
    choice = next(c for c in style.candidates("latn") if "Lora" in c.path and c.variation == "Bold")
    image = sample("Handmade", style.load_font(choice, 30))
    wide = [(15.0, 15.0), (185.0, 15.0), (185.0, 65.0), (15.0, 65.0)]
    found = style.analyze(image, np.full_like(image, (230, 240, 245)), wide, "Handmade")
    assert "Lora" in found.font.path
    assert found.size == pytest.approx(30, rel=0.15)
