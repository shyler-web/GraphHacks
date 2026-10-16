# Memory Service — Contract (T2.1)

**Status:** DESIGN — no implementation yet. Implementation lands in T2.2–T2.4.
**Companion types:** [`memory-service.types.ts`](./memory-service.types.ts) (compilable, self-contained, no `falkordb` import).
**Ground truth:** `reference/graph-schema.html` (node/edge model), `reference/features.html` (five key-focus points, "one connected graph"), `docs/decisions.md` D5 (three-tier in one graph, one named graph per tenant), D1 (Node/TS), D2 (hand-rolled state machine).

This contract is the single boundary every tier and the coordination layer go through. It is deliberately language-agnostic: the TypeScript types are the reference, but the signatures describe a service any runtime can implement. The graph — not the framework — is the star (D2).

---

## 1. Tenant isolation rule (D5)

- **One named graph per tenant.** The graph key is `tenant:<tenantId>` (e.g. `tenant:acme`). This mirrors `reference/graph-schema.html` §5 (`db.select_graph(f"tenant:{tenant_id}")`).
- **Every service call takes `tenant` as its first argument.** The implementation resolves the graph key from it; callers never pass a graph key directly.
- **No cross-tenant reads.** A call with tenant B must never touch tenant A's graph. Cross-tenant access would require an explicit second `selectGraph`, which this contract does not expose.
- **No `:Tenant` node is written inside a tenant graph.** The tenant is the graph key itself; the `:Tenant` node in the schema is only meaningful in a separate registry graph, which is out of scope (see §5, ambiguity A1).
- **Isolation is structural, not a query filter.** This is what makes "separate memory per user or tenant" a property of the topology rather than a `WHERE` clause.

---

## 2. Node labels and relationship names (aligned with `graph-schema.html`)

Keep this set small and consistent. Do not add labels without a decision record.

**Node labels**

| Tier | Label | Key properties used by this contract |
|---|---|---|
| Episodic | `:User` | `id`, `display_name` |
| Episodic | `:Session` | `id`, `started_at`, `ended_at`, `title` |
| Episodic | `:Turn` | `id`, `timestamp`, `role`, `text`, `response_quality` |
| Semantic | `:Entity` | `id`, `name`, `type`, `embedding` |
| Semantic | `:Fact` | `id`, `statement`, `confidence`, `source_turn` |
| Semantic | `:Topic` | `name` |
| Procedural | `:Tool` | `id`, `name`, `signature` |
| Procedural | `:Workflow` | `id`, `name`, `trigger_domain`, `learned_from` |
| Procedural | `:Step` | `id`, `order`, `action`, `expected_result` |
| Coordination | `:Agent` | `id`, `name`, `role`, `persona_level` |
| Coordination | `:Handoff` | `id`, `created_at`, `reason`, `status` |

**Relationship types**

| Type | Direction | Used by |
|---|---|---|
| `:PARTICIPATED` | `(:User)-[:PARTICIPATED]->(:Turn)` | `write_turn` (user-authored) |
| `:PRODUCED` | `(:Agent)-[:PRODUCED]->(:Turn)` | `write_turn` (agent-authored) |
| `:IN_SESSION` | `(:Turn)-[:IN_SESSION]->(:Session)` | `write_turn` |
| `:ABOUT` | `(:Turn)-[:ABOUT]->(:Topic)` | `write_turn` |
| `:MENTIONS` | `(:Turn)-[:MENTIONS]->(:Entity)` | `write_turn` |
| `:HAS_FACT` | `(:Entity)-[:HAS_FACT]->(:Fact)` | `upsert_fact` |
| `:DERIVED_FROM` | `(:Fact)-[:DERIVED_FROM]->(:Turn)` | `upsert_fact` (provenance) |
| `:RELATES_TO` | `(:Entity)-[:RELATES_TO {type, confidence}]->(:Entity)` | `upsert_fact` |
| `:SAME_TOPIC` | `(:Topic)-[:SAME_TOPIC]->(:Topic)` | (later, cross-session recall) |
| `:USES` | `(:Workflow)-[:USES]->(:Tool)` | `save_workflow` |
| `:START` | `(:Workflow)-[:START]->(:Step)` | `save_workflow` |
| `:NEXT_STEP` | `(:Step)-[:NEXT_STEP {order}]->(:Step)` | `save_workflow` |
| `:LEARNED_FROM` | `(:Workflow)-[:LEARNED_FROM]->(:Handoff)` | `save_workflow` |
| `:EXECUTED` | `(:Agent)-[:EXECUTED {at}]->(:Workflow)` | `replay_workflow` |
| `:HANDED_TO` | `(:Agent)-[:HANDED_TO {at}]->(:Agent)` | `record_handoff` |
| `:FROM_AGENT` | `(:Handoff)-[:FROM_AGENT]->(:Agent)` | `record_handoff` |
| `:TO_AGENT` | `(:Handoff)-[:TO_AGENT]->(:Agent)` | `record_handoff` |
| `:TARGETS` | `(:Handoff)-[:TARGETS]->(:Entity)` | `record_handoff` |
| `:MODIFIED` | `(:Turn)-[:MODIFIED {op}]->(:Entity)` | (later, write provenance) |

