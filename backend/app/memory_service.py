"""Memory Service — episodic tier (T2.2 parity with the Node reference).

Implements ``write_turn`` and ``recall_turns`` from
``docs/contracts/memory-service.md`` against a real FalkorDB instance, matching
``dump/node-backend/server/memory/service.ts``:

* same node/edge vocabulary (``:User``/``:Agent``/``:Session``/``:Topic``/``:Entity``
  and the ``PARTICIPATED``/``PRODUCED``/``IN_SESSION``/``ABOUT``/``MENTIONS`` edges);
* same ``MERGE``-based idempotency (a re-write of the same turn id is a no-op);
* same tenant graph key ``tenant:<tenantId>`` (D5).

Every other ``MemoryService`` method is a stub until T2.3/T2.4.
"""

from __future__ import annotations

import time
import uuid

from . import db
from .config import FalkorDBConfig
from .models import (
    Entity,
    Fact,
    Handoff,
    QueryEntitiesQuery,
    ReadHandoffsQuery,
    RecallFactsQuery,
    RecallTurnsQuery,
    RecordHandoffInput,
    SaveWorkflowInput,
    TenantId,
    Turn,
    UpsertEntityInput,
    UpsertFactInput,
    Workflow,
    WorkflowReplay,
    WriteTurnInput,
)
from .observability import span

NOT_IMPLEMENTED = "not implemented yet (T2.3/T2.4)"

# Cypher parameter values used by the episodic tier.
Params = dict[str, object]


