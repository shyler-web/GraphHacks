// =============================================================================
// GraphHacks Nexus — the real Cypher the product depends on (rule 10).
//
// Every query below is copied from the running engine under `backend/app/`:
//   Track 02  memory_service.py · cockpit.py · db.py
//   Track 01  graph_sync.py     · falkor_action.py
//   Track 03  falkor_brain.py
//
// Conventions (release notes):
//   * `$name`  — a bound parameter passed via `graph.query(cypher, params={...})`.
//   * `<int>`  — the ONLY values ever interpolated, and only into `LIMIT` or a
//                `*..N` traversal, where FalkorDB rejects parameters. Every one
//                is validated/clamped in Python (`_inline_int`, `_clamp`) before
//                interpolation, so no user string ever reaches the query text.
//   * Every write is `MERGE`-based and idempotent (safe to re-run).
//   * Every read is scoped to exactly one named graph (D5/D10): the graph key is
//     `tenant:<id>` / `code:<repoId>` / `company:brain`; there is no cross-graph read.
//   * `-- ...` comments are annotations, not part of the query text.
// =============================================================================


// #############################################################################
// ## TRACK 02 — Agent memory & coordination  (named graph: tenant:<tenantId>)
// #############################################################################

// --- 0. Indexes on every MERGE key (idempotent; "already indexed" tolerated) --
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


// --- 1. Episodic memory -------------------------------------------------------

// write_turn — one `:Turn` linked to its actor/session/topic/entities (T2.2).
// The Python builds a clause list; entity clauses repeat once per `mentions[i]`
// as (entity0, entity1, ...) with `$entity0`, `$entity1`, ... bound. Agent turns
// use `(actor:Agent)` + `[:PRODUCED]` where user turns use `(actor:User)` + `[:PARTICIPATED]`.
MERGE (actor:User {id: $userId})                       // agent turn: MERGE (actor:Agent {id: $agentId})
MERGE (session:Session {id: $sessionId})
MERGE (topic:Topic {name: $topic})
MERGE (entity0:Entity {id: $entity0})                  // ...one per mention
MERGE (t:Turn {id: $id})
  ON CREATE SET t.timestamp = $timestamp, t.role = $role, t.text = $text
SET t.response_quality = $responseQuality              // only when provided
MERGE (actor)-[:PARTICIPATED]->(t)                     // agent turn: (actor)-[:PRODUCED]->(t)
MERGE (t)-[:IN_SESSION]->(session)
MERGE (t)-[:ABOUT]->(topic)
MERGE (t)-[:MENTIONS]->(entity0);

// recall_turns — episodic history, newest-first (T2.2). Filters are optional.
MATCH (t:Turn)
MATCH (t)-[:IN_SESSION]->(:Session {id: $sessionId})    // optional filter
MATCH (t)-[:ABOUT]->(:Topic {name: $topic})             // optional filter
MATCH (:User {id: $userId})-[:PARTICIPATED]->(t)        // optional filter
OPTIONAL MATCH (u:User)-[:PARTICIPATED]->(t)
OPTIONAL MATCH (a:Agent)-[:PRODUCED]->(t)
OPTIONAL MATCH (t)-[:IN_SESSION]->(s:Session)
OPTIONAL MATCH (t)-[:ABOUT]->(tp:Topic)
OPTIONAL MATCH (t)-[:MENTIONS]->(e:Entity)
RETURN t.id AS id, t.timestamp AS timestamp, t.role AS role, t.text AS text,
       t.response_quality AS responseQuality, u.id AS userId, a.id AS agentId,
       s.id AS sessionId, tp.name AS topic, collect(e.id) AS mentions
ORDER BY t.timestamp DESC, t.id DESC
LIMIT <int>;


// --- 2. Semantic memory -------------------------------------------------------

// upsert_entity — idempotent on `id` (T2.3).
MERGE (e:Entity {id: $id}) ON CREATE SET e.name = $name, e.type = $type;
// SET e.embedding = $embedding                           // only when provided

// upsert_fact — assertion on its entity; the DERIVED_FROM edge is provenance (T2.3, A3).
MERGE (e:Entity {id: $entityId})
MERGE (f:Fact {id: $id}) ON CREATE SET f.statement = $statement
SET f.confidence = $confidence
MERGE (e)-[:HAS_FACT]->(f);
// when sourceTurn: bind the Turn first so the edge MERGE matches the existing node
MERGE (st:Turn {id: $sourceTurn})
MERGE (f)-[:DERIVED_FROM]->(st);

