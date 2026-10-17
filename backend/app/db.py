"""Thin FalkorDB access helpers (mirrors `scripts/health.mjs`).

Named-graph topology (D5 + D10):
* ``tenant:<tenantId>``  — Track 02 agent memory (one graph per tenant, D5).
* ``code:<repoId>``      — Track 01 AST action graph (D10).
* ``company:brain``      — Track 03 company brain (D10).
* ``graphhacks_registry``— tenant registry (id -> name).

All graph access goes through :func:`named_graph`; callers pass a *tenant id* or
*repo id* to the domain layer, which resolves the graph key here. Callers never
build a key by hand.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from falkordb import FalkorDB
from redis.exceptions import ResponseError

from .config import FalkorDBConfig

# Health check graph, matching the Node implementation (`scripts/health.mjs`).
HEALTH_GRAPH = "graphhacks_health"

# Tenant registry + Track 01/03 named graphs (D10).
REGISTRY_GRAPH = "graphhacks_registry"
BRAIN_GRAPH = "company:brain"


def tenant_graph_key(tenant: str) -> str:
    """Resolve the FalkorDB graph key for a tenant (D5)."""
    return f"tenant:{tenant}"


def repo_graph_key(repo_id: str) -> str:
    """Resolve the FalkorDB graph key for a code repo (D10, Track 01)."""
    return f"code:{repo_id}"


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
def named_graph(
    graph_key: str, config: FalkorDBConfig | None = None
) -> Iterator[object]:
    """Yield any named graph by key, closing the client in a ``finally``.

    The single router for every projection (D10). A fresh client per call keeps
    concurrent threads safe (no shared connection state).
    """
    db = connect(config)
    try:
        yield db.select_graph(graph_key)
    finally:
        close = getattr(db, "close", None)
        if callable(close):
            close()


@contextmanager
def tenant_graph(
    tenant: str, config: FalkorDBConfig | None = None
) -> Iterator[object]:
    """Yield the tenant's graph (D5) — ``named_graph`` for ``tenant:<id>``."""
    with named_graph(tenant_graph_key(tenant), config) as graph:
        yield graph


def ensure_indexes(
    graph_key: str,
    specs: list[tuple[str, str]],
    config: FalkorDBConfig | None = None,
) -> int:
    """Idempotently create range indexes for ``(label, property)`` pairs.

    ``CREATE INDEX IF NOT EXISTS`` is unsupported by FalkorDB; a repeat
    ``CREATE INDEX`` raises ``ResponseError: Attribute '<p>' is already indexed``
    which we tolerate. Returns the number of indexes actually created.
    """
    created = 0
    with named_graph(graph_key, config) as graph:
        for label, prop in specs:
            try:
                graph.query(f"CREATE INDEX FOR (n:{label}) ON (n.{prop})")
                created += 1
            except ResponseError as exc:  # already indexed / already exists
                if "already indexed" not in str(exc) and "already exists" not in str(exc):
                    raise
    return created


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
