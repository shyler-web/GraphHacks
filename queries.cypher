// =============================================================================
// GraphHacks Nexus — Official Cypher Queries & Graph Algorithms (Rule 10)
//
// This file is divided into two sections:
//   SECTION 1: 📋 READY-TO-RUN QUERIES FOR JUDGES (COPY & PASTE INTO FALKORDB BROWSER)
//              These queries have zero placeholders and run directly in http://localhost:3000.
//   SECTION 2: ⚙️ PRODUCTION ENGINE TEMPLATES ($PARAMETERIZED FOR BACKEND CODE)
//              The exact parameterized templates executed by the FastAPI backend.
// =============================================================================


// #############################################################################
// SECTION 1: 📋 READY-TO-RUN QUERIES FOR JUDGES
// (Copy & paste directly into FalkorDB Browser at http://localhost:3000)
// #############################################################################

// =============================================================================
// 1. TRACK 02 — Multi-Agent Memory & Coordination
// ⚠️ In FalkorDB Browser, select graph: 'tenant:graphsync_user1_ai_avatar_saas'
// =============================================================================

// Query 1.1: Interactive Visual Concept Graph (Circles & Directed Edges)
// Click "Graph View" in FalkorDB Browser to see the interactive 2D graph!
MATCH (n:ConceptNode)-[r]->(m:ConceptNode)
RETURN n, r, m
LIMIT 25;

// Query 1.2: Red Bubble-Up Alerts (The [:ENDANGERS] Security Relationship)
// Visually shows the L4 Senior Auditor node pointing an ENDANGERS arrow to L0!
MATCH (risk:ConceptNode)-[r:ENDANGERS]->(target:ConceptNode)
RETURN risk, r, target;

// Query 1.3: Multi-Agent Handoff Ledger (Audit Trail of Agent Coordination)
// Shows the real statuses: COMPLETED, ALERT_RAISED, and PLAYBOOK_ENFORCED
MATCH (h:Handoff)
RETURN h.id AS handoff_id, h.reason AS reason, h.status AS status, h.created_at AS timestamp
ORDER BY h.created_at DESC;

// Query 1.4: Procedural Playbooks (Learned Engineering Guardrails)
// Shows the reusable rules saved by the Senior Auditor
MATCH (w:Workflow)
RETURN w.name AS rule_name, w.trigger_domain AS domain;

// Query 1.5: Episodic Memory Timeline (Past Chat Sessions & Turns)
// Shows the persisted user prompts and fix records
MATCH (t:Turn)-[:IN_SESSION]->(s:Session)
RETURN s.id AS session_id, t.id AS turn_id, t.text AS prompt, t.timestamp AS timestamp
ORDER BY t.timestamp DESC
LIMIT 10;

// Query 1.6: The 4-Agent Squad Nodes
// Shows the specialized AI personas persisted in FalkorDB
MATCH (a:Agent)
RETURN a.id AS agent_id, a.name AS name, a.role AS role;


// =============================================================================
// 2. TRACK 01 — Connected-Data Action Engine (Code AST Graph)
// ⚠️ In FalkorDB Browser, select graph: 'code:graphhacks'
// =============================================================================

// Query 2.1: Native FalkorDB PageRank Hotspots
// Runs FalkorDB's native PageRank algorithm over the [:CALLS] graph
CALL algo.pageRank('Symbol', 'CALLS')
YIELD node, score
RETURN node.id AS id, node.label AS symbol_name, node.source_file AS file, score
ORDER BY score DESC
LIMIT 10;

// Query 2.2: 2-Hop Blast Radius for observability span()
// Finds all symbols that transitively call span() within 2 hops
MATCH p=(root:Symbol {id: 'backend_app_observability_span'})<-[:CALLS*1..2]-(affected:Symbol)
WHERE affected.id <> 'backend_app_observability_span'
WITH affected, min(length(p)) AS hops
RETURN affected.id AS id, affected.label AS symbol, affected.source_file AS file, hops
ORDER BY hops ASC, id ASC
LIMIT 25;

// Query 2.3: Total AST Symbols Loaded
// Counts all indexed functions, classes, and methods
MATCH (s:Symbol)
RETURN count(s) AS total_ast_symbols;


// =============================================================================
// 3. TRACK 03 — Company Brain (Git Commits, People & Documentation)
// ⚠️ In FalkorDB Browser, select graph: 'company:brain'
// =============================================================================

// Query 3.1: Who Owns backend/app/observability.py
// Walks the commit graph over [:MODIFIED] and [:AUTHORED] edges to find author
MATCH (f:File {path: 'backend/app/observability.py'})<-[m:MODIFIED]-(c:Commit)<-[:AUTHORED]-(p:Person)
RETURN p.name AS author, p.email AS email, count(c) AS commits,
       sum(m.insertions) AS insertions, sum(m.deletions) AS deletions;

