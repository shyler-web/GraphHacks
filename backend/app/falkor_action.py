"""Track 01 (B2) — the connected-data action engine over ``code:<repoId>``.

Each public action runs against the named graph (D10) and returns an
:class:`ActionResult` whose :class:`DecisionTrace` carries the exact Cypher, the
parameters, the node/edge evidence and the query time. This is the "explainable
answer" seam: the UI/cockpit can render the trace next to the result.

Only ``max_hops``/``limit``/``max_len`` are inlined into ``*..N``/``LIMIT``
(FalkorDB rejects parameters there); all three are validated ints in
``[1, 10]`` before interpolation and every other value is parameterised.
"""

from __future__ import annotations

import time
from typing import Literal

from pydantic import BaseModel

from . import db
from .config import FalkorDBConfig
from .graph_sync import DEFAULT_REPO_ID
from .observability import span

# Inlined-int bounds (B2): reject anything outside [1, 10].
MIN_INLINE = 1
MAX_INLINE = 10


def _inline_int(name: str, value: object) -> int:
    """Validate a value destined for ``LIMIT``/``*..N`` and return it as ``int``."""
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(
            f"{name} must be an int in [{MIN_INLINE}, {MAX_INLINE}], got {value!r}"
        )
    if value < MIN_INLINE or value > MAX_INLINE:
        raise ValueError(
            f"{name} must be in [{MIN_INLINE}, {MAX_INLINE}], got {value}"
        )
    return value


class EdgeRef(BaseModel):
    """One traversed relationship in a trace."""

    source: str
    target: str
    type: str


class HopBucket(BaseModel):
    """Affected symbol ids grouped by hop distance from the root."""

    hop: int
    ids: list[str]


class DecisionTrace(BaseModel):
    """Everything needed to explain how an action's result was derived."""

    action: Literal["blast_radius", "hotspots", "shortest_dep_path"]
    graph: str
    params: dict
    cypher: str
    node_ids: list[str]
    edges: list[EdgeRef]
    hop_buckets: list[HopBucket] | None
    row_count: int
    elapsed_ms: float


class ActionResult(BaseModel):
    """A derived result plus its decision trace."""

    data: object
    trace: DecisionTrace


