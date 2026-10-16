---
name: track02-build
description: The build order, stack, and key-focus map for the GraphHacks Track 02 submission. Use when starting or resuming build work, wiring FalkorDB, or checking what to do next.
---

# Track 02 Build

## Locked stack
FalkorDB (memory) · Node/TS backend (Fastify/Express + `falkordb` npm) · React/Vite frontend · Gemini LLM · Tavily tool · MCP (FalkorDB + Tavily) · LangSmith traces · hand-rolled orchestrator. Full records: `docs/decisions.md`.

## Build order (authoritative: `reference/insight.html` §4)
- **T0** Groundwork: `git init` (done), kill root↔`src/` duplicate, AGENTS.md ALWAYS block (done).
- **T1** Real graph: run FalkorDB, debug drill, `npm run health`, write+read a node.
- **T2** Memory model: contract + schema, then episodic → semantic → procedural.
- **T3** Coordination: handoffs, per-tenant isolation, concurrency test.
- **T4** Wire & ship: `/api/graph/nodes`, rule-3 flip, explainable answers, submission packet.

## Five key-focus points to prove (the judging criteria)
Episodic / semantic / procedural memory · persistent history · shared state & handoffs · high-concurrency reads/writes · separate memory per tenant. Each needs a runnable artifact — see `reference/track02-checklist.html`.

## Non-negotiables
- Rule 3: stopping FalkorDB must break the app.
- Rule 10: repo, README + data model, `queries.cypher`, demo video, deployment/local setup, track name.
- Rule 11: disclose AI use. Rule 12: you can explain the model, queries, and decisions.

Each task is a spec card (`prompt-playbook` skill); verify per change (`verify-change` skill).
