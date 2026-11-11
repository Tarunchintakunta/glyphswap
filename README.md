# Glyphswap

Open-source AI image text editor. Upload an image, see every line of text detected, then replace or remove any of it while matching font, size, color, angle and background. Runs fully local, deployable to Vercel + Render.

An open-source alternative to ReWords.AI.

> Status: editor and public API are in the repo. Neon, Vercel and Render are still blocked on credentials. See `PROGRESS.md`.

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

Create an API key in Settings after you sign up. `MAX_UPLOAD_MB` applies to the editor only. The API accepts 20 MB.

```bash
curl -X POST http://localhost:3000/v1/ocr \
  -H "Authorization: Bearer $GLYPHSWAP_KEY" \
  -F "image=@samples/poster.jpg" \
  -F "lang=en"

curl -X POST http://localhost:3000/v1/edit \
  -H "Authorization: Bearer $GLYPHSWAP_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 3b1c" \
  -d '{"image_id":"IMAGE","edits":[{"old_text":"SUMMER","new_text":"WINTER"}],"results":["B"]}'
```

`GET /v1/openapi.json` describes the same routes. Set `DATABASE_URL` before the web app can store a job. `make eval` writes `eval/report.md`.

## Responsible use
Do not use Glyphswap to forge IDs, certificates, invoices or official documents, or to impersonate anyone.

## License
MIT. Third-party components are listed in `THIRD_PARTY_LICENSES.md`.