All writes use `MERGE` for idempotent memory writes; indexes on the `MERGE` key properties (`User.id`, `Turn.id`, `Entity.id`, `Fact.id`, `Workflow.id`, `Handoff.id`) keep writes off full-graph scans (`graph-schema.html` §4).

---

## 3. Function signatures

Every signature takes `tenant: TenantId` first. `Promise` is used throughout because the `falkordb` client is async. `?` marks optional fields.

| Function | Purpose | Signature | Inputs | Output | Cypher intent (one line) | Exit criterion (later impl) |
|---|---|---|---|---|---|---|
| `write_turn` | Persist one episodic event and link it to its actor, session, topic, and mentioned entities. | `writeTurn(tenant: TenantId, input: WriteTurnInput): Promise<Turn>` | `role`, `text`; optional `id`, `timestamp`, `responseQuality`, `sessionId`, `userId`, `topic`, `mentions[]` | `Turn` | `MERGE` User/Session/Topic/Entity, `CREATE` Turn, then `PARTICIPATED`/`PRODUCED`/`IN_SESSION`/`ABOUT`/`MENTIONS` edges. | Two `writeTurn` calls → `MATCH (t:Turn) RETURN count(t)` = 2; `recallTurns` returns both in timestamp order. |
| `recall_turns` | Read episodic history, newest-first by default, optionally filtered. | `recallTurns(tenant: TenantId, query?: RecallTurnsQuery): Promise<Turn[]>` | optional `userId`, `sessionId`, `topic`, `limit`, `order` | `Turn[]` | `MATCH` Turn via `PARTICIPATED`/`IN_SESSION`/`ABOUT`, `RETURN` ordered by `timestamp`. | After two writes, returns `[user, agent]` in order; a filter by `sessionId` returns only that session's turns. |
| `upsert_entity` | Create or update a durable semantic object; idempotent on `id`. | `upsertEntity(tenant: TenantId, input: UpsertEntityInput): Promise<Entity>` | `name`, `type`; optional `id`, `embedding` | `Entity` | `MERGE (e:Entity {id}) ON CREATE SET name, type`; `SET` embedding if provided. | Calling twice with the same `id` leaves `MATCH (e:Entity) RETURN count(e)` unchanged (no duplicate). |
| `upsert_fact` | Persist a durable assertion, bind it to its entity, and record provenance. | `upsertFact(tenant: TenantId, input: UpsertFactInput): Promise<Fact>` | `statement`, `confidence`, `entityId`; optional `id`, `sourceTurn` | `Fact` | `MERGE` Entity + Fact, `MERGE (e)-[:HAS_FACT]->(f)`, `MERGE (f)-[:DERIVED_FROM]->(:Turn {id: sourceTurn})`. | After one call, `MATCH (e:Entity {id})-[:HAS_FACT]->(f:Fact) RETURN f.statement` returns the statement; `DERIVED_FROM` points at the source turn. |
| `recall_facts` | Read facts, optionally scoped to an entity/topic and a confidence floor. | `recallFacts(tenant: TenantId, query: RecallFactsQuery): Promise<Fact[]>` | optional `entityId`, `topic`, `minConfidence`, `limit` | `Fact[]` | `MATCH` Entity/Fact via `HAS_FACT`, optional `ABOUT`/`MENTIONS` join, `WHERE confidence >= $min`. | After one `upsert_fact`, returns exactly that fact; `minConfidence` above its confidence returns `[]`. |
| `query_entities` | Look up semantic entities by name and/or type. | `queryEntities(tenant: TenantId, query: QueryEntitiesQuery): Promise<Entity[]>` | optional `name`, `type`, `limit` | `Entity[]` | `MATCH (e:Entity)` with optional `WHERE e.name = $name` / `e.type = $type`. | After one `upsert_entity`, a query by its `type` returns it; a query for an absent type returns `[]`. |
| `save_workflow` | Store a reusable, re-executable step sequence (procedural memory). | `saveWorkflow(tenant: TenantId, input: SaveWorkflowInput): Promise<Workflow>` | `name`, `triggerDomain`, `steps[]`; optional `id`, `learnedFrom`, `toolIds[]` | `Workflow` | `MERGE` Workflow + Steps, `MERGE (w)-[:START]->(s1)`, chain `NEXT_STEP`, `USES` tools, `LEARNED_FROM` handoff. | After one call, `MATCH (w:Workflow {id})-[:START]->(s) RETURN s.action` returns the first step; `NEXT_STEP` chain length = `steps.length - 1`. |
| `get_workflow` | Fetch a stored workflow and its ordered steps without re-deriving it. | `getWorkflow(tenant: TenantId, workflowId: string): Promise<Workflow \| null>` | `workflowId` | `Workflow \| null` | `MATCH` Workflow, `OPTIONAL MATCH` `START`/`NEXT_STEP` chain, `RETURN` steps ordered by `order`. | After `save_workflow`, returns the same step order; an unknown id returns `null`. |
| `replay_workflow` | Re-execute a stored workflow's steps in order and record the execution. | `replayWorkflow(tenant: TenantId, workflowId: string): Promise<WorkflowReplay>` | `workflowId` | `WorkflowReplay` (`{ workflowId, steps }`) | `MATCH` the workflow's ordered steps, `MERGE (a:Agent)-[:EXECUTED {at}]->(w)`, return steps. | After `save_workflow`, returns steps in stored order and creates one `EXECUTED` edge; the workflow is fetched, not re-derived. |
| `record_handoff` | Record transfer of state/responsibility between two agents. | `recordHandoff(tenant: TenantId, input: RecordHandoffInput): Promise<Handoff>` | `reason`, `fromAgentId`, `toAgentId`; optional `id`, `createdAt`, `status`, `targetEntityId` | `Handoff` | `MERGE` both Agents, `CREATE` Handoff, `FROM_AGENT`/`TO_AGENT`/`HANDED_TO {at}`/`TARGETS` edges. | After one call, `MATCH (a:Agent)-[h:HANDED_TO]->(b:Agent) RETURN h.at` returns a timestamp; the `Handoff` node carries `reason` + `status`. |
| `read_handoffs` | Read the handoff ledger, optionally filtered by agent or status. | `readHandoffs(tenant: TenantId, query?: ReadHandoffsQuery): Promise<Handoff[]>` | optional `agentId`, `status`, `limit` | `Handoff[]` | `MATCH` Handoff via `FROM_AGENT`/`TO_AGENT`, optional `WHERE status = $status`, `RETURN` ordered by `created_at`. | After one `record_handoff`, returns it; filtering by the other agent returns `[]`. |

