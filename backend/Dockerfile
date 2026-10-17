# syntax=docker/dockerfile:1
# GraphHacks Python backend (D8) — FastAPI + falkordb, run with uv.
# Build context: ./backend  (see docker-compose.yml).

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    FALKORDB_HOST=falkordb \
    FALKORDB_PORT=6379

WORKDIR /app

# Dependencies first so this layer caches across app-only edits.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Application code (app/ to serve, scripts/ for seeding via `compose exec`).
COPY app ./app
COPY scripts ./scripts

EXPOSE 8000

# --no-sync: the venv is already built above; never hit the network at runtime.
CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
