# Master prompt: build Glyphswap end to end

You are Claude Opus running in Claude Code with the ponytail plugin. Read `CLAUDE.md` and `SPEC.md` first and obey them for the whole run. You are building **Glyphswap**: an open-source, locally runnable, production-grade AI tool that finds text in an image and lets the user replace or remove it while matching font, size, color, angle and background. It is an original product; the reference product we are studying is rewords.ai, and none of its branding goes anywhere in our code or UI.

## Operating rules
- **Never stop to ask; decide, log, continue.** If something is ambiguous, pick the simplest option that meets SPEC.md, write it to `DECISIONS.md`, and move on.
- The only things you may hand back to me are physically impossible for you: payment details, Google OAuth consent setup, 2FA codes. Put them in a single `BLOCKERS.md` list, stub around them (env flags, feature toggles), and keep going.
- GitHub (`gh`), Vercel (`vercel`), Render (`render` CLI or MCP) and Neon (`neonctl` or MCP) are already authenticated. Use them directly.
- Ponytail: the simplest working solution, no unrequested abstractions, stdlib first. Zero code comments.
- Each phase: create `feat/<phase>` from `main`, micro commits, run all checks, self-review, open a PR, wait for green CI, squash-merge, pull `main`. Do not start the next phase until its done-criteria pass.
- Keep `PROGRESS.md` updated after each phase: what's done, what's next, parity status.
- If a tool or model fails, try the documented fallback from SPEC.md, log it, and continue. Don't silently skip a requirement; mark it in PROGRESS.md with the reason.

## Phase 0 — Reverse-engineering teardown (no product code yet)
Study rewords.ai from public surfaces only, following the boundaries in CLAUDE.md.
1. Fetch and read every public page: home, pricing, developers/API docs, blog, FAQ, terms, privacy. Note features, limits, languages, credits, file sizes, retention, result types.
2. Use Playwright (headed is fine) to walk the public editor flow: landing → upload → OCR boxes shown → edit a box → Replace all → A/B results → download. Screenshot each state into `teardown/screens/` (gitignored).
3. With devtools/Playwright network capture in your own session, record the public request/response shapes (endpoint paths, payload fields, status/polling cadence, webhooks, error shapes). Infer the job lifecycle. Don't replay, fuzz or flood anything.
4. Optionally use the free edit(s) a normal visitor gets on 2–3 of our own sample images to capture quality baselines into `teardown/baseline/`. Never create extra accounts to get more.
5. Write `TEARDOWN.md` with:
   - feature inventory (table),
   - UX flow (step list + mermaid),
   - inferred architecture and pipeline,
   - API contract as observed,
   - limits and pricing model,
   - quality baseline notes (what it does well and where it breaks: curved text, handwriting, Indic scripts, textures, small text),
   - **Parity checklist**: numbered items `P1…Pn`, each with an acceptance test,
   - **Where we beat it**: numbered items `B1…Bn` (e.g. local/offline, open source, batch, Indic script quality, API webhooks, transparent pipeline, self-hosting).
6. Update SPEC.md only where the teardown shows a better requirement; log each change in DECISIONS.md.
**Done when:** TEARDOWN.md exists with a parity checklist of at least 20 items and at least 6 "beat it" items, merged via PR (docs only, screenshots excluded from git).

## Phase 1 — Bootstrap repo and GitHub
- Create public repo `Tarunchintakunta/glyphswap` (`gh repo create --public`), push this kit as the first commit on `main`.
- Monorepo with pnpm workspaces: `apps/web` (Next.js 15 App Router, TypeScript strict, Tailwind v4, shadcn/ui), `inference/` (FastAPI, Python 3.11, uv), `packages/shared` (zod schemas + generated TS types for the API).
- Tooling: ESLint, Prettier, Vitest, Playwright; ruff, mypy, pytest. Root scripts `lint`, `typecheck`, `test`, `build`, `dev`. `Makefile` with `make setup`, `make models`, `make dev`, `make eval`.
- GitHub Actions `ci.yml`: web lint/typecheck/test/build, inference ruff/mypy/pytest (CPU, tiny models or mocks), Playwright on a preview. Branch protection on `main` requiring CI.
- `.gitignore` covers `.env*` (not `.env.example`), `models/`, `data/`, `teardown/screens`, `teardown/baseline`, `eval/out`.
**Done when:** CI green on an empty-but-real app, branch protection on, `make dev` boots both services.

## Phase 2 — Neon database
- Create a Neon project `glyphswap` with `main` and `dev` branches; write `DATABASE_URL` to `.env` and Vercel env (dev/preview/prod using matching Neon branches).
- Drizzle ORM + drizzle-kit migrations from the schema in SPEC.md. You own every schema/index decision; log them.
- Seed script: a demo user with credits and one sample image.
**Done when:** migrations run clean on both branches, seed works, a Vitest suite covers the repository functions.

## Phase 3 — Auth and login page
- Better Auth with the Drizzle adapter: email/password (with verification email via the console in dev), Google OAuth behind env (if credentials are missing, hide the button and log it in BLOCKERS.md).
- A polished `/login` and `/signup` (one shared card with tabs), password strength, error states, loading states, redirect back to `/app`. Middleware protects `/app/**` and `/settings/**`.
- On signup grant `FREE_CREDITS` credits in a ledger row.
**Done when:** Playwright covers signup → logout → login → protected redirect; it looks excellent in light and dark at all four widths.

