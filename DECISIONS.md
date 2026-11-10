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
