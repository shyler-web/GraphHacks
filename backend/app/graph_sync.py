"""Track 01 (B1) — sync the graphify AST graph into FalkorDB ``code:<repoId>``.

Reads ``graphify-out/graph.json`` directly (no ``graphify`` runtime dependency)
and loads it into the named graph resolved by :func:`db.repo_graph_key` (D10) as
``(:File)``/``(:Symbol)`` nodes plus ``[:CALLS]``/``[:IMPORTS]``/``[:CONTAINS]``/
``[:INHERITS]`` edges. Every write is ``MERGE``-based, so re-running without
``reset=True`` is idempotent.

Only ``int`` values for ``LIMIT``/``*..N`` are ever inlined (and those live in
``falkor_action``, not here); every value in these queries is parameterised.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path

from pydantic import BaseModel

from . import db
from .config import FalkorDBConfig
from .observability import span

DEFAULT_REPO_ID = "graphhacks"

# graphify relation -> FalkorDB relationship type (B1 spec).
REL_MAP: dict[str, str] = {
    "calls": "CALLS",
    "indirect_call": "CALLS",
    "imports": "IMPORTS",
    "imports_from": "IMPORTS",
    "dynamic_import": "IMPORTS",
    "contains": "CONTAINS",
    "part_of": "CONTAINS",
    "defines": "CONTAINS",
    "implements": "INHERITS",
    "implemented_by": "INHERITS",
    "inherits": "INHERITS",
    "extends": "INHERITS",
}

# Test detection is a path/name heuristic over the graphify ``source_file``.
TEST_PATTERN = re.compile(
    r"(^|/)(tests?|__tests__)/|(^|/)verify[_-]|[._-](test|spec)\.[^.]+$|(^|/)test[._-]"
)

# Index the MERGE keys queried by ``falkor_action``.
INDEX_SPECS: list[tuple[str, str]] = [("File", "id"), ("Symbol", "id")]

# Batch size for the ``UNWIND`` writes.
BATCH = 500


def is_test_file(source_file: str | None) -> bool:
    """Return True when ``source_file`` looks like a test/verification file."""
    if not source_file:
        return False
    return bool(TEST_PATTERN.search(source_file))


class LoadStats(BaseModel):
    """Counts returned by :func:`load_graph`.

    ``elapsed_ms`` is the time spent inside ``graph.query`` only
    (``time.perf_counter`` deltas), per the Track 01 constraint.
    """

    files: int
    symbols: int
    tests: int
    edges: dict[str, int]
    nodes_total: int
    elapsed_ms: float


def _symbol_row(node_id: str, node: dict | None) -> dict:
    """Project a graphify node into the Symbol property row."""
    n = node or {}
    return {
        "id": node_id,
        "label": n.get("label"),
        "source_file": n.get("source_file"),
        "source_location": n.get("source_location"),
        "callable": bool(n.get("_callable")),
        "origin": n.get("_origin"),
        "community": n.get("community"),
    }


def load_graph(
    graph_path: Path,
    repo_id: str = DEFAULT_REPO_ID,
    config: FalkorDBConfig | None = None,
    reset: bool = False,
) -> LoadStats:
    """Load ``graph_path`` into ``code:<repo_id>`` and return :class:`LoadStats`.

    Node rule: one ``:File`` per distinct ``source_file``; one ``:Symbol`` for
    every ``file_type == "code"`` node and every endpoint of a mapped edge; a
    ``:Test`` label is added when :func:`is_test_file` matches. ``reset=True``
    clears the graph first; the default is ``MERGE``-only (idempotent).
    """
    data = json.loads(Path(graph_path).read_text(encoding="utf-8"))
    nodes = data.get("nodes", [])
    links = data.get("links", [])

    by_id: dict[str, dict] = {}
    files: set[str] = set()
    symbol_rows: dict[str, dict] = {}

    for node in nodes:
        node_id = node.get("id")
        if not node_id:
            continue
        by_id[node_id] = node
        source_file = node.get("source_file")
        if isinstance(source_file, str) and source_file:
            files.add(source_file)
        if node.get("file_type") == "code":
            symbol_rows[node_id] = _symbol_row(node_id, node)

    # Mapped edges may reference nodes that are not ``file_type == "code"``
    # (e.g. an imported module name); those still become ``:Symbol`` endpoints
    # so no edge dangles.
    edge_groups: dict[str, dict[tuple[str, str], dict]] = {}
    for link in links:
        rel = REL_MAP.get(link.get("relation"))
        if not rel:
            continue
        source, target = link.get("source"), link.get("target")
        if not source or not target:
            continue
        for node_id in (source, target):
            if node_id not in symbol_rows:
                symbol_rows[node_id] = _symbol_row(node_id, by_id.get(node_id))
                source_file = symbol_rows[node_id]["source_file"]
                if isinstance(source_file, str) and source_file:
                    files.add(source_file)
        edge_groups.setdefault(rel, {})[(source, target)] = {
            "source": source,
            "target": target,
        }

    symbol_list = list(symbol_rows.values())
    file_list = sorted(files)
    test_ids = [
        row["id"]
        for row in symbol_list
        if is_test_file(row["source_file"])
    ]
    contains_rows = [
        {"file_id": "file:" + row["source_file"], "id": row["id"]}
        for row in symbol_list
        if isinstance(row["source_file"], str) and row["source_file"]
    ]

    graph_key = db.repo_graph_key(repo_id)
    edges_loaded: dict[str, int] = {}
    elapsed_s = 0.0

    def run(graph, cypher: str, params: dict) -> object:
        nonlocal elapsed_s
        started = time.perf_counter()
        result = graph.query(cypher, params=params)
        elapsed_s += time.perf_counter() - started
        return result

    with span("track1.load_graph"):
        db.ensure_indexes(graph_key, INDEX_SPECS, config)
        with db.named_graph(graph_key, config) as graph:
            if reset:
                run(graph, "MATCH (n) DETACH DELETE n", {})

            for start in range(0, len(file_list), BATCH):
                chunk = file_list[start : start + BATCH]
                run(
                    graph,
                    "UNWIND $files AS p MERGE (f:File {id:'file:'+p}) SET f.path=p",
                    {"files": chunk},
                )

            for start in range(0, len(symbol_list), BATCH):
                chunk = symbol_list[start : start + BATCH]
                run(
                    graph,
                    """
                    UNWIND $symbols AS row MERGE (s:Symbol {id:row.id})
                    SET s.label=row.label, s.source_file=row.source_file,
                        s.source_location=row.source_location, s.callable=row.callable,
                        s.origin=row.origin, s.community=row.community
                    """,
                    {"symbols": chunk},
                )

            for start in range(0, len(contains_rows), BATCH):
                chunk = contains_rows[start : start + BATCH]
                run(
                    graph,
                    """
                    UNWIND $rows AS row
                    MATCH (f:File {id:row.file_id}) MATCH (s:Symbol {id:row.id})
                    MERGE (f)-[:CONTAINS]->(s)
                    """,
                    {"rows": chunk},
                )

            for start in range(0, len(test_ids), BATCH):
                chunk = test_ids[start : start + BATCH]
                run(
                    graph,
                    "UNWIND $test_ids AS tid MATCH (s:Symbol {id:tid}) SET s:Test",
                    {"test_ids": chunk},
                )

            for rel, pair_map in edge_groups.items():
                edge_list = list(pair_map.values())
                edges_loaded[rel] = len(edge_list)
                # ``rel`` comes from the fixed REL_MAP values, never user input.
                cypher = (
                    "UNWIND $edges AS e "
                    "MERGE (a:Symbol {id:e.source}) MERGE (b:Symbol {id:e.target}) "
                    f"MERGE (a)-[:{rel}]->(b)"
                )
                for start in range(0, len(edge_list), BATCH):
                    chunk = edge_list[start : start + BATCH]
                    run(graph, cypher, {"edges": chunk})

            count_result = run(graph, "MATCH (n) RETURN count(n)", {})
            nodes_total = int(count_result.result_set[0][0])

    return LoadStats(
        files=len(file_list),
        symbols=len(symbol_list),
        tests=len(test_ids),
        edges=edges_loaded,
        nodes_total=nodes_total,
        elapsed_ms=round(elapsed_s * 1000.0, 3),
    )
