"""FastAPI application for the GraphHacks Track 02 Python backend (D8).

The falkordb Python client is synchronous, so these endpoints are declared as
plain ``def`` — FastAPI runs them in a threadpool and they do not block the
event loop. LangSmith tracing hooks in through ``app.observability.span`` (D3).
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from fastapi import Body, FastAPI, HTTPException, Query

from . import cockpit
from .db import HEALTH_GRAPH, count_nodes
from .errors import missing_artifact, service_error
from .models import EdgesResponse, NodesResponse, TenantsResponse
from .observability import span
from .routes_tracks import router as tracks_router

app = FastAPI(
    title="GraphHacks Track 02 — Memory API",
    version="0.1.0",
    description="Python backend + FalkorDB memory service (decision D8).",
)

# Track 01 (code:<repoId>) + Track 03 (company:brain) routes (D10).
app.include_router(tracks_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "graphhacks-backend", "status": "ok"}


def _health_payload() -> dict[str, object]:
    """``MATCH (n) RETURN count(n)`` against FalkorDB, or raise."""
    try:
        with span("health.count_nodes"):
            count = count_nodes()
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc
    return {"status": "ok", "graph": HEALTH_GRAPH, "node_count": count}


@app.get("/health")
def health() -> dict[str, object]:
    """Runnable health check; 503 when FalkorDB is down (rule 3)."""
    return _health_payload()


@app.get("/api/health")
def api_health() -> dict[str, object]:
    """Same as ``/health`` under the ``/api`` prefix the Vite dev proxy uses (F1)."""
    return _health_payload()


# ---------------------------------------------------------------------------
# Cockpit routes (F2 / T4.1). Read-only: they never create a graph. Any
# FalkorDB failure becomes a 503 so the cockpit's ErrorScreen can show it and
# the app cannot silently fall back to seed data (rule 3).
# ---------------------------------------------------------------------------


@app.get("/api/tenants", response_model=TenantsResponse)
def api_tenants() -> dict[str, object]:
    """The tenant registry (``:Tenant`` nodes in ``db.REGISTRY_GRAPH``)."""
    try:
        with span("api.tenants"):
            tenants = cockpit.list_tenants()
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc
    if not tenants:
        raise missing_artifact(
            "No tenants seeded — run `cd backend && uv run python scripts/seed_cockpit.py`"
        )
    return {"tenants": tenants}


@app.get("/api/graph/nodes", response_model=NodesResponse)
def api_graph_nodes(tenant: str = Query(..., min_length=1)) -> dict[str, object]:
    """Nodes + episodes + playbooks + handoffs for one tenant graph."""
    try:
        with span("api.graph_nodes"):
            return cockpit.read_cockpit_tenant(tenant)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc


@app.get("/api/graph/edges", response_model=EdgesResponse)
def api_graph_edges(tenant: str = Query(..., min_length=1)) -> dict[str, object]:
    """The typed concept relationships for one tenant graph."""
    try:
        with span("api.graph_edges"):
            edges = cockpit.read_cockpit_edges(tenant)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc
    return {"tenant": tenant, "edges": edges}


# ---------------------------------------------------------------------------
# Server-side Gemini proxy (minor 14). The browser bundle never contains an API
# key: this route reads `GEMINI_API_KEY` from the backend environment only.
# ---------------------------------------------------------------------------


@app.post("/api/gemini/generate")
def gemini_generate(payload: dict = Body(...)) -> object:
    """Proxy a generateContent call without shipping a key to the client."""
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the backend (server-side only)",
        )
    model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={key}"
    )
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise HTTPException(
            status_code=502,
            detail=f"Gemini upstream error {exc.code}: {detail}",
        ) from exc
    except Exception as exc:  # network/timeout/parse
        raise HTTPException(
            status_code=502,
            detail=f"Gemini request failed ({type(exc).__name__})",
        ) from exc