**Shared types** (`Turn`, `Entity`, `Fact`, `Workflow`, `Step`, `Handoff`, `Agent`, and the `*Input`/`*Query` shapes) are defined in `memory-service.types.ts`.

---

## 4. The service interface

```ts
interface MemoryService {
  // episodic
  writeTurn(tenant: TenantId, input: WriteTurnInput): Promise<Turn>;
  recallTurns(tenant: TenantId, query?: RecallTurnsQuery): Promise<Turn[]>;
  // semantic
  upsertEntity(tenant: TenantId, input: UpsertEntityInput): Promise<Entity>;
  upsertFact(tenant: TenantId, input: UpsertFactInput): Promise<Fact>;
  recallFacts(tenant: TenantId, query: RecallFactsQuery): Promise<Fact[]>;
  queryEntities(tenant: TenantId, query: QueryEntitiesQuery): Promise<Entity[]>;
  // procedural
  saveWorkflow(tenant: TenantId, input: SaveWorkflowInput): Promise<Workflow>;
  getWorkflow(tenant: TenantId, workflowId: string): Promise<Workflow | null>;
  replayWorkflow(tenant: TenantId, workflowId: string): Promise<WorkflowReplay>;
  // coordination
  recordHandoff(tenant: TenantId, input: RecordHandoffInput): Promise<Handoff>;
  readHandoffs(tenant: TenantId, query?: ReadHandoffsQuery): Promise<Handoff[]>;
}
```

