"""Track 01 exit criterion (B3) — graph_sync + action engine, end to end.

Run from ``backend/``::

    uv run python scripts/verify_track1.py

Loads ``graphify-out/graph.json`` into ``code:graphhacks`` twice (proving the
load is idempotent), then exercises ``blast_radius``/``hotspots``/
``shortest_dep_path`` against the live graph and asserts every
``DecisionTrace`` carries ``graph == "code:graphhacks"`` and ``elapsed_ms > 0``.
Prints ``TRACK1 OK`` and exits 0. With FalkorDB stopped the connection error
propagates and the process exits non-zero (rule 3).
"""

from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import db  # noqa: E402
from app.config import FalkorDBConfig  # noqa: E402
from app.falkor_action import ActionEngine  # noqa: E402
from app.graph_sync import DEFAULT_REPO_ID, is_test_file, load_graph  # noqa: E402

REPO_ID = DEFAULT_REPO_ID
GRAPH_JSON = (
    pathlib.Path(__file__).resolve().parents[2] / "graphify-out" / "graph.json"
)


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> int:
    cfg = FalkorDBConfig.from_env()

    # -- test detection (B1) ----------------------------------------------
    if is_test_file("scripts/verify_track1.py") is not True:
        fail("is_test_file('scripts/verify_track1.py') should be True")
    if is_test_file("assets/spec-card.js") is not False:
        fail("is_test_file('assets/spec-card.js') should be False")

    if not GRAPH_JSON.exists():
        fail(f"missing AST graph: {GRAPH_JSON}")

    # -- load #1 (reset) then load #2 (MERGE-only) ------------------------
    first = load_graph(GRAPH_JSON, REPO_ID, cfg, reset=True)
    print(
        f"load#1 files={first.files} symbols={first.symbols} tests={first.tests} "
        f"nodes={first.nodes_total} edges={first.edges}"
    )
    if first.files < 1:
        fail(f"load#1 files={first.files}")
    if first.symbols <= 0:
        fail(f"load#1 symbols={first.symbols}")
    if first.edges.get("CALLS", 0) <= 0:
        fail(f"load#1 CALLS={first.edges.get('CALLS')}")

    second = load_graph(GRAPH_JSON, REPO_ID, cfg, reset=False)
    print(
        f"load#2 files={second.files} symbols={second.symbols} tests={second.tests} "
        f"nodes={second.nodes_total} edges={second.edges}"
    )
    if (
        second.files,
        second.symbols,
        second.tests,
        second.edges,
        second.nodes_total,
    ) != (
        first.files,
        first.symbols,
        first.tests,
        first.edges,
        first.nodes_total,
    ):
        fail("load #2 changed counts — load is not idempotent")

    graph_key = db.repo_graph_key(REPO_ID)
    engine = ActionEngine(REPO_ID, cfg)

    # -- demo symbol ------------------------------------------------------
    demo = engine.demo_changed_symbol(REPO_ID)
    if not demo:
        fail("demo_changed_symbol returned empty")
    print(f"demo_symbol={demo}")

    # -- blast radius -----------------------------------------------------
    blast = engine.blast_radius(REPO_ID, demo, max_hops=2)
    buckets = {b.hop: b.ids for b in (blast.trace.hop_buckets or [])}
    if not buckets.get(1):
        fail(f"blast_radius hop1 empty for {demo}")
    if max(buckets) > 2:
        fail(f"blast_radius exceeded max_hops: {sorted(buckets)}")
    if "*1..2" not in blast.trace.cypher:
        fail(f"blast_radius cypher missing *1..2: {blast.trace.cypher}")
    if blast.trace.graph != graph_key:
        fail(f"blast_radius graph={blast.trace.graph!r}")
    if not blast.trace.elapsed_ms > 0:
        fail(f"blast_radius elapsed_ms={blast.trace.elapsed_ms}")
    print(
        f"blast_radius(hops=2): hop1={len(buckets.get(1, []))} "
        f"hop2={len(buckets.get(2, []))} rows={blast.trace.row_count}"
    )

    # -- hotspots ---------------------------------------------------------
    hot = engine.hotspots(REPO_ID, limit=5)
    if not 1 <= len(hot.data) <= 5:
        fail(f"hotspots returned {len(hot.data)} rows (want 1..5)")
    for row in hot.data:
        if not isinstance(row["score"], float):
            fail(f"hotspots score not numeric: {row!r}")
    if hot.trace.graph != graph_key:
        fail(f"hotspots graph={hot.trace.graph!r}")
    if not hot.trace.elapsed_ms > 0:
        fail(f"hotspots elapsed_ms={hot.trace.elapsed_ms}")
    top = hot.data[0]
    print(f"hotspots(top1): {top['id']} score={top['score']:.6f}")

    # -- shortest dependency path ----------------------------------------
    with db.named_graph(graph_key, cfg) as graph:
        target_result = graph.query(
            "MATCH (a:Symbol {id:$demo})-[:CALLS*1..4]->(b:Symbol) "
            "WHERE b.id <> $demo RETURN b.id AS id ORDER BY b.id LIMIT 1",
            {"demo": demo},
        )
    if not target_result.result_set:
        fail(f"no CALLS-reachable target from demo {demo}")
    target = str(target_result.result_set[0][0])

    sp = engine.shortest_dep_path(REPO_ID, demo, target, max_len=4)
    node_ids = sp.data["node_ids"]
    if len(node_ids) < 2:
        fail(f"shortest_dep_path {demo}->{target} returned {node_ids}")
    if node_ids[0] != demo or node_ids[-1] != target:
        fail(f"shortest_dep_path endpoints wrong: {node_ids}")
    if any(edge.type != "CALLS" for edge in sp.trace.edges):
        fail(f"shortest_dep_path has non-CALLS edge: {sp.trace.edges}")
    if sp.trace.graph != graph_key:
        fail(f"shortest_dep_path graph={sp.trace.graph!r}")
    if not sp.trace.elapsed_ms > 0:
        fail(f"shortest_dep_path elapsed_ms={sp.trace.elapsed_ms}")
    print(
        f"shortest_dep_path: {demo} -> {target} hops={len(node_ids) - 1}"
    )

    print("TRACK1 OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
