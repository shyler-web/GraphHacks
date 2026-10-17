"""FastAPI application for the GraphHacks Track 02 Python backend (D8).

The falkordb Python client is synchronous, so these endpoints are declared as
plain ``def`` — FastAPI runs them in a threadpool and they do not block the
event loop. LangSmith tracing hooks in through ``app.observability.span`` (D3).
"""

from __future__ import annotations

from fastapi import Body, FastAPI, HTTPException, Query

from . import cockpit, llm, search
from .db import HEALTH_GRAPH, count_nodes
from .errors import missing_artifact, service_error
from .guidance import router as guidance_router
from .models import EdgesResponse, NodesResponse, TenantsResponse
from .observability import span
from .repos import router as repos_router
from .routes_tracks import router as tracks_router

app = FastAPI(
    title="GraphHacks Track 02 — Memory API",
    version="0.1.0",
    description="Python backend + FalkorDB memory service (decision D8).",
)

# Track 01 (code:<repoId>) + Track 03 (company:brain) routes (D10).
app.include_router(tracks_router)
# Any-repo loading (D10 extension) + graph-grounded guidance (Option B).
app.include_router(repos_router)
app.include_router(guidance_router)


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
# Provider-agnostic LLM proxy (Nebius Token Factory). The browser bundle never
# contains a key: this route reads `NEBIUS_API_KEY` from the backend environment
# only. It accepts the legacy Gemini payload shape and answers in the same
# shape, so the frontend's `src/orchestration/gemini.ts` works unchanged.
# ---------------------------------------------------------------------------


@app.post("/api/gemini/generate")
def gemini_generate(payload: dict = Body(...)) -> object:
    """Translate the Gemini-format payload to a Nebius chat completion and
    return a Gemini-shaped response (``candidates[0].content.parts[0].text``)."""
    if not llm.is_configured():
        raise HTTPException(
            status_code=503,
            detail="NEBIUS_API_KEY is not configured on the backend (server-side only)",
        )
    try:
        sys_parts = (payload.get("systemInstruction") or {}).get("parts") or [{}]
        system_text = " ".join(p.get("text", "") for p in sys_parts if isinstance(p, dict))
        contents = (payload.get("contents") or [{}])[0]
        user_parts = contents.get("parts") or [{}]
        user_text = " ".join(p.get("text", "") for p in user_parts if isinstance(p, dict))
    except (KeyError, IndexError, AttributeError):
        raise HTTPException(status_code=400, detail="malformed LLM payload")

    generation = payload.get("generationConfig") or {}
    json_mode = generation.get("responseMimeType") == "application/json"
    try:
        text = llm.chat_completion(system_text, user_text, json_mode=json_mode)
    except llm.LLMUnavailable as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


@app.post("/api/research")
def research(payload: dict = Body(...)) -> object:
    """Web-grounded prior-art search via Tavily (replaces Gemini google_search).

    Returns cited sources (``uri``/``title``/``content``) so the L4/L5 "prior
    art" step is verifiable. A missing key is a 503 (the UI degrades).
    """
    query = str(payload.get("query", "")).strip()
    if not query:
        raise HTTPException(status_code=400, detail="query is required")
    try:
        sources = search.search(query)
    except search.SearchUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"query": query, "sources": sources}