The implementation (T2.2+) mirrors `scripts/health.mjs`: connect with `FalkorDB.connect`, `selectGraph('tenant:' + tenant)`, run parameterised Cypher, close in a `finally`.

---

## 5. Ambiguities in `graph-schema.html` (flagged, with the resolution this contract takes)

- **A1 — `:Tenant` node vs graph key.** The schema says `:Tenant` is "usually implicit in the key" and only needed for a registry graph. **Resolution:** do not write a `:Tenant` node inside tenant graphs; the graph key is the tenant. A registry graph is out of scope.
- **A2 — `:Topic` has no `id`.** Every other label has a stable `id`; `:Topic` has only `name`. **Resolution:** use `name` as the `MERGE` key for `:Topic`.
- **A3 — `Fact.source_turn` property vs `:DERIVED_FROM` edge.** Both encode provenance. **Resolution:** the `:DERIVED_FROM` edge is the source of truth; `source_turn` is an optional denormalised convenience.
- **A4 — `Workflow.learned_from` property vs `:LEARNED_FROM` edge.** Same redundancy. **Resolution:** the edge is the source of truth; the property is optional.
- **A5 — agent-authored turns.** `:PARTICIPATED` is `User→Turn`, but agents author turns too. **Resolution:** user turns use `PARTICIPATED`; agent turns use `PRODUCED` (`Agent→Turn`).
- **A6 — `:Handoff` node vs `:HANDED_TO` edge.** Both exist. **Resolution:** keep both — the node is the ledger entry (reason/status), the edge is the coordination skeleton (timestamp).
- **A7 — `:Entity.embedding`.** The schema lists a vector property, but no vector index is in scope for T2.1–T2.4. **Resolution:** `embedding` is optional and unused until a later decision record; semantic recall here is property/traversal-based, not vector-based.
- **A8 — `:Session` lifecycle.** `started_at`/`ended_at` are listed but no function opens/closes a session. **Resolution:** `write_turn` `MERGE`s a `:Session` by `id`; explicit session lifecycle is deferred.

---

## Next: T2.2 spec card

**1. What it builds.** The episodic tier of the memory service: `writeTurn` and `recallTurns` against a real FalkorDB graph, persisting `:Turn` nodes with their `PARTICIPATED`/`PRODUCED`/`IN_SESSION`/`ABOUT` edges and reading them back in order.

**2. Exit criterion (runnable).** A verification script added in T2.2 (e.g. `scripts/verify-t2.2.mjs`, mirroring `scripts/health.mjs`) writes two turns for tenant `t2-2-demo` — one `role: "user"`, one `role: "agent"` — then calls `recallTurns`. It exits 0 and prints exactly `turns=2 order=user,agent`. Independently, `MATCH (t:Turn) RETURN count(t)` against the `tenant:t2-2-demo` graph returns `2`.

**3. Out of scope.** Semantic extraction (`upsertEntity`/`upsertFact`), procedural workflows, handoffs, tenant-isolation proof (T3.2), concurrency (T3.3), the HTTP route (T4.1), and any vector/embedding work.

**4. Locked decisions.** D1 (Node/TS), D2 (hand-rolled, no framework), D5 (one graph per tenant, key `tenant:<tenantId>`), and this contract's signatures/labels. Do not change the `writeTurn`/`recallTurns` signatures or the `:Turn` label without a new decision record.

**5. Verify step.** `npm run verify:t2.2` (added in T2.2) exits 0 with `turns=2 order=user,agent`; then `npm run health` still exits 0. Commit only after both pass.
