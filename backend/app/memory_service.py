"""Memory Service — all four tiers (contract ``docs/contracts/memory-service.md``).

Implements the full ``MemoryService`` boundary against a real FalkorDB instance,
matching ``dump/node-backend/server/memory/service.ts``:

* same node/edge vocabulary (``:User``/``:Agent``/``:Session``/``:Topic``/``:Entity``
  /``:Fact``/``:Workflow``/``:Step``/``:Tool``/``:Handoff`` and the contract §2 edges);
* same ``MERGE``-based idempotency (a re-write of the same id is a no-op);
* same tenant graph key ``tenant:<tenantId>`` (D5).

Covers episodic (T2.2), semantic (T2.3), procedural (T2.4), and coordination
(T3.1). Contract resolutions A3/A4 (the edge is the provenance source of truth),
A6 (both the handoff node and edge), A9 (derived ``Step.id``) and A10 (replay
executor) are applied here.
"""

from __future__ import annotations

import threading
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
    Step,
    TenantId,
    Turn,
    UpsertEntityInput,
    UpsertFactInput,
    Workflow,
    WorkflowReplay,
    WriteTurnInput,
)
from .observability import span

# Cypher parameter values used by the memory tiers.
Params = dict[str, object]

# MERGE-key properties indexed per tenant graph (contract §2). ``CREATE INDEX``
# is not idempotent in FalkorDB, so :func:`db.ensure_indexes` tolerates the
# "already indexed" ``ResponseError``.
TENANT_INDEX_SPECS: list[tuple[str, str]] = [
    ("User", "id"),
    ("Session", "id"),
    ("Turn", "id"),
    ("Entity", "id"),
    ("Fact", "id"),
    ("Topic", "name"),
    ("Tool", "id"),
    ("Workflow", "id"),
    ("Step", "id"),
    ("Agent", "id"),
    ("Handoff", "id"),
]

# Provision each tenant's indexes at most once per process; the lock keeps the
# memo safe when a single service instance is shared across writer threads.
_INDEX_LOCK = threading.Lock()
_INDEXED_TENANTS: set[str] = set()

# FalkorDB rejects parameters in ``LIMIT``, so the value has to be inlined. Keep
# every caller bounded so a hostile/overflowing value can never reach Cypher.
MIN_LIMIT = 1
MAX_LIMIT = 1000


def _clamp_limit(value: object, lo: int = MIN_LIMIT, hi: int = MAX_LIMIT) -> int | None:
    """Coerce a query ``limit`` into ``[lo, hi]`` (``None`` means "no limit")."""
    if value is None:
        return None
    try:
        parsed = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        parsed = lo
    return max(lo, min(hi, parsed))


def _node_properties(value: object) -> dict[str, object] | None:
    """Return a node's property map, tolerating dict/node client shapes."""
    if isinstance(value, dict):
        return value
    props = getattr(value, "properties", None)
    if isinstance(props, dict):
        return props
    return None


