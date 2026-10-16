# Track 02 Glossary

Canonical language for this workspace. Lessons must use these terms exactly. Definitions are compressed to one or two sentences and are revised as understanding deepens.

## Agent memory

**Episodic memory**:
A record of specific past interactions, stored as timestamped event nodes linked to the entities involved, so an agent can recall "what happened last time."
_Avoid_: chat log, history

**Semantic memory**:
Durable factual knowledge about the domain — entities, attributes, and their relationships — independent of any single interaction.
_Avoid_: knowledge base, facts store (when unconnected)

**Procedural memory**:
Stored tool-use patterns and successful query strategies, represented as reusable workflow subgraphs an agent can re-execute.
_Avoid_: playbook (use only as a named artifact, not the concept)

**Agent memory**:
The persistent, queryable state an agent reads and writes across sessions so it does not start from zero each time.
_Avoid_: context window, RAG

**Handoff**:
The transfer of state and responsibility from one agent to another, recorded in the graph so the receiving agent knows what was done and why.
_Avoid_: message passing (when state is not persisted)

**Three-tier memory model**:
The composition of episodic, semantic, and procedural memory into one connected graph, rather than three separate stores.
_Avoid_: memory layer

## Graphs

**Graph database**:
A database that stores data as nodes and relationships and traverses them directly, rather than joining tables.
_Avoid_: graph store, network DB

**Node**:
A single entity in the graph (a user, session, fact, tool call), optionally carrying properties.
_Avoid_: vertex, record

**Edge (relationship)**:
A typed, directed connection between two nodes that itself carries meaning and can hold properties.
_Avoid_: link, pointer

**Cypher**:
The declarative query language for FalkorDB, in which patterns are drawn with ASCII art to match or create graph structure.
_Avoid_: SQL-for-graphs

**Multi-graph / multi-tenant topology**:
FalkorDB's ability to hold thousands of isolated graphs in one instance, so each user or tenant gets a separate memory graph without a separate deployment.
_Avoid_: sharding, namespaces

## FalkorDB specifics

**FalkorDB**:
An open-source, ultra-fast, multi-tenant graph database with vector search and Cypher, used as the agent's context layer.
_Avoid_: Falkor, RedisGraph

**MERGE**:
The Cypher clause that matches a pattern or creates it if it does not exist, the basis of idempotent memory writes.
_Avoid_: upsert

**GraphRAG**:
Retrieval-augmented generation in which the retrieved context is a subgraph traversed by relationships, not a set of loose text chunks.
_Avoid_: vector RAG

## Engineering practice

**Spec card**:
A five-line task brief — what it builds, exit criterion, out of scope, locked decisions, verification — handed to an agent instead of a vague wish.
_Avoid_: prompt, request

**Exit criterion**:
The single specific, verifiable check that defines when a task is done, stated before work begins.
_Avoid_: definition of done, acceptance idea

**Context budget**:
The deliberate split of what a model always sees, what it sees on demand, and what it never sees.
_Avoid_: prompt stuffing

**Systems thinking**:
Reasoning about boundaries, data flow, feedback loops, and failure modes rather than isolated components.
_Avoid_: big-picture thinking

**Reproduce (repro)**:
The act of triggering a bug on demand, the precondition for any fix.
_Avoid_: "it happens sometimes"

**Root cause**:
The condition that, if fixed, prevents the defect recurring — as opposed to the symptom where it surfaces.
_Avoid_: the bug (when meaning the symptom)

**Regression test**:
A test written from the reproduction so a fixed defect cannot silently return.
_Avoid_: unit test (when the purpose is guarding a past bug)

**Autonomy tier**:
The level of oversight a task is given: Tier 1 interactive, Tier 2 bounded sprint, Tier 3 unattended batch.
_Avoid_: hands-off mode

**Reversible decision**:
A choice cheap to undo, so it should be made quickly; its opposite (expensive to reverse) deserves deliberate analysis.
_Avoid_: small decision

**Vertical slice**:
One thin feature built through every layer end-to-end (UI → API → graph), so it is independently demoable, testable, and verifiable.
_Avoid_: feature (when it is not end-to-end)

**Horizontal slab**:
One layer built across every feature before the next layer starts, so nothing works until all layers are done.
_Avoid_: layer (when meaning a whole-stage build)
