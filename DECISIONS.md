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
