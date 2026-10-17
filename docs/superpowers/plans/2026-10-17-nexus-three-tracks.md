# GraphHacks Nexus — Three-Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Do NOT execute this plan without first re-reading `docs/superpowers/specs/2026-10-17-nexus-three-tracks-design.md`.**

**Goal:** Turn the `GraphHacks` simulation into a real FalkorDB-backed system that is entered in Tracks 01, 02, and 03, where stopping FalkorDB visibly breaks the app.

**Architecture:** One React cockpit (reused, D9) → one FastAPI backend (D8) → one FalkorDB instance holding three named-graph projections: `tenant:<id>` (Track 02 memory), `code:<repoId>` (Track 01 AST graph), `company:brain` (Track 03 people/docs/code). A shared `db.named_graph` router + index provisioner is the H0 foundation (D10).

**Tech Stack:** Python 3.12 + FastAPI + `falkordb` (py) via `uv`; React + Vite + TS (existing); FalkorDB Docker; `pytest` for contract tests, `scripts/verify_*.py` for live exit criteria.

**Spec:** `docs/superpowers/specs/2026-10-17-nexus-three-tracks-design.md`

## Global Constraints

- Python `>=3.12`; deps via `uv` only (`backend/pyproject.toml`); **no new runtime dependencies** (graphify JSON is read directly; do not import `graphify` at runtime).
- All Cypher parameterised via `graph.query(cypher, params={...})`; the **only** inlined value is a validated `int` in `LIMIT` or `*..N` (FalkorDB rejects params there) — clamp/reject out-of-range ints.
- Every graph call is scoped through a named graph (`tenant:<id>` / `code:<repoId>` / `company:brain`); no un-scoped reads.
- Wrap engine calls in `with span("<area>.<method>"):` (`app.observability`); LangSmith stays a lazy no-op hook (D3).
- Secrets via `os.environ` only; never read/print/commit `.env`, keys, tokens (AGENTS.md security).
- `CREATE INDEX IF NOT EXISTS` is **unsupported** — catch the "already indexed" `ResponseError`.
- Every write is `MERGE`-based and idempotent; verify scripts clear their graph first for determinism.
- Commit only after the task's exit criterion passes, with a decision-bearing message and a `verify:` line; push after each commit.

## Review Focus

The five failure modes most likely to bite that no single task's happy-path test catches — each gets a test in its owning task:
1. **Empty/unknown target** — resolvers (`who_owns`, `recall_facts`, `query_entities`) return `[]`/empty and never raise; read routes never lazily create a graph (owner: A1, C5).
2. **Out-of-range `limit`/`max_hops`/`max_len`** — clamped/rejected, never interpolated raw into `LIMIT`/`*..N` (owner: B2, C5).
3. **FalkorDB down mid-request** — API returns `503`; cockpit shows `ErrorScreen`; **no silent fallback** to `INITIAL_TENANTS` (owner: F2, F3).
4. **`git --numstat` oddities** — binary (`-`) and rename (`old => new`) lines must not crash the parser or create phantom files (owner: C2).
5. **Re-run idempotency** — running any ingest/load twice leaves counts unchanged (MERGE + `present` flags; no duplicate edges) (owner: A0, B1, C3, C4).

---

## Phase A — Foundation + Track 02 anchor (must-win)

### Task A0 (M-01) · H0 foundation: named-graph router, index provisioner, D10

**Files**
- Modify: `backend/app/db.py`
- Modify: `docs/decisions.md` (append **D10**)
- Test: `backend/scripts/verify_t0_engine.py` (new, small)

**Interfaces**
- Consumes: `app.config.FalkorDBConfig`.
- Produces:
  ```python
  HEALTH_GRAPH = "graphhacks_health"
  REGISTRY_GRAPH = "graphhacks_registry"
  BRAIN_GRAPH = "company:brain"
  def tenant_graph_key(tenant: str) -> str: ...          # existing
  def repo_graph_key(repo_id: str) -> str: ...            # f"code:{repo_id}"
  @contextmanager
  def named_graph(graph_key: str, config: FalkorDBConfig | None = None): ...
  @contextmanager
  def tenant_graph(tenant: str, config=None): ...         # = named_graph(tenant_graph_key(tenant), config)
  def ensure_indexes(graph_key: str, specs: list[tuple[str, str]], config=None) -> int: ...
  ```

