# Graph Report - GraphHacks  (2026-10-16)

## Corpus Check
- 16 files · ~50,663 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .css 3)

## Summary
- 393 nodes · 555 edges · 28 communities (14 shown, 14 thin omitted)
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Agent memory
- The Engineer's Prompt Playbook
- Five-Part Spec Card
- package.json
- Seven Engineering Habits
- App() — god node
- Handoff
- App
- Three-tier memory model
- App
- compilerOptions
- Graph Hacks Track 02 Resources
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

## God Nodes (most connected - your core abstractions)
1. `Three-tier memory model` - 22 edges
2. `compilerOptions` - 16 edges
3. `App()` - 15 edges
4. `App()` - 15 edges
5. `Agent memory` - 13 edges
6. `App() — god node` - 12 edges
7. `Track 02 Curriculum` - 12 edges
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
- `Graph data model deliverable` --produced_by--> `Lesson 0003 — The Three-Tier Memory Model`  [INFERRED]
  MISSION.md → lessons/0003-three-tier-memory-model.html

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

## Communities (28 total, 14 thin omitted)

### Community 0 - "Agent memory"
Cohesion: 0.09
Nodes (40): Lesson Template, Agent memory, Edge (relationship), Graph database, GraphRAG, MERGE, Node, Episodic Memory (+32 more)

### Community 1 - "The Engineer's Prompt Playbook"
Cohesion: 0.06
Nodes (48): Exit criterion, Reversible decision, Spec card, Five-Point Spec Card, Compounding Error, Evidence Before Assertions, Health-Check Command, Per-Action Verification (+40 more)

### Community 2 - "Five-Part Spec Card"
Cohesion: 0.09
Nodes (24): Cockpit Simulation (INITIAL_TENANTS), Lesson 0010 — Wiring the Cockpit to Real FalkorDB, liveCypherQuery, Explainable Answer Payload, Lesson 0011 — Explainable Answers: Show the Path, Cypher Path Returned as a Value, Path Functions (nodes/relationships/length), Provenance via Event Node Timestamp (+16 more)

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (29): dependencies, lucide-react, react, react-dom, devDependencies, autoprefixer, postcss, tailwindcss (+21 more)

### Community 4 - "Seven Engineering Habits"
Cohesion: 0.06
Nodes (33): Commands, Context graph — use graphify FIRST, GraphHacks — Track 02 (Agent Memory and Coordination), Teaching workspace, Horizontal slab, Regression test, Vertical slice, Decision-Making / Autonomy Tiers (+25 more)

### Community 5 - "App() — god node"
Cohesion: 0.14
Nodes (25): App() — god node, callGeminiWithBackoff · resilient LLM calls (retry + backoff), Canvas Graph View, Controls · Maturity Dial L0–L5 + Domain Lenses, Cypher Traversal · liveCypherQuery, Episodic Memory (past interactions, timestamped), FalkorDB Instance · multi-graph topology, Gemini API (external LLM) (+17 more)

### Community 7 - "Handoff"
Cohesion: 0.06
Nodes (35): Handoff, 4-Agent Squad, HANDED_TO Edge, Handoff Ledger, Lesson 0007 — Multi-Agent Coordination and Handoffs, Idempotent MERGE Write, Persisted State Beats Message Passing, Isolation vs. Cross-Tenant Analytics Trade-off (+27 more)

### Community 8 - "App"
Cohesion: 0.13
Nodes (23): react, App(), Bubble-Up Senior Guardian Alerting, bubbleUpRisks, Builder Maturity Levels (L0-L5), callGeminiWithBackoff, Cognitive Debt, DOMAIN_LENSES (+15 more)

### Community 9 - "Three-tier memory model"
Cohesion: 0.07
Nodes (42): Multi-graph / multi-tenant topology, Three-tier memory model, Learner Initial State Record, Track 02 — Agent Memory and Coordination, Track 02 Curriculum, Milestone A — Get a Real Graph Running, Milestone B — The Three-Tier Memory Model, Milestone C — Coordination and Scale (+34 more)

### Community 10 - "App"
Cohesion: 0.14
Nodes (23): Cypher, App(), Bubble-Up Alerting, Builder Maturity Dial, callGeminiWithBackoff, Cognitive Debt, Cypher Traversal, DOMAIN_LENSES (+15 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 12 - "Graph Hacks Track 02 Resources"
Cohesion: 0.12
Nodes (17): Autonomy tier, Systems thinking, Boundaries and Interfaces, Emergence, Feedback Loops, Resilience, Retry Storm, Mission: Ship a winning GraphHacks Track 02 project (+9 more)

### Community 14 - "GraphSync — Multi-Agent FalkorDB Memory Cockpit"
Cohesion: 0.40
Nodes (6): FalkorDB, GraphSync — Multi-Agent FalkorDB Memory Cockpit, GraphSync index.html, Multi-Agent Memory, Root Mount Element, src/main.tsx entry module

### Community 16 - "getSvgCoords"
Cohesion: 0.67
Nodes (3): getSvgCoords, handleCanvasPointerMove, handleNodePointerDown

## Ambiguous Edges - Review These
- `Canvas Graph View` → `FalkorDB Instance · multi-graph topology`  [AMBIGUOUS]
  architecture-diagram.svg · relation: references

## Knowledge Gaps
- **100 isolated node(s):** `@types/react`, `@types/react-dom`, `autoprefixer`, `postcss`, `tailwindcss` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 143 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Track 02 Curriculum` connect `Three-tier memory model` to `Agent memory`, `The Engineer's Prompt Playbook`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Three-tier memory model` (e.g. with `Agent memory` and `The Three-Tier Trick`) actually correct?**
  _`Three-tier memory model` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/react`, `@types/react-dom`, `autoprefixer` to the rest of the system?**
  _100 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Agent memory` be split into smaller, more focused modules?**
  _Cohesion score 0.08846153846153847 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App` to `App`, `package.json`, `App() — god node`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `App()` (e.g. with `Bubble-Up Alerting` and `Builder Maturity Dial`) actually correct?**
  _`App()` has 6 INFERRED edges - model-reasoned connections that need verification._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Canvas Graph View` and `FalkorDB Instance · multi-graph topology`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._