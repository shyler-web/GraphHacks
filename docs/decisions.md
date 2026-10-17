# Decision Records — GraphHacks Track 02

One record per expensive-to-reverse decision. Format per lesson 0108: **Decision · Why · Alternatives · Reversibility · Revisit if**. Append, don't rewrite history (lesson 0110).

---

## D1 · Backend + agent language: Node.js + TypeScript

- **Decision:** The agent backend and memory service are Node.js + TypeScript, served to the existing Vite/React cockpit.
- **Why:** The frontend is already TS. One language means one toolchain, one debug surface, and AI writes it more reliably for a solo beginner under a deadline. The official `falkordb` npm client is first-class. The Track 02 prize is the *graph memory*, not the framework — minimize everything else.
- **Alternatives:** Python + LangGraph (richest agent-memory examples, but a second language to debug solo); Go/Rust (fast, but no example ecosystem).
- **Reversibility:** Expensive. The memory service contract (lesson 0105) is language-agnostic, so a later Python port is possible but costly.
- **Revisit if:** a must-have memory integration only ships Python.

## D2 · Multi-agent orchestration: hand-rolled workflow first

- **Decision:** Implement the 4-agent flow as a small, explicit state machine whose state is persisted in FalkorDB. Do **not** adopt a framework up front.
- **Why:** Frameworks are the #1 beginner trap (a complex framework you use 10% of breaks the simple thing you need). A hand-rolled loop is fully debuggable and makes the graph — not the framework — the star. LangGraph's checkpointer is the only feature we'd miss; FalkorDB is our checkpointer.
- **Alternatives:** LangGraph / LangGraph.js (nice story, heavier to debug); Mastra (TS-first, batteries included); CrewAI.
- **Reversibility:** Cheap-ish. The orchestrator sits behind the `runAgents()` boundary (lesson 0105); swap later.
- **Revisit if:** we need cycles + human-in-the-loop + time-travel debugging and have spare time.

## D3 · Observability: LangSmith

- **Decision:** Trace every LLM call and tool call with LangSmith.
- **Why:** Solo beginner + async agent loop = debugging by trace is the only tractable path. The user already holds $50 LangSmith credits. Traces turn "it hangs" into "step 6 returned malformed JSON".
- **Alternatives:** Langfuse (OSS, self-host, free — strong fallback); Helicone; logs only.
- **Reversibility:** Easy. Instrumentation is thin; swapping to Langfuse is a small change.
- **Revisit if:** credits run out or we need self-hosting.

## D4 · Deployment: local Docker Compose first, cloud second

- **Decision:** Ship the demo as `docker compose up` (FalkorDB + backend + frontend) with a demo video; move to cloud only after the local demo is proven.
- **Why:** Rule 10 allows "complete local setup instructions" instead of a live deployment. Local-first removes an entire class of network/env failures and protects the deadline. Cloud is a stretch goal, not the critical path.
- **Alternatives:** FalkorDB Cloud + Render/Railway (backend) + Vercel (frontend) from day one.
- **Reversibility:** Easy — the app is containerized either way.
- **Revisit if:** the local demo passes and we have 12+ hours left.

## D5 · Memory model: three-tier in one connected graph

- **Decision:** Episodic, semantic, and procedural memory live in **one** graph (a Turn links to an Entity links to a Workflow), one named graph per tenant.
- **Why:** The winning move per `reference/features.html` — three separate stores look like three demos; one connected graph looks like a memory *system*. Matches all Track 02 key-focus points.
- **Alternatives:** three separate stores; vector-only memory.
- **Reversibility:** Expensive (schema).
- **Revisit if:** a key-focus point can't be expressed in one graph.

## D6 · Memory-service contract & schema location

- **Decision:** All three memory tiers plus coordination go through one `MemoryService` interface, defined by a language-agnostic contract at `docs/contracts/memory-service.md` with compilable TypeScript types at `docs/contracts/memory-service.types.ts`. Every call takes `tenant` first and resolves to the graph key `tenant:<tenantId>` (D5). The node/edge vocabulary is fixed to the minimal set in `reference/graph-schema.html`; ambiguities in that reference are resolved explicitly in the contract's §5. Implementation lands in T2.2–T2.4; T2.1 is design only.
- **Why:** A single typed boundary lets each tier be built and verified independently (T2.2 episodic, T2.3 semantic, T2.4 procedural) while keeping the "one connected graph" story intact. Writing the contract before the queries prevents ad-hoc Cypher from drifting from the schema and gives the builder an exit criterion per function. It also keeps the service language-agnostic, so D1's later-port escape hatch stays open.
- **Alternatives:** three separate stores (looks like three demos, loses the winning move); vector-only memory (no typed edges, no explainable path); schema-in-UI only (no testable boundary, queries drift); no contract — ad-hoc queries per feature (fastest to start, most expensive to keep consistent).
- **Reversibility:** Cheap-ish. The contract is a document plus types; implementations sit behind the `MemoryService` boundary and can be swapped. Changing the *schema* itself is expensive (see D5).
- **Revisit if:** a key-focus point can't be expressed through these signatures, a vector/embedding requirement forces a different recall path, or the TS runtime choice (Node 18 vs a TS runner) makes the type-only contract impractical to implement.

## D7 · TypeScript execution & backend layout