- [ ] **Step 1:** Write `verify_t0_engine.py`: assert `db.named_graph("verify:h0")` runs `MATCH (n) RETURN count(n)`; call `ensure_indexes("verify:h0", [("Node","id")])` twice → second call raises nothing and returns `0` (already indexed).
- [ ] **Step 2:** Run `cd backend && uv run python scripts/verify_t0_engine.py` → FAIL (`AttributeError: ... named_graph`).
- [ ] **Step 3:** Implement `named_graph` (mirror `tenant_graph`'s open/close/finally, generalized to any key), reimplement `tenant_graph` on top of it, add `repo_graph_key`, `ensure_indexes` (loop `CREATE INDEX FOR (n:Label) ON (n.prop)` catching `ResponseError` containing "already indexed"). Append **D10** to `docs/decisions.md` (Decision/Why/Alternatives/Reversibility/Revisit-if).
- [ ] **Step 4:** Run → prints `h0 ok — named_graph + ensure_indexes idempotent`, exit 0.
- [ ] **Step 5:** Commit: `feat(engine): named_graph router + idempotent ensure_indexes (H0); decision: D10 code:/company: graphs; verify: verify_t0_engine exit 0`.

### Task A1 (T2.3) · Semantic memory

**Files**
- Modify: `backend/app/memory_service.py` (replace 4 stubs, lines 223–235); add module-level `TENANT_INDEX_SPECS`
- Test: `backend/scripts/verify_t2_3.py` (new; pattern of `verify_t2_2.py`)

**Interfaces**
- Consumes: `UpsertEntityInput{id?,name,type,embedding?}`, `UpsertFactInput{id?,statement,confidence,entityId,sourceTurn?}`, `RecallFactsQuery{entityId?,topic?,minConfidence?,limit?}`, `QueryEntitiesQuery{name?,type?,limit?}`.
- Produces: `upsert_entity(tenant, data) -> Entity`, `upsert_fact(tenant, data) -> Fact`, `recall_facts(tenant, query) -> list[Fact]`, `query_entities(tenant, query) -> list[Entity]`.

**Cypher intent** (contract §2/§3; `HAS_FACT`, `DERIVED_FROM {edge = truth, A3}`)
```cypher
-- upsert_entity (id = data.id or uuid4)
MERGE (e:Entity {id:$id}) ON CREATE SET e.name=$name, e.type=$type
-- upsert_fact
MERGE (e:Entity {id:$entityId})
MERGE (f:Fact {id:$id}) ON CREATE SET f.statement=$statement, f.confidence=$confidence
SET f.confidence=$confidence
MERGE (e)-[:HAS_FACT]->(f)
-- if sourceTurn:
MERGE (f)-[:DERIVED_FROM]->(:Turn {id:$sourceTurn})
-- recall_facts: MATCH (e:Entity)-[:HAS_FACT]->(f:Fact) [or by entityId]
--   [topic scopes via (f)-[:DERIVED_FROM]->(:Turn)-[:ABOUT]->(:Topic {name:$topic})]
--   WHERE f.confidence >= $min RETURN ... ORDER BY f.confidence DESC LIMIT <int>
-- query_entities: MATCH (e:Entity) [WHERE e.name=$name AND/OR e.type=$type] ORDER BY e.name LIMIT <int>
```

- [ ] **Step 1:** Write `verify_t2_3.py`: clear `tenant:t2-3-demo`; `ensure_indexes(tenant_graph_key(TENANT), TENANT_INDEX_SPECS)`; `upsert_entity({id:"e-atlas",name:"Project Atlas",type:"project"})` twice.
- [ ] **Step 2:** Run `uv run python scripts/verify_t2_3.py` → FAIL (`NotImplementedError`).
- [ ] **Step 3:** Implement `upsert_entity` + `ensure_indexes` wiring.
- [ ] **Step 4:** Run → `entities=1`.
- [ ] **Step 5:** Extend: `write_turn` a user turn `{id:"turn-src-1", mentions:["e-atlas"]}`; `upsert_fact({id:"f-1",statement:"Priya leads Project Atlas",confidence:0.9,entityId:"e-atlas",sourceTurn:"turn-src-1"})` twice → assert `HAS_FACT` returns the statement, `DERIVED_FROM → turn-src-1` exists, `count(f)==1`.
- [ ] **Step 6:** Run → fail; implement `upsert_fact`; run → pass.
- [ ] **Step 7:** Add `recall_facts(entity_id="e-atlas")→1`, `min_confidence=0.95→[]`, `topic="atlas"→1`; `query_entities(type="project")→1`, `type="absent"→[]`. Implement `recall_facts`+`query_entities`.
- [ ] **Step 8:** Run → `semantic=1 facts=1 source=ok`, exit 0.
- [ ] **Step 9:** Commit: `feat(semantic): Entity/Fact upsert+recall via MERGE/HAS_FACT/DERIVED_FROM (T2.3); decision: edge is provenance (A3); verify: verify_t2_3 exit 0`.

**Exit criterion:** `uv run python scripts/verify_t2_3.py` → exit 0, `semantic=1 facts=1 source=ok`.

### Task A2 (T2.4) · Procedural memory

**Files:** Modify `backend/app/memory_service.py` (lines 241–248); Test `backend/scripts/verify_t2_4.py`.

**Interfaces**
- Consumes: `SaveWorkflowInput{id?,name,triggerDomain,learnedFrom?,steps:StepInput[],toolIds?}`, `StepInput{order,action,expectedResult?,id?}`, `WorkflowReplay`.
- Produces: `save_workflow(tenant, data) -> Workflow`, `get_workflow(tenant, workflow_id) -> Workflow | None`, `replay_workflow(tenant, workflow_id) -> WorkflowReplay`.

**Cypher intent** (`START`, `NEXT_STEP {order}`, `USES`, `LEARNED_FROM {edge = truth, A4}`, `EXECUTED {at}`; derived `Step.id` per **A9**)
```cypher
MERGE (w:Workflow {id:$id}) ON CREATE SET w.name=$name, w.trigger_domain=$domain
-- per step i: MERGE (s_i:Step {id:$stepId_i}) SET s_i.order=$order_i, s_i.action=$action_i, s_i.expected_result=$expected_i
MERGE (w)-[:START]->(s_0)
-- i>0: MERGE (s_{i-1})-[:NEXT_STEP {order:$order_i}]->(s_i)
-- toolIds: MERGE (w)-[:USES]->(:Tool {id:$toolId_i})
-- learnedFrom: MERGE (h:Handoff {id:$learnedFrom}) MERGE (w)-[:LEARNED_FROM]->(h)
```
`get_workflow`: `MATCH (w:Workflow {id:$id}) OPTIONAL MATCH (w)-[:START]->(s0) OPTIONAL MATCH p=(s0)-[:NEXT_STEP*0..]->(s:Step) RETURN w.name, w.trigger_domain, collect(DISTINCT s)`; empty → `None`; sort by `.order` in Python.
`replay_workflow`: fetch via `get_workflow` (never re-derive); resolve executor (**A10**) `MATCH (w)-[:LEARNED_FROM]->(:Handoff)-[:FROM_AGENT]->(a:Agent)` else `MERGE (a:Agent {id:"agent:replay"})`; `MERGE (a)-[:EXECUTED {at:$now}]->(w)`.

- [ ] **Step 1:** `verify_t2_4.py`: clear `tenant:t2-4-demo`; save a 3-step workflow `[ingest,classify,notify]`, `toolIds:["tool-tavily"]`, twice.
- [ ] **Step 2:** Run → FAIL; implement `save_workflow` (derive `step_id = f"{wf_id}:step:{order}"` when absent).
- [ ] **Step 3:** Run → `workflow=1 steps=3 start=ingest`; chain length == 2.
- [ ] **Step 4:** Add `get_workflow("wf-1")→3 steps`; `get_workflow("nope")→None`; implement.
- [ ] **Step 5:** Add `replay_workflow("wf-1")` → same order + exactly 1 `EXECUTED` edge; re-run still 1; implement.
- [ ] **Step 6:** Run → pass; commit: `feat(procedural): save/get/replay Workflow via START/NEXT_STEP/USES/EXECUTED (T2.4); decision: A9 derived step id, A10 executor; verify: verify_t2_4 exit 0`.

**Exit criterion:** `uv run python scripts/verify_t2_4.py` → exit 0, `workflow=1 steps=3 start=ingest`.

### Task A3 (T3.1) · Handoff ledger

**Files:** Modify `backend/app/memory_service.py` (lines 254–260); Test `backend/scripts/verify_t3_1.py`.

**Interfaces**
- Consumes: `RecordHandoffInput{id?,createdAt?,reason,status?,fromAgentId,toAgentId,targetEntityId?}`, `ReadHandoffsQuery{agentId?,status?,limit?}`.
- Produces: `record_handoff(tenant, data) -> Handoff`, `read_handoffs(tenant, query=None) -> list[Handoff]`.

**Cypher intent** (`HANDED_TO {at}` in the merge key; node = ledger, edge = skeleton, **A6**)
```cypher
MERGE (from:Agent {id:$fromId}) MERGE (to:Agent {id:$toId})
MERGE (h:Handoff {id:$id}) ON CREATE SET h.created_at=$ts, h.reason=$reason, h.status=$status
MERGE (h)-[:FROM_AGENT]->(from) MERGE (h)-[:TO_AGENT]->(to)
MERGE (from)-[:HANDED_TO {at:$ts}]->(to)
-- if targetEntityId: MERGE (h)-[:TARGETS]->(:Entity {id:$targetEntityId})
```
`status = data.status or "PENDING"`. `read_handoffs`: `MATCH (h:Handoff) OPTIONAL MATCH (h)-[:FROM_AGENT]->(fa) OPTIONAL MATCH (h)-[:TO_AGENT]->(ta)` + optional `WHERE fa.id=$agentId OR ta.id=$agentId` / `h.status=$status`, `ORDER BY h.created_at DESC LIMIT <int>`.

- [ ] **Step 1:** `verify_t3_1.py`: clear `tenant:t3-1-demo`; record handoff `{id:"h-1",reason:"needs research",fromAgentId:"agent-researcher",toAgentId:"agent-planner",targetEntityId:"e-atlas"}` twice.
- [ ] **Step 2:** Run → FAIL; implement `record_handoff`.
- [ ] **Step 3:** Run → `handoffs=1 edge=1`; assert `HANDED_TO.at` non-null, `status=="PENDING"`, `TARGETS→e-atlas`.
- [ ] **Step 4:** Add `read_handoffs()`→1, by `agent_id="agent-researcher"`→1, `agent_id="agent-other"`→`[]`, `status="COMPLETED"`→`[]`; implement.
- [ ] **Step 5:** Run → pass; commit: `feat(coordination): handoff ledger MERGE/HANDED_TO/FROM_AGENT/TO_AGENT/TARGETS (T3.1); decision: A6 ledger+skeleton, default PENDING; verify: verify_t3_1 exit 0`.

**Exit criterion:** `uv run python scripts/verify_t3_1.py` → exit 0, `handoffs=1 edge=1`.

### Task A4 (T3.2) · Per-tenant isolation proof

**Files:** Test `backend/scripts/verify_t3_2.py`.

- [ ] **Step 1:** Clear `tenant:t3-2-a` and `tenant:t3-2-b`; write 3 turns to A only.
- [ ] **Step 2:** Assert A `count(t)==3`, B `count(t)==0`; `recall_turns("t3-2-a")→3`, `recall_turns("t3-2-b")→[]`; `tenant_graph_key("t3-2-a") != tenant_graph_key("t3-2-b")`.
- [ ] **Step 3:** Run → `tenant_a=3 tenant_b=0`, exit 0.
- [ ] **Step 4:** Commit: `test(isolation): tenant B sees 0 of A's turns via distinct graph keys (T3.2); decision: isolation is structural (D5); verify: verify_t3_2 exit 0`.

### Task A5 (T3.3) · Concurrency proof

**Files:** Test `backend/scripts/verify_t3_3.py`.

**Approach:** `concurrent.futures.ThreadPoolExecutor(max_workers=16)` with a `threading.Barrier(16)`. Safe because `db.tenant_graph` opens a **fresh client per call** (no client sharing); retry transient `ResponseError` up to 3× (safe — `MERGE` is idempotent). Non-secret: FalkorDB serializes writers and is atomic per graph.

- [ ] **Step 1:** Clear `tenant:t3-3-demo`; `ensure_indexes`. Phase 1 → 16 distinct ids `turn-conc-{i}` via barrier+threads; assert `count(t)==16`.
- [ ] **Step 2:** Run → print N + wall time. If `Max pending queries exceeded`, lower N or note it.
- [ ] **Step 3:** Phase 2 → 16 threads write the **same** id `turn-conc-same`; assert total `==17` and `count(turn-conc-same)==1`.
- [ ] **Step 4:** Run → `writers=16 distinct=16 same=1`. **If Phase 2 returns >1**, FAIL and record the race + remedy in `docs/decisions.md` before claiming pass.
- [ ] **Step 5:** Commit: `test(concurrency): 16 parallel writers → no loss + same-id MERGE dedupes (T3.3); decision: per-call client + MERGE retry; verify: verify_t3_3 exit 0`.

### Task F1 · Vite dev proxy

**Files:** Modify `vite.config.ts`.
- [ ] Add `server: { host:true, port:5173, proxy: { '/api': { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000', changeOrigin:true } } }`.
- [ ] Prove: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/api/health` → `200`; `npm run build` green.

### Task F2 (T4.1) · FastAPI graph routes + cockpit seed

**Files:** Modify `backend/app/models.py`, `backend/app/memory_service.py`, `backend/app/main.py`; Create `backend/scripts/seed_cockpit.py`.

**Interfaces**
- Routes (any FalkorDB failure → `HTTPException(503, "FalkorDB unavailable (<ExcType>)")`; unknown tenant → `200` with empty arrays, **never** create a graph on read):
  - `GET /api/tenants` → `{"tenants":[{"key":..., "name":...}]}` (from `REGISTRY_GRAPH`).
  - `GET /api/graph/nodes?tenant=<id>` → `{"tenant":..., "nodes":ConceptNode[], "episodes":Episode[], "playbooks":Playbook[], "handoffs":Handoff[]}`.
  - `GET /api/graph/edges?tenant=<id>` → `{"tenant":..., "edges":[{from,to,type}]}` (`from` uses `Field(alias="from")`).
- `MemoryService`: `list_tenants() -> list[dict]`, `read_cockpit_nodes(tenant) -> list[dict]`, `read_cockpit_edges(tenant) -> list[dict]`, `read_cockpit_tenant(tenant) -> dict`.
- Projection: `:ConceptNode`→`ConceptNode`; `:Turn`/`:Session`/`:Topic`→`Episode`; `:Workflow`(+`:Step`)→`Playbook`; `:Handoff`(`FROM_AGENT`/`TO_AGENT`/`TARGETS`)→`Handoff`.
- `seed_cockpit.py`: idempotently `MERGE`s `INITIAL_TENANTS` (`src/data/tenants.ts`) into FalkorDB + `:Tenant` nodes into `REGISTRY_GRAPH`. This is what makes the graph load-bearing.

- [ ] **Step 1:** Add response models; `uv run python -c "from app.models import NodesResponse"` imports clean.
- [ ] **Step 2:** `uv run python scripts/seed_cockpit.py` → prints per-tenant counts; re-run → identical (idempotent).
- [ ] **Step 3:** `uv run uvicorn app.main:app --port 8000`; `curl .../api/tenants` shows both keys; `curl '.../api/graph/nodes?tenant=graphsync_user1_ai_avatar_saas'` returns seeded nodes/episodes/playbooks/handoffs.
- [ ] **Step 4:** `docker stop falkordb` → same curl `503`; `docker start falkordb` → `200`.
- [ ] **Step 5:** Commit: `feat(api): real /api/tenants + /api/graph/{nodes,edges} + idempotent cockpit seed (T4.1); decision: read routes never create graphs; verify: curl 200 up / 503 down`.

### Task F3 (T4.2) · Rule-3 flip — cockpit reads the backend

**Files:** Create `src/data/remote.ts`, `src/vite-env.d.ts`, `src/panels/DataStates.tsx`; Modify `src/data/index.ts`, `src/App.tsx`.

**Interfaces**
```ts
export class ApiError extends Error { readonly status: number }
export async function fetchTenant(key: string, name: string): Promise<Tenant>   // nodes+edges
export async function fetchTenants(): Promise<TenantMap>
export async function loadTenants(): Promise<TenantMap>                          // replaces getInitialTenants
export function LoadingScreen(): JSX.Element
export function ErrorScreen(props: { message: string | null; onRetry: () => void }): JSX.Element
```
- `App.tsx`: `LoadState = 'loading'|'ready'|'error'`; early-return `LoadingScreen`/`ErrorScreen` before any panel; `currentTenant` only accessed in `ready`.
- **No fallback** to `INITIAL_TENANTS` (a silent fallback violates rule 3).

- [ ] **Step 1:** `npm run build` green after seam + App changes.
- [ ] **Step 2:** FalkorDB+backend up → `npm run dev` renders the seeded graph.
- [ ] **Step 3:** **Rule-3 proof:** `docker stop falkordb` → reload `:5173` shows `ErrorScreen`; `curl .../api/graph/nodes?...` → `503`. `docker start falkordb` → `Retry` → renders.
- [ ] **Step 4:** Record both HTTP codes in `PROGRESS.md` as T4.2 evidence.
- [ ] **Step 5:** Commit: `feat(cockpit): data seam reads FastAPI; stop-FalkorDB → ErrorScreen (T4.2, rule 3); verify: 503 down / 200 up` .

---

## Phase B — Track 01: Connected-Data Action Engine

### Task B0 · Refresh the AST graph

**Files:** `graphify-out/graph.json` (regenerated).
- [ ] Check staleness: `python3 -c "import json;d=json.load(open('graphify-out/graph.json'));print(any('backend' in (n.get('source_file') or '') for n in d['nodes']))"` → `False`.
- [ ] Run `graphify update .` → same check prints `True`; graph parses; nodes/links > 457/560.
- [ ] Commit: `chore(graph): refresh graphify after D8/D9 (backend present)`.

### Task B1 · `backend/app/graph_sync.py` — graph.json → `code:<repoId>`

**Files:** Create `backend/app/graph_sync.py`; Create `backend/scripts/verify_track1.py` (partial).

**Interfaces**
```python
DEFAULT_REPO_ID = "graphhacks"
REL_MAP = {"calls":"CALLS","indirect_call":"CALLS","imports":"IMPORTS","imports_from":"IMPORTS",
           "dynamic_import":"IMPORTS","contains":"CONTAINS","part_of":"CONTAINS","defines":"CONTAINS",
           "implements":"INHERITS","implemented_by":"INHERITS","inherits":"INHERITS","extends":"INHERITS"}
TEST_PATTERN: re.Pattern   # (^|/)(tests?|__tests__)/|(^|/)verify[_-]|[._-](test|spec)\.[^.]+$|(^|/)test[._-]
def is_test_file(source_file: str | None) -> bool: ...
class LoadStats(BaseModel): files:int; symbols:int; tests:int; edges:dict[str,int]; nodes_total:int; elapsed_ms:float
def load_graph(graph_path: Path, repo_id=DEFAULT_REPO_ID, config=None, reset=False) -> LoadStats: ...
```
- Node rule: `:File{id:"file:"+source_file}` per distinct `source_file`; `:Symbol{id:<graphify id>}` for every `file_type=="code"` node **and every mapped-edge endpoint**; add `:Test` when `is_test_file`.
- Graph key via `db.repo_graph_key(repo_id)`. `reset=True` → `MATCH (n) DETACH DELETE n` first; default MERGE-only (idempotent).

**Cypher (UNWIND batches)**
```cypher
UNWIND $files AS p MERGE (f:File {id:'file:'+p}) SET f.path=p
UNWIND $symbols AS row MERGE (s:Symbol {id:row.id})
  SET s.label=row.label, s.source_file=row.source_file, s.source_location=row.source_location,
      s.callable=row.callable, s.origin=row.origin, s.community=row.community
UNWIND $symbols AS row MATCH (f:File {id:'file:'+row.source_file}) MATCH (s:Symbol {id:row.id}) MERGE (f)-[:CONTAINS]->(s)
UNWIND $test_ids AS tid MATCH (s:Symbol {id:tid}) SET s:Test
-- per edge type T: UNWIND $edges AS e MERGE (a:Symbol {id:e.source}) MERGE (b:Symbol {id:e.target}) MERGE (a)-[:T]->(b)
```

- [ ] **Step 1:** `cd backend && uv run python scripts/verify_track1.py` → `ModuleNotFoundError`, exit 1.
- [ ] **Step 2:** Implement loader; assert `is_test_file("scripts/verify_track1.py") is True`, `is_test_file("assets/spec-card.js") is False`.
- [ ] **Step 3:** Run → load #1 asserts `files>=1`, `symbols>0`, `edges["CALLS"]>0`; load #2 (no reset) byte-equal counts.
- [ ] **Step 4:** Commit: `feat(track1): graph_sync loads graphify graph into code:<repoId> (File/Symbol/Test, CALLS|IMPORTS|CONTAINS|INHERITS), idempotent (B1); decision: D10; verify: track1 load idempotent`.

### Task B2 · `backend/app/falkor_action.py` — action engine

**Files:** Create `backend/app/falkor_action.py`.

**Interfaces**
```python
class EdgeRef(BaseModel): source:str; target:str; type:str
class HopBucket(BaseModel): hop:int; ids:list[str]
class DecisionTrace(BaseModel):
    action: Literal["blast_radius","hotspots","shortest_dep_path"]; graph:str; params:dict
    cypher:str; node_ids:list[str]; edges:list[EdgeRef]; hop_buckets:list[HopBucket]|None
    row_count:int; elapsed_ms:float
class ActionResult(BaseModel): data:object; trace:DecisionTrace
class ActionEngine:
    def __init__(self, repo_id=DEFAULT_REPO_ID, config=None): ...
    def blast_radius(self, repo_id:str, symbol_id:str, max_hops:int=3) -> ActionResult: ...
    def hotspots(self, repo_id:str, limit:int=10) -> ActionResult: ...
    def shortest_dep_path(self, repo_id:str, symbol_id:str, target_id:str, max_len:int=6) -> ActionResult: ...
    def demo_changed_symbol(self, repo_id:str) -> str: ...
```
`elapsed_ms` = `perf_counter` delta around `graph.query` only. `max_hops`/`limit`/`max_len` validated ints (reject `<1`/`>10`) then **inlined**.

**Cypher**
```cypher
-- blast_radius A: hop-bucketed affected symbols
MATCH p=(root:Symbol {id:$symbolId})<-[:CALLS*1..<H>]-(affected:Symbol) WHERE affected.id<>$symbolId
WITH affected, min(length(p)) AS hops
RETURN affected.id AS id, affected.label AS label, affected.source_file AS file,
       (affected:Test) AS is_test, hops ORDER BY hops ASC, id ASC
-- blast_radius B: exact edges traversed
MATCH p=(root:Symbol {id:$symbolId})<-[:CALLS*1..<H>]-(:Symbol) UNWIND relationships(p) AS r
RETURN DISTINCT startNode(r).id AS source, endNode(r).id AS target, type(r) AS type
-- hotspots
CALL algo.pageRank('Symbol','CALLS') YIELD node, score
RETURN node.id AS id, node.label AS label, node.source_file AS file, score ORDER BY score DESC LIMIT <L>
-- shortest_dep_path (primary)
MATCH (a:Symbol {id:$source}), (b:Symbol {id:$target})
CALL algo.SPpaths({sourceNode:a, targetNode:b, relTypes:['CALLS'], relDirection:'outgoing', maxLen:<N>, pathCount:1}) YIELD path
RETURN [n IN nodes(path) | n.id] AS node_ids, [r IN relationships(path) | type(r)] AS edge_types
-- shortest_dep_path (fallback)
MATCH p=shortestPath((a:Symbol {id:$source})-[:CALLS*1..<N>]->(b:Symbol {id:$target}))
RETURN [n IN nodes(p) | n.id] AS node_ids, [r IN relationships(p) | type(r)] AS edge_types
```

- [ ] **Step 1:** `uv run python -c "from app.falkor_action import ActionEngine"` → `ModuleNotFoundError`.
- [ ] **Step 2:** Implement; capture `elapsed_ms` per query.
- [ ] **Step 3:** Assert `demo_changed_symbol` non-empty; `blast_radius(max_hops=2)` → hop1 non-empty, `trace.cypher` contains `*1..2`; `hotspots(limit=5)` → `1..5` rows with numeric score; every trace `graph=="code:graphhacks"`, `elapsed_ms>0`.
- [ ] **Step 4:** Commit: `feat(track1): action engine blast_radius/hotspots/shortest_dep_path + DecisionTrace (B2); verify: demo symbol + *1..2 traversal`.

### Task B3 · `backend/scripts/verify_track1.py` exit criterion

**Files:** Finalize `backend/scripts/verify_track1.py`.
- [ ] Asserts: load idempotent; `nodes_total` unchanged after load #2; `demo` non-empty; `blast_radius(hops=2)` → non-empty hop1, `len<=2`; `hotspots(limit=5)` range + numeric; `shortest_dep_path(demo, a-caller-of-demo)` → `len(node_ids)>=2`, all edges `CALLS`; all `elapsed_ms>0`.
- [ ] Run exit criterion (below); commit: `test(track1): verify_track1 end-to-end (B3); verify: TRACK1 OK exit 0`.

**Exit criterion:**
```bash
cd backend && uv run python scripts/verify_track1.py; echo exit=$?
```
Expected final line `TRACK1 OK`, `exit=0` (counts asserted, not hardcoded). Rule-3: with FalkorDB stopped this raises `ConnectionError` → non-zero.

---

## Phase C — Track 03: Company Brain

**Scope boundary (state in README + D10):** no GitHub token → Track 03 is built on local `git log --numstat` + on-disk docs + `graphify-out/graph.json` only. Anything PR-shaped is deferred.

**Vocabulary (`company:brain`)** — keys: `:Person{email}`, `:Commit{sha}`, `:File{repo:path}`, `:Doc` (co-labels `:File`), `:Symbol{repo#node-id}`. Edges: `:AUTHORED`, `:MODIFIED{path,insertions,deletions,at}`, `:DEFINES`, `:MENTIONS`, `:DOCUMENTED_IN`. `present` flags (`false` pre-pass, `true` when seen) — **never `DETACH DELETE`** so removed symbols leave a drift signal.

### Task C1 (T3.1) · Graph handle, schema, D10
**Files:** Modify `backend/app/db.py`, `backend/app/falkor_brain.py` (skeleton + `ensure_schema`), `PROGRESS.md`; Test `backend/scripts/verify_track3.py` (frame + `--step`).
**Interfaces:** `BRAIN_GRAPH`, `repo_graph_key`, `named_graph`; `FalkorBrain(config=None, graph_key=BRAIN_GRAPH)`; `ensure_schema() -> None` (`ensure_indexes` on Person.id, Commit.id, File.id/path, Doc.id, Symbol.id/name).
- [ ] `check_3_1()` → `db.BRAIN_GRAPH == "company:brain"`; `ensure_schema()` twice raises nothing.
- [ ] Run `--step 3.1` → FAIL (`AttributeError: BRAIN_GRAPH`); implement; run → `3.1 ok — graph=company:brain`; commit.

### Task C2 (T3.2) · Commit/Person/File ingest
**Interfaces:** `ingest_commits(repo_id, repo_path) -> IngestStats`.
- [ ] `check_3_2()`: clear graph; ingest → assert `AUTHORED`/`MODIFIED` count>0 and the git author email resolves as `:Person.id`; re-run → counts unchanged.
- [ ] Run → FAIL; implement (parse `git -C <path> log --numstat --format='%H|%an|%ae|%at|%s'`; binary `-`→0; rename `old => new`/`{a => b}`→destination; pre-set `present=false`; label `:Doc` files).
- [ ] Run → `3.2 ok — people=1 commits=<N> files=<M>`; commit.

### Task C3 (T3.3) · Symbol ingest
**Interfaces:** `ingest_symbols(repo_id, graph_json_path) -> IngestStats`.
- [ ] `check_3_3()`: `count((:File)-[:DEFINES]->(s:Symbol {present:true}))>0`; set one symbol `present=false`, re-run, assert **not deleted**.
- [ ] Run → FAIL; implement (`file_type=="code"`, non-empty `source_file`, `symId=f"{repo}#{id}"`); run → `3.3 ok — symbols=<K>`; commit.

### Task C4 (T3.4) · Doc ingest
**Interfaces:** `ingest_docs(repo_id, repo_path, doc_prefixes=("docs/","reference/","lessons/")) -> IngestStats`.
- [ ] `check_3_4()`: `(:Doc)-[:MENTIONS]->(:Symbol)` count>0 (e.g. `docs/contracts/memory-service.md` names `write_turn`); heading match → `DOCUMENTED_IN`; all docs have a `title`.
- [ ] Run → FAIL; implement (strip HTML, match symbol names/heading, path refs); run → `3.4 ok — docs=<D> mentions=<X>`; commit.

### Task C5 (T3.5) · `who_owns`
**Interfaces:** `who_owns(repo_id, path_or_symbol, limit=5) -> list[Owner]` (`Owner{person_id,name,commits,insertions,deletions,last_touched,file_ids}`).
- [ ] `check_3_5()`: `who_owns("graphhacks","docs/decisions.md")` → ≥1 owner, `commits>=1`; unknown → `[]`; `limit=10000` → `<=100`.
```cypher
MATCH (f:File) WHERE f.id=$target OR f.path=$target RETURN DISTINCT f.id AS fileId, f.path AS path
UNION MATCH (f:File)-[:DEFINES]->(s:Symbol) WHERE s.id=$target OR s.name=$target
RETURN DISTINCT f.id AS fileId, f.path AS path
```
```cypher
MATCH (p:Person)-[:AUTHORED]->(c:Commit)-[m:MODIFIED]->(f:File)
WHERE f.id IN $fileIds AND ($repo='' OR f.repo=$repo)
RETURN p.id AS personId, p.name AS name, count(DISTINCT c) AS commits,
       sum(m.insertions) AS insertions, sum(m.deletions) AS deletions,
       max(m.at) AS lastTouched, collect(DISTINCT f.id) AS fileIds
ORDER BY commits DESC, lastTouched DESC LIMIT <clamped int>
```
- [ ] Run → FAIL; implement (W1→W2, clamp `1..100`); run → `3.5 ok`; commit.

### Task C6 (T3.6) · `trace_why`
**Interfaces:** `trace_why(symbol_or_file) -> Trace` (`Trace{target_id,kind,doc_paths,sources:[TraceSource{doc_id,doc_path,doc_title,commit_id,subject,at,person_id,person_name}]}`).
```cypher
MATCH (e:Symbol) WHERE e.id=$target OR e.name=$target OPTIONAL MATCH (e)-[:DOCUMENTED_IN]->(d:Doc)
RETURN e.id AS id,'Symbol' AS kind, collect(DISTINCT d.id) AS docIds
UNION MATCH (e:File) WHERE (e.id=$target OR e.path=$target) AND NOT e:Doc OPTIONAL MATCH (e)-[:DOCUMENTED_IN]->(d:Doc)
RETURN e.id AS id,'File' AS kind, collect(DISTINCT d.id) AS docIds
UNION MATCH (e:Doc) WHERE e.id=$target OR e.path=$target RETURN e.id AS id,'Doc' AS kind,[e.id] AS docIds
```
```cypher
MATCH (d:Doc) WHERE d.id IN $docIds
OPTIONAL MATCH (c:Commit)-[:MODIFIED]->(d) OPTIONAL MATCH (p:Person)-[:AUTHORED]->(c)
RETURN DISTINCT d.id AS docId,d.path AS docPath,d.title AS docTitle,c.id AS commitId,
       c.subject AS subject,c.at AS at,p.id AS personId,p.name AS personName
ORDER BY at DESC LIMIT <clamped int>
```
- [ ] `check_3_6()`: `trace_why("docs/contracts/memory-service.md")` → `kind=="Doc"`, ≥1 source with `commit_id`+`person_id`; `trace_why("write_turn")` → `kind=="Symbol"`, `doc_paths` non-empty; every `source.doc_path` truthy (100% cited).
- [ ] Run → FAIL; implement; run → `3.6 ok — trace_docs=<R> cited=100%`; commit.

### Task C7 (T3.7) · `detect_drift`
**Interfaces:** `detect_drift(repo_id, since_epoch=None) -> DriftReport` (`DriftReport{repo_id,since,spec_drift:[DriftItem],doc_drift:[DriftItem]}`).
- [ ] `check_3_7()`: fixture — a `:File {present:false}` modified after `since` with no `MENTIONS`, and a `:Symbol {present:false}` with a `(:Doc)-[:MENTIONS]->` in-edge; both appear; default `since=max(at)-30d`.
```cypher
-- window
MATCH (c:Commit) WHERE $repo='' OR c.repo=$repo RETURN max(c.at) AS maxAt
-- spec-drift files
MATCH (:Person)-[:AUTHORED]->(c:Commit)-[m:MODIFIED]->(f:File)
WHERE ($repo='' OR f.repo=$repo) AND m.at>=$since
WITH f, max(m.at) AS lastTouched WHERE NOT (f)<-[:MENTIONS]-(:Doc)
RETURN 'file' AS kind, f.id AS id, f.path AS path_or_name, lastTouched ORDER BY lastTouched DESC
-- doc-drift (removed symbol)
MATCH (d:Doc)-[:MENTIONS]->(s:Symbol {present:false}) WHERE $repo='' OR s.repo=$repo
RETURN 'removed-symbol' AS kind, s.id AS id, s.name AS path_or_name, collect(DISTINCT d.path) AS docPaths
```
- [ ] Run → FAIL; implement D0–D3; run → `3.7 ok — spec_drift=<S> doc_drift=<U>`; commit.

### Task C8 (T3.8) · Exit criterion + rule-3 flip
- [ ] `main()` clears `company:brain`, ingests this repo (`repo_id="graphhacks"`, root from `git rev-parse --show-toplevel`), runs every resolver, prints one line.
- [ ] Run exit criterion → exit 0; commit.

**Exit criterion:**
```bash
cd backend && uv run python scripts/verify_track3.py
```
Expected: `track3 OK — repo=graphhacks people=1 commits=<N> files=<M> symbols=<K> docs=<D> owners=1 trace_docs=<R> spec_drift=<S> doc_drift=<U> cited=100%`, exit 0. Rule-3: with FalkorDB stopped → non-zero connection error.

---

## Phase D — UI, compose, ship

### Task F4 · Three-track UI (reuse only)
**Files:** Create `src/panels/Track01Studio.tsx`, `src/panels/Track03Brain.tsx`, `src/data/trackViews.ts`; Modify `src/shared/types.ts`, `src/panels/Header.tsx`, `src/panels/ControlPanel.tsx`, `src/App.tsx`.
- `TrackId='track02'|'track01'|'track03'`; `deriveTrack01Tools/deriveTrack01Trace/deriveTrack03Entities/deriveTrack03Answer` are **read-only projections** of the real tenant graph (no new backend algorithms; labelled "borrowed schema"). Reuse `GraphCanvas`/`NodeInspector`.
- [ ] Add tabs; `npm run build` green; manual: tenant switch resets selection; Track 01/03 tabs render; select jumps to cockpit.
- [ ] Commit: `feat(ui): reuse cockpit for Track 01/03 views + tenant switcher (F4); verify: npm run build exit 0`.

### Task F5 · `docker-compose.yml` (D4)
**Files:** Create `docker-compose.yml`, `backend/Dockerfile`, `Dockerfile` (frontend → nginx), `deploy/nginx.conf` (`/api/ → backend:8000`); Modify `.env.example` (document compose env, no secrets).
- [ ] `docker compose up --build` → `:5173` renders from the containerized FalkorDB.
- [ ] Rule-3 in-compose: `docker compose stop falkordb` → `ErrorScreen`; `start` → `Retry` renders.
- [ ] `docker compose config` validates; commit.

### Task S1 · Submission packet (rule 10/11)
**Files:** Create `README.md`, `queries.cypher`; (video + deployment per D4).
- [ ] README: setup, **graph data model** (the four tiers + three named graphs), the three track write-ups, AI-assistant disclosure (rule 11).
- [ ] `queries.cypher`: the real Cypher each track depends on (tenant tiers, PageRank/SPpaths/blast-radius, who_owns/trace_why/drift).
- [ ] Demo video (3-min script: rule-3 flip → Track 02 → Track 01 → Track 03); local setup instructions (compose).
- [ ] Rehearse the rule-12 explanation cold.
- [ ] Commit: `docs(submission): README + data model + queries.cypher + AI disclosure (rule 10/11); verify: all six items present`.

---

## Exit-criteria summary

| Task | Command | Expected |
|---|---|---|
| A0 | `uv run python scripts/verify_t0_engine.py` | `h0 ok ...` exit 0 |
| A1 | `uv run python scripts/verify_t2_3.py` | `semantic=1 facts=1 source=ok` |
| A2 | `uv run python scripts/verify_t2_4.py` | `workflow=1 steps=3 start=ingest` |
| A3 | `uv run python scripts/verify_t3_1.py` | `handoffs=1 edge=1` |
| A4 | `uv run python scripts/verify_t3_2.py` | `tenant_a=3 tenant_b=0` |
| A5 | `uv run python scripts/verify_t3_3.py` | `writers=16 distinct=16 same=1` |
| F2 | `curl '.../api/graph/nodes?tenant=...'` | `200` up / `503` down |
| F3 | stop FalkorDB + reload `:5173` | `ErrorScreen` |
| B3 | `uv run python scripts/verify_track1.py` | `TRACK1 OK` exit 0 |
| C8 | `uv run python scripts/verify_track3.py` | `track3 OK ... cited=100%` |
| F5 | `docker compose up --build` | `:5173` renders; stop→ErrorScreen |
| S1 | manual | all six rule-10 items + disclosure |

## Self-review notes
- **Coverage:** every spec requirement maps to a task (H0→A0, Track 02→A1–A5, rule-3→F2/F3, Track 01→B0–B3, Track 03→C1–C8, UI/compose/ship→F4/F5/S1).
- **Type consistency:** graph-key helpers are `db.repo_graph_key` / `db.BRAIN_GRAPH` / `db.named_graph` everywhere (Track 01's ad-hoc `code_graph_key` removed); `ensure_indexes` is the single index path for A0/A1/C1.
- **Open implementation choices deferred to the builder:** `graph_sync` batch sizes; `is_test_file` regex already fixed; `who_owns` tie-break already fixed (`commits DESC, lastTouched DESC`).