// recall_facts — scoped by entity/topic and a confidence floor (T2.3).
MATCH (f:Fact)
MATCH (:Entity {id: $entityId})-[:HAS_FACT]->(f)                 // optional filter
MATCH (f)-[:DERIVED_FROM]->(:Turn)-[:ABOUT]->(:Topic {name: $topic})  // optional filter
WHERE f.confidence >= $minConfidence                            // optional filter
OPTIONAL MATCH (e:Entity)-[:HAS_FACT]->(f)
OPTIONAL MATCH (f)-[:DERIVED_FROM]->(st:Turn)
WITH f, collect(DISTINCT e.id) AS entityIds, collect(DISTINCT st.id) AS sourceTurns
RETURN f.id AS id, f.statement AS statement, f.confidence AS confidence,
       entityIds, sourceTurns
ORDER BY f.confidence DESC, f.id ASC
LIMIT <int>;

// query_entities — by name and/or type; unknown target returns [] (T2.3).
MATCH (e:Entity)
WHERE e.name = $name AND e.type = $type                 // either clause may be absent
RETURN e.id AS id, e.name AS name, e.type AS type
ORDER BY e.name ASC, e.id ASC
LIMIT <int>;


// --- 3. Procedural memory -----------------------------------------------------

// save_workflow — a replayable step chain + tools + learned-from handoff (T2.4).
// Step ids are derived `"<workflow_id>:step:<order>"` when the caller omits them (A9).
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
MERGE (w)-[:LEARNED_FROM]->(h);                          // A4: the edge is the provenance

// get_workflow — fetch the stored order; unknown id -> no rows (T2.4).
MATCH (w:Workflow {id: $id})
OPTIONAL MATCH (w)-[:START]->(s0)
OPTIONAL MATCH (s0)-[:NEXT_STEP*0..]->(s:Step)
OPTIONAL MATCH (w)-[:USES]->(t:Tool)
WITH w, collect(DISTINCT s) AS steps, collect(DISTINCT t.id) AS toolIds
RETURN w.name AS name, w.trigger_domain AS domain, steps, toolIds;

// replay_workflow, part 1 — resolve the executor (A10).
MATCH (w:Workflow {id: $id})
OPTIONAL MATCH (w)-[:LEARNED_FROM]->(:Handoff)-[:FROM_AGENT]->(o:Agent)
RETURN o.id AS ownerId;

// replay_workflow, part 2 — record exactly one execution (re-run updates `at`).
MERGE (w:Workflow {id: $id})
MERGE (a:Agent {id: $agentId})
MERGE (a)-[r:EXECUTED]->(w)
SET r.at = $now;


// --- 4. Coordination: the handoff ledger (T3.1) -------------------------------

// record_handoff — the node is the ledger, the HANDED_TO edge is the skeleton (A6).
MERGE (h:Handoff {id: $id}) ON CREATE SET h.created_at = $ts, h.reason = $reason, h.status = $status
MERGE (from:Agent {id: $fromId})
MERGE (to:Agent {id: $toId})
MERGE (h)-[:FROM_AGENT]->(from)
MERGE (h)-[:TO_AGENT]->(to)
MERGE (from)-[:HANDED_TO {at: h.created_at}]->(to)
MERGE (te:Entity {id: $targetEntityId})                 // only when targetEntityId
MERGE (h)-[:TARGETS]->(te);

// read_handoffs — the ledger, filtered by agent/status (T3.1).
MATCH (h:Handoff)
OPTIONAL MATCH (h)-[:FROM_AGENT]->(fa:Agent)
OPTIONAL MATCH (h)-[:TO_AGENT]->(ta:Agent)
OPTIONAL MATCH (h)-[:TARGETS]->(te:Entity)
WITH h, fa, ta, te
WHERE (fa.id = $agentId OR ta.id = $agentId) AND h.status = $status   // optional filters
RETURN h.id AS id, h.created_at AS createdAt, h.reason AS reason, h.status AS status,
       fa.id AS fromAgentId, ta.id AS toAgentId, collect(DISTINCT te.id) AS targets
ORDER BY h.created_at DESC
LIMIT <int>;


