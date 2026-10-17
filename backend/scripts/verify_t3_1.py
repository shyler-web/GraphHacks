"""A3 (T3.1) exit criterion — handoff ledger.

Run from `backend/`: `uv run python scripts/verify_t3_1.py`

Records the same handoff twice (proving the ledger node + ``HANDED_TO`` skeleton
edge are idempotent), then asserts the edge timestamp, default ``PENDING``
status, ``TARGETS`` entity, and every ``read_handoffs`` filter. Prints exactly
``handoffs=1 edge=1`` and exits 0.
"""

from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import db  # noqa: E402
from app.config import FalkorDBConfig  # noqa: E402
from app.memory_service import TENANT_INDEX_SPECS, MemoryService  # noqa: E402
from app.models import ReadHandoffsQuery, RecordHandoffInput  # noqa: E402

TENANT = "t3-1-demo"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def scalar(graph, cypher, params=None) -> object:
    result = graph.query(cypher, params=params or {})
    return result.result_set[0][0]


def main() -> int:
    cfg = FalkorDBConfig.from_env()

    with db.tenant_graph(TENANT, cfg) as graph:
        graph.query("MATCH (n) DETACH DELETE n")
    db.ensure_indexes(db.tenant_graph_key(TENANT), TENANT_INDEX_SPECS, cfg)

    memory = MemoryService(cfg)
    handoff = RecordHandoffInput(
        id="h-1",
        reason="needs research",
        from_agent_id="agent-researcher",
        to_agent_id="agent-planner",
        target_entity_id="e-atlas",
    )

    memory.record_handoff(TENANT, handoff)
    memory.record_handoff(TENANT, handoff)

    with db.tenant_graph(TENANT, cfg) as graph:
        handoffs = int(scalar(graph, "MATCH (h:Handoff) RETURN count(h)"))
        edges = int(
            scalar(graph, "MATCH (:Agent)-[r:HANDED_TO]->(:Agent) RETURN count(r)")
        )
        edge_at = scalar(graph, "MATCH (:Agent)-[r:HANDED_TO]->(:Agent) RETURN r.at")
        status = scalar(graph, "MATCH (h:Handoff {id: 'h-1'}) RETURN h.status")
        targets = int(
            scalar(
                graph,
                "MATCH (:Handoff {id: 'h-1'})-[:TARGETS]->(:Entity {id: 'e-atlas'}) "
                "RETURN count(*)",
            )
        )
    if handoffs != 1:
        fail(f"record_handoff twice gave handoffs={handoffs}, expected 1")
    if edges != 1:
        fail(f"record_handoff twice gave HANDED_TO edges={edges}, expected 1")
    if edge_at is None:
        fail("HANDED_TO.at is null")
    if status != "PENDING":
        fail(f"handoff status={status!r}, expected 'PENDING'")
    if targets != 1:
        fail(f"TARGETS -> e-atlas count={targets}, expected 1")

    # read_handoffs: unfiltered, by agent (either side), and the empty cases.
    if len(memory.read_handoffs(TENANT)) != 1:
        fail("read_handoffs() did not return exactly 1")
    if len(memory.read_handoffs(TENANT, ReadHandoffsQuery(agent_id="agent-researcher"))) != 1:
        fail("read_handoffs(agent_id=agent-researcher) did not return 1")
    if memory.read_handoffs(TENANT, ReadHandoffsQuery(agent_id="agent-other")) != []:
        fail("read_handoffs(agent_id=agent-other) returned rows, expected []")
    if memory.read_handoffs(TENANT, ReadHandoffsQuery(status="COMPLETED")) != []:
        fail("read_handoffs(status=COMPLETED) returned rows, expected []")

    print("handoffs=1 edge=1")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
