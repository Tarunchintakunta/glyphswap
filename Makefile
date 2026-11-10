.PHONY: setup models dev web inference eval check

setup:
	pnpm install
	cd inference && uv sync --group ml

models:
	cd inference && uv run --group ml python scripts/download_models.py

web:
	pnpm --filter @glyphswap/web dev

inference:
	cd inference && uv run --group ml uvicorn glyphswap_inference.main:app --reload --port 8000

dev:
	$(MAKE) -j2 web inference

eval:
	cd inference && uv run --group ml python scripts/bakeoff.py

check:
	pnpm lint && pnpm typecheck && pnpm test && pnpm build
	cd inference && uv run --group ml ruff check && uv run --group ml ruff format --check && uv run --group ml mypy . && uv run --group ml pytest -q