// Query 3.2: Architecture Documentation Ingested into Graph
// Lists official markdown documentation and C4 architecture diagrams
MATCH (d:Doc)
RETURN d.path AS doc_path, d.title AS title
LIMIT 10;

// Query 3.3: Git Commit Authorship History
// Shows recent git commits and their authors
MATCH (p:Person)-[:AUTHORED]->(c:Commit)
RETURN p.name AS author, c.sha AS commit_sha, c.subject AS message, c.at AS timestamp
ORDER BY c.at DESC
LIMIT 10;


// =============================================================================
// 4. GLOBAL TENANT REGISTRY
// ⚠️ In FalkorDB Browser, select graph: 'graphhacks_registry'
// =============================================================================

// Query 4.1: List All Registered Customer Workspaces
MATCH (t:Tenant)
RETURN t.key AS tenant_key, t.name AS workspace_name;



// #############################################################################
// SECTION 2: ⚙️ PRODUCTION ENGINE TEMPLATES ($PARAMETERIZED FOR BACKEND CODE)
// (Used by backend/app/ with parameter bindings)
// #############################################################################

// --- Track 02 Index Setup (idempotent) ---------------------------------------
CREATE INDEX FOR (u:User)     ON (u.id);
CREATE INDEX FOR (s:Session)  ON (s.id);
CREATE INDEX FOR (t:Turn)     ON (t.id);
CREATE INDEX FOR (e:Entity)   ON (e.id);
CREATE INDEX FOR (f:Fact)     ON (f.id);
CREATE INDEX FOR (tp:Topic)   ON (tp.name);
CREATE INDEX FOR (tl:Tool)    ON (tl.id);
CREATE INDEX FOR (w:Workflow) ON (w.id);
CREATE INDEX FOR (st:Step)    ON (st.id);
CREATE INDEX FOR (a:Agent)    ON (a.id);
CREATE INDEX FOR (h:Handoff)  ON (h.id);

// --- Track 02 Write Turn (T2.2) ----------------------------------------------
MERGE (actor:User {id: $userId})
MERGE (session:Session {id: $sessionId})
MERGE (topic:Topic {name: $topic})
MERGE (entity0:Entity {id: $entity0})
MERGE (t:Turn {id: $id})
  ON CREATE SET t.timestamp = $timestamp, t.role = $role, t.text = $text
SET t.response_quality = $responseQuality
MERGE (actor)-[:PARTICIPATED]->(t)
MERGE (t)-[:IN_SESSION]->(session)
MERGE (t)-[:ABOUT]->(topic)
MERGE (t)-[:MENTIONS]->(entity0);

// --- Track 02 Recall Turns (T2.2) --------------------------------------------
MATCH (t:Turn)
MATCH (t)-[:IN_SESSION]->(:Session {id: $sessionId})
OPTIONAL MATCH (u:User)-[:PARTICIPATED]->(t)
OPTIONAL MATCH (a:Agent)-[:PRODUCED]->(t)
OPTIONAL MATCH (t)-[:IN_SESSION]->(s:Session)
OPTIONAL MATCH (t)-[:ABOUT]->(tp:Topic)
OPTIONAL MATCH (t)-[:MENTIONS]->(e:Entity)
RETURN t.id AS id, t.timestamp AS timestamp, t.role AS role, t.text AS text,
       t.response_quality AS responseQuality, u.id AS userId, a.id AS agentId,
       s.id AS sessionId, tp.name AS topic, collect(e.id) AS mentions
ORDER BY t.timestamp DESC, t.id DESC
LIMIT 50;

// --- Track 02 Semantic Memory (T2.3) -----------------------------------------
MERGE (e:Entity {id: $id}) ON CREATE SET e.name = $name, e.type = $type;

MERGE (e:Entity {id: $entityId})
MERGE (f:Fact {id: $id}) ON CREATE SET f.statement = $statement
SET f.confidence = $confidence
MERGE (e)-[:HAS_FACT]->(f);
MERGE (st:Turn {id: $sourceTurn})
MERGE (f)-[:DERIVED_FROM]->(st);

MATCH (f:Fact)
MATCH (:Entity {id: $entityId})-[:HAS_FACT]->(f)
MATCH (f)-[:DERIVED_FROM]->(:Turn)-[:ABOUT]->(:Topic {name: $topic})
WHERE f.confidence >= $minConfidence
OPTIONAL MATCH (e:Entity)-[:HAS_FACT]->(f)
OPTIONAL MATCH (f)-[:DERIVED_FROM]->(st:Turn)
WITH f, collect(DISTINCT e.id) AS entityIds, collect(DISTINCT st.id) AS sourceTurns
RETURN f.id AS id, f.statement AS statement, f.confidence AS confidence,
       entityIds, sourceTurns
