"""FastAPI application for the GraphHacks Track 02 Python backend (D8).

The falkordb Python client is synchronous, so these endpoints are declared as
plain ``def`` — FastAPI runs them in a threadpool and they do not block the
event loop. LangSmith tracing hooks in through ``app.observability.span`` (D3).
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .db import HEALTH_GRAPH, count_nodes
from .observability import span

app = FastAPI(
    title="GraphHacks Track 02 — Memory API",
    version="0.1.0",
    description="Python backend + FalkorDB memory service (decision D8).",
)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "graphhacks-backend", "status": "ok"}


@app.get("/health")
def health() -> dict[str, object]:
    """Runnable health check: ``MATCH (n) RETURN count(n)`` against FalkorDB.

    If FalkorDB is stopped this returns 503 — the graph is load-bearing, so the
    backend must not pretend to be healthy without it (rule 3).
    """
    try:
        with span("health.count_nodes"):
            count = count_nodes()
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise HTTPException(
            status_code=503,
            detail=f"FalkorDB unavailable ({type(exc).__name__})",
        ) from exc
    return {"status": "ok", "graph": HEALTH_GRAPH, "node_count": count}
