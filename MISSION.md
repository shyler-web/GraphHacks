# Mission: Ship a winning GraphHacks Track 02 project

## Why
Win the WeMakeDevs × FalkorDB **Graph Hacks** hackathon (Oct 15–18, 2026) in **Track 02 — Agent Memory and Coordination**. The prize is a PS5 + GTA VI, and more importantly a portfolio-grade, explainable multi-agent memory system. The user generated the foundation (`graphsync_multi_agent_falkordb_memory_cockpit.tsx`) with AI acceleration and has low clarity on the underlying concepts.

## Success looks like
- Runs a **real FalkorDB instance** (Docker) as the load-bearing context layer — not a simulation.
- Demonstrates the five Track 02 key-focus points, each with runnable evidence:
  - Episodic, semantic, and procedural memory
  - Persistent conversation history
  - Shared state and handoffs between agents
  - High-concurrency reads and writes
  - Separate memory per user or tenant
- Submits a public repo with README + **graph data model**, the real **Cypher queries**, a demo video, and a live deployment (or full local setup).
- The user can **explain the graph model, queries, architecture, and technical decisions** on demand (required by rule 12).
- User can **debug and direct AI** to extend the system without hand-holding.

## Constraints
- **Solo**, **limited hours** before Oct 18 11:59 PM IST.
- New to: graph databases/Cypher, LLM agent memory, React/TS.
- Not chasing extreme theoretical depth — enough to engineer, debug, and direct AI.
- Learning preference: short self-contained HTML lessons, one tangible win each.

## Out of scope
- Advanced graph algorithms (PageRank, community detection) beyond what the demo uses.
- Track 01 (acting on data) and Track 03 (Company Brain) — may borrow, not target.
- Production hardening, auth, billing, horizontal scaling.
- Deep React internals; the cockpit UI is a given, not the subject.