- **Decision:** Run the backend/memory TypeScript directly with **`tsx`** (a dev dependency) on the host's Node 18; add `npm run typecheck` = `tsc --noEmit` covering `src/`, `server/`, `scripts/`, and `docs/contracts/`; backend and memory code live under **`server/`**. The canonical memory types remain at `docs/contracts/memory-service.types.ts` (D6) and are imported by the implementation.
- **Why:** The host is Node v18.19.1 and `falkordb@6.8.0` only *warns* (`engines.node >= 22`); it installed and ran. `tsx` gives real `.ts` with no build step and the fastest edit-run loop, matching D1 (Node/TS) and the deadline. Because `tsx` strips types without checking them, a separate `tsc --noEmit` (`npm run typecheck`) is added so the contract is still enforced.
- **Alternatives:** `.mjs` + JSDoc types (no new dependency, weaker/less idiomatic typing); `tsc` compile → run `.js` (enforces types, but adds a build step to every run); upgrade Node to 22+ (built-in type stripping, but environment churn mid-hackathon).
- **Reversibility:** Easy. The runner and the typecheck command are thin wrappers; the code stays `.ts`.
- **Revisit if:** we upgrade to Node 22+ (built-in type stripping removes the need for `tsx`), or we need a production bundle/build for the backend.

## D8 · Backend + agents language: Python (supersedes D1)

- **Decision:** The backend, memory service, and agent orchestration are written in **Python** (FastAPI for HTTP, `falkordb` Python client for the graph, `uv` for dependency/venv management). The prior Node/TS implementation (`server/`, its verification scripts) is preserved under **`dump/node-backend/`** for future revert. The `MemoryService` contract (D6) and schema (D5) are unchanged; only the implementation language changes. The frontend stays React + Vite + TS and talks to the Python backend over HTTP/JSON.
- **Why:** The participant judges Python gives materially more clarity for the agent-memory/orchestration code and prefers it deliberately, accepting the rewrite cost. The contract was designed language-agnostic (D6) precisely so this port is possible; FalkorDB ships a first-class Python client. This is a conscious, recorded reversal of D1, not a silent change.
- **Alternatives:** stay on Node/TS (D1 — no port cost, but lower clarity for the participant); hybrid (Node for HTTP, Python for agents — two runtimes, worst of both).
- **Reversibility:** Expensive but bounded — the Node implementation is retained in `dump/`, and the contract is unchanged, so the tier-by-tier exit criteria (T2.2–T2.4) re-run identically against the Python implementation.
- **Revisit if:** the Python port cannot reach parity on a tier's exit criterion before the deadline, in which case restore `dump/node-backend/` and continue on Node.
- **⚠ Risk accepted:** this lands with < 36h to the deadline. The critical path (rule-3 wiring, T4.1/T4.2) must not be starved by the port; the port is done tier-by-tier with parity checks, never a big-bang swap.

## D9 · Frontend structure: modular cockpit under `src/`

- **Decision:** Decompose the single ~1,985-line `src/graphsync_multi_agent_falkordb_memory_cockpit.tsx` into a small module tree (data layer, graph view, panels, orchestration view, shared types/helpers), with a single **data-access seam** so the cockpit can read from the Python backend route instead of the hard-coded `INITIAL_TENANTS`. Behavior and visuals are unchanged during the split; the refactor keeps `npm run build` green at every step.
- **Why:** A monolith cannot be wired to a real backend cleanly, and the user wants modules that are easy to connect and replace. Isolating the data seam is the prerequisite for T4.2 (cockpit reads real route) and the rule-3 flip.
- **Alternatives:** leave the monolith and wire it in place (fastest to start, hardest to reason about and revert); rewrite the UI from scratch (throws away a working asset).
- **Reversibility:** Easy — pure refactor, fully reversible via git; no behavior change until the data seam is switched to the backend.
- **Revisit if:** the split destabilizes the build near the deadline, in which case freeze the module tree and wire the data seam in the smallest touching file.

## D10 · Named-graph topology: tenant / code / company graphs

- **Decision:** Extend the named-graph model (D5) beyond `tenant:<id>` with two additional projections on the same FalkorDB instance: **`code:<repoId>`** (Track 01 — the `graphify-out/graph.json` AST graph loaded as `(:File)`/`(:Symbol)` with `[:CALLS]`/`[:IMPORTS]`/`[:CONTAINS]`/`[:INHERITS]`) and **`company:brain`** (Track 03 — `(:Person)`/`(:Commit)`/`(:Doc)`/`(:File)`/`(:Symbol)`). All named-graph access goes through one router, `db.named_graph(graph_key)`; `tenant:<id>` is unchanged and remains the Track 02 isolation boundary. Track 01/03 read only their own graphs; no cross-graph reads.
- **Why:** Entering Tracks 01 and 03 from one repo requires more than per-tenant memory. Reusing the same instance + one router keeps the "graph does real work" story (rule 3) intact across all three tracks and avoids a second database or service. `code:`/`company:` are read-mostly projections rebuilt by an idempotent sync, so they do not threaten D5's tenant isolation.
- **Alternatives:** one giant graph with label prefixes (mixes tenant isolation into query filters — violates D5's "structural, not a `WHERE`"); a second FalkorDB instance per track (more moving parts, breaks the one-command demo, D4); local NetworkX only for Tracks 01/03 (fails rule 3 — the graph would not be load-bearing).
- **Reversibility:** Cheap-ish. The router is one function (`db.named_graph`); dropping a projection is a config change, and the sync scripts are idempotent. Tenant graphs are untouched.
- **Revisit if:** a projection cannot be expressed through the existing `MemoryService`/engine boundaries, the local demo's single-instance budget is exceeded, or rule 3 cannot be shown for a projection (in which case that track's entry is dropped, not faked).
- **Scope note (Track 03):** no GitHub token → built on local `git log` commits + on-disk docs + the AST graph only; PRs/issues are explicitly deferred.