class MemoryService:
    """The single boundary for all memory tiers (contract §4)."""

    def __init__(self, config: FalkorDBConfig | None = None) -> None:
        # ``None`` means "resolve from the environment on each call", so the
        # service stays cheap to construct in tests and scripts.
        self._config = config

    # -----------------------------------------------------------------------
    # Episodic (T2.2)
    # -----------------------------------------------------------------------

    def write_turn(self, tenant: TenantId, data: WriteTurnInput) -> Turn:
        """Persist one episodic event and link it to actor/session/topic/entities.

        Idempotent on ``id``: the ``:Turn`` is ``MERGE``d by id and its core
        properties are set only ``ON CREATE`` (contract §2).
        """
        turn_id = data.id or str(uuid.uuid4())
        timestamp = data.timestamp if data.timestamp is not None else int(time.time())
        role = data.role
        mentions = data.mentions or []

        clauses: list[str] = []
        params: Params = {
            "id": turn_id,
            "timestamp": timestamp,
            "role": role,
            "text": data.text,
        }

        # Actor: user turns participate, agent turns produce (ambiguity A5).
        if role == "user" and data.user_id:
            clauses.append("MERGE (actor:User {id: $userId})")
            params["userId"] = data.user_id
        elif role == "agent" and data.agent_id:
            clauses.append("MERGE (actor:Agent {id: $agentId})")
            params["agentId"] = data.agent_id

        if data.session_id:
            clauses.append("MERGE (session:Session {id: $sessionId})")
            params["sessionId"] = data.session_id
        if data.topic:
            clauses.append("MERGE (topic:Topic {name: $topic})")
            params["topic"] = data.topic
        for i, entity_id in enumerate(mentions):
            clauses.append(f"MERGE (entity{i}:Entity {{id: $entity{i}}})")
            params[f"entity{i}"] = entity_id

        clauses.append(
            "MERGE (t:Turn {id: $id}) "
            "ON CREATE SET t.timestamp = $timestamp, t.role = $role, t.text = $text"
        )
        if data.response_quality is not None:
            clauses.append("SET t.response_quality = $responseQuality")
            params["responseQuality"] = data.response_quality

        if role == "user" and data.user_id:
            clauses.append("MERGE (actor)-[:PARTICIPATED]->(t)")
        elif role == "agent" and data.agent_id:
            clauses.append("MERGE (actor)-[:PRODUCED]->(t)")
        if data.session_id:
            clauses.append("MERGE (t)-[:IN_SESSION]->(session)")
        if data.topic:
            clauses.append("MERGE (t)-[:ABOUT]->(topic)")
        for i in range(len(mentions)):
            clauses.append(f"MERGE (t)-[:MENTIONS]->(entity{i})")

        with span("memory.write_turn"):
            with db.tenant_graph(tenant, self._config) as graph:
                graph.query("\n".join(clauses), params=params)

        turn = Turn(id=turn_id, timestamp=timestamp, role=role, text=data.text)
        if data.response_quality is not None:
            turn.response_quality = data.response_quality
        if data.session_id:
            turn.session_id = data.session_id
        if data.user_id:
            turn.user_id = data.user_id
        if data.agent_id:
            turn.agent_id = data.agent_id
        if data.topic:
            turn.topic = data.topic
        if mentions:
            turn.mentions = mentions
        return turn

    def recall_turns(
        self, tenant: TenantId, query: RecallTurnsQuery | None = None
    ) -> list[Turn]:
        """Read episodic history, newest-first by default, optionally filtered."""
        q = query or RecallTurnsQuery()
        direction = "ASC" if q.order == "asc" else "DESC"

        clauses: list[str] = ["MATCH (t:Turn)"]
        params: Params = {}

        if q.session_id:
            clauses.append("MATCH (t)-[:IN_SESSION]->(:Session {id: $sessionId})")
            params["sessionId"] = q.session_id
        if q.topic:
            clauses.append("MATCH (t)-[:ABOUT]->(:Topic {name: $topic})")
            params["topic"] = q.topic
        if q.user_id:
            clauses.append("MATCH (:User {id: $userId})-[:PARTICIPATED]->(t)")
            params["userId"] = q.user_id

        # Linkage fields are optional on `Turn`; OPTIONAL MATCH keeps turns that
        # lack any one of them. `mentions` is collected so multiple edges do not
        # multiply rows.
        clauses.extend(
            [
                "OPTIONAL MATCH (u:User)-[:PARTICIPATED]->(t)",
                "OPTIONAL MATCH (a:Agent)-[:PRODUCED]->(t)",
                "OPTIONAL MATCH (t)-[:IN_SESSION]->(s:Session)",
                "OPTIONAL MATCH (t)-[:ABOUT]->(tp:Topic)",
                "OPTIONAL MATCH (t)-[:MENTIONS]->(e:Entity)",
                "RETURN t.id AS id, t.timestamp AS timestamp, t.role AS role, "
                "t.text AS text, t.response_quality AS responseQuality, "
                "u.id AS userId, a.id AS agentId, s.id AS sessionId, "
                "tp.name AS topic, collect(e.id) AS mentions",
                f"ORDER BY t.timestamp {direction}, t.id {direction}",
            ]
        )
        if q.limit is not None:
            # FalkorDB does not accept parameters in LIMIT; `limit` is a
            # validated int, so inlining it is injection-safe.
            clauses.append(f"LIMIT {int(q.limit)}")

        with span("memory.recall_turns"):
            with db.tenant_graph(tenant, self._config) as graph:
                result = graph.query("\n".join(clauses), params=params)
        rows = result.result_set or []

        turns: list[Turn] = []
        for row in rows:
            (
                turn_id,
                timestamp,
                role,
                text,
                response_quality,
                user_id,
                agent_id,
                session_id,
                topic,
                mentions_raw,
            ) = row

            turn = Turn(
                id=turn_id,
                timestamp=timestamp,
                role=role,
                text=text,
            )
            if response_quality is not None:
                turn.response_quality = response_quality
            if user_id is not None:
                turn.user_id = user_id
            if agent_id is not None:
                turn.agent_id = agent_id
            if session_id is not None:
                turn.session_id = session_id
            if topic is not None:
                turn.topic = topic
            mentions = [m for m in (mentions_raw or []) if m is not None]
            if mentions:
                turn.mentions = mentions
            turns.append(turn)
        return turns

    # -----------------------------------------------------------------------
    # Semantic (T2.3) — stubs
    # -----------------------------------------------------------------------

    def upsert_entity(self, tenant: TenantId, data: UpsertEntityInput) -> Entity:
        raise NotImplementedError(NOT_IMPLEMENTED)

    def upsert_fact(self, tenant: TenantId, data: UpsertFactInput) -> Fact:
        raise NotImplementedError(NOT_IMPLEMENTED)

    def recall_facts(self, tenant: TenantId, query: RecallFactsQuery) -> list[Fact]:
        raise NotImplementedError(NOT_IMPLEMENTED)

    def query_entities(
        self, tenant: TenantId, query: QueryEntitiesQuery
    ) -> list[Entity]:
        raise NotImplementedError(NOT_IMPLEMENTED)

    # -----------------------------------------------------------------------
    # Procedural (T2.4) — stubs
    # -----------------------------------------------------------------------

    def save_workflow(self, tenant: TenantId, data: SaveWorkflowInput) -> Workflow:
        raise NotImplementedError(NOT_IMPLEMENTED)

    def get_workflow(self, tenant: TenantId, workflow_id: str) -> Workflow | None:
        raise NotImplementedError(NOT_IMPLEMENTED)

    def replay_workflow(self, tenant: TenantId, workflow_id: str) -> WorkflowReplay:
        raise NotImplementedError(NOT_IMPLEMENTED)

    # -----------------------------------------------------------------------
    # Coordination (T3.1) — stubs
    # -----------------------------------------------------------------------

    def record_handoff(self, tenant: TenantId, data: RecordHandoffInput) -> Handoff:
        raise NotImplementedError(NOT_IMPLEMENTED)

    def read_handoffs(
        self, tenant: TenantId, query: ReadHandoffsQuery | None = None
    ) -> list[Handoff]:
        raise NotImplementedError(NOT_IMPLEMENTED)
