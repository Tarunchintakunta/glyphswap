.PHONY: setup models dev web inference eval check

setup:
	pnpm install
	cd inference && uv sync

models:
	@echo "Model download arrives in the inference phase"

web:
	pnpm --filter @glyphswap/web dev

inference:
	cd inference && uv run uvicorn glyphswap_inference.main:app --reload --port 8000

dev:
	$(MAKE) -j2 web inference

eval:
	@echo "Eval arrives in the inference phase"

check:
	pnpm lint && pnpm typecheck && pnpm test && pnpm build
	cd inference && uv run ruff check && uv run ruff format --check && uv run mypy . && uv run pytest -q