class ActionEngine:
    """Track 01 actions over the ``code:<repoId>`` projection of FalkorDB."""

    def __init__(
        self, repo_id: str = DEFAULT_REPO_ID, config: FalkorDBConfig | None = None
    ) -> None:
        self.repo_id = repo_id
        self.config = config

    # -- helpers -----------------------------------------------------------

    def _query(self, graph, cypher: str, params: dict) -> tuple[object, float]:
        """Run one query and return ``(result, elapsed_ms)`` (query time only)."""
        started = time.perf_counter()
        result = graph.query(cypher, params=params)
        return result, (time.perf_counter() - started) * 1000.0

    # -- actions -----------------------------------------------------------

    def blast_radius(
        self, repo_id: str, symbol_id: str, max_hops: int = 3
    ) -> ActionResult:
        """Affected symbols that (transitively) CALL ``symbol_id``, hop-bucketed."""
        hops = _inline_int("max_hops", max_hops)
        graph_key = db.repo_graph_key(repo_id)
        params = {"symbolId": symbol_id}
        cypher_nodes = f"""
            MATCH p=(root:Symbol {{id:$symbolId}})<-[:CALLS*1..{hops}]-(affected:Symbol)
            WHERE affected.id <> $symbolId
            WITH affected, min(length(p)) AS hops
            RETURN affected.id AS id, affected.label AS label,
                   affected.source_file AS file, (affected:Test) AS is_test, hops
            ORDER BY hops ASC, id ASC
        """
        cypher_edges = f"""
            MATCH p=(root:Symbol {{id:$symbolId}})<-[:CALLS*1..{hops}]-(:Symbol)
            UNWIND relationships(p) AS r
            RETURN DISTINCT startNode(r).id AS source, endNode(r).id AS target,
                   type(r) AS type
        """

        elapsed_ms = 0.0
        with span("track1.blast_radius"):
            with db.named_graph(graph_key, self.config) as graph:
                node_result, ms = self._query(graph, cypher_nodes, params)
                elapsed_ms += ms
                edge_result, ms = self._query(graph, cypher_edges, params)
                elapsed_ms += ms

        rows = [
            {
                "id": r[0],
                "label": r[1],
                "file": r[2],
                "is_test": bool(r[3]),
                "hops": int(r[4]),
            }
            for r in node_result.result_set
        ]
        edge_rows = [
            EdgeRef(source=r[0], target=r[1], type=r[2])
            for r in edge_result.result_set
        ]

        buckets: dict[int, list[str]] = {}
        for row in rows:
            buckets.setdefault(row["hops"], []).append(row["id"])
        hop_buckets = [
            HopBucket(hop=hop, ids=sorted(ids)) for hop, ids in sorted(buckets.items())
        ]

        trace = DecisionTrace(
            action="blast_radius",
            graph=graph_key,
            params={"repo_id": repo_id, "symbol_id": symbol_id, "max_hops": hops},
            cypher=cypher_nodes.strip(),
            node_ids=[row["id"] for row in rows],
            edges=edge_rows,
            hop_buckets=hop_buckets,
            row_count=len(rows),
            elapsed_ms=round(elapsed_ms, 3),
        )
        return ActionResult(data=rows, trace=trace)

    def hotspots(self, repo_id: str, limit: int = 10) -> ActionResult:
        """Top CALLS-PageRank symbols (load-bearing code, by centrality)."""
        top = _inline_int("limit", limit)
        graph_key = db.repo_graph_key(repo_id)
        cypher = (
            "CALL algo.pageRank('Symbol','CALLS') YIELD node, score "
            "WITH node, score "
            "WHERE node.source_file IS NOT NULL AND node.source_file <> '' "
            "RETURN node.id AS id, node.label AS label, node.source_file AS file, "
            f"score ORDER BY score DESC LIMIT {top}"
        )

        with span("track1.hotspots"):
            with db.named_graph(graph_key, self.config) as graph:
                result, elapsed_ms = self._query(graph, cypher, {})

        rows = [
            {"id": r[0], "label": r[1], "file": r[2], "score": float(r[3])}
            for r in result.result_set
        ]
        trace = DecisionTrace(
            action="hotspots",
            graph=graph_key,
            params={"repo_id": repo_id, "limit": top},
            cypher=cypher,
            node_ids=[row["id"] for row in rows],
            edges=[],
            hop_buckets=None,
            row_count=len(rows),
            elapsed_ms=round(elapsed_ms, 3),
        )
        return ActionResult(data=rows, trace=trace)

    def shortest_dep_path(
        self,
        repo_id: str,
        symbol_id: str,
        target_id: str,
        max_len: int = 6,
    ) -> ActionResult:
        """Shortest directed CALLS path from ``symbol_id`` to ``target_id``.

        Primary: FalkorDB ``algo.SPpaths`` (native); fallback: Cypher
        ``shortestPath()`` when the algorithm call yields no path/errors.
        """
        length = _inline_int("max_len", max_len)
        graph_key = db.repo_graph_key(repo_id)
        params = {"source": symbol_id, "target": target_id}
        cypher_primary = f"""
            MATCH (a:Symbol {{id:$source}}), (b:Symbol {{id:$target}})
            CALL algo.SPpaths({{sourceNode:a, targetNode:b, relTypes:['CALLS'],
                relDirection:'outgoing', maxLen:{length}, pathCount:1}}) YIELD path
            RETURN [n IN nodes(path) | n.id] AS node_ids,
                   [r IN relationships(path) | type(r)] AS edge_types
        """
        cypher_fallback = f"""
            MATCH (a:Symbol {{id:$source}}), (b:Symbol {{id:$target}})
            WITH shortestPath((a)-[:CALLS*1..{length}]->(b)) AS p
            RETURN [n IN nodes(p) | n.id] AS node_ids,
                   [r IN relationships(p) | type(r)] AS edge_types
        """

        elapsed_ms = 0.0
        node_ids: list[str] = []
        edge_types: list[str] = []
        used_cypher = cypher_primary.strip()
        with span("track1.shortest_dep_path"):
            with db.named_graph(graph_key, self.config) as graph:
                primary_result = None
                try:
                    primary_result, ms = self._query(graph, cypher_primary, params)
                    elapsed_ms += ms
                except Exception:  # algorithm unavailable / unsupported signature
                    primary_result = None
                if primary_result is not None and primary_result.result_set:
                    node_ids = list(primary_result.result_set[0][0])
                    edge_types = list(primary_result.result_set[0][1])
                else:
                    fallback_result, ms = self._query(graph, cypher_fallback, params)
                    elapsed_ms += ms
                    used_cypher = cypher_fallback.strip()
                    if fallback_result.result_set:
                        node_ids = list(fallback_result.result_set[0][0])
                        edge_types = list(fallback_result.result_set[0][1])

        edges = [
            EdgeRef(source=node_ids[i], target=node_ids[i + 1], type=edge_types[i])
            for i in range(len(edge_types))
            if i + 1 < len(node_ids)
        ]
        trace = DecisionTrace(
            action="shortest_dep_path",
            graph=graph_key,
            params={
                "repo_id": repo_id,
                "symbol_id": symbol_id,
                "target_id": target_id,
                "max_len": length,
            },
            cypher=used_cypher,
            node_ids=node_ids,
            edges=edges,
            hop_buckets=None,
            row_count=len(node_ids),
            elapsed_ms=round(elapsed_ms, 3),
        )
        data = {"node_ids": node_ids, "edge_types": edge_types}
        return ActionResult(data=data, trace=trace)

    def demo_changed_symbol(self, repo_id: str) -> str:
        """Pick a deterministic symbol with callers (and, if possible, callees).

        Returning a callee guarantees ``blast_radius`` is non-empty; preferring a
        node that also calls onward guarantees ``shortest_dep_path`` is non-empty.
        """
        graph_key = db.repo_graph_key(repo_id)
        cypher = """
            MATCH (s:Symbol)
            WHERE s.source_file IS NOT NULL AND s.source_file <> ''
            OPTIONAL MATCH (caller:Symbol)-[:CALLS]->(s)
            OPTIONAL MATCH (s)-[:CALLS]->(callee:Symbol)
            WITH s, count(DISTINCT caller) AS callers, count(DISTINCT callee) AS callees
            WHERE callers > 0
            RETURN s.id AS id
            ORDER BY (CASE WHEN callees > 0 THEN 1 ELSE 0 END) DESC,
                     callers DESC, s.id ASC
            LIMIT 1
        """
        with span("track1.demo_changed_symbol"):
            with db.named_graph(graph_key, self.config) as graph:
                result = graph.query(cypher)
        if not result.result_set:
            return ""
        return str(result.result_set[0][0])