// --- 5. Cockpit read projections (T4.1/T4.2) ---------------------------------

// tenant registry (graphhacks_registry)
MATCH (t:Tenant)
RETURN t.key AS key, t.name AS name
ORDER BY key ASC;

// 2D graph nodes (tenant:<id>)
MATCH (n:ConceptNode)
RETURN n.id AS id, n.domain AS domain, n.persona_level AS persona_level,
       n.title AS title, n.summary AS summary, n.vibe_translation AS vibe_translation,
       n.code_or_math AS code_or_math, n.status AS status,
       n.created_by_agent AS created_by_agent, n.x AS x, n.y AS y
ORDER BY n.persona_level ASC, n.id ASC;

// 2D graph edges (tenant:<id>)
MATCH (a:ConceptNode)-[r]->(b:ConceptNode)
RETURN a.id AS source, b.id AS target, type(r) AS type
ORDER BY source ASC, target ASC, type ASC;

// episodic projection: Turn -> Episode
MATCH (t:Turn)-[:IN_SESSION]->(s:Session)
RETURN t.id AS id, coalesce(s.name, s.id) AS session, t.text AS prompt,
       t.summary AS summary, t.timestamp AS timestamp
ORDER BY t.id ASC;

// procedural projection: Workflow -> Playbook
MATCH (w:Workflow)
RETURN w.id AS id, w.name AS rule_name, w.trigger_domain AS trigger_domain,
       w.enforced_action AS enforced_action, w.learned_from AS learned_from
ORDER BY id ASC;

// coordination projection: Handoff -> Handoff
MATCH (h:Handoff)
OPTIONAL MATCH (h)-[:FROM_AGENT]->(fa:Agent)
OPTIONAL MATCH (h)-[:TO_AGENT]->(ta:Agent)
OPTIONAL MATCH (h)-[:TARGETS]->(tg:ConceptNode)
RETURN h.id AS id, fa.name AS source, ta.name AS target_agent,
       tg.id AS target, h.status AS status
ORDER BY id ASC;


// #############################################################################
// ## TRACK 01 — Connected-data action engine  (named graph: code:<repoId>)
// #############################################################################

// --- B1: load graphify-out/graph.json into code:<repoId> (idempotent MERGE) ---
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

// one per mapped relation T in {CALLS, IMPORTS, CONTAINS, INHERITS} (T is from a fixed map, never user input)
UNWIND $edges AS e
MERGE (a:Symbol {id: e.source}) MERGE (b:Symbol {id: e.target})
MERGE (a)-[:CALLS]->(b);


// --- B2: blast_radius — hop-bucketed affected symbols (max_hops inlined, 1..10) ---
MATCH p=(root:Symbol {id: $symbolId})<-[:CALLS*1..<H>]-(affected:Symbol)
WHERE affected.id <> $symbolId
WITH affected, min(length(p)) AS hops
RETURN affected.id AS id, affected.label AS label,
       affected.source_file AS file, (affected:Test) AS is_test, hops
ORDER BY hops ASC, id ASC;

// blast_radius — the exact CALLS edges traversed (for the DecisionTrace)
MATCH p=(root:Symbol {id: $symbolId})<-[:CALLS*1..<H>]-(:Symbol)
UNWIND relationships(p) AS r
RETURN DISTINCT startNode(r).id AS source, endNode(r).id AS target, type(r) AS type;

// --- B2: hotspots — native PageRank over the CALLS subgraph (limit inlined, 1..10) ---
CALL algo.pageRank('Symbol','CALLS') YIELD node, score
RETURN node.id AS id, node.label AS label, node.source_file AS file, score
ORDER BY score DESC LIMIT <L>;

// --- B2: shortest_dep_path — primary: native algo.SPpaths (max_len inlined) ---
MATCH (a:Symbol {id: $source}), (b:Symbol {id: $target})
CALL algo.SPpaths({sourceNode: a, targetNode: b, relTypes: ['CALLS'],
    relDirection: 'outgoing', maxLen: <N>, pathCount: 1}) YIELD path
RETURN [n IN nodes(path) | n.id] AS node_ids,
       [r IN relationships(path) | type(r)] AS edge_types;

