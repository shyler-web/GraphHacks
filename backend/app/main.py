"""FastAPI application for the GraphHacks Track 02 Python backend (D8).

The falkordb Python client is synchronous, so these endpoints are declared as
plain ``def`` — FastAPI runs them in a threadpool and they do not block the
event loop. LangSmith tracing hooks in through ``app.observability.span`` (D3).
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query

from . import cockpit
from .db import HEALTH_GRAPH, count_nodes
from .models import EdgesResponse, NodesResponse, TenantsResponse
from .observability import span

app = FastAPI(
    title="GraphHacks Track 02 — Memory API",
    version="0.1.0",
    description="Python backend + FalkorDB memory service (decision D8).",
)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "graphhacks-backend", "status": "ok"}


def _health_payload() -> dict[str, object]:
    """``MATCH (n) RETURN count(n)`` against FalkorDB, or raise."""
    try:
        with span("health.count_nodes"):
            count = count_nodes()
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise HTTPException(
            status_code=503,
            detail=f"FalkorDB unavailable ({type(exc).__name__})",
        ) from exc
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


def _falkordb_unavailable(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail=f"FalkorDB unavailable ({type(exc).__name__})",
    )


@app.get("/api/tenants", response_model=TenantsResponse)
def api_tenants() -> dict[str, object]:
    """The tenant registry (``:Tenant`` nodes in ``db.REGISTRY_GRAPH``)."""
    try:
        with span("api.tenants"):
            tenants = cockpit.list_tenants()
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise _falkordb_unavailable(exc) from exc
    return {"tenants": tenants}


@app.get("/api/graph/nodes", response_model=NodesResponse)
def api_graph_nodes(tenant: str = Query(..., min_length=1)) -> dict[str, object]:
    """Nodes + episodes + playbooks + handoffs for one tenant graph."""
    try:
        with span("api.graph_nodes"):
            return cockpit.read_cockpit_tenant(tenant)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise _falkordb_unavailable(exc) from exc


@app.get("/api/graph/edges", response_model=EdgesResponse)
def api_graph_edges(tenant: str = Query(..., min_length=1)) -> dict[str, object]:
    """The typed concept relationships for one tenant graph."""
    try:
        with span("api.graph_edges"):
            edges = cockpit.read_cockpit_edges(tenant)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise _falkordb_unavailable(exc) from exc
    return {"tenant": tenant, "edges": edges}