ORDER BY f.confidence DESC, f.id ASC
LIMIT 50;

// --- Track 02 Procedural Memory (T2.4) ---------------------------------------
MERGE (w:Workflow {id: $id}) ON CREATE SET w.name = $name, w.trigger_domain = $domain
MERGE (s0:Step {id: $stepId0}) SET s0.order = $stepOrder0, s0.action = $stepAction0, s0.expected_result = $stepExpected0
MERGE (s1:Step {id: $stepId1}) SET s1.order = $stepOrder1, s1.action = $stepAction1, s1.expected_result = $stepExpected1
MERGE (s2:Step {id: $stepId2}) SET s2.order = $stepOrder2, s2.action = $stepAction2, s2.expected_result = $stepExpected2
MERGE (w)-[:START]->(s0)
MERGE (s0)-[:NEXT_STEP {order: $stepOrder1}]->(s1)
MERGE (s1)-[:NEXT_STEP {order: $stepOrder2}]->(s2)
MERGE (tool0:Tool {id: $toolId0})
MERGE (w)-[:USES]->(tool0)
MERGE (h:Handoff {id: $learnedFrom})
MERGE (w)-[:LEARNED_FROM]->(h);

MATCH (w:Workflow {id: $id})
OPTIONAL MATCH (w)-[:START]->(s0)
OPTIONAL MATCH (s0)-[:NEXT_STEP*0..]->(s:Step)
OPTIONAL MATCH (w)-[:USES]->(t:Tool)
WITH w, collect(DISTINCT s) AS steps, collect(DISTINCT t.id) AS toolIds
RETURN w.name AS name, w.trigger_domain AS domain, steps, toolIds;

// --- Track 02 Record Handoff (T3.1) ------------------------------------------
MERGE (h:Handoff {id: $id}) ON CREATE SET h.created_at = $ts, h.reason = $reason, h.status = $status
MERGE (from:Agent {id: $fromId})
MERGE (to:Agent {id: $toId})
MERGE (h)-[:FROM_AGENT]->(from)
MERGE (h)-[:TO_AGENT]->(to)
MERGE (from)-[:HANDED_TO {at: h.created_at}]->(to)
MERGE (te:ConceptNode {id: $targetEntityId})
MERGE (h)-[:TARGETS]->(te);

MATCH (h:Handoff)
OPTIONAL MATCH (h)-[:FROM_AGENT]->(fa:Agent)
OPTIONAL MATCH (h)-[:TO_AGENT]->(ta:Agent)
OPTIONAL MATCH (h)-[:TARGETS]->(te:ConceptNode)
WITH h, fa, ta, te
RETURN h.id AS id, h.created_at AS createdAt, h.reason AS reason, h.status AS status,
       fa.id AS fromAgentId, ta.id AS toAgentId, collect(DISTINCT te.id) AS targets
ORDER BY h.created_at DESC
LIMIT 50;

// --- Track 02 Cockpit Read Projections (T4.1/T4.2) ---------------------------
MATCH (n:ConceptNode)
RETURN n.id AS id, n.domain AS domain, n.persona_level AS persona_level,
       n.title AS title, n.summary AS summary, n.vibe_translation AS vibe_translation,
       n.code_or_math AS code_or_math, n.status AS status,
       n.created_by_agent AS created_by_agent, n.x AS x, n.y AS y
ORDER BY n.persona_level ASC, n.id ASC;

MATCH (a:ConceptNode)-[r]->(b:ConceptNode)
RETURN a.id AS source, b.id AS target, type(r) AS type
ORDER BY source ASC, target ASC, type ASC;


// #############################################################################
// TRACK 01 — Connected-Data Action Engine (named graph: code:<repoId>)
// #############################################################################

// --- B1: load graphify-out/graph.json into code:<repoId> ---------------------
UNWIND $files AS p
MERGE (f:File {id: 'file:' + p}) SET f.path = p;

UNWIND $symbols AS row
MERGE (s:Symbol {id: row.id})
SET s.label = row.label, s.source_file = row.source_file,
    s.source_location = row.source_location, s.callable = row.callable,
    s.origin = row.origin, s.community = row.community;

UNWIND $rows AS row
MATCH (f:File {id: row.file_id}) MATCH (s:Symbol {id: row.id})
MERGE (f)-[:CONTAINS]->(s);

UNWIND $test_ids AS tid
MATCH (s:Symbol {id: tid}) SET s:Test;

UNWIND $edges AS e
MERGE (a:Symbol {id: e.source}) MERGE (b:Symbol {id: e.target})
MERGE (a)-[:CALLS]->(b);

