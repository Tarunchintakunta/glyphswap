import json
import sys
import time
from pathlib import Path

import cv2

from glyphswap_inference.metrics import score
from glyphswap_inference.ocr import available_engines, get_engine, merge_words

SAMPLES = Path(__file__).resolve().parents[2] / "samples"


def main() -> None:
    truth = json.loads((SAMPLES / "truth.json").read_text())
    engines = sys.argv[1:] or available_engines()
    print("| engine | sample | CER | IoU | ms |\n| --- | --- | --- | --- | --- |")
    for name in engines:
        _, engine = get_engine(name)
        totals = [0.0, 0.0, 0.0]
        count = 0
        for sample, info in truth.items():
            image = cv2.imread(str(SAMPLES / sample))
            assert image is not None
            try:
                engine(image, info["lang"])
                start = time.perf_counter()
                lines = merge_words(engine(image, info["lang"]))
                ms = (time.perf_counter() - start) * 1000
            except RuntimeError:
                print(f"| {name} | {sample} | n/a | n/a | n/a |")
                continue
            expected = [
                (line["text"], [tuple(p) for p in line["polygon"]]) for line in info["lines"]
            ]
            cer, overlap = score(expected, lines)
            totals = [totals[0] + cer, totals[1] + overlap, totals[2] + ms]
            count += 1
            print(f"| {name} | {sample} | {cer:.3f} | {overlap:.2f} | {ms:.0f} |")
        count = max(count, 1)
        print(
            f"| {name} | **mean** | {totals[0] / count:.3f} | {totals[1] / count:.2f} | {totals[2] / count:.0f} |"
        )


if __name__ == "__main__":
    main()
