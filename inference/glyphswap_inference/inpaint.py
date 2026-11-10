import importlib.util
from functools import cache
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from glyphswap_inference.settings import settings

MAX_SIDE = 1024


def torch_device() -> str:
    import torch

    if settings.torch_device != "auto":
        return settings.torch_device
    if torch.cuda.is_available():
        return "cuda"
    return "mps" if torch.backends.mps.is_available() else "cpu"


def lama_path() -> Path:
    return Path(settings.models_dir) / "big-lama.pt"


@cache
def lama() -> Any:
    if not lama_path().exists() or not importlib.util.find_spec("torch"):
        return None
    import torch

    return torch.jit.load(str(lama_path()), map_location=torch_device()).eval()


def engine() -> str:
    return "lama" if lama() is not None else "telea"


def run_lama(model: Any, patch: np.ndarray, mask: np.ndarray) -> np.ndarray:
    import torch

    height, width = patch.shape[:2]
    scale = min(1.0, MAX_SIDE / max(height, width))
    if scale < 1:
        size = (round(width * scale), round(height * scale))
        patch = cv2.resize(patch, size, interpolation=cv2.INTER_AREA)
        mask = cv2.resize(mask, size, interpolation=cv2.INTER_NEAREST)
    small_h, small_w = patch.shape[:2]
    pad_h, pad_w = -small_h % 8, -small_w % 8
    patch = cv2.copyMakeBorder(patch, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT)
    mask = cv2.copyMakeBorder(mask, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT)
    device = next(model.parameters()).device
    rgb = cv2.cvtColor(patch, cv2.COLOR_BGR2RGB)
    image_t = torch.from_numpy(rgb).permute(2, 0, 1)[None].float().div(255).to(device)
    mask_t = torch.from_numpy((mask > 0).astype(np.float32))[None, None].to(device)
    with torch.inference_mode():
        result = model(image_t, mask_t)[0].permute(1, 2, 0).clamp(0, 1).mul(255)
    filled = cv2.cvtColor(result.byte().cpu().numpy()[:small_h, :small_w], cv2.COLOR_RGB2BGR)
    filled = poisson(filled, patch[:small_h, :small_w], mask[:small_h, :small_w])
    return (
        cv2.resize(filled, (width, height), interpolation=cv2.INTER_CUBIC) if scale < 1 else filled
    )


def poisson(filled: np.ndarray, original: np.ndarray, mask: np.ndarray) -> np.ndarray:
    region = cv2.dilate(mask, np.ones((5, 5), np.uint8))
    region[[0, -1], :] = 0
    region[:, [0, -1]] = 0
    x, y, w, h = cv2.boundingRect(region)
    if w < 3 or h < 3:
        return filled
    return cv2.seamlessClone(filled, original, region, (x + w // 2, y + h // 2), cv2.NORMAL_CLONE)


def crop_box(mask: np.ndarray) -> tuple[int, int, int, int]:
    x, y, w, h = cv2.boundingRect(mask)
    margin = int(np.clip(max(w, h) // 2, 48, 256))
    height, width = mask.shape
    return (
        max(0, x - margin),
        max(0, y - margin),
        min(width, x + w + margin),
        min(height, y + h + margin),
    )


def inpaint(image: np.ndarray, mask: np.ndarray) -> np.ndarray:
    result = image.copy()
    if not mask.any():
        return result
    x0, y0, x1, y1 = crop_box(mask)
    patch, patch_mask = image[y0:y1, x0:x1], mask[y0:y1, x0:x1]
    model = lama()
    if model is None:
        filled = cv2.inpaint(patch, patch_mask, 5, cv2.INPAINT_TELEA)
    else:
        filled = run_lama(model, patch, patch_mask)
    region = result[y0:y1, x0:x1]
    region[patch_mask > 0] = filled[patch_mask > 0]
    return result
