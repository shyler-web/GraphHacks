# syntax=docker/dockerfile:1
# GraphHacks Python backend (D8) — FastAPI + falkordb, run with uv.
# Build context: the repo root (see docker-compose.yml) so the Track 01/03
# artifacts can be baked in. Compose also bind-mounts the live repo at /repo.

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    FALKORDB_HOST=falkordb \
    FALKORDB_PORT=6379 \
    REPO_ROOT=/repo

WORKDIR /app

# Track 03 reads `git log --numstat` locally, so the runtime needs git.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/* \
    && git config --system --add safe.directory /repo

# Dependencies first so this layer caches across app-only edits.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

# Application code (app/ to serve, scripts/ for seeding via `compose exec`).
COPY backend/app ./app
COPY backend/scripts ./scripts

# Track 01/03 artifact used when no bind mount is present. Compose overlays
# /repo with the live checkout (graphify-out + .git + docs).
COPY graphify-out/graph.json /repo/graphify-out/graph.json

EXPOSE 8000

# --no-sync: the venv is already built above; never hit the network at runtime.
CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
