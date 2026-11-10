import json
from pathlib import Path

import cv2
import pytest

from glyphswap_inference.metrics import edit_distance, iou, score
from glyphswap_inference.ocr import available_engines, get_engine, line, merge_words, quad

SAMPLES = Path(__file__).resolve().parents[2] / "samples"


def test_quad_orders_corners_and_reads_angle() -> None:
    corners, angle = quad([(10, 30), (110, 30), (110, 10), (10, 10)])
    assert corners == [(10, 10), (110, 10), (110, 30), (10, 30)]
    assert angle == 0


def test_quad_rising_text_has_positive_angle() -> None:
    _, angle = quad([(0, 20), (100, 3), (103, 23), (3, 40)])
    assert 8 < angle < 12


def test_merge_words_joins_same_baseline() -> None:
    words = [
        line("world", [(70, 0), (120, 0), (120, 20), (70, 20)], 0.9),
        line("hello", [(0, 0), (60, 0), (60, 20), (0, 20)], 0.8),
        line("below", [(0, 60), (60, 60), (60, 80), (0, 80)], 0.9),
    ]
    merged = merge_words(words)
    assert [item.text for item in merged] == ["hello world", "below"]
    assert merged[0].confidence == 0.8


def test_metrics() -> None:
    box = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)]
    assert edit_distance("kitten", "sitting") == 3
    assert iou(box, box) == pytest.approx(1)
    cer, overlap = score([("hi", box)], [line("hi", box, 1)])
    assert cer == 0 and overlap == pytest.approx(1)
    assert score([("hi", box)], []) == (1, 0)


@pytest.mark.models
@pytest.mark.skipif(not available_engines(), reason="no OCR engine installed")
def test_default_engine_reads_screenshot() -> None:
    truth = json.loads((SAMPLES / "truth.json").read_text())["screenshot.png"]
    image = cv2.imread(str(SAMPLES / "screenshot.png"))
    assert image is not None
    _, engine = get_engine()
    texts = [item.text for item in merge_words(engine(image, "en"))]
    assert texts == [item["text"] for item in truth["lines"]]
