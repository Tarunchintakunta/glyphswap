import json
import time
from pathlib import Path

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from glyphswap_inference.main import app
from glyphswap_inference.settings import settings

client = TestClient(app)
auth = {"Authorization": f"Bearer {settings.inference_token}"}
square = [[10, 10], [90, 10], [90, 40], [10, 40]]


def png() -> bytes:
    image = np.full((60, 120, 3), 240, np.uint8)
    cv2.putText(image, "Hi", (15, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (20, 20, 20), 2)
    return cv2.imencode(".png", image)[1].tobytes()


def submit(payload: dict[str, object], with_image: bool = True) -> dict[str, object]:
    files = {"image": ("a.png", png(), "image/png")} if with_image else None
    response = client.post(
        "/jobs", headers=auth, data={"payload": json.dumps(payload)}, files=files
    )
    assert response.status_code == 202, response.text
    body: dict[str, object] = response.json()
    return body


def wait(job_id: object) -> dict[str, object]:
    for _ in range(300):
        body: dict[str, object] = client.get(f"/jobs/{job_id}", headers=auth).json()
        if body["status"] in {"done", "failed"}:
            return body
        time.sleep(0.05)
    raise AssertionError("job did not finish")


def result_of(body: dict[str, object], kind: str) -> dict[str, object]:
    results = body["results"]
    assert isinstance(results, dict)
    item = results[kind]
    assert isinstance(item, dict)
    return item


def test_healthz() -> None:
    assert client.get("/healthz").json()["ok"] is True


def test_ocr_requires_token() -> None:
    response = client.post("/ocr", files={"image": ("a.png", b"x", "image/png")})
    assert response.status_code == 401


def test_ocr_rejects_unsupported_type() -> None:
    response = client.post("/ocr", headers=auth, files={"image": ("a.gif", b"x", "image/gif")})
    assert response.status_code == 415


def test_ocr_rejects_undecodable_image() -> None:
    response = client.post("/ocr", headers=auth, files={"image": ("a.png", b"x", "image/png")})
    assert response.status_code == 400


def test_job_runs_to_done_and_serves_png() -> None:
    with client:
        accepted = submit(
            {
                "edits": [{"polygon": square, "new_text": "Yo", "old_text": "Hi"}],
                "results": ["B", "A"],
            }
        )
        body = wait(accepted["job_id"])
        assert body["status"] == "done", body
        results = body["results"]
        assert isinstance(results, dict)
        assert results["B"]["status"] == "ready"
        assert results["A"]["status"] == "unavailable"
        image = client.get(f"/jobs/{accepted['job_id']}/result/B", headers=auth)
        assert image.headers["content-type"] == "image/png"
        assert image.content.startswith(b"\x89PNG")
        assert client.get(f"/jobs/{accepted['job_id']}/result/A", headers=auth).status_code == 404
        events = client.get(f"/jobs/{accepted['job_id']}/events", headers=auth).text
        assert '"stage":"done"' in events


def test_job_from_image_key(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "local_storage_dir", str(tmp_path))
    (tmp_path / "u").mkdir()
    (tmp_path / "u" / "a.png").write_bytes(png())
    with client:
        accepted = submit(
            {"image_key": "u/a.png", "edits": [{"polygon": square, "remove": True}]}, False
        )
        assert wait(accepted["job_id"])["status"] == "done"


def test_result_c_upscales_and_skips_wide_frames() -> None:
    wide = np.full((40, 200, 3), 230, np.uint8)
    wide_png = cv2.imencode(".png", wide)[1].tobytes()
    with client:
        accepted = submit({"edits": [{"polygon": square, "remove": True}], "results": ["B", "C"]})
        body = wait(accepted["job_id"])
        upscaled = result_of(body, "C")
        assert upscaled["status"] == "ready"
        assert upscaled["width"] == 240
        response = client.post(
            "/jobs",
            headers=auth,
            data={
                "payload": json.dumps(
                    {
                        "edits": [
                            {"polygon": [[0, 0], [180, 0], [180, 30], [0, 30]], "remove": True}
                        ],
                        "results": ["C"],
                    }
                )
            },
            files={"image": ("w.png", wide_png, "image/png")},
        )
        assert response.status_code == 202, response.text
        skipped = wait(response.json()["job_id"])
        wide_result = result_of(skipped, "C")
        assert wide_result["status"] == "unavailable"
        assert wide_result["reason"] == "aspect_ratio_unsupported"


def test_rejects_tiny_image() -> None:
    tiny = cv2.imencode(".png", np.full((10, 10, 3), 255, np.uint8))[1].tobytes()
    response = client.post("/ocr", headers=auth, files={"image": ("t.png", tiny, "image/png")})
    assert response.status_code == 400


def test_applies_exif_orientation(monkeypatch: pytest.MonkeyPatch) -> None:
    from io import BytesIO

    from PIL import Image

    from glyphswap_inference import ocr

    def fake_recognize(image: np.ndarray, lang: str = "en") -> tuple[str, list[ocr.Line]]:
        return "none", []

    monkeypatch.setattr(ocr, "recognize", fake_recognize)
    image = Image.new("RGB", (80, 40), "white")
    exif = image.getexif()
    exif[274] = 6
    buffer = BytesIO()
    image.save(buffer, format="JPEG", exif=exif)
    response = client.post(
        "/ocr", headers=auth, files={"image": ("r.jpg", buffer.getvalue(), "image/jpeg")}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["width"] == 40
    assert body["height"] == 80


def test_job_rejects_path_traversal(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "local_storage_dir", str(tmp_path))
    payload = {"image_key": "../etc/passwd", "edits": [{"polygon": square, "remove": True}]}
    response = client.post("/jobs", headers=auth, data={"payload": json.dumps(payload)})
    assert response.status_code == 404


def test_job_validates_payload() -> None:
    response = client.post("/jobs", headers=auth, data={"payload": json.dumps({"edits": []})})
    assert response.status_code == 422


def test_unknown_job_is_404() -> None:
    assert client.get("/jobs/nope", headers=auth).status_code == 404
