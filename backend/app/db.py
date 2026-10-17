"""Thin FalkorDB access helpers (mirrors `scripts/health.mjs`).

Tenant isolation (D5): **one named graph per tenant**, key ``tenant:<tenantId>``.
Callers never pass a graph key directly — they pass a tenant id to the service,
which resolves the key here.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from falkordb import FalkorDB

from .config import FalkorDBConfig

# Health check graph, matching the Node implementation (`scripts/health.mjs`).
HEALTH_GRAPH = "graphhacks_health"


def tenant_graph_key(tenant: str) -> str:
    """Resolve the FalkorDB graph key for a tenant (D5)."""
    return f"tenant:{tenant}"


def connect(config: FalkorDBConfig | None = None) -> FalkorDB:
    """Open a short-lived FalkorDB client, as the Node service did per call."""
    cfg = config or FalkorDBConfig.from_env()
    kwargs: dict[str, object] = {"host": cfg.host, "port": cfg.port}
    if cfg.username:
        kwargs["username"] = cfg.username
    if cfg.password:
        kwargs["password"] = cfg.password
    return FalkorDB(**kwargs)


@contextmanager
def tenant_graph(
    tenant: str, config: FalkorDBConfig | None = None
) -> Iterator[object]:
    """Yield the tenant's graph, closing the client in a ``finally``."""
    db = connect(config)
    try:
        yield db.select_graph(tenant_graph_key(tenant))
    finally:
        close = getattr(db, "close", None)
        if callable(close):
            close()


def count_nodes(
    graph_name: str = HEALTH_GRAPH, config: FalkorDBConfig | None = None
) -> int:
    """Run ``MATCH (n) RETURN count(n)`` against a graph and return the count."""
    db = connect(config)
    try:
        graph = db.select_graph(graph_name)
        result = graph.query("MATCH (n) RETURN count(n)")
        return int(result.result_set[0][0])
    finally:
        close = getattr(db, "close", None)
        if callable(close):
            close()
