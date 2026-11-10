# Glyphswap

Open-source AI image text editor. Upload an image, see every line of text detected, then replace or remove any of it while matching font, size, color, angle and background. Runs fully local, deployable to Vercel + Render.

An open-source alternative to ReWords.AI.

> Status: early bootstrap. See `docs/SPEC.md` for the product spec and `PROGRESS.md` for status.

## Stack
- `apps/web` — Next.js 15 (App Router), Tailwind v4, shadcn/ui
- `packages/db` — Drizzle ORM schema for Neon Postgres
- `packages/shared` — zod schemas shared by web and API
- `inference/` — FastAPI (Python 3.11, uv): OCR, inpainting, style match, render, blend

## Quick start
```bash
cp .env.example .env
make setup
make dev
```
Web on http://localhost:3000, inference on http://localhost:8000/healthz.

## Responsible use
Do not use Glyphswap to forge IDs, certificates, invoices or official documents, or to impersonate anyone.

## License
MIT. Third-party components are listed in `THIRD_PARTY_LICENSES.md`.