// shortest_dep_path — fallback: Cypher shortestPath() when the algorithm yields none
MATCH (a:Symbol {id: $source}), (b:Symbol {id: $target})
WITH shortestPath((a)-[:CALLS*1..<N>]->(b)) AS p
RETURN [n IN nodes(p) | n.id] AS node_ids,
       [r IN relationships(p) | type(r)] AS edge_types;

// --- B2: demo_changed_symbol — a symbol with callers (and, if possible, callees) ---
MATCH (s:Symbol)
OPTIONAL MATCH (caller:Symbol)-[:CALLS]->(s)
OPTIONAL MATCH (s)-[:CALLS]->(callee:Symbol)
WITH s, count(DISTINCT caller) AS callers, count(DISTINCT callee) AS callees
WHERE callers > 0
RETURN s.id AS id
ORDER BY (CASE WHEN callees > 0 THEN 1 ELSE 0 END) DESC, callers DESC, s.id ASC
LIMIT 1;


// #############################################################################
// ## TRACK 03 — Company Brain  (named graph: company:brain)
// ## Local data only: git log --numstat + docs/ + graphify-out/graph.json.
// ## `present` flags are set false pre-pass / true on sight; nothing is deleted.
// #############################################################################

// --- C2: ingest commits / people / files (git log --numstat) -------------------
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

UNWIND $ids AS id
MATCH (f:File {id: id}) SET f:Doc;

// --- C3: ingest symbols from graph.json ---------------------------------------
UNWIND $symbols AS row
MERGE (s:Symbol {id: row.id})
SET s.repo = row.repo, s.name = row.name, s.label = row.label,
    s.source_file = row.source_file, s.source_location = row.source_location,
    s.present = true;

UNWIND $symbols AS row
MATCH (s:Symbol {id: row.id})
MERGE (f:File {id: row.fileId})
ON CREATE SET f.repo = row.repo, f.path = row.source_file, f.present = false
MERGE (f)-[:DEFINES]->(s);

// --- C4: ingest docs + MENTIONS / DOCUMENTED_IN -------------------------------
UNWIND $docs AS row
MERGE (d:File {id: row.id})
SET d:Doc
SET d.repo = row.repo, d.path = row.path, d.title = row.title, d.present = true;

UNWIND $rows AS row
MATCH (d:Doc {id: row.docId}), (s:Symbol {name: row.name})
MERGE (d)-[:MENTIONS]->(s);

UNWIND $rows AS row
MATCH (d:Doc {id: row.docId}), (f:File {id: row.fileId})
MERGE (d)-[:MENTIONS]->(f);

UNWIND $rows AS row
MATCH (d:Doc {id: row.docId}), (s:Symbol {name: row.name})
MERGE (s)-[:DOCUMENTED_IN]->(d);

// --- C5: who_owns (limit clamped to 1..100 and inlined) -----------------------
// W1 — resolve a path/symbol to the File ids that carry it
MATCH (f:File)
WHERE (f.id = $target OR f.path = $target) AND ($repo = '' OR f.repo = $repo)
RETURN DISTINCT f.id AS fileId, f.path AS path
UNION
MATCH (f:File)-[:DEFINES]->(s:Symbol)
WHERE (s.id = $target OR s.name = $target) AND ($repo = '' OR f.repo = $repo)
RETURN DISTINCT f.id AS fileId, f.path AS path;

// W2 — aggregate authorship over :MODIFIED
MATCH (p:Person)-[:AUTHORED]->(c:Commit)-[m:MODIFIED]->(f:File)
WHERE f.id IN $fileIds AND ($repo = '' OR f.repo = $repo)
RETURN p.id AS personId, p.name AS name, count(DISTINCT c) AS commits,
       sum(m.insertions) AS insertions, sum(m.deletions) AS deletions,
       max(m.at) AS lastTouched, collect(DISTINCT f.id) AS fileIds
ORDER BY commits DESC, lastTouched DESC
LIMIT <int>;

// --- C6: trace_why (limit is a constant 200 and inlined) ----------------------
// target resolution; symbol evidence = DOCUMENTED_IN (heading) UNION MENTIONS (body)
MATCH (e:Symbol)
WHERE e.id = $target OR e.name = $target
OPTIONAL MATCH (e)-[:DOCUMENTED_IN]->(hd:Doc)
OPTIONAL MATCH (e)<-[:MENTIONS]-(md:Doc)
WITH e, collect(DISTINCT hd.id) AS hIds, collect(DISTINCT md.id) AS mIds
RETURN e.id AS id, 'Symbol' AS kind, hIds + mIds AS docIds
UNION
MATCH (e:File)
WHERE (e.id = $target OR e.path = $target) AND NOT e:Doc
OPTIONAL MATCH (e)-[:DOCUMENTED_IN]->(d:Doc)
RETURN e.id AS id, 'File' AS kind, collect(DISTINCT d.id) AS docIds
UNION
MATCH (e:Doc)
WHERE e.id = $target OR e.path = $target
RETURN e.id AS id, 'Doc' AS kind, [e.id] AS docIds;

