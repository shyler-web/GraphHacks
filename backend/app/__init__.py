"""GraphHacks Track 02 — Python backend (decision D8).

Package layout (mirrors the Node reference preserved at `dump/node-backend/`):

- ``app.config``          — env-based FalkorDB connection settings
- ``app.db``              — thin FalkorDB client helpers + tenant graph keys
- ``app.models``          — Pydantic mirrors of ``docs/contracts/memory-service.types.ts``
- ``app.memory_service``  — the ``MemoryService`` (episodic tier in this slice)
- ``app.observability``   — no-op LangSmith hook point (D3)
- ``app.main``            — FastAPI application
"""
