from fastapi.testclient import TestClient

from glyphswap_inference.main import app
from glyphswap_inference.settings import settings

client = TestClient(app)
auth = {"Authorization": f"Bearer {settings.inference_token}"}
square = [[0, 0], [10, 0], [10, 10], [0, 10]]


def test_healthz() -> None:
    assert client.get("/healthz").json()["ok"] is True


def test_ocr_requires_token() -> None:
    response = client.post("/ocr", files={"image": ("a.png", b"x", "image/png")})
    assert response.status_code == 401


def test_ocr_rejects_unsupported_type() -> None:
    response = client.post("/ocr", headers=auth, files={"image": ("a.gif", b"x", "image/gif")})
    assert response.status_code == 415


def test_ocr_accepts_png() -> None:
    response = client.post("/ocr", headers=auth, files={"image": ("a.png", b"x", "image/png")})
    assert response.status_code == 200
    assert response.json()["lines"] == []


def test_create_job() -> None:
    body = {"image_key": "k", "edits": [{"polygon": square, "new_text": "hi"}]}
    response = client.post("/jobs", headers=auth, json=body)
    assert response.status_code == 202
    assert response.json()["status"] == "queued"
