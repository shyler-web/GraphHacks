"""A1 (T2.3) exit criterion — semantic memory.

Run from `backend/`: `uv run python scripts/verify_t2_3.py`

Builds one Entity + one Fact (with ``HAS_FACT`` and ``DERIVED_FROM`` provenance),
re-writes both to prove ``MERGE`` idempotency, then exercises ``recall_facts`` and
``query_entities`` (including the empty-result cases). Prints exactly
``semantic=1 facts=1 source=ok`` and exits 0.
"""

from __future__ import annotations

import pathlib
import sys

# Make ``backend/`` importable when run as a script.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import db  # noqa: E402
from app.config import FalkorDBConfig  # noqa: E402
from app.memory_service import TENANT_INDEX_SPECS, MemoryService  # noqa: E402
from app.models import (  # noqa: E402
    QueryEntitiesQuery,
    RecallFactsQuery,
    UpsertEntityInput,
    UpsertFactInput,
    WriteTurnInput,
)

TENANT = "t2-3-demo"
STATEMENT = "Priya leads Project Atlas"


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

    # A1 Step 1: index the MERGE keys, then upsert the same entity twice.
    db.ensure_indexes(db.tenant_graph_key(TENANT), TENANT_INDEX_SPECS, cfg)

    memory = MemoryService(cfg)

    memory.upsert_entity(
        TENANT, UpsertEntityInput(id="e-atlas", name="Project Atlas", type="project")
    )
    memory.upsert_entity(
        TENANT, UpsertEntityInput(id="e-atlas", name="Project Atlas", type="project")
    )

    with db.tenant_graph(TENANT, cfg) as graph:
        entities = int(scalar(graph, "MATCH (e:Entity) RETURN count(e)"))
    if entities != 1:
        fail(f"upsert_entity twice gave entities={entities}, expected 1")

    # A1 Step 5: a source turn (with a topic) gives the fact its provenance.
    memory.write_turn(
        TENANT,
        WriteTurnInput(
            id="turn-src-1",
            role="user",
            text=STATEMENT,
            user_id="user-1",
            topic="atlas",
            mentions=["e-atlas"],
        ),
    )

    memory.upsert_fact(
        TENANT,
        UpsertFactInput(
            id="f-1",
            statement=STATEMENT,
            confidence=0.9,
            entity_id="e-atlas",
            source_turn="turn-src-1",
        ),
    )
    memory.upsert_fact(
        TENANT,
        UpsertFactInput(
            id="f-1",
            statement=STATEMENT,
            confidence=0.9,
            entity_id="e-atlas",
            source_turn="turn-src-1",
        ),
    )

    with db.tenant_graph(TENANT, cfg) as graph:
        facts = int(scalar(graph, "MATCH (f:Fact) RETURN count(f)"))
        has_fact = scalar(
            graph,
            "MATCH (:Entity {id: 'e-atlas'})-[:HAS_FACT]->(f:Fact) "
            "RETURN f.statement",
        )
        derived = int(
            scalar(
                graph,
                "MATCH (:Fact {id: 'f-1'})-[:DERIVED_FROM]->"
                "(:Turn {id: 'turn-src-1'}) RETURN count(*)",
            )
        )
    if facts != 1:
        fail(f"upsert_fact twice gave facts={facts}, expected 1")
    if has_fact != STATEMENT:
        fail(f"HAS_FACT returned {has_fact!r}, expected {STATEMENT!r}")
    if derived != 1:
        fail(f"DERIVED_FROM -> turn-src-1 count={derived}, expected 1")

    # A1 Step 7: recall + entity query paths, including the empty cases.
    by_entity = memory.recall_facts(TENANT, RecallFactsQuery(entity_id="e-atlas"))
    if len(by_entity) != 1 or by_entity[0].statement != STATEMENT:
        fail(f"recall_facts(entity_id=e-atlas) returned {len(by_entity)}")

    above_floor = memory.recall_facts(
        TENANT, RecallFactsQuery(entity_id="e-atlas", min_confidence=0.95)
    )
    if above_floor != []:
        fail(f"recall_facts(min_confidence=0.95) returned {len(above_floor)}, expected []")

    by_topic = memory.recall_facts(TENANT, RecallFactsQuery(topic="atlas"))
    if len(by_topic) != 1:
        fail(f"recall_facts(topic=atlas) returned {len(by_topic)}, expected 1")

    projects = memory.query_entities(TENANT, QueryEntitiesQuery(type="project"))
    if len(projects) != 1:
        fail(f"query_entities(type=project) returned {len(projects)}, expected 1")

    absent = memory.query_entities(TENANT, QueryEntitiesQuery(type="absent"))
    if absent != []:
        fail(f"query_entities(type=absent) returned {len(absent)}, expected []")

    print("semantic=1 facts=1 source=ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
