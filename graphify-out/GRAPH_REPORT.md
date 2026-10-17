# Graph Report - GraphHacks  (2026-10-17)

## Corpus Check
- 75 files · ~199,075 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .css 3, .example 1, (none) 1)

## Summary
- 725 nodes · 1120 edges · 59 communities (33 shown, 26 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 157 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cbcd63dc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graph Hacks Track 02 Resources
- The Engineer's Prompt Playbook
- Three-tier memory model
- package.json
- MemoryService
- App() — god node
- bash
- One Graph Per Tenant
- App.tsx
- Track 02 Feature Set
- Debug Drill 0001 — FalkorDB on port 6379 is unreachable
- compilerOptions
- GraphHacks — Track 02 (Agent Memory and Coordination)
- Handoff Ledger
- GraphSync — Multi-Agent FalkorDB Memory Cockpit
- spec-card.js
- GraphHacks Nexus — Three-Track Implementation Plan
- PRODUCED / READS Edges
- Append-over-Rewrite
- Track 02 Glossary
- Context budget
- Reproduce (repro)
- Root cause
- Rule 11 — Disclose AI Assistant Use
- Rule 12 — Understand and Explain Submitted Code
- service.ts
- db.py
- named_graph
- Decision Records — GraphHacks Track 02
- Agent memory
- GraphHacks Nexus — Three-Track Design
- Lesson 0005 — Semantic Memory: Facts and Entities
- Track 02 Build
- Track 02 Curriculum
- Verify Every Step
- memory-service.types.ts
- Prompt Playbook
- Graph database
- main.py
- Memory Service Contract
- Lesson 0010 — Wiring the Cockpit to Real FalkorDB
- Five-Part Spec Card
- Handoff
- Node Backend Route /api/graph/nodes
- Cypher Path Returned as a Value
- verify_t0_engine.py
- graphhacks-backend

## God Nodes (most connected - your core abstractions)
1. `MemoryService` - 32 edges
2. `App()` - 25 edges
3. `ContractModel` - 22 edges
4. `Three-tier memory model` - 19 edges
5. `FalkorDBConfig` - 17 edges
6. `compilerOptions` - 16 edges
7. `3. Function signatures` - 14 edges
8. `named_graph()` - 12 edges
9. `MemoryService` - 12 edges
10. `App() — god node` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Task A0 (M-01) · H0 foundation: named-graph router, index provisioner, D10` --references--> `FalkorDBConfig`  [INFERRED]
  docs/superpowers/plans/2026-10-17-nexus-three-tracks.md → backend/app/config.py
- `2 · Architecture` --references--> `repo_graph_key()`  [INFERRED]
  docs/superpowers/specs/2026-10-17-nexus-three-tracks-design.md → backend/app/db.py
- `D10 · Named-graph topology: tenant / code / company graphs` --references--> `named_graph()`  [INFERRED]
  docs/decisions.md → backend/app/db.py
- `GraphHacks Nexus — Three-Track Implementation Plan` --references--> `named_graph()`  [INFERRED]
  docs/superpowers/plans/2026-10-17-nexus-three-tracks.md → backend/app/db.py
- `Task A1 (T2.3) · Semantic memory` --references--> `ensure_indexes()`  [INFERRED]
  docs/superpowers/plans/2026-10-17-nexus-three-tracks.md → backend/app/db.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Autonomy Tier Ladder** — lessons_0109_roles_and_autonomy_tier1_interactive, lessons_0109_roles_and_autonomy_tier2_bounded_sprint, lessons_0109_roles_and_autonomy_tier3_unattended [EXTRACTED 1.00]
- **Sequential learning path 0001-0006** — lessons_0001_falkordb_up_in_ten_minutes, lessons_0002_cypher_for_memory, lessons_0003_three_tier_memory_model, lessons_0004_episodic_conversation_history, lessons_0005_semantic_memory_facts, lessons_0006_procedural_memory_playbooks [EXTRACTED 1.00]
- **Persisted Handoff Ledger Pattern** — glossary_handoff, lessons_0007_multi_agent_handoffs_handoff_ledger, lessons_0007_multi_agent_handoffs_shared_memory, lessons_0007_multi_agent_handoffs_handed_to_edge [EXTRACTED 1.00]
- **The Engineer's Seven Habits** — glossary_systems_thinking, lessons_0104_engineer_the_context_context_engineering, lessons_0101_the_engineers_prompt_decomposition, lessons_0101_the_engineers_prompt_scientific_debugging, lessons_0101_the_engineers_prompt_per_step_verification, lessons_0101_the_engineers_prompt_decision_making [EXTRACTED 1.00]
- **Systems Thinking Lenses** — lessons_0102_think_in_systems_boundaries_interfaces, lessons_0102_think_in_systems_feedback_loops, lessons_0102_think_in_systems_emergence, lessons_0102_think_in_systems_resilience [EXTRACTED 1.00]
- **Spec-Build-Verify Gate Flow** — reference_prompt_playbook_build_loop, glossary_spec_card, lessons_0107_verify_every_step_per_action_verification, lessons_0110_write_for_future_you_decision_bearing_commit [INFERRED 0.75]
- **Three-Tier Memory Model Composition** — glossary_three_tier_memory_model, reference_graph_schema_turn, reference_graph_schema_entity, reference_graph_schema_workflow [INFERRED 0.85]

## Communities (59 total, 26 thin omitted)

### Community 0 - "Graph Hacks Track 02 Resources"
Cohesion: 0.15
Nodes (15): Learner Initial State Record, Mission: Ship a winning GraphHacks Track 02 project, Functional deployed Track 02 demo, Graph data model deliverable, WeMakeDevs x FalkorDB Graph Hacks hackathon, Track 02 — Agent Memory and Coordination, Teaching notes, graphify-out/graph.json codebase graph (+7 more)

### Community 1 - "The Engineer's Prompt Playbook"
Cohesion: 0.06
Nodes (48): Exit criterion, Reversible decision, Spec card, Five-Point Spec Card, Compounding Error, Evidence Before Assertions, Health-Check Command, Per-Action Verification (+40 more)

### Community 2 - "Three-tier memory model"
Cohesion: 0.19
Nodes (17): Three-tier memory model, MERGE for Idempotent Writes, Agent-Memory Cypher Snippets, MERGE Clause, Agent Node, Entity Node, Fact Node, Graph Database AI Agents: GraphRAG & Memory Guide — FalkorDB (+9 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (36): dependencies, falkordb, lucide-react, react, react-dom, devDependencies, autoprefixer, postcss (+28 more)

### Community 4 - "MemoryService"
Cohesion: 0.06
Nodes (35): FalkorDBConfig, MemoryService, Agent, ContractModel, Entity, Fact, Handoff, QueryEntitiesQuery (+27 more)

### Community 5 - "App() — god node"
Cohesion: 0.13
Nodes (26): App() — god node, callGeminiWithBackoff · resilient LLM calls (retry + backoff), Canvas Graph View, Controls · Maturity Dial L0–L5 + Domain Lenses, Cypher Traversal · liveCypherQuery, Episodic Memory (past interactions, timestamped), FalkorDB Instance · multi-graph topology, Gemini API (external LLM) (+18 more)

### Community 6 - "bash"
Cohesion: 0.06
Nodes (36): agent, cypher-reviewer, cat .env*, cat *.key, cat *.pem, git push *, rm -rf /*, description (+28 more)

### Community 7 - "One Graph Per Tenant"
Cohesion: 0.18
Nodes (12): Lesson 0007 — Multi-Agent Coordination and Handoffs, Isolation vs. Cross-Tenant Analytics Trade-off, Lesson 0008 — Per-Tenant Isolation with Multi-Graph, Memory Node, FalkorDB Multi-Graph / Multi-Tenant Topology, One Graph Per Tenant, select_graph / selectGraph, Avoid a Single Hot Node (+4 more)

### Community 8 - "App.tsx"
Cohesion: 0.07
Nodes (47): Task F2 (T4.1) · FastAPI graph routes + cockpit seed, Task F4 · Three-track UI (reuse only), lucide-react, App(), DEFAULT_TENANT_KEY, getFirstNodeId(), getInitialTenants(), addFeatureStack() (+39 more)

### Community 9 - "Track 02 Feature Set"
Cohesion: 0.14
Nodes (16): Multi-graph / multi-tenant topology, FalkorDB-Is-Load-Bearing Check, De-Scope List, Differentiators, Track 02 Feature Set, Required MVP Features, Submission Artifacts (rule 10), The Three-Tier Trick (+8 more)

### Community 10 - "Debug Drill 0001 — FalkorDB on port 6379 is unreachable"
Cohesion: 0.22
Nodes (8): Debug Drill 0001 — FalkorDB on port 6379 is unreachable, Expected, Fix, Generalizes to, Hypotheses, Observed, Repro (minimal, ordered, paste-able), Root cause (for the reproduced case)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 12 - "GraphHacks — Track 02 (Agent Memory and Coordination)"
Cohesion: 0.04
Nodes (47): AI disclosure, ALWAYS — locked context (do not reopen without recording a decision), Commands, Context graph — use graphify FIRST, Git workflow — commit and push continuously, GraphHacks — Track 02 (Agent Memory and Coordination), Security — non-negotiable, Stack (+39 more)

### Community 13 - "Handoff Ledger"
Cohesion: 0.22
Nodes (9): Handoff Ledger, Persisted State Beats Message Passing, handleRunMultiAgentPrompt, 2-Minute Demo Video, queries.cypher Artifact, README with Graph Data Model, Rule 10 — Submission Contents, Rule 3 — Graph Must Be Load-Bearing (+1 more)

### Community 14 - "GraphSync — Multi-Agent FalkorDB Memory Cockpit"
Cohesion: 0.40
Nodes (6): FalkorDB, GraphSync — Multi-Agent FalkorDB Memory Cockpit, GraphSync index.html, Multi-Agent Memory, Root Mount Element, src/main.tsx entry module

### Community 16 - "GraphHacks Nexus — Three-Track Implementation Plan"
Cohesion: 0.10
Nodes (19): Exit-criteria summary, Global Constraints, GraphHacks Nexus — Three-Track Implementation Plan, Phase B — Track 01: Connected-Data Action Engine, Phase C — Track 03: Company Brain, Phase D — UI, compose, ship, Task B0 · Refresh the AST graph, Task B1 · `backend/app/graph_sync.py` — graph.json → `code:<repoId>` (+11 more)

### Community 28 - "service.ts"
Cohesion: 0.11
Nodes (11): port, base, memory, port, roles, createMemoryService(), MemoryServiceOptions, Params (+3 more)

### Community 30 - "named_graph"
Cohesion: 0.18
Nodes (13): ensure_indexes(), named_graph(), repo_graph_key(), tenant_graph(), D10 · Named-graph topology: tenant / code / company graphs, Phase A — Foundation + Track 02 anchor (must-win), Self-review notes, Task A0 (M-01) · H0 foundation: named-graph router, index provisioner, D10 (+5 more)

### Community 31 - "Decision Records — GraphHacks Track 02"
Cohesion: 0.18
Nodes (10): D1 · Backend + agent language: Node.js + TypeScript, D2 · Multi-agent orchestration: hand-rolled workflow first, D3 · Observability: LangSmith, D4 · Deployment: local Docker Compose first, cloud second, D5 · Memory model: three-tier in one connected graph, D6 · Memory-service contract & schema location, D7 · TypeScript execution & backend layout, D8 · Backend + agents language: Python (supersedes D1) (+2 more)

### Community 32 - "Agent memory"
Cohesion: 0.20
Nodes (14): Agent memory, Cypher, MERGE, Lesson 0002 — Cypher for Memory, Five Cypher memory clauses (CREATE, MERGE, MATCH, WHERE, RETURN), MERGE as the memory-write primitive, Cross-tier linking edges, Node families of the memory model (+6 more)

### Community 33 - "GraphHacks Nexus — Three-Track Design"
Cohesion: 0.18
Nodes (9): tenant_graph_key(), 0 · Reality check (what this design corrects), 1 · Positioning — one repo, three entries, one load-bearing graph, 2 · Architecture, 3 · Decisions, 4 · Verification gates (all tasks), 5 · Risks, 6 · Task-ID map (+1 more)

### Community 34 - "Lesson 0005 — Semantic Memory: Facts and Entities"
Cohesion: 0.33
Nodes (9): GraphRAG, LLM entity/relationship extraction into MERGE, Provenance edges (MENTIONED_IN), Lesson 0005 — Semantic Memory: Facts and Entities, Playbook Guardrail, Lesson 0006 — Procedural Memory: Reusable Playbooks, Task-type lookup / guardrail, Workflow subgraph (Workflow -HAS_STEP-> Step -USES-> Tool) (+1 more)

### Community 35 - "Track 02 Build"
Cohesion: 0.33
Nodes (5): Build order (authoritative: `reference/insight.html` §4), Five key-focus points to prove (the judging criteria), Locked stack, Non-negotiables, Track 02 Build

### Community 36 - "Track 02 Curriculum"
Cohesion: 0.22
Nodes (9): Track 02 Curriculum, Milestone A — Get a Real Graph Running, Milestone B — The Three-Tier Memory Model, Milestone C — Coordination and Scale, Milestone D — Ship It, CREATE Clause, FalkorDB Cypher, Cypher Gotchas (+1 more)

### Community 37 - "Verify Every Step"
Cohesion: 0.40
Nodes (4): Rules, The loop, This project's checks, Verify Every Step

### Community 38 - "memory-service.types.ts"
Cohesion: 0.05
Nodes (31): Next: T2.2 spec card, Agent, Entity, EpochSeconds, Fact, Handoff, HandoffStatus, MemoryService (+23 more)

### Community 48 - "Graph database"
Cohesion: 0.32
Nodes (8): Lesson Template, Edge (relationship), Graph database, Node, Real FalkorDB instance (Docker), Lesson 0001 — FalkorDB Up in Ten Minutes, FalkorDB speaks the Redis protocol on port 6379, Connection Usage

### Community 50 - "Memory Service Contract"
Cohesion: 0.29
Nodes (7): Append a Turn, Don't Rewrite a Session, Turn Appended to Session, Interface-First Contract, Memory Service Contract, recall_turns(user, topic), record_handoff(from, to, reason), write_turn(user, session, text)

### Community 51 - "Lesson 0010 — Wiring the Cockpit to Real FalkorDB"
Cohesion: 0.29
Nodes (7): Cockpit Simulation (INITIAL_TENANTS), Lesson 0010 — Wiring the Cockpit to Real FalkorDB, Lesson 0011 — Explainable Answers: Show the Path, Lesson 0012 — Shipping the Winning Submission, Blast Radius, App Data Flow Map, Failure-Mode Analysis

### Community 52 - "Five-Part Spec Card"
Cohesion: 0.29
Nodes (7): liveCypherQuery, Exit Criterion (Verifiable Check), Five-Part Spec Card, Locked Decisions, Out of Scope, Spec-Card Builder Widget, Verification Step

### Community 53 - "Handoff"
Cohesion: 0.33
Nodes (6): Handoff, 4-Agent Squad, HANDED_TO Edge, Idempotent MERGE Write, Idempotent MERGE Writes, Documented GAP: shared multi-agent handoff patterns

### Community 54 - "Node Backend Route /api/graph/nodes"
Cohesion: 0.33
Nodes (6): falkordb-ts Node Client, graph.query() API, handleApplySeniorFix, Node Backend Route /api/graph/nodes, FalkorDB Speaks RESP over TCP, Vite Dev-Server Plugin (configureServer)

### Community 55 - "Cypher Path Returned as a Value"
Cohesion: 0.33
Nodes (6): Explainable Answer Payload, Cypher Path Returned as a Value, Path Functions (nodes/relationships/length), Provenance via Event Node Timestamp, shortestPath, Answer Subgraph

## Ambiguous Edges - Review These
- `Canvas Graph View` → `FalkorDB Instance · multi-graph topology`  [AMBIGUOUS]
  architecture-diagram.svg · relation: references

## Knowledge Gaps
- **94 isolated node(s):** `graphhacks-backend`, `@types/node`, `@types/react`, `@types/react-dom`, `autoprefixer` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 327 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `App.tsx` to `GraphHacks — Track 02 (Agent Memory and Coordination)`, `App() — god node`?**
  _High betweenness centrality (0.361) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `MemoryService` (e.g. with `FalkorDBConfig` and `Entity`) actually correct?**
  _`MemoryService` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `graphhacks-backend`, `@types/node`, `@types/react` to the rest of the system?**
  _94 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `The Engineer's Prompt Playbook` be split into smaller, more focused modules?**
  _Cohesion score 0.05851063829787234 - nodes in this community are weakly interconnected._
- **Why does `GraphHacks — Track 02 (Agent Memory and Coordination)` connect `GraphHacks — Track 02 (Agent Memory and Coordination)` to `App.tsx`?**
  _High betweenness centrality (0.351) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App()` (e.g. with `GraphHacks — Track 02 (Agent Memory and Coordination)` and `getInitialTenants()`) actually correct?**
  _`App()` has 2 INFERRED edges - model-reasoned connections that need verification._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Canvas Graph View` and `FalkorDB Instance · multi-graph topology`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._