## Phase 4 — Landing page
- Hero with a draggable before/after slider using our own eval images, headline, CTA to sign up, short "how it works" (Detect → Edit → Match), languages strip, API teaser with a code block, FAQ, footer. Design tokens from SPEC.md. Lighthouse ≥ 95 performance/accessibility/SEO on mobile.
**Done when:** Lighthouse scores met, OG image generated, no rewords branding or copy.

## Phase 5 — Inference service
Build `inference/` per SPEC.md pipeline:
1. OCR bake-off: implement adapters for PaddleOCR (PP-OCRv5, fallback v4), Surya, and docTR behind one interface. Run them on the eval set, score CER, box IoU and speed on MPS, write the table to DECISIONS.md, choose the default per script (Latin, Devanagari, Telugu, handwriting) and keep the next best as fallback.
2. Mask → LaMa via iopaint (MAT fallback for large regions) → style match (k-means color, size from box, angle from polygon, font via SSIM against bundled Google Fonts, stroke/shadow detection) → render with Pillow/Skia fitted to width → perspective warp → Poisson blend + noise match = Result B.
3. Result A: diffusion text-edit pass behind `ENABLE_DIFFUSION` (try AnyText, then TextDiffuser-2, or a newer open model; verify license allows redistribution and commercial use; log). If it can't run on MPS in reasonable time, ship it as GPU-only and mark that clearly.
4. Result C: Real-ESRGAN 2x/4x behind `ENABLE_UPSCALE`.
5. FastAPI endpoints internal to the web app (token-auth via `INFERENCE_TOKEN`), async job queue (max concurrency from env), SSE progress.
6. `scripts/download_models.py` fetches all weights into `MODELS_DIR` with checksums. Weights never in git.
7. Dockerfile (CPU) and `Dockerfile.gpu`; `render.yaml` blueprint.
**Done when:** pytest per stage passes, `make eval` writes before/after for all samples to `eval/out/` plus `eval/report.md` with timings, and the parity items for quality are measured.

## Phase 6 — Editor app
- `/app`: drag-and-drop upload (PNG/JPG/WebP ≤ 8 MB), OCR boxes overlay, click to edit inline, draw a manual box, per-box remove toggle, Replace all, progress via SSE, A / B / original compare with slider, download PNG, history list (`/app/history`), credits badge. Keyboard shortcuts. Optimistic UI, skeletons, toasts.
- Storage driver: local disk in dev, S3-compatible (Cloudflare R2) in prod via env; signed URLs; 72h deletion job (Vercel cron hitting a route).
- 1 credit per processed image regardless of box count, debited atomically in a transaction.
**Done when:** Playwright e2e upload → edit → Replace all → download passes locally against the real inference service, screenshots at four widths in both themes are in the PR.

## Phase 7 — Public API
- `/v1/ocr`, `/v1/edit`, `/v1/jobs/:id`, optional webhook, exactly per SPEC.md. API keys (hashed, prefix shown) managed in `/settings/api`. Rate limit per key from Postgres (sliding window) — no extra service. Generated OpenAPI at `/v1/openapi.json` and a docs page.
**Done when:** contract tests pass, curl examples in README work.

## Phase 8 — Deploy
- Render: deploy `inference/` as a Docker web service from `render.yaml` with a persistent disk for models. Start on CPU; document in README the CPU vs GPU trade-offs (CPU is slow for LaMa at high res and impractical for diffusion; Result A needs a GPU host). Health check `/healthz`.
- Vercel: link `apps/web`, set env for all environments, deploy preview per PR and production from `main`. `INFERENCE_URL` points to Render.
- Smoke test production with Playwright.
**Done when:** the production URL serves landing, login works, a real edit completes end to end.

## Phase 9 — Eval and quality
- Eval set of 10 of our own/openly licensed images in `samples/` with `samples/LICENSES.md`: screenshot, poster, sign photo, scanned doc, handwriting, Hindi, Telugu, curved text, textured background, small UI text.
- `eval/report.md`: per image OCR CER, SSIM of untouched regions, timing, and a side-by-side contact sheet. Compare against `teardown/baseline/` where we have it. Fix the worst two cases.
**Done when:** every parity quality item is measured and either passes or is listed with a reason.

## Phase 10 — Open-source polish
- MIT `LICENSE`, `THIRD_PARTY_LICENSES.md` (every model, library and font with license and link), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue and PR templates, README with demo GIF (ffmpeg from Playwright video), before/after table, one-command setup, architecture diagram, API examples, and a responsible-use note (no forging IDs, certificates, invoices or documents; no impersonation).
**Done when:** a fresh clone → `make setup && make models && make dev` works following only the README.

## Self-review checklist (run at the end of every phase)
- [ ] All checks green locally and in CI.
- [ ] Diff re-read; no comments, dead code, debug logs, unused deps.
- [ ] No secrets, weights or user data in git.
- [ ] UI screenshots at 375/768/1280/1440, light and dark, no console errors.
- [ ] DECISIONS.md and PROGRESS.md updated; parity items moved are listed in the PR.
- [ ] Nothing in code or UI references the reference product's branding.

## Final report (print at the end)
1. Production URLs (web, inference health), repo URL, merged PRs list.
2. Parity table: every `P#` with ✅ / ⚠️ / ❌ and evidence; every `B#` with status.
3. OCR bake-off result and chosen defaults; per-image timings on MPS and on Render.
4. Eval summary with link to `eval/report.md`.
5. Key decisions (top 10 from DECISIONS.md).
6. BLOCKERS.md contents: exactly what I must do by hand.
7. Known gaps and next steps.

Start with Phase 0 now.
