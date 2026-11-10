FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --group ml --no-install-project
COPY . .
RUN uv sync --frozen --no-dev --group ml
ENV MODELS_DIR=/models PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uv run --no-sync python scripts/download_models.py && uv run --no-sync uvicorn glyphswap_inference.main:app --host 0.0.0.0 --port ${PORT}"]
