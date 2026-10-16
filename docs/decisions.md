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
