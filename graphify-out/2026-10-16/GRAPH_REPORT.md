# Graph Report - GraphHacks  (2026-10-16)

## Corpus Check
- 39 files · ~49,229 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 389 nodes · 551 edges · 30 communities (16 shown, 14 thin omitted)
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Core Graph & Cypher Concepts
- Verification & Decisions
- Wiring Cockpit to FalkorDB
- Build Config & Dependencies
- The Engineer's Prompt Series
- GraphSync App (src) — Core
- Spec Cards & Curriculum
- Multi-Agent Coordination & Tenancy
- GraphSync App (src) — Concepts
- Track 02 Model & Requirements
- GraphSync App (root copy)
- TypeScript Compiler Config
- Systems Thinking & Mission
- Cypher Write Patterns
- App Entry Point
- Spec-Card Widget
- Canvas Interaction Handlers
- Shared Memory Concepts
- Concurrency Patterns
- Thin Community 21
- Thin Community 22
- Thin Community 23
- Thin Community 24
- Thin Community 25
- Thin Community 26
- Thin Community 28
- Thin Community 29

## God Nodes (most connected - your core abstractions)
1. `Three-tier memory model` - 22 edges
2. `compilerOptions` - 16 edges
3. `App()` - 15 edges
4. `App()` - 15 edges
5. `Agent memory` - 13 edges
6. `Track 02 Curriculum` - 12 edges
7. `App() — god node` - 12 edges
8. `FalkorDB` - 11 edges
9. `Episodic Memory` - 10 edges
10. `The Engineer's Prompt Playbook` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Episodic Memory` --composed_of--> `Turn Appended to Session`  [EXTRACTED]
  graphsync_multi_agent_falkordb_memory_cockpit.tsx → lessons/0009-high-concurrency.html
- `Bounded relational recall query` --reads--> `Episodic Memory`  [EXTRACTED]
  lessons/0004-episodic-conversation-history.html → graphsync_multi_agent_falkordb_memory_cockpit.tsx
- `Provenance edges (MENTIONED_IN)` --links_to--> `Episodic Memory`  [INFERRED]
  lessons/0005-semantic-memory-facts.html → graphsync_multi_agent_falkordb_memory_cockpit.tsx
- `Lesson 0001 — FalkorDB Up in Ten Minutes` --references--> `FalkorDB`  [EXTRACTED]
  lessons/0001-falkordb-up-in-ten-minutes.html → graphsync_multi_agent_falkordb_memory_cockpit.tsx
- `Lesson Template` --templates--> `Lesson 0001 — FalkorDB Up in Ten Minutes`  [INFERRED]
  assets/lesson-template.html → lessons/0001-falkordb-up-in-ten-minutes.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **4-Agent Multi-Agent Build Flow** — src_graphsync_multi_agent_falkordb_memory_cockpit_handle_run_multi_agent_prompt, src_graphsync_multi_agent_falkordb_memory_cockpit_call_gemini_with_backoff, src_graphsync_multi_agent_falkordb_memory_cockpit_multi_agent_squad, src_graphsync_multi_agent_falkordb_memory_cockpit_semantic_graph_nodes, src_graphsync_multi_agent_falkordb_memory_cockpit_playbook_guardrails [INFERRED 0.85]
- **Maturity Dial x Domain Lens Graph View** — src_graphsync_multi_agent_falkordb_memory_cockpit_app, src_graphsync_multi_agent_falkordb_memory_cockpit_persona_levels, src_graphsync_multi_agent_falkordb_memory_cockpit_domain_lenses, src_graphsync_multi_agent_falkordb_memory_cockpit_visible_nodes, src_graphsync_multi_agent_falkordb_memory_cockpit_live_cypher_query [INFERRED 0.95]
- **Three-Tier FalkorDB Memory Model** — src_graphsync_multi_agent_falkordb_memory_cockpit_initial_tenants, src_graphsync_multi_agent_falkordb_memory_cockpit_falkordb_agent_memory, src_graphsync_multi_agent_falkordb_memory_cockpit_playbook_guardrails, src_graphsync_multi_agent_falkordb_memory_cockpit_semantic_graph_nodes [INFERRED 0.95]
- **Three-tier memory model** — graphsync_multi_agent_falkordb_memory_cockpit_episodic_memory, graphsync_multi_agent_falkordb_memory_cockpit_semantic_memory, graphsync_multi_agent_falkordb_memory_cockpit_procedural_memory [EXTRACTED 1.00]
- **Sequential learning path 0001-0006** — lessons_0001_falkordb_up_in_ten_minutes, lessons_0002_cypher_for_memory, lessons_0003_three_tier_memory_model, lessons_0004_episodic_conversation_history, lessons_0005_semantic_memory_facts, lessons_0006_procedural_memory_playbooks [EXTRACTED 1.00]
- **Track 02 key-focus memory and coordination flow** — graphsync_multi_agent_falkordb_memory_cockpit_episodic_memory, graphsync_multi_agent_falkordb_memory_cockpit_semantic_memory, graphsync_multi_agent_falkordb_memory_cockpit_procedural_memory, glossary_handoff, glossary_multi_graph_topology [INFERRED 0.85]
- **Persisted Handoff Ledger Pattern** — glossary_handoff, lessons_0007_multi_agent_handoffs_handoff_ledger, lessons_0007_multi_agent_handoffs_shared_memory, lessons_0007_multi_agent_handoffs_handed_to_edge [EXTRACTED 1.00]
- **The Engineer's Seven Habits** — glossary_systems_thinking, lessons_0104_engineer_the_context_context_engineering, lessons_0101_the_engineers_prompt_decomposition, lessons_0101_the_engineers_prompt_scientific_debugging, lessons_0101_the_engineers_prompt_per_step_verification, lessons_0101_the_engineers_prompt_decision_making [EXTRACTED 1.00]
- **Systems Thinking Lenses** — lessons_0102_think_in_systems_boundaries_interfaces, lessons_0102_think_in_systems_feedback_loops, lessons_0102_think_in_systems_emergence, lessons_0102_think_in_systems_resilience [EXTRACTED 1.00]
- **Three-Tier Memory Model Composition** — glossary_three_tier_memory_model, reference_graph_schema_turn, reference_graph_schema_entity, reference_graph_schema_workflow [INFERRED 0.85]
- **Autonomy Tier Ladder** — lessons_0109_roles_and_autonomy_tier1_interactive, lessons_0109_roles_and_autonomy_tier2_bounded_sprint, lessons_0109_roles_and_autonomy_tier3_unattended [EXTRACTED 1.00]
- **Spec-Build-Verify Gate Flow** — reference_prompt_playbook_build_loop, glossary_spec_card, lessons_0107_verify_every_step_per_action_verification, lessons_0110_write_for_future_you_decision_bearing_commit [INFERRED 0.75]

## Communities (30 total, 14 thin omitted)

### Community 0 - "Core Graph & Cypher Concepts"
Cohesion: 0.10
Nodes (37): Agent memory, Cypher, Edge (relationship), Graph database, GraphRAG, MERGE, Node, Episodic Memory (+29 more)

### Community 1 - "Verification & Decisions"
Cohesion: 0.07
Nodes (36): Reversible decision, Compounding Error, Evidence Before Assertions, Health-Check Command, Per-Action Verification, 10xdev.blog 7+ Things Every Developer Gets Wrong About AI Agents in 2026, Verify Every Step, verify: line (+28 more)

### Community 2 - "Wiring Cockpit to FalkorDB"
Cohesion: 0.06
Nodes (35): Handoff Ledger, Persisted State Beats Message Passing, Cockpit Simulation (INITIAL_TENANTS), falkordb-ts Node Client, graph.query() API, handleApplySeniorFix, handleRunMultiAgentPrompt, Lesson 0010 — Wiring the Cockpit to Real FalkorDB (+27 more)

### Community 3 - "Build Config & Dependencies"
Cohesion: 0.07
Nodes (29): dependencies, lucide-react, react, react-dom, devDependencies, autoprefixer, postcss, tailwindcss (+21 more)

### Community 4 - "The Engineer's Prompt Series"
Cohesion: 0.07
Nodes (30): Horizontal slab, Regression test, Vertical slice, Decision-Making / Autonomy Tiers, Decomposition / Contracts, Lesson 0101 — The Engineer's Prompt, Per-Step Verification, Prompt Quality Is Capped by Judgment (+22 more)

### Community 5 - "GraphSync App (src) — Core"
Cohesion: 0.14
Nodes (25): App() — god node, callGeminiWithBackoff · resilient LLM calls (retry + backoff), Canvas Graph View, Controls · Maturity Dial L0–L5 + Domain Lenses, Cypher Traversal · liveCypherQuery, Episodic Memory (past interactions, timestamped), FalkorDB Instance · multi-graph topology, Gemini API (external LLM) (+17 more)

### Community 6 - "Spec Cards & Curriculum"
Cohesion: 0.09
Nodes (27): Lesson Template, Exit criterion, Spec card, Five-Point Spec Card, Track 02 Curriculum, Milestone A — Get a Real Graph Running, Milestone B — The Three-Tier Memory Model, Milestone C — Coordination and Scale (+19 more)

### Community 7 - "Multi-Agent Coordination & Tenancy"
Cohesion: 0.09
Nodes (25): Handoff, 4-Agent Squad, HANDED_TO Edge, Lesson 0007 — Multi-Agent Coordination and Handoffs, Idempotent MERGE Write, Isolation vs. Cross-Tenant Analytics Trade-off, Lesson 0008 — Per-Tenant Isolation with Multi-Graph, Memory Node (+17 more)

### Community 8 - "GraphSync App (src) — Concepts"
Cohesion: 0.12
Nodes (24): lucide-react, react, App(), Bubble-Up Senior Guardian Alerting, bubbleUpRisks, Builder Maturity Levels (L0-L5), callGeminiWithBackoff, Cognitive Debt (+16 more)

### Community 9 - "Track 02 Model & Requirements"
Cohesion: 0.13
Nodes (24): Multi-graph / multi-tenant topology, Three-tier memory model, Learner Initial State Record, Track 02 — Agent Memory and Coordination, Learner profile, Agent-Memory Cypher Snippets, Required MVP Features, The Three-Tier Trick (+16 more)

### Community 10 - "GraphSync App (root copy)"
Cohesion: 0.17
Nodes (20): App(), Bubble-Up Alerting, Builder Maturity Dial, callGeminiWithBackoff, Cognitive Debt, Cypher Traversal, DOMAIN_LENSES, FalkorDB (+12 more)

### Community 11 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 12 - "Systems Thinking & Mission"
Cohesion: 0.12
Nodes (17): Autonomy tier, Systems thinking, Boundaries and Interfaces, Emergence, Feedback Loops, Resilience, Retry Storm, Mission: Ship a winning GraphHacks Track 02 project (+9 more)

### Community 13 - "Cypher Write Patterns"
Cohesion: 0.29
Nodes (7): MERGE for Idempotent Writes, CREATE Clause, FalkorDB Cypher, Cypher Gotchas, MERGE Clause, Cypher Parameters, MERGE-Based Schema Writes

### Community 14 - "App Entry Point"
Cohesion: 0.40
Nodes (6): FalkorDB, GraphSync — Multi-Agent FalkorDB Memory Cockpit, GraphSync index.html, Multi-Agent Memory, Root Mount Element, src/main.tsx entry module

### Community 16 - "Canvas Interaction Handlers"
Cohesion: 0.67
Nodes (3): getSvgCoords, handleCanvasPointerMove, handleNodePointerDown

## Ambiguous Edges - Review These
- `Canvas Graph View` → `FalkorDB Instance · multi-graph topology`  [AMBIGUOUS]
  architecture-diagram.svg · relation: references

## Knowledge Gaps
- **101 isolated node(s):** `autoprefixer`, `postcss`, `tailwindcss`, `@types/react`, `@types/react-dom` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 141 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Track 02 Curriculum` connect `Spec Cards & Curriculum` to `Core Graph & Cypher Concepts`, `Track 02 Model & Requirements`, `Cypher Write Patterns`, `Verification & Decisions`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Three-tier memory model` (e.g. with `Agent memory` and `The Three-Tier Trick`) actually correct?**
  _`Three-tier memory model` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `autoprefixer`, `postcss`, `tailwindcss` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Graph & Cypher Concepts` be split into smaller, more focused modules?**
  _Cohesion score 0.1021021021021021 - nodes in this community are weakly interconnected._
- **Why does `react` connect `GraphSync App (src) — Concepts` to `GraphSync App (root copy)`, `Build Config & Dependencies`, `GraphSync App (src) — Core`?**
  _High betweenness centrality (0.203) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `App()` (e.g. with `Bubble-Up Alerting` and `Builder Maturity Dial`) actually correct?**
  _`App()` has 6 INFERRED edges - model-reasoned connections that need verification._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Canvas Graph View` and `FalkorDB Instance · multi-graph topology`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._