// sources — OPTIONAL MATCH keeps a doc with no commit as a still-cited source
MATCH (d:Doc)
WHERE d.id IN $docIds
OPTIONAL MATCH (c:Commit)-[:MODIFIED]->(d)
OPTIONAL MATCH (p:Person)-[:AUTHORED]->(c)
RETURN DISTINCT d.id AS docId, d.path AS docPath, d.title AS docTitle,
       c.id AS commitId, c.subject AS subject, c.at AS at,
       p.id AS personId, p.name AS personName
ORDER BY at DESC
LIMIT <int>;

// --- C7: detect_drift ---------------------------------------------------------
// D0 — window: newest commit in the repo
MATCH (c:Commit) WHERE ($repo = '' OR c.repo = $repo)
RETURN max(c.at) AS maxAt;

// D1 — spec drift: files changed inside the window that no doc mentions
MATCH (:Person)-[:AUTHORED]->(c:Commit)-[m:MODIFIED]->(f:File)
WHERE ($repo = '' OR f.repo = $repo) AND m.at >= $since
WITH f, max(m.at) AS lastTouched
OPTIONAL MATCH (f)<-[:MENTIONS]-(md:Doc)
WITH f, lastTouched, count(md) AS mentioned
WHERE mentioned = 0
RETURN 'file' AS kind, f.id AS id, f.path AS path_or_name, lastTouched
ORDER BY lastTouched DESC;

// D2 — spec drift: symbols changed inside the window but never documented
MATCH (c:Commit)-[m:MODIFIED]->(f:File)-[:DEFINES]->(s:Symbol)
WHERE ($repo = '' OR f.repo = $repo) AND m.at >= $since
WITH s, max(m.at) AS lastTouched
OPTIONAL MATCH (s)-[:DOCUMENTED_IN]->(dd:Doc)
WITH s, lastTouched, count(dd) AS documented
WHERE documented = 0
RETURN 'symbol' AS kind, s.id AS id, s.name AS path_or_name, lastTouched
ORDER BY lastTouched DESC;

// D3 — doc drift: a doc still mentions a symbol that is no longer present
MATCH (d:Doc)-[:MENTIONS]->(s:Symbol)
WHERE s.present = false AND ($repo = '' OR s.repo = $repo)
RETURN 'removed-symbol' AS kind, s.id AS id, s.name AS path_or_name,
       collect(DISTINCT d.path) AS docPaths;


// #############################################################################
// ## ANY-REPO LOADING + GRAPH-GROUNDED GUIDANCE  (D12 / Option B)
// #############################################################################

// --- repo registry (named graph: graphhacks_repos) ---------------------------
// POST /api/repos/load registers a freshly cloned + graphified repo.
MERGE (r:Repo {id: $id}) SET r.name = $name, r.url = $url, r.loaded_at = $loadedAt;

// GET /api/repos — list loaded repos, newest first.
MATCH (r:Repo)
RETURN r.id AS id, r.name AS name, r.url AS url, r.loaded_at AS loaded_at
ORDER BY r.loaded_at DESC;

// --- graph-grounded guidance (POST /api/guidance) ----------------------------
// The LLM answer is grounded in FOUR facts, each a query already listed above:
//   hotspots      = algo.pageRank over code:<repo>          (Track 01, B2)
//   blast_radius  = <-[:CALLS*1..3]- hop buckets            (Track 01, B2)
//   who_owns      = :AUTHORED/:MODIFIED aggregation          (Track 03, C5)
//   drift         = spec_drift D1/D2 + doc_drift D3          (Track 03, C7)
// These facts are serialized into the Nebius prompt (app/guidance.py), so the
// LLM cannot produce the answer without FalkorDB — rule 3 strengthened: the
// graph is load-bearing for the LLM too, not just the UI.
