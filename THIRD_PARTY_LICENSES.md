# Third-party licenses

| Component | Use | License | Link |
| --- | --- | --- | --- |
| Next.js | Web framework | MIT | https://github.com/vercel/next.js |
| Tailwind CSS | Styling | MIT | https://github.com/tailwindlabs/tailwindcss |
| shadcn/ui | UI primitives | MIT | https://github.com/shadcn-ui/ui |
| Drizzle ORM | Database | Apache-2.0 | https://github.com/drizzle-team/drizzle-orm |
| zod | Validation | MIT | https://github.com/colinhacks/zod |
| Geist | Fonts | OFL-1.1 | https://github.com/vercel/geist-font |
| Instrument Serif | Font | OFL-1.1 | https://fonts.google.com/specimen/Instrument+Serif |
| FastAPI | Inference API | MIT | https://github.com/fastapi/fastapi |

Models (OCR, inpainting, upscaling) are added in the inference phase and must be listed here with their license before merge.

## Inference

| Component | Use | License | Link |
| --- | --- | --- | --- |
| PaddleOCR / PaddlePaddle (PP-OCRv5) | OCR (default) | Apache-2.0 | https://github.com/PaddlePaddle/PaddleOCR |
| docTR | OCR fallback (Latin) | Apache-2.0 | https://github.com/mindee/doctr |
| LaMa (big-lama) | Inpainting | Apache-2.0 | https://github.com/advimman/lama |
| big-lama TorchScript build | Inpainting weights mirror | Apache-2.0 | https://github.com/Sanster/models |
| PyTorch | Model runtime | BSD-3-Clause | https://github.com/pytorch/pytorch |
| OpenCV | Image ops, Telea fallback, Poisson blend | Apache-2.0 | https://github.com/opencv/opencv |
| Pillow | Text rendering | MIT-CMU (HPND) | https://github.com/python-pillow/Pillow |
| NumPy | Arrays | BSD-3-Clause | https://github.com/numpy/numpy |

## Fonts (downloaded at setup, not committed)

Inter, Roboto, Open Sans, Montserrat, Lato, Merriweather, Playfair Display, Lora, Source Code Pro, Bebas Neue, Oswald, Caveat, Noto Sans Devanagari, Noto Sans Telugu — all SIL Open Font License 1.1, from https://github.com/google/fonts.

Surya was evaluated and not used (GPL-3.0 code, weights with revenue-based commercial limits).
