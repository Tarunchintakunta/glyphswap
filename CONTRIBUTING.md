# Contributing

Glyphswap is a small monorepo. Keep `main` deployable and put each change on `feat/<scope>`, `fix/<scope>` or `chore/<scope>`.

1. `cp .env.example .env` and set `DATABASE_URL`.
2. `make setup` then `make dev`.
3. Before a push: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. For `inference/`: `uv run ruff check && uv run ruff format --check && uv run mypy . && uv run pytest -q`.
4. Commit with Conventional Commits, one logical change per commit.
5. Open a pull request that says what changed, why, and which parity items in `TEARDOWN.md` moved.

Do not commit secrets, `.env`, model weights, user uploads, or eval outputs over 1 MB. Study the reference product from public pages only. Do not copy its code, assets, copy, screenshots or branding.