// --- B2: blast_radius (hop-bucketed affected symbols) ------------------------
MATCH p=(root:Symbol {id: $symbolId})<-[:CALLS*1..3]-(affected:Symbol)
WHERE affected.id <> $symbolId
WITH affected, min(length(p)) AS hops
RETURN affected.id AS id, affected.label AS label,
       affected.source_file AS file, (affected:Test) AS is_test, hops
ORDER BY hops ASC, id ASC;

// --- B2: hotspots (native PageRank over the CALLS subgraph) ------------------
CALL algo.pageRank('Symbol','CALLS') YIELD node, score
RETURN node.id AS id, node.label AS label, node.source_file AS file, score
ORDER BY score DESC LIMIT 10;

// --- B2: shortest_dep_path (native algo.SPpaths) -----------------------------
MATCH (a:Symbol {id: $source}), (b:Symbol {id: $target})
CALL algo.SPpaths({sourceNode: a, targetNode: b, relTypes: ['CALLS'],
    relDirection: 'outgoing', maxLen: 10, pathCount: 1}) YIELD path
RETURN [n IN nodes(path) | n.id] AS node_ids,
       [r IN relationships(path) | type(r)] AS edge_types;


// #############################################################################
// TRACK 03 — Company Brain (named graph: company:brain)
// #############################################################################

// --- C2: ingest commits / people / files -------------------------------------
UNWIND $people AS row
MERGE (p:Person {id: row.email})
SET p.email = row.email, p.name = row.name;

UNWIND $commits AS row
MERGE (c:Commit {id: row.sha})
SET c.sha = row.sha, c.repo = row.repo, c.subject = row.subject,
    c.at = row.at, c.author_email = row.email;

UNWIND $commits AS row
MATCH (p:Person {id: row.email}), (c:Commit {id: row.sha})
MERGE (p)-[:AUTHORED]->(c);

UNWIND $files AS row
MERGE (f:File {id: row.id})
ON CREATE SET f.repo = row.repo, f.path = row.path
SET f.present = true;

UNWIND $rows AS row
MATCH (f:File {id: row.fileId}), (c:Commit {id: row.sha})
MERGE (c)-[m:MODIFIED]->(f)
SET m.path = row.path, m.insertions = row.insertions,
    m.deletions = row.deletions, m.at = row.at;

// --- C4: ingest docs + MENTIONS / DOCUMENTED_IN -------------------------------
UNWIND $docs AS row
MERGE (d:File {id: row.id})
SET d:Doc
SET d.repo = row.repo, d.path = row.path, d.title = row.title, d.present = true;

UNWIND $rows AS row
MATCH (d:Doc {id: row.docId}), (s:Symbol {name: row.name})
MERGE (d)-[:MENTIONS]->(s);

// --- C5: who_owns (aggregate authorship over :MODIFIED) -----------------------
MATCH (p:Person)-[:AUTHORED]->(c:Commit)-[m:MODIFIED]->(f:File)
WHERE f.id IN $fileIds AND ($repo = '' OR f.repo = $repo)
RETURN p.id AS personId, p.name AS name, count(DISTINCT c) AS commits,
       sum(m.insertions) AS insertions, sum(m.deletions) AS deletions,
       max(m.at) AS lastTouched, collect(DISTINCT f.id) AS fileIds
ORDER BY commits DESC, lastTouched DESC
LIMIT 50;

// --- C6: trace_why (100% cited provenance) -----------------------------------
MATCH (d:Doc)
WHERE d.id IN $docIds
OPTIONAL MATCH (c:Commit)-[:MODIFIED]->(d)
OPTIONAL MATCH (p:Person)-[:AUTHORED]->(c)
RETURN DISTINCT d.id AS docId, d.path AS docPath, d.title AS docTitle,
       c.id AS commitId, c.subject AS subject, c.at AS at,
       p.id AS personId, p.name AS personName
ORDER BY at DESC
LIMIT 50;

// --- C7: detect_drift (spec drift + doc drift) --------------------------------
MATCH (:Person)-[:AUTHORED]->(c:Commit)-[m:MODIFIED]->(f:File)
WHERE ($repo = '' OR f.repo = $repo) AND m.at >= $since
WITH f, max(m.at) AS lastTouched
OPTIONAL MATCH (f)<-[:MENTIONS]-(md:Doc)
WITH f, lastTouched, count(md) AS mentioned
WHERE mentioned = 0
RETURN 'file' AS kind, f.id AS id, f.path AS path_or_name, lastTouched
ORDER BY lastTouched DESC;

MATCH (d:Doc)-[:MENTIONS]->(s:Symbol)
WHERE s.present = false AND ($repo = '' OR s.repo = $repo)
RETURN 'removed-symbol' AS kind, s.id AS id, s.name AS path_or_name,
       collect(DISTINCT d.path) AS docPaths;
