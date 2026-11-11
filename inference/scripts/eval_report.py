import json
import time
from pathlib import Path
from typing import TypedDict, cast

import cv2
import numpy as np

from glyphswap_inference import mask
from glyphswap_inference.metrics import score
from glyphswap_inference.ocr import OcrUnavailableError, Point, recognize
from glyphswap_inference.pipeline import Edit, result_b

ROOT = Path(__file__).resolve().parents[2]
SAMPLES = ROOT / "samples"
OUT = ROOT / "eval" / "out"


class LineInfo(TypedDict):
    text: str
    polygon: list[list[float]]


class EditInfo(TypedDict):
    line: int
    new_text: str


class SampleInfo(TypedDict):
    lang: str
    lines: list[LineInfo]
    edit: EditInfo


def load_truth() -> dict[str, SampleInfo]:
    raw: object = json.loads((SAMPLES / "truth.json").read_text())
    if not isinstance(raw, dict):
        raise SystemExit("truth.json is not an object")
    return cast(dict[str, SampleInfo], raw)


def polygon_of(points: list[list[float]]) -> list[Point]:
    return [(float(point[0]), float(point[1])) for point in points]


def cer_for(image: np.ndarray, info: SampleInfo) -> str:
    truth = [(line["text"], polygon_of(line["polygon"])) for line in info["lines"]]
    try:
        _, lines = recognize(image, info["lang"])
    except OcrUnavailableError:
        return "n/a"
    value, _iou = score(truth, lines)
    return f"{value:.3f}"


def outside_changed(before: np.ndarray, after: np.ndarray, polygons: list[list[Point]]) -> int:
    covered = mask.text_mask(before.shape, polygons)
    changed = np.any(before != after, axis=2)
    return int(np.count_nonzero(changed & (covered == 0)))


def main() -> None:
    truth = load_truth()
    OUT.mkdir(parents=True, exist_ok=True)
    rows = [
        "# Eval",
        "",
        "| sample | CER | result B ms | pixels outside mask | note |",
        "| --- | --- | --- | --- | --- |",
    ]
    for name, info in truth.items():
        path = SAMPLES / name
        image = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if image is None:
            rows.append(f"| {name} | n/a | n/a | n/a | unreadable |")
            continue
        cer = cer_for(image, info)
        edit = info.get("edit")
        note = ""
        elapsed = "n/a"
        leaked = "n/a"
        if edit is not None:
            source = info["lines"][edit["line"]]
            change = Edit(
                polygon=polygon_of(source["polygon"]),
                new_text=edit["new_text"],
                old_text=source["text"],
            )
            started = time.perf_counter()
            try:
                rendered = result_b(image, [change], info["lang"], lambda _stage, _pct: None)
                elapsed = f"{(time.perf_counter() - started) * 1000:.0f}"
                leaked = str(outside_changed(image, rendered, [change.polygon]))
                side = cv2.hconcat([image, cv2.resize(rendered, (image.shape[1], image.shape[0]))])
                cv2.imwrite(str(OUT / f"{Path(name).stem}.png"), side)
            except Exception as error:
                note = type(error).__name__
        rows.append(f"| {name} | {cer} | {elapsed} | {leaked} | {note} |")
    report = ROOT / "eval" / "report.md"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text("\n".join(rows) + "\n")
    print(report)


if __name__ == "__main__":
    main()
