# Graph Report - GraphHacks  (2026-10-16)

## Corpus Check
- 32 files · ~58,764 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .css 3, .example 1, (none) 1)

## Summary
- 457 nodes · 560 edges · 43 communities (20 shown, 23 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `62267c47`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- graphsync_multi_agent_falkordb_memory_cockpit.tsx
- Compartmentalize Roles & Autonomy
- Three-tier memory model
- package.json
- GraphHacks — Track 02 (Agent Memory and Coordination)
- App() — god node
- bash
- Handoff
- App
- Track 02 Curriculum
- Debug Drill 0001 — FalkorDB on port 6379 is unreachable
- compilerOptions
- Systems thinking
- Node Backend Route /api/graph/nodes
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
- Decision Records — GraphHacks Track 02
- Track 02 Build
- Verify Every Step
- Progress — GraphHacks Track 02
- Prompt Playbook

## God Nodes (most connected - your core abstractions)
1. `Three-tier memory model` - 19 edges
2. `App()` - 16 edges
3. `compilerOptions` - 16 edges
4. `App() — god node` - 12 edges
5. `Track 02 Curriculum` - 12 edges
6. `GraphHacks — Track 02 (Agent Memory and Coordination)` - 11 edges
7. `Agent memory` - 10 edges
8. `The Engineer's Prompt Playbook` - 10 edges
9. `bash` - 9 edges
10. `Lesson 0002 — Cypher for Memory` - 9 edges

## Surprising Connections (you probably didn't know these)
- `GraphHacks — Track 02 (Agent Memory and Coordination)` --references--> `App()`  [INFERRED]
  AGENTS.md → src/graphsync_multi_agent_falkordb_memory_cockpit.tsx
- `Graph data model deliverable` --produced_by--> `Lesson 0003 — The Three-Tier Memory Model`  [INFERRED]
  MISSION.md → lessons/0003-three-tier-memory-model.html
- `Lesson Template` --references--> `Spec card`  [INFERRED]
  assets/lesson-template.html → GLOSSARY.md
- `Track 02 Key-Focus Points` --references--> `Agent memory`  [INFERRED]
  reference/track02-checklist.html → GLOSSARY.md
- `The Three-Tier Trick` --based_on--> `Three-tier memory model`  [INFERRED]
  reference/features.html → GLOSSARY.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Autonomy Tier Ladder** — lessons_0109_roles_and_autonomy_tier1_interactive, lessons_0109_roles_and_autonomy_tier2_bounded_sprint, lessons_0109_roles_and_autonomy_tier3_unattended [EXTRACTED 1.00]
- **Sequential learning path 0001-0006** — lessons_0001_falkordb_up_in_ten_minutes, lessons_0002_cypher_for_memory, lessons_0003_three_tier_memory_model, lessons_0004_episodic_conversation_history, lessons_0005_semantic_memory_facts, lessons_0006_procedural_memory_playbooks [EXTRACTED 1.00]
- **Persisted Handoff Ledger Pattern** — glossary_handoff, lessons_0007_multi_agent_handoffs_handoff_ledger, lessons_0007_multi_agent_handoffs_shared_memory, lessons_0007_multi_agent_handoffs_handed_to_edge [EXTRACTED 1.00]
- **The Engineer's Seven Habits** — glossary_systems_thinking, lessons_0104_engineer_the_context_context_engineering, lessons_0101_the_engineers_prompt_decomposition, lessons_0101_the_engineers_prompt_scientific_debugging, lessons_0101_the_engineers_prompt_per_step_verification, lessons_0101_the_engineers_prompt_decision_making [EXTRACTED 1.00]
- **Systems Thinking Lenses** — lessons_0102_think_in_systems_boundaries_interfaces, lessons_0102_think_in_systems_feedback_loops, lessons_0102_think_in_systems_emergence, lessons_0102_think_in_systems_resilience [EXTRACTED 1.00]
- **Spec-Build-Verify Gate Flow** — reference_prompt_playbook_build_loop, glossary_spec_card, lessons_0107_verify_every_step_per_action_verification, lessons_0110_write_for_future_you_decision_bearing_commit [INFERRED 0.75]
- **4-Agent Multi-Agent Build Flow** — src_graphsync_multi_agent_falkordb_memory_cockpit_handle_run_multi_agent_prompt, src_graphsync_multi_agent_falkordb_memory_cockpit_call_gemini_with_backoff, src_graphsync_multi_agent_falkordb_memory_cockpit_multi_agent_squad, src_graphsync_multi_agent_falkordb_memory_cockpit_semantic_graph_nodes, src_graphsync_multi_agent_falkordb_memory_cockpit_playbook_guardrails [INFERRED 0.85]
- **Three-Tier Memory Model Composition** — glossary_three_tier_memory_model, reference_graph_schema_turn, reference_graph_schema_entity, reference_graph_schema_workflow [INFERRED 0.85]
- **Maturity Dial x Domain Lens Graph View** — src_graphsync_multi_agent_falkordb_memory_cockpit_app, src_graphsync_multi_agent_falkordb_memory_cockpit_persona_levels, src_graphsync_multi_agent_falkordb_memory_cockpit_domain_lenses, src_graphsync_multi_agent_falkordb_memory_cockpit_visible_nodes, src_graphsync_multi_agent_falkordb_memory_cockpit_live_cypher_query [INFERRED 0.95]
- **Three-Tier FalkorDB Memory Model** — src_graphsync_multi_agent_falkordb_memory_cockpit_initial_tenants, src_graphsync_multi_agent_falkordb_memory_cockpit_falkordb_agent_memory, src_graphsync_multi_agent_falkordb_memory_cockpit_playbook_guardrails, src_graphsync_multi_agent_falkordb_memory_cockpit_semantic_graph_nodes [INFERRED 0.95]

## Communities (43 total, 23 thin omitted)

### Community 0 - "graphsync_multi_agent_falkordb_memory_cockpit.tsx"
Cohesion: 0.06
Nodes (47): Lesson Template, Agent memory, Cypher, Edge (relationship), Graph database, GraphRAG, MERGE, Multi-graph / multi-tenant topology (+39 more)

### Community 1 - "Compartmentalize Roles & Autonomy"
Cohesion: 0.07
Nodes (36): Reversible decision, Compounding Error, Evidence Before Assertions, Health-Check Command, Per-Action Verification, 10xdev.blog 7+ Things Every Developer Gets Wrong About AI Agents in 2026, Verify Every Step, verify: line (+28 more)

### Community 2 - "Three-tier memory model"
Cohesion: 0.13
Nodes (24): Three-tier memory model, Cross-tier linking edges, Node families of the memory model, Lesson 0003 — The Three-Tier Memory Model, MERGE for Idempotent Writes, Agent-Memory Cypher Snippets, MERGE Clause, Required MVP Features (+16 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (34): dependencies, falkordb, lucide-react, react, react-dom, devDependencies, autoprefixer, postcss (+26 more)

### Community 4 - "GraphHacks — Track 02 (Agent Memory and Coordination)"
Cohesion: 0.12
Nodes (15): AI disclosure, ALWAYS — locked context (do not reopen without recording a decision), Commands, Context graph — use graphify FIRST, Git workflow — commit and push continuously, GraphHacks — Track 02 (Agent Memory and Coordination), Security — non-negotiable, Stack (+7 more)

### Community 5 - "App() — god node"
Cohesion: 0.13
Nodes (26): App() — god node, callGeminiWithBackoff · resilient LLM calls (retry + backoff), Canvas Graph View, Controls · Maturity Dial L0–L5 + Domain Lenses, Cypher Traversal · liveCypherQuery, Episodic Memory (past interactions, timestamped), FalkorDB Instance · multi-graph topology, Gemini API (external LLM) (+18 more)

### Community 6 - "bash"
Cohesion: 0.06
Nodes (32): cat .env*, docker *, git *, graphify *, ls *, npm *, npx *, rm -rf * (+24 more)

### Community 7 - "Handoff"
Cohesion: 0.09
Nodes (25): Handoff, 4-Agent Squad, HANDED_TO Edge, Lesson 0007 — Multi-Agent Coordination and Handoffs, Idempotent MERGE Write, Isolation vs. Cross-Tenant Analytics Trade-off, Lesson 0008 — Per-Tenant Isolation with Multi-Graph, Memory Node (+17 more)

### Community 8 - "App"
Cohesion: 0.13
Nodes (22): App(), Bubble-Up Senior Guardian Alerting, bubbleUpRisks, Builder Maturity Levels (L0-L5), callGeminiWithBackoff, Cognitive Debt, DOMAIN_LENSES, FalkorDB Agent Memory (+14 more)

### Community 9 - "Track 02 Curriculum"
Cohesion: 0.08
Nodes (30): Exit criterion, Spec card, Five-Point Spec Card, Track 02 Curriculum, Milestone A — Get a Real Graph Running, Milestone B — The Three-Tier Memory Model, Milestone C — Coordination and Scale, Milestone D — Ship It (+22 more)

### Community 10 - "Debug Drill 0001 — FalkorDB on port 6379 is unreachable"
Cohesion: 0.22
Nodes (8): Debug Drill 0001 — FalkorDB on port 6379 is unreachable, Expected, Fix, Generalizes to, Hypotheses, Observed, Repro (minimal, ordered, paste-able), Root cause (for the reproduced case)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 12 - "Systems thinking"
Cohesion: 0.06
Nodes (32): Autonomy tier, Horizontal slab, Regression test, Systems thinking, Vertical slice, Decision-Making / Autonomy Tiers, Decomposition / Contracts, Lesson 0101 — The Engineer's Prompt (+24 more)

### Community 13 - "Node Backend Route /api/graph/nodes"
Cohesion: 0.06
Nodes (35): Handoff Ledger, Persisted State Beats Message Passing, Cockpit Simulation (INITIAL_TENANTS), falkordb-ts Node Client, graph.query() API, handleApplySeniorFix, handleRunMultiAgentPrompt, Lesson 0010 — Wiring the Cockpit to Real FalkorDB (+27 more)

### Community 14 - "GraphSync — Multi-Agent FalkorDB Memory Cockpit"
Cohesion: 0.40
Nodes (6): FalkorDB, GraphSync — Multi-Agent FalkorDB Memory Cockpit, GraphSync index.html, Multi-Agent Memory, Root Mount Element, src/main.tsx entry module

### Community 16 - "getSvgCoords"
Cohesion: 0.67
Nodes (3): getSvgCoords, handleCanvasPointerMove, handleNodePointerDown

### Community 31 - "Decision Records — GraphHacks Track 02"
Cohesion: 0.29
Nodes (6): D1 · Backend + agent language: Node.js + TypeScript, D2 · Multi-agent orchestration: hand-rolled workflow first, D3 · Observability: LangSmith, D4 · Deployment: local Docker Compose first, cloud second, D5 · Memory model: three-tier in one connected graph, Decision Records — GraphHacks Track 02

### Community 35 - "Track 02 Build"
Cohesion: 0.33
Nodes (5): Build order (authoritative: `reference/insight.html` §4), Five key-focus points to prove (the judging criteria), Locked stack, Non-negotiables, Track 02 Build

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
- **99 isolated node(s):** `@types/react`, `@types/react-dom`, `autoprefixer`, `postcss`, `tailwindcss` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 212 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Agent memory` connect `graphsync_multi_agent_falkordb_memory_cockpit.tsx` to `Track 02 Curriculum`, `Three-tier memory model`, `Handoff`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Three-tier memory model` (e.g. with `Agent memory` and `The Three-Tier Trick`) actually correct?**
  _`Three-tier memory model` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/react`, `@types/react-dom`, `autoprefixer` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `graphsync_multi_agent_falkordb_memory_cockpit.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06382978723404255 - nodes in this community are weakly interconnected._
- **Why does `Track 02 Curriculum` connect `Track 02 Curriculum` to `graphsync_multi_agent_falkordb_memory_cockpit.tsx`, `Compartmentalize Roles & Autonomy`, `Three-tier memory model`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App()` (e.g. with `GraphHacks — Track 02 (Agent Memory and Coordination)` and `Cognitive Debt`) actually correct?**
  _`App()` has 2 INFERRED edges - model-reasoned connections that need verification._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Canvas Graph View` and `FalkorDB Instance · multi-graph topology`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._