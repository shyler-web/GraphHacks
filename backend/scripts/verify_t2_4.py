"""A2 (T2.4) exit criterion — procedural memory.

Run from `backend/`: `uv run python scripts/verify_t2_4.py`

Stores a 3-step workflow (twice, proving ``MERGE`` idempotency), asserts the
``START``/``NEXT_STEP`` chain, fetches it back, and replays it (twice) to prove
exactly one ``EXECUTED`` edge. Prints exactly
``workflow=1 steps=3 start=ingest`` and exits 0.
"""

from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import db  # noqa: E402
from app.config import FalkorDBConfig  # noqa: E402
from app.memory_service import TENANT_INDEX_SPECS, MemoryService  # noqa: E402
from app.models import SaveWorkflowInput, StepInput  # noqa: E402

TENANT = "t2-4-demo"
ACTIONS = ["ingest", "classify", "notify"]


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
    workflow = SaveWorkflowInput(
        id="wf-1",
        name="Atlas triage",
        trigger_domain="atlas",
        steps=[
            StepInput(order=i, action=action, expected_result=f"{action} done")
            for i, action in enumerate(ACTIONS)
        ],
        tool_ids=["tool-tavily"],
    )

    memory.save_workflow(TENANT, workflow)
    memory.save_workflow(TENANT, workflow)

    with db.tenant_graph(TENANT, cfg) as graph:
        workflows = int(scalar(graph, "MATCH (w:Workflow) RETURN count(w)"))
        steps = int(scalar(graph, "MATCH (s:Step) RETURN count(s)"))
        start = scalar(
            graph,
            "MATCH (:Workflow {id: 'wf-1'})-[:START]->(s:Step) RETURN s.action",
        )
        chain = int(scalar(graph, "MATCH (:Step)-[r:NEXT_STEP]->(:Step) RETURN count(r)"))
        uses = int(scalar(graph, "MATCH (:Workflow)-[:USES]->(:Tool) RETURN count(*)"))
    if workflows != 1:
        fail(f"save_workflow twice gave workflows={workflows}, expected 1")
    if steps != 3:
        fail(f"expected 3 steps, got {steps}")
    if start != "ingest":
        fail(f"START -> {start!r}, expected 'ingest'")
    if chain != 2:
        fail(f"NEXT_STEP chain length={chain}, expected 2")
    if uses != 1:
        fail(f"USES tool count={uses}, expected 1")

    # get_workflow: stored order preserved; unknown id -> None.
    fetched = memory.get_workflow(TENANT, "wf-1")
    if fetched is None:
        fail("get_workflow('wf-1') returned None")
    orders = [s.order for s in fetched.steps]
    actions = [s.action for s in fetched.steps]
    if orders != [0, 1, 2] or actions != ACTIONS:
        fail(f"get_workflow steps order={orders} actions={actions}")
    if memory.get_workflow(TENANT, "nope") is not None:
        fail("get_workflow('nope') did not return None")

    # replay_workflow: same order, exactly one EXECUTED edge; re-run stays 1.
    first = memory.replay_workflow(TENANT, "wf-1")
    if [s.order for s in first.steps] != [0, 1, 2]:
        fail(f"replay step order changed: {[s.order for s in first.steps]}")
    with db.tenant_graph(TENANT, cfg) as graph:
        executed = int(scalar(graph, "MATCH (:Agent)-[r:EXECUTED]->(:Workflow) RETURN count(r)"))
    if executed != 1:
        fail(f"after replay EXECUTED count={executed}, expected 1")

    memory.replay_workflow(TENANT, "wf-1")
    with db.tenant_graph(TENANT, cfg) as graph:
        executed = int(scalar(graph, "MATCH (:Agent)-[r:EXECUTED]->(:Workflow) RETURN count(r)"))
    if executed != 1:
        fail(f"after replay twice EXECUTED count={executed}, expected 1")

    print("workflow=1 steps=3 start=ingest")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
