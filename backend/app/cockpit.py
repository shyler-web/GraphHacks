"""Cockpit read projections (F2 / T4.1) — real FalkorDB reads for the UI.

The React cockpit reads three things through this module (all camel/snake-shaped
to match `src/data/types.ts`):

* the tenant registry (`graphhacks_registry` → ``:Tenant`` nodes);
* `:ConceptNode` nodes + their typed relationships (the 2D graph);
* the episodic/procedural/coordination tiers projected onto the cockpit labels
  (``:Turn``/``:Session`` → ``Episode``, ``:Workflow`` → ``Playbook``,
  ``:Handoff`` → ``Handoff``).

Read-only guarantee: every access goes through :func:`app.db.tenant_graph` /
:func:`app.db.named_graph`, and a read of an unknown tenant simply returns empty
rows — a graph is **never** created on read. A FalkorDB error propagates
untouched so the HTTP layer can translate it into a 503 (rule 3).
"""

from __future__ import annotations

from typing import Any

from . import db
from .config import FalkorDBConfig
from .observability import span

# ---------------------------------------------------------------------------
# Cypher — one query per projection.
# ---------------------------------------------------------------------------

_TENANTS_CYPHER = """
MATCH (t:Tenant)
RETURN t.key AS key, t.name AS name
ORDER BY key ASC
"""

_NODES_CYPHER = """
MATCH (n:ConceptNode)
RETURN n.id AS id, n.domain AS domain, n.persona_level AS persona_level,
       n.title AS title, n.summary AS summary, n.vibe_translation AS vibe_translation,
       n.code_or_math AS code_or_math, n.status AS status,
       n.created_by_agent AS created_by_agent, n.x AS x, n.y AS y
ORDER BY n.persona_level ASC, n.id ASC
"""

_EDGES_CYPHER = """
MATCH (a:ConceptNode)-[r]->(b:ConceptNode)
RETURN a.id AS source, b.id AS target, type(r) AS type
ORDER BY source ASC, target ASC, type ASC
"""

_EPISODES_CYPHER = """
MATCH (t:Turn)-[:IN_SESSION]->(s:Session)
RETURN t.id AS id, coalesce(s.name, s.id) AS session, t.text AS prompt,
       t.summary AS summary, t.timestamp AS timestamp
ORDER BY t.id ASC
"""

_PLAYBOOKS_CYPHER = """
MATCH (w:Workflow)
RETURN w.id AS id, w.name AS rule_name, w.trigger_domain AS trigger_domain,
       w.enforced_action AS enforced_action, w.learned_from AS learned_from
ORDER BY id ASC
"""

_HANDOFFS_CYPHER = """
MATCH (h:Handoff)
OPTIONAL MATCH (h)-[:FROM_AGENT]->(fa:Agent)
OPTIONAL MATCH (h)-[:TO_AGENT]->(ta:Agent)
OPTIONAL MATCH (h)-[:TARGETS]->(tg:ConceptNode)
RETURN h.id AS id, fa.name AS source, ta.name AS target_agent,
       tg.id AS target, h.status AS status
ORDER BY id ASC
"""


def _text(value: Any, default: str = "") -> str:
    """Coerce an OPTIONAL property into a string for the cockpit shape."""
    if value is None:
        return default
    return str(value)


def _rows(graph: object, cypher: str) -> list[list[Any]]:
    result = graph.query(cypher)  # type: ignore[attr-defined]
    return result.result_set or []


# ---------------------------------------------------------------------------
# Projections
# ---------------------------------------------------------------------------


def list_tenants(config: FalkorDBConfig | None = None) -> list[dict[str, str]]:
    """Read the tenant registry (``:Tenant`` nodes) → ``[{key, name}]``."""
    with span("cockpit.list_tenants"):
        with db.named_graph(db.REGISTRY_GRAPH, config) as graph:
            rows = _rows(graph, _TENANTS_CYPHER)
    return [{"key": _text(row[0]), "name": _text(row[1])} for row in rows]


def _read_nodes(graph: object) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    for row in _rows(graph, _NODES_CYPHER):
        nodes.append(
            {
                "id": _text(row[0]),
                "domain": _text(row[1]),
                "persona_level": int(row[2] or 0),
                "title": _text(row[3]),
                "summary": _text(row[4]),
                "vibe_translation": _text(row[5]),
                "code_or_math": _text(row[6]),
                "status": _text(row[7]),
                "created_by_agent": _text(row[8]),
                "x": float(row[9] or 0),
                "y": float(row[10] or 0),
            }
        )
    return nodes


def _read_episodes(graph: object) -> list[dict[str, str]]:
    episodes: list[dict[str, str]] = []
    for row in _rows(graph, _EPISODES_CYPHER):
        episodes.append(
            {
                "id": _text(row[0]),
                "session": _text(row[1]),
                "prompt": _text(row[2]),
                "summary": _text(row[3]),
                "timestamp": _text(row[4]),
            }
        )
    return episodes


def _read_playbooks(graph: object) -> list[dict[str, str]]:
    playbooks: list[dict[str, str]] = []
    for row in _rows(graph, _PLAYBOOKS_CYPHER):
        playbooks.append(
            {
                "id": _text(row[0]),
                "rule_name": _text(row[1]),
                "trigger_domain": _text(row[2]),
                "enforced_action": _text(row[3]),
                "learned_from": _text(row[4]),
            }
        )
    return playbooks


def _read_handoffs(graph: object) -> list[dict[str, str]]:
    handoffs: list[dict[str, str]] = []
    for row in _rows(graph, _HANDOFFS_CYPHER):
        handoffs.append(
            {
                "id": _text(row[0]),
                "from": _text(row[1]),
                "to": _text(row[2]),
                "target": _text(row[3]),
                "status": _text(row[4]),
            }
        )
    return handoffs


def read_cockpit_tenant(
    tenant: str, config: FalkorDBConfig | None = None
) -> dict[str, Any]:
    """The full cockpit payload for one tenant (nodes + all three tiers)."""
    with span("cockpit.read_tenant"):
        with db.tenant_graph(tenant, config) as graph:
            nodes = _read_nodes(graph)
            episodes = _read_episodes(graph)
            playbooks = _read_playbooks(graph)
            handoffs = _read_handoffs(graph)
    return {
        "tenant": tenant,
        "nodes": nodes,
        "episodes": episodes,
        "playbooks": playbooks,
        "handoffs": handoffs,
    }


def read_cockpit_nodes(
    tenant: str, config: FalkorDBConfig | None = None
) -> list[dict[str, Any]]:
    """Just the ``:ConceptNode`` rows for a tenant."""
    with span("cockpit.read_nodes"):
        with db.tenant_graph(tenant, config) as graph:
            return _read_nodes(graph)


def read_cockpit_edges(
    tenant: str, config: FalkorDBConfig | None = None
) -> list[dict[str, str]]:
    """The typed ``:ConceptNode`` → ``:ConceptNode`` relationships."""
    with span("cockpit.read_edges"):
        with db.tenant_graph(tenant, config) as graph:
            rows = _rows(graph, _EDGES_CYPHER)
    return [
        {"from": _text(row[0]), "to": _text(row[1]), "type": _text(row[2])}
        for row in rows
    ]
