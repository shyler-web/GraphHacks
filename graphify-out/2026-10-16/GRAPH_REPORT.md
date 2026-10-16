# Graph Report - GraphHacks  (2026-10-16)

## Corpus Check
- 30 files · ~65,323 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .css 3, .example 1, (none) 1)

## Summary
- 466 nodes · 614 edges · 48 communities (25 shown, 23 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4a66c090`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Three-tier memory model
- The Engineer's Prompt Playbook
- Five-Part Spec Card
- package.json
- GraphHacks — Track 02 (Agent Memory and Coordination)
- App() — god node
- bash
- One Graph Per Tenant
- App
- Track 02 Curriculum
- App
- compilerOptions
- Graph Hacks Track 02 Resources
- Cypher Path Returned as a Value
- GraphSync — Multi-Agent FalkorDB Memory Cockpit
- spec-card.js
- getSvgCoords
- PRODUCED / READS Edges
- Append-over-Rewrite
- Track 02 Glossary
- Context budget
- Reproduce (repro)
- Root cause
- Rule 11 — Disclose AI Assistant Use
- Rule 12 — Understand and Explain Submitted Code
- handleCanvasPointerDown
- handleCanvasPointerUp
- Reproduce Reliably
- Decision Records — GraphHacks Track 02
- Memory Service Contract
- Handoff
- Node Backend Route /api/graph/nodes
- Track 02 Build
- Lesson 0010 — Wiring the Cockpit to Real FalkorDB
- Verify Every Step
- Progress — GraphHacks Track 02
- Prompt Playbook

## God Nodes (most connected - your core abstractions)
1. `Three-tier memory model` - 22 edges
2. `compilerOptions` - 16 edges
3. `App()` - 15 edges
4. `App()` - 15 edges
5. `Agent memory` - 13 edges
6. `App() — god node` - 12 edges
7. `Track 02 Curriculum` - 12 edges
8. `FalkorDB` - 11 edges
9. `GraphHacks — Track 02 (Agent Memory and Coordination)` - 10 edges
10. `Episodic Memory` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Episodic Memory` --composed_of--> `Turn Appended to Session`  [EXTRACTED]
  graphsync_multi_agent_falkordb_memory_cockpit.tsx → lessons/0009-high-concurrency.html
- `Bounded relational recall query` --reads--> `Episodic Memory`  [EXTRACTED]
  lessons/0004-episodic-conversation-history.html → graphsync_multi_agent_falkordb_memory_cockpit.tsx
- `Provenance edges (MENTIONED_IN)` --links_to--> `Episodic Memory`  [INFERRED]
  lessons/0005-semantic-memory-facts.html → graphsync_multi_agent_falkordb_memory_cockpit.tsx
- `Lesson Template` --templates--> `Lesson 0001 — FalkorDB Up in Ten Minutes`  [INFERRED]
  assets/lesson-template.html → lessons/0001-falkordb-up-in-ten-minutes.html
- `Lesson 0001 — FalkorDB Up in Ten Minutes` --references--> `FalkorDB`  [EXTRACTED]
  lessons/0001-falkordb-up-in-ten-minutes.html → graphsync_multi_agent_falkordb_memory_cockpit.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Autonomy Tier Ladder** — lessons_0109_roles_and_autonomy_tier1_interactive, lessons_0109_roles_and_autonomy_tier2_bounded_sprint, lessons_0109_roles_and_autonomy_tier3_unattended [EXTRACTED 1.00]
- **Sequential learning path 0001-0006** — lessons_0001_falkordb_up_in_ten_minutes, lessons_0002_cypher_for_memory, lessons_0003_three_tier_memory_model, lessons_0004_episodic_conversation_history, lessons_0005_semantic_memory_facts, lessons_0006_procedural_memory_playbooks [EXTRACTED 1.00]
- **Persisted Handoff Ledger Pattern** — glossary_handoff, lessons_0007_multi_agent_handoffs_handoff_ledger, lessons_0007_multi_agent_handoffs_shared_memory, lessons_0007_multi_agent_handoffs_handed_to_edge [EXTRACTED 1.00]
- **The Engineer's Seven Habits** — glossary_systems_thinking, lessons_0104_engineer_the_context_context_engineering, lessons_0101_the_engineers_prompt_decomposition, lessons_0101_the_engineers_prompt_scientific_debugging, lessons_0101_the_engineers_prompt_per_step_verification, lessons_0101_the_engineers_prompt_decision_making [EXTRACTED 1.00]
- **Systems Thinking Lenses** — lessons_0102_think_in_systems_boundaries_interfaces, lessons_0102_think_in_systems_feedback_loops, lessons_0102_think_in_systems_emergence, lessons_0102_think_in_systems_resilience [EXTRACTED 1.00]
- **Three-tier memory model** — graphsync_multi_agent_falkordb_memory_cockpit_episodic_memory, graphsync_multi_agent_falkordb_memory_cockpit_semantic_memory, graphsync_multi_agent_falkordb_memory_cockpit_procedural_memory [EXTRACTED 1.00]
- **Spec-Build-Verify Gate Flow** — reference_prompt_playbook_build_loop, glossary_spec_card, lessons_0107_verify_every_step_per_action_verification, lessons_0110_write_for_future_you_decision_bearing_commit [INFERRED 0.75]
- **4-Agent Multi-Agent Build Flow** — src_graphsync_multi_agent_falkordb_memory_cockpit_handle_run_multi_agent_prompt, src_graphsync_multi_agent_falkordb_memory_cockpit_call_gemini_with_backoff, src_graphsync_multi_agent_falkordb_memory_cockpit_multi_agent_squad, src_graphsync_multi_agent_falkordb_memory_cockpit_semantic_graph_nodes, src_graphsync_multi_agent_falkordb_memory_cockpit_playbook_guardrails [INFERRED 0.85]
- **Three-Tier Memory Model Composition** — glossary_three_tier_memory_model, reference_graph_schema_turn, reference_graph_schema_entity, reference_graph_schema_workflow [INFERRED 0.85]
- **Track 02 key-focus memory and coordination flow** — graphsync_multi_agent_falkordb_memory_cockpit_episodic_memory, graphsync_multi_agent_falkordb_memory_cockpit_semantic_memory, graphsync_multi_agent_falkordb_memory_cockpit_procedural_memory, glossary_handoff, glossary_multi_graph_topology [INFERRED 0.85]
- **Maturity Dial x Domain Lens Graph View** — src_graphsync_multi_agent_falkordb_memory_cockpit_app, src_graphsync_multi_agent_falkordb_memory_cockpit_persona_levels, src_graphsync_multi_agent_falkordb_memory_cockpit_domain_lenses, src_graphsync_multi_agent_falkordb_memory_cockpit_visible_nodes, src_graphsync_multi_agent_falkordb_memory_cockpit_live_cypher_query [INFERRED 0.95]
- **Three-Tier FalkorDB Memory Model** — src_graphsync_multi_agent_falkordb_memory_cockpit_initial_tenants, src_graphsync_multi_agent_falkordb_memory_cockpit_falkordb_agent_memory, src_graphsync_multi_agent_falkordb_memory_cockpit_playbook_guardrails, src_graphsync_multi_agent_falkordb_memory_cockpit_semantic_graph_nodes [INFERRED 0.95]

## Communities (48 total, 23 thin omitted)

### Community 0 - "Three-tier memory model"
Cohesion: 0.07
Nodes (59): Agent memory, Cypher, Edge (relationship), Graph database, GraphRAG, MERGE, Node, Three-tier memory model (+51 more)

### Community 1 - "The Engineer's Prompt Playbook"
Cohesion: 0.06
Nodes (49): Lesson Template, Exit criterion, Reversible decision, Spec card, Five-Point Spec Card, Compounding Error, Evidence Before Assertions, Health-Check Command (+41 more)

### Community 2 - "Five-Part Spec Card"
Cohesion: 0.20
Nodes (10): liveCypherQuery, Explainable Answer Payload, Provenance via Event Node Timestamp, Answer Subgraph, Exit Criterion (Verifiable Check), Five-Part Spec Card, Locked Decisions, Out of Scope (+2 more)

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (29): dependencies, lucide-react, react, react-dom, devDependencies, autoprefixer, postcss, tailwindcss (+21 more)

### Community 4 - "GraphHacks — Track 02 (Agent Memory and Coordination)"
Cohesion: 0.09
Nodes (21): AI disclosure, ALWAYS — locked context (do not reopen without recording a decision), Commands, Context graph — use graphify FIRST, Git workflow — commit and push continuously, GraphHacks — Track 02 (Agent Memory and Coordination), Security — non-negotiable, Stack (+13 more)

### Community 5 - "App() — god node"
Cohesion: 0.14
Nodes (25): App() — god node, callGeminiWithBackoff · resilient LLM calls (retry + backoff), Canvas Graph View, Controls · Maturity Dial L0–L5 + Domain Lenses, Cypher Traversal · liveCypherQuery, Episodic Memory (past interactions, timestamped), FalkorDB Instance · multi-graph topology, Gemini API (external LLM) (+17 more)

### Community 6 - "bash"
Cohesion: 0.06
Nodes (32): cat .env*, docker *, git *, graphify *, ls *, npm *, npx *, rm -rf * (+24 more)

### Community 7 - "One Graph Per Tenant"
Cohesion: 0.18
Nodes (12): Lesson 0007 — Multi-Agent Coordination and Handoffs, Isolation vs. Cross-Tenant Analytics Trade-off, Lesson 0008 — Per-Tenant Isolation with Multi-Graph, Memory Node, FalkorDB Multi-Graph / Multi-Tenant Topology, One Graph Per Tenant, select_graph / selectGraph, Avoid a Single Hot Node (+4 more)

### Community 8 - "App"
Cohesion: 0.12
Nodes (24): lucide-react, react, App(), Bubble-Up Senior Guardian Alerting, bubbleUpRisks, Builder Maturity Levels (L0-L5), callGeminiWithBackoff, Cognitive Debt (+16 more)

### Community 9 - "Track 02 Curriculum"
Cohesion: 0.09
Nodes (25): Multi-graph / multi-tenant topology, Track 02 Curriculum, Milestone A — Get a Real Graph Running, Milestone B — The Three-Tier Memory Model, Milestone C — Coordination and Scale, Milestone D — Ship It, CREATE Clause, FalkorDB Cypher (+17 more)

### Community 10 - "App"
Cohesion: 0.19
Nodes (18): App(), Bubble-Up Alerting, Builder Maturity Dial, callGeminiWithBackoff, Cognitive Debt, Cypher Traversal, DOMAIN_LENSES, FalkorDB (+10 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 12 - "Graph Hacks Track 02 Resources"
Cohesion: 0.08
Nodes (25): Autonomy tier, Horizontal slab, Systems thinking, Vertical slice, Decision-Making / Autonomy Tiers, Decomposition / Contracts, Per-Step Verification, Scientific Debugging (+17 more)

### Community 13 - "Cypher Path Returned as a Value"
Cohesion: 0.15
Nodes (14): Handoff Ledger, Persisted State Beats Message Passing, handleRunMultiAgentPrompt, Lesson 0011 — Explainable Answers: Show the Path, Cypher Path Returned as a Value, Path Functions (nodes/relationships/length), shortestPath, 2-Minute Demo Video (+6 more)

### Community 14 - "GraphSync — Multi-Agent FalkorDB Memory Cockpit"
Cohesion: 0.40
Nodes (6): FalkorDB, GraphSync — Multi-Agent FalkorDB Memory Cockpit, GraphSync index.html, Multi-Agent Memory, Root Mount Element, src/main.tsx entry module

### Community 16 - "getSvgCoords"
Cohesion: 0.67
Nodes (3): getSvgCoords, handleCanvasPointerMove, handleNodePointerDown

### Community 30 - "Reproduce Reliably"
Cohesion: 0.20
Nodes (10): Regression test, Lesson 0105 — Decompose & Design Contracts, Cheapest Discriminating Test, Confident Fix for an Unreproduced Bug, Hypothesis Table, Lesson 0106 — Debug Like a Scientist, Rank by Likelihood x Ease of Test, Reproduce Reliably (+2 more)

### Community 31 - "Decision Records — GraphHacks Track 02"
Cohesion: 0.29
Nodes (6): D1 · Backend + agent language: Node.js + TypeScript, D2 · Multi-agent orchestration: hand-rolled workflow first, D3 · Observability: LangSmith, D4 · Deployment: local Docker Compose first, cloud second, D5 · Memory model: three-tier in one connected graph, Decision Records — GraphHacks Track 02

### Community 32 - "Memory Service Contract"
Cohesion: 0.29
Nodes (7): Append a Turn, Don't Rewrite a Session, Turn Appended to Session, Interface-First Contract, Memory Service Contract, recall_turns(user, topic), record_handoff(from, to, reason), write_turn(user, session, text)

### Community 33 - "Handoff"
Cohesion: 0.33
Nodes (6): Handoff, 4-Agent Squad, HANDED_TO Edge, Idempotent MERGE Write, Idempotent MERGE Writes, Documented GAP: shared multi-agent handoff patterns

### Community 34 - "Node Backend Route /api/graph/nodes"
Cohesion: 0.33
Nodes (6): falkordb-ts Node Client, graph.query() API, handleApplySeniorFix, Node Backend Route /api/graph/nodes, FalkorDB Speaks RESP over TCP, Vite Dev-Server Plugin (configureServer)

### Community 35 - "Track 02 Build"
Cohesion: 0.33
Nodes (5): Build order (authoritative: `reference/insight.html` §4), Five key-focus points to prove (the judging criteria), Locked stack, Non-negotiables, Track 02 Build

### Community 36 - "Lesson 0010 — Wiring the Cockpit to Real FalkorDB"
Cohesion: 0.40
Nodes (5): Cockpit Simulation (INITIAL_TENANTS), Lesson 0010 — Wiring the Cockpit to Real FalkorDB, Blast Radius, App Data Flow Map, Failure-Mode Analysis

### Community 37 - "Verify Every Step"
Cohesion: 0.40
Nodes (4): Rules, The loop, This project's checks, Verify Every Step

### Community 38 - "Progress — GraphHacks Track 02"
Cohesion: 0.40
Nodes (4): Blockers / notes, Current status, Progress — GraphHacks Track 02, Recent commits

## Ambiguous Edges - Review These
- `Canvas Graph View` → `FalkorDB Instance · multi-graph topology`  [AMBIGUOUS]
  architecture-diagram.svg · relation: references

## Knowledge Gaps
- **100 isolated node(s):** `@types/react`, `@types/react-dom`, `autoprefixer`, `postcss`, `tailwindcss` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 201 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Track 02 Curriculum` connect `Track 02 Curriculum` to `Three-tier memory model`, `The Engineer's Prompt Playbook`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Three-tier memory model` (e.g. with `Agent memory` and `The Three-Tier Trick`) actually correct?**
  _`Three-tier memory model` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/react`, `@types/react-dom`, `autoprefixer` to the rest of the system?**
  _100 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Three-tier memory model` be split into smaller, more focused modules?**
  _Cohesion score 0.06545879602571596 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App` to `App`, `package.json`, `App() — god node`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `App()` (e.g. with `Bubble-Up Alerting` and `Builder Maturity Dial`) actually correct?**
  _`App()` has 6 INFERRED edges - model-reasoned connections that need verification._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Canvas Graph View` and `FalkorDB Instance · multi-graph topology`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._