# Decisions

## 2026-11-10 — Monorepo layout
- Decision: pnpm workspaces with `apps/web`, `packages/shared`, `packages/db`, and a uv-managed `inference/`.
- Options: Turborepo, Nx, plain pnpm.
- Why: plain pnpm is the simplest thing that runs `lint/typecheck/test/build` across packages.
- Revert: add Turborepo later if build times grow.

## 2026-11-10 — Framework versions
- Decision: Next.js 15.5, React 19.2, Tailwind 4.1, TypeScript 5.9, ESLint 9, zod 3.25, Drizzle 0.45.
- Why: SPEC asks for Next 15; TypeScript 7 and ESLint 10 are too new for the Next 15 lint config.
- Revert: bump in one PR per major.

## 2026-11-10 — Database driver
- Decision: `@neondatabase/serverless` HTTP driver with `drizzle-orm/neon-http`; ids are text UUIDs from `gen_random_uuid()`; Better Auth tables use text ids.
- Why: works on Vercel serverless and edge without pooling setup.
- Revert: switch to `postgres-js` for long-lived workers.

## 2026-11-10 — Teardown raises the public API bar
- Decision: SPEC API section gains exactly-one image source incl. base64, 20 MB/8000 px API limit, `Idempotency-Key`, `match` semantics with `422 text_not_found`, per-result status with skip reasons, typed error codes with `Retry-After`, per-user rate/queue limits, `GET /v1/account`, cancel, and a timestamped webhook signature with 1/5/30 min retries.
- Options: keep SPEC as is; copy the reference contract verbatim; adopt the stronger requirements under our own names.
- Why: TEARDOWN.md parity P14–P25 and B7/B10 show these are table stakes; our own names and a replay-safe signature avoid copying.
- Revert: drop the added bullets in SPEC "API contract".

## 2026-11-10 — Retention stays at 72 h
- Decision: keep 72 h deletion for uploads and results, not the reference API's 7-day result links.
- Why: the reference site itself promises 72 h; shorter retention is the stronger privacy requirement.
- Revert: raise `expires_at` default.

## 2026-11-10 — Teardown scope
- Decision: Phase 0 used public pages only; Playwright walk, network capture and free-edit baselines skipped per operator instruction.
- Why: budget and boundary rules; contract taken from their public docs instead of traffic.
- Revert: capture later into gitignored `teardown/`.
- Decision: ~~neon-http~~ superseded 2026-11-10 by `postgres` (postgres.js 3.4) + `drizzle-orm/postgres-js`, `prepare: false`; ids are text UUIDs from `gen_random_uuid()`; Better Auth tables use text ids.
- Options: neon-http (Neon only, no transactions), node-postgres, postgres.js v4.
- Why: one driver for local Postgres and Neon (use the pooled URL on Vercel; `prepare: false` keeps PgBouncer happy) with real transactions for credit debits. postgres.js 4.x (released 2026-10-29) sends strings as `text` and breaks enum parameters, so pinned to ^3.4.9.
- Revert: swap `createDb` back to `neon(url)` + `drizzle-orm/neon-http`.

## 2026-11-10 — Auth
- Decision: Better Auth 1.7 + Drizzle adapter on the existing schema (no schema changes needed); email/password with console verification links, `requireEmailVerification: false`; Google only when both env vars are set; signup credits granted in `databaseHooks.user.create.after`; middleware checks the session cookie only, pages re-check the session server-side.
- Options: Auth.js, Lucia (deprecated), Clerk (hosted).
- Why: SPEC names Better Auth; self-hosted, owns its tables in our Postgres.
- Revert: drop `apps/web/src/lib/auth.ts` and the `/api/auth` route.

## 2026-11-10 — Pool size env
- Decision: `DATABASE_POOL_MAX` (default 10) and one cached client per process; local `.env` sets 1 because the PGlite dev server takes a single connection.
- Revert: remove the env and pass nothing to `createDb`.

## 2026-11-10 — Landing and theme
- Decision: landing is a static server page; only the before/after slider (native range input over two inline SVG posters) and the theme toggle are client components. Theme = class on `<html>` set by a tiny inline script from `localStorage`, system via `prefers-color-scheme`. Added `--color-on-accent` (#0B0B0C in dark) because white on #6E8BFF is ~3:1 and fails AA. FAQ uses `<details>` (no JS). `/` first load 107 kB.
- Options: next-themes, a canvas slider library, real eval photos (none committed yet).
- Why: zero new dependencies, keyboard accessible slider for free.
- Revert: swap the SVG posters for `samples/` images once Phase 9 lands.

## 2026-11-10 — Playwright pin
- Decision: `@playwright/test` 1.64.0 to match the preinstalled Chromium build 1248.
- Revert: bump and run `npx playwright install chromium`.
## 2026-11-10 — OCR engine (bake-off)
- Decision: `OCR_ENGINE=auto` picks PaddleOCR 3.4 with PP-OCRv5 mobile det + per-language PP-OCRv5 mobile rec (`en`, `latin`, `hi`, `te`); docTR 1.1 (fast_base + crnn_vgg16_bn) is the Latin-only fallback. Word boxes on one baseline are merged into lines by `merge_words`.
- Options: PaddleOCR server det, PaddleOCR mobile det, docTR, Surya.
- Why: mobile det matches server det quality on our samples at ~4x the speed and covers Devanagari and Telugu; docTR is faster but Latin only. Paddle runs with `enable_mkldnn=False` because paddlepaddle 3.3 oneDNN crashes on CPU (`ConvertPirAttribute2RuntimeAttribute`). Surya skipped: GPL-3.0 code, weights under a modified OpenRAIL-M with revenue-based commercial limits, and it pins its own torch/transformers; not cheap to wire.
- Benchmark (`uv run python scripts/bakeoff.py`, 6 synthetic samples, CPU 8 cores, warm, ms per image):

| engine | sample | CER | IoU | ms |
| --- | --- | --- | --- | --- |
| paddle-server | screenshot.png | 0.000 | 0.81 | 4505 |
| paddle-server | poster.jpg | 0.000 | 0.82 | 4659 |
| paddle-server | textured.jpg | 0.000 | 0.84 | 5998 |
| paddle-server | rotated.png | 0.000 | 0.77 | 3715 |
| paddle-server | hindi.png | 0.094 | 0.72 | 3837 |
| paddle-server | telugu.png | 0.000 | 0.76 | 3839 |
| paddle-server | **mean** | 0.016 | 0.78 | 4426 |
| paddle | screenshot.png | 0.000 | 0.81 | 1651 |
| paddle | poster.jpg | 0.000 | 0.79 | 1114 |
| paddle | textured.jpg | 0.000 | 0.74 | 539 |
| paddle | rotated.png | 0.000 | 0.74 | 916 |
| paddle | hindi.png | 0.000 | 0.79 | 1323 |
| paddle | telugu.png | 0.000 | 0.79 | 1433 |
| paddle | **mean** | 0.000 | 0.78 | 1163 |
| doctr | screenshot.png | 0.000 | 0.88 | 346 |
| doctr | poster.jpg | 0.068 | 0.92 | 347 |
| doctr | textured.jpg | 0.000 | 0.85 | 356 |
| doctr | rotated.png | 0.000 | 0.80 | 423 |
| doctr | hindi.png | n/a | n/a | n/a |
| doctr | telugu.png | n/a | n/a | n/a |
| doctr | **mean** (4 Latin) | 0.017 | 0.86 | 368 |
- Revert: set `OCR_ENGINE=paddle-server` or `doctr`, or reorder `AUTO_ORDER` in `ocr.py`.