class MemoryService:
    """The single boundary for all memory tiers (contract §4)."""

    def __init__(self, config: FalkorDBConfig | None = None) -> None:
        # ``None`` means "resolve from the environment on each call", so the
        # service stays cheap to construct in tests and scripts.
        self._config = config

    def _ensure_tenant_indexes(self, tenant: TenantId) -> None:
        """Idempotently index this tenant's MERGE keys (once per process)."""
        with _INDEX_LOCK:
            if tenant in _INDEXED_TENANTS:
                return
            db.ensure_indexes(
                db.tenant_graph_key(tenant), TENANT_INDEX_SPECS, self._config
            )
            _INDEXED_TENANTS.add(tenant)

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
        limit = _clamp_limit(q.limit)
        if limit is not None:
            # FalkorDB does not accept parameters in LIMIT; ``_clamp_limit``
            # guarantees a bounded int before it is inlined.
            clauses.append(f"LIMIT {limit}")

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
    # Semantic (T2.3)
    # -----------------------------------------------------------------------

    def upsert_entity(self, tenant: TenantId, data: UpsertEntityInput) -> Entity:
        """Idempotently create/update a semantic :Entity keyed by ``id``."""
        entity_id = data.id or str(uuid.uuid4())
        self._ensure_tenant_indexes(tenant)

        clauses = [
            "MERGE (e:Entity {id: $id}) ON CREATE SET e.name = $name, e.type = $type"
        ]
        params: Params = {"id": entity_id, "name": data.name, "type": data.type}
        if data.embedding is not None:
            clauses.append("SET e.embedding = $embedding")
            params["embedding"] = data.embedding

        with span("memory.upsert_entity"):
            with db.tenant_graph(tenant, self._config) as graph:
                graph.query("\n".join(clauses), params=params)

        return Entity(
            id=entity_id,
            name=data.name,
            type=data.type,
            embedding=data.embedding,
        )

    def upsert_fact(self, tenant: TenantId, data: UpsertFactInput) -> Fact:
        """Persist an assertion on its entity; ``DERIVED_FROM`` is provenance (A3)."""
        fact_id = data.id or str(uuid.uuid4())
        self._ensure_tenant_indexes(tenant)

        clauses = [
            "MERGE (e:Entity {id: $entityId})",
            "MERGE (f:Fact {id: $id}) ON CREATE SET f.statement = $statement",
            "SET f.confidence = $confidence",
            "MERGE (e)-[:HAS_FACT]->(f)",
        ]
        params: Params = {
            "id": fact_id,
            "statement": data.statement,
            "confidence": data.confidence,
            "entityId": data.entity_id,
        }
        if data.source_turn:
            # Bind the Turn first: FalkorDB's ``MERGE (f)-[:REL]->(:Turn {id})``
            # creates a duplicate anonymous node when the Turn already exists but
            # the edge does not (probed live). ``MERGE`` on the bound node matches.
            clauses.append("MERGE (st:Turn {id: $sourceTurn})")
            clauses.append("MERGE (f)-[:DERIVED_FROM]->(st)")
            params["sourceTurn"] = data.source_turn

        with span("memory.upsert_fact"):
            with db.tenant_graph(tenant, self._config) as graph:
                graph.query("\n".join(clauses), params=params)

        return Fact(
            id=fact_id,
            statement=data.statement,
            confidence=data.confidence,
            entity_id=data.entity_id,
            source_turn=data.source_turn,
        )

    def recall_facts(self, tenant: TenantId, query: RecallFactsQuery) -> list[Fact]:
        """Read facts, optionally scoped by entity/topic and a confidence floor."""
        q = query or RecallFactsQuery()
        clauses = ["MATCH (f:Fact)"]
        params: Params = {}

        if q.entity_id:
            clauses.append("MATCH (:Entity {id: $entityId})-[:HAS_FACT]->(f)")
            params["entityId"] = q.entity_id
        if q.topic:
            clauses.append(
                "MATCH (f)-[:DERIVED_FROM]->(:Turn)-[:ABOUT]->(:Topic {name: $topic})"
            )
            params["topic"] = q.topic
        if q.min_confidence is not None:
            clauses.append("WHERE f.confidence >= $minConfidence")
            params["minConfidence"] = q.min_confidence

        clauses.extend(
            [
                "OPTIONAL MATCH (e:Entity)-[:HAS_FACT]->(f)",
                "OPTIONAL MATCH (f)-[:DERIVED_FROM]->(st:Turn)",
                "WITH f, collect(DISTINCT e.id) AS entityIds, "
                "collect(DISTINCT st.id) AS sourceTurns",
                "RETURN f.id AS id, f.statement AS statement, "
                "f.confidence AS confidence, entityIds, sourceTurns",
                "ORDER BY f.confidence DESC, f.id ASC",
            ]
        )
        limit = _clamp_limit(q.limit)
        if limit is not None:
            clauses.append(f"LIMIT {limit}")

        with span("memory.recall_facts"):
            with db.tenant_graph(tenant, self._config) as graph:
                result = graph.query("\n".join(clauses), params=params)

        facts: list[Fact] = []
        for row in result.result_set or []:
            fact_id, statement, confidence, entity_ids, source_turns = row
            eids = [e for e in (entity_ids or []) if e is not None]
            sts = [s for s in (source_turns or []) if s is not None]
            facts.append(
                Fact(
                    id=fact_id,
                    statement=statement,
                    confidence=confidence,
                    entity_id=(eids[0] if eids else None),
                    source_turn=(sts[0] if sts else None),
                )
            )
        return facts

    def query_entities(
        self, tenant: TenantId, query: QueryEntitiesQuery
    ) -> list[Entity]:
        """Look up entities by name and/or type (unknown target → ``[]``)."""
        q = query or QueryEntitiesQuery()
        clauses = ["MATCH (e:Entity)"]
        params: Params = {}
        filters: list[str] = []
        if q.name is not None:
            filters.append("e.name = $name")
            params["name"] = q.name
        if q.type is not None:
            filters.append("e.type = $type")
            params["type"] = q.type
        if filters:
            clauses.append("WHERE " + " AND ".join(filters))
        clauses.append("RETURN e.id AS id, e.name AS name, e.type AS type")
        clauses.append("ORDER BY e.name ASC, e.id ASC")
        limit = _clamp_limit(q.limit)
        if limit is not None:
            clauses.append(f"LIMIT {limit}")

        with span("memory.query_entities"):
            with db.tenant_graph(tenant, self._config) as graph:
                result = graph.query("\n".join(clauses), params=params)

        return [
            Entity(id=row[0], name=row[1], type=row[2])
            for row in (result.result_set or [])
        ]

    # -----------------------------------------------------------------------
    # Procedural (T2.4)
    # -----------------------------------------------------------------------

    def save_workflow(self, tenant: TenantId, data: SaveWorkflowInput) -> Workflow:
        """Idempotently store a step sequence + its tools/learned-from handoff."""
        workflow_id = data.id or str(uuid.uuid4())
        self._ensure_tenant_indexes(tenant)
        steps = sorted(data.steps, key=lambda s: s.order)

        clauses = [
            "MERGE (w:Workflow {id: $id}) "
            "ON CREATE SET w.name = $name, w.trigger_domain = $domain"
        ]
        params: Params = {
            "id": workflow_id,
            "name": data.name,
            "domain": data.trigger_domain,
        }

        step_ids: list[str] = []
        for i, step in enumerate(steps):
            # A9: derive a stable Step.id when the caller omits one.
            step_id = step.id or f"{workflow_id}:step:{step.order}"
            step_ids.append(step_id)
            clauses.append(
                f"MERGE (s{i}:Step {{id: $stepId{i}}}) "
                f"SET s{i}.order = $stepOrder{i}, s{i}.action = $stepAction{i}, "
                f"s{i}.expected_result = $stepExpected{i}"
            )
            params[f"stepId{i}"] = step_id
            params[f"stepOrder{i}"] = step.order
            params[f"stepAction{i}"] = step.action
            params[f"stepExpected{i}"] = step.expected_result

        if steps:
            clauses.append("MERGE (w)-[:START]->(s0)")
            for i in range(1, len(steps)):
                clauses.append(
                    f"MERGE (s{i - 1})-[:NEXT_STEP {{order: $stepOrder{i}}}]->(s{i})"
                )

        for i, tool_id in enumerate(data.tool_ids or []):
            clauses.append(f"MERGE (tool{i}:Tool {{id: $toolId{i}}})")
            clauses.append(f"MERGE (w)-[:USES]->(tool{i})")
            params[f"toolId{i}"] = tool_id

        if data.learned_from:
            # A4: the edge is the source of truth for provenance.
            clauses.append("MERGE (h:Handoff {id: $learnedFrom})")
            clauses.append("MERGE (w)-[:LEARNED_FROM]->(h)")
            params["learnedFrom"] = data.learned_from

        with span("memory.save_workflow"):
            with db.tenant_graph(tenant, self._config) as graph:
                # Drop the workflow's previous step chain (START + NEXT_STEP and
                # the now-orphaned :Step nodes) so a shorter/changed step list
                # cannot leave a stale tail behind. Bounded traversal.
                graph.query(
                    "MATCH (w:Workflow {id: $id}) "
                    "OPTIONAL MATCH (w)-[:START]->(s0:Step) "
                    "OPTIONAL MATCH (s0)-[:NEXT_STEP*0..100]->(s:Step) "
                    "WITH collect(DISTINCT s) AS oldSteps "
                    "UNWIND oldSteps AS st DETACH DELETE st",
                    params={"id": workflow_id},
                )
                graph.query("\n".join(clauses), params=params)

        return Workflow(
            id=workflow_id,
            name=data.name,
            trigger_domain=data.trigger_domain,
            learned_from=data.learned_from,
            steps=[
                Step(
                    id=step_id,
                    order=step.order,
                    action=step.action,
                    expected_result=step.expected_result,
                )
                for step_id, step in zip(step_ids, steps)
            ],
            tool_ids=data.tool_ids,
        )

    def get_workflow(self, tenant: TenantId, workflow_id: str) -> Workflow | None:
        """Fetch a stored workflow + ordered steps; unknown id → ``None``."""
        cypher = (
            "MATCH (w:Workflow {id: $id})\n"
            "OPTIONAL MATCH (w)-[:START]->(s0)\n"
            "OPTIONAL MATCH (s0)-[:NEXT_STEP*0..100]->(s:Step)\n"
            "OPTIONAL MATCH (w)-[:USES]->(t:Tool)\n"
            "WITH w, collect(DISTINCT s) AS steps, collect(DISTINCT t.id) AS toolIds\n"
            "RETURN w.name AS name, w.trigger_domain AS domain, steps, toolIds"
        )
        with span("memory.get_workflow"):
            with db.tenant_graph(tenant, self._config) as graph:
                result = graph.query(cypher, params={"id": workflow_id})

        rows = result.result_set or []
        if not rows:
            return None

        name, domain, steps_raw, tool_ids_raw = rows[0]
        steps: list[Step] = []
        for node in steps_raw or []:
            props = _node_properties(node)
            if props is None:
                continue
            steps.append(
                Step(
                    id=str(props.get("id")),
                    order=int(props.get("order", 0)),
                    action=str(props.get("action", "")),
                    expected_result=props.get("expected_result"),
                )
            )
        steps.sort(key=lambda s: s.order)
        tool_ids = [t for t in (tool_ids_raw or []) if t is not None]

        return Workflow(
            id=workflow_id,
            name=name,
            trigger_domain=domain,
            steps=steps,
            tool_ids=tool_ids or None,
        )

    def replay_workflow(self, tenant: TenantId, workflow_id: str) -> WorkflowReplay:
        """Re-run a *fetched* workflow and record one ``EXECUTED`` edge (A10)."""
        workflow = self.get_workflow(tenant, workflow_id)
        if workflow is None:
            raise ValueError(f"workflow not found: {workflow_id}")

        now = int(time.time())
        with span("memory.replay_workflow"):
            with db.tenant_graph(tenant, self._config) as graph:
                # A10: executor = the agent that owns the learned-from handoff,
                # else a synthetic replay agent.
                owner_result = graph.query(
                    "MATCH (w:Workflow {id: $id}) "
                    "OPTIONAL MATCH (w)-[:LEARNED_FROM]->(:Handoff)"
                    "-[:FROM_AGENT]->(o:Agent) "
                    "RETURN o.id AS ownerId",
                    params={"id": workflow_id},
                )
                owner_rows = owner_result.result_set or []
                agent_id = (
                    owner_rows[0][0] if owner_rows and owner_rows[0][0] else "agent:replay"
                )

                # MERGE is keyed on the (agent, workflow) pair, not on ``at``, so a
                # re-run updates the timestamp instead of creating a second edge
                # (the contract's "creates one EXECUTED edge").
                graph.query(
                    "MERGE (w:Workflow {id: $id}) "
                    "MERGE (a:Agent {id: $agentId}) "
                    "MERGE (a)-[r:EXECUTED]->(w) "
                    "SET r.at = $now",
                    params={"id": workflow_id, "agentId": agent_id, "now": now},
                )

        return WorkflowReplay(workflow_id=workflow_id, steps=workflow.steps)

    # -----------------------------------------------------------------------
    # Coordination (T3.1)
    # -----------------------------------------------------------------------

    def record_handoff(self, tenant: TenantId, data: RecordHandoffInput) -> Handoff:
        """Record a handoff: node = ledger, ``HANDED_TO`` edge = skeleton (A6)."""
        handoff_id = data.id or str(uuid.uuid4())
        created_at = data.created_at if data.created_at is not None else int(time.time())
        status = data.status or "PENDING"
        self._ensure_tenant_indexes(tenant)

        clauses = [
            "MERGE (h:Handoff {id: $id}) "
            "ON CREATE SET h.created_at = $ts, h.reason = $reason",
            # Status is mutable state (PENDING → COMPLETED), so it is SET on
            # every record, not only ON CREATE.
            "SET h.status = $status",
            "MERGE (from:Agent {id: $fromId})",
            "MERGE (to:Agent {id: $toId})",
            "MERGE (h)-[:FROM_AGENT]->(from)",
            "MERGE (h)-[:TO_AGENT]->(to)",
            # Keyed on the persisted ``h.created_at`` so re-recording the same
            # handoff (with a fresh wall-clock ``$ts``) does not duplicate the
            # skeleton edge — the ledger node stays the source of truth.
            "MERGE (from)-[:HANDED_TO {at: h.created_at}]->(to)",
        ]
        params: Params = {
            "id": handoff_id,
            "ts": created_at,
            "reason": data.reason,
            "status": status,
            "fromId": data.from_agent_id,
            "toId": data.to_agent_id,
        }
        if data.target_entity_id:
            clauses.append("MERGE (te:Entity {id: $targetEntityId})")
            clauses.append("MERGE (h)-[:TARGETS]->(te)")
            params["targetEntityId"] = data.target_entity_id

        with span("memory.record_handoff"):
            with db.tenant_graph(tenant, self._config) as graph:
                graph.query("\n".join(clauses), params=params)

        return Handoff(
            id=handoff_id,
            created_at=created_at,
            reason=data.reason,
            status=status,
            from_agent_id=data.from_agent_id,
            to_agent_id=data.to_agent_id,
            target_entity_id=data.target_entity_id,
        )

    def read_handoffs(
        self, tenant: TenantId, query: ReadHandoffsQuery | None = None
    ) -> list[Handoff]:
        """Read the handoff ledger, optionally filtered by agent/status."""
        q = query or ReadHandoffsQuery()
        clauses = [
            "MATCH (h:Handoff)",
            "OPTIONAL MATCH (h)-[:FROM_AGENT]->(fa:Agent)",
            "OPTIONAL MATCH (h)-[:TO_AGENT]->(ta:Agent)",
            "OPTIONAL MATCH (h)-[:TARGETS]->(te:Entity)",
            # A WHERE directly after an OPTIONAL MATCH binds to *that* match in
            # FalkorDB (probed live), so detach the bindings with WITH first.
            "WITH h, fa, ta, te",
        ]
        params: Params = {}
        filters: list[str] = []
        if q.agent_id:
            filters.append("(fa.id = $agentId OR ta.id = $agentId)")
            params["agentId"] = q.agent_id
        if q.status:
            filters.append("h.status = $status")
            params["status"] = q.status
        if filters:
            clauses.append("WHERE " + " AND ".join(filters))

        clauses.extend(
            [
                "RETURN h.id AS id, h.created_at AS createdAt, h.reason AS reason, "
                "h.status AS status, fa.id AS fromAgentId, ta.id AS toAgentId, "
                "collect(DISTINCT te.id) AS targets",
                "ORDER BY h.created_at DESC",
            ]
        )
        limit = _clamp_limit(q.limit)
        if limit is not None:
            clauses.append(f"LIMIT {limit}")

        with span("memory.read_handoffs"):
            with db.tenant_graph(tenant, self._config) as graph:
                result = graph.query("\n".join(clauses), params=params)

        handoffs: list[Handoff] = []
        for row in result.result_set or []:
            handoff_id, created_at, reason, status, from_id, to_id, targets = row
            target_ids = [t for t in (targets or []) if t is not None]
            handoffs.append(
                Handoff(
                    id=handoff_id,
                    created_at=created_at,
                    reason=reason,
                    status=status,
                    from_agent_id=from_id or "",
                    to_agent_id=to_id or "",
                    target_entity_id=(target_ids[0] if target_ids else None),
                )
            )
        return handoffs
