# Progress — GraphHacks Track 02

Living status. Update after every verified milestone (see `AGENTS.md` §Progress). The authoritative task list is `reference/insight.html` §4 (T0.1 → T4.5).

**Deadline:** Oct 18, 11:59 PM IST · **Mode:** solo · **Backend:** Python/FastAPI (D8; Node preserved in `dump/`) · **Orchestration:** hand-rolled · **Tracing:** LangSmith · **Deploy:** local Docker + Compose (D4)

## Current status

| Task | What | Exit criterion | Status |
|---|---|---|---|
| T0.1 | `git init` + first commit | `git log --oneline -1` shows the foundation | ✅ done |
| T0.2 | Remove root↔`src/` duplicate | `grep -rl INITIAL_TENANTS src/` → one path | ✅ done |
| T0.3 | ALWAYS block in `AGENTS.md` | rules + goal/exit + locked decisions + health present | ✅ done |
| T1.1 | Run FalkorDB (Docker) | `nc -z localhost 6379` exits 0 | ✅ done |
| T1.2 | Debug drill on "6379 refused" | Expected/Observed/Repro + 3 hypotheses | ✅ done |
| T1.3 | `npm run health` | prints `MATCH (n) RETURN count(n)` | ✅ done |
| T1.4 | `npm install falkordb`; write+read one node | node read back by id | ✅ done |
| T2.1 | memory-service contract + decision record | typed signatures + schema decision | ✅ done |
| T2.2 | Episodic: write_turn / recall_turns | 2 messages → 2 Turn nodes in order | ✅ done (Node) · ✅ Python parity (D8) |
| T2.3 | Semantic: facts & entities | message builds queryable Entity/Fact nodes | ✅ done — `semantic=1 facts=1 source=ok` |
| T2.4 | Procedural: workflow replay | stored Workflow fetched and re-run | ✅ done — `workflow=1 steps=3 start=ingest` |
| T3.1 | Handoff ledger | agent B reads A's HANDED_TO | ✅ done — `handoffs=1 edge=1` |
| T3.2 | Per-tenant isolation | tenant B sees 0 of A's turns | ✅ done — `tenant_a=3 tenant_b=0` |
| T3.3 | Concurrency test | N writers → all N, no loss | ✅ done — `writers=16 distinct=16 same=1` |
| T4.1 | Vite route `/api/graph/nodes` | curl returns real JSON | ✅ done — curl 200 (up) / 503 (down), F2 |
| T4.2 | Cockpit reads real route | stop FalkorDB → app errors | ✅ done — HTTP 503 → `ErrorScreen`, Retry → 200, F3 |
| T4.3 | Explainable answers | answer carries its subgraph + sources | ✅ done — `DecisionTrace` (cypher/params/edges/ms) + `trace_why` `cited=100%` |
| T4.4 | Submission packet | all rule-10 items + AI disclosure | ✅ done — `README.md` + `queries.cypher` + `docs/guides/DEMO-SCRIPT.md` |
| T4.5 | Rehearse rule-12 explanation | narrate model/queries/decisions cold | ⬜ todo |
| **Track 01** | `code:<repoId>` action engine (B0–B3) | `verify_track1.py` → `TRACK1 OK` | ✅ done — `TRACK1 OK` (files=107 symbols=521 tests=17 nodes=628; CALLS=51) |
| **Track 03** | `company:brain` engine (C1–C8) | `verify_track3.py` → `track3 OK … cited=100%` | ✅ done — `track3 OK — repo=graphhacks people=1 commits=19 files=168 symbols=292 docs=48 owners=1 trace_docs=1 spec_drift=382 doc_drift=0 cited=100%` |
| **F5** | `docker compose up --build` (D4) | `:5173` renders; stop → `ErrorScreen` | 🟡 compose files present; `docker compose config` exit 0; full up/build not re-run in this packet slice |

## Blockers / notes

- FalkorDB running: `docker run -d --name falkordb -p 6379:6379 -p 3000:3000 falkordb/falkordb:latest` (container `falkordb`, Browser UI on `:3000`, Redis port `6379`). Restart with `docker start falkordb`.
- **Risk:** `falkordb@6.8.0` declares `engines.node >=22` but the host runs Node **v18.19.1**. Install prints `EBADENGINE`; the client was smoke-tested and works (`RETURN 1`, `MATCH (n) RETURN count(n)`, MERGE write/read all OK). Revisit if a Node-22-only API is hit or on a clean install elsewhere.
- **Track 02 tiers verified (Python, D8):** all six exit criteria re-run green on 2026-10-17 (FalkorDB up): `verify_t2_2` → `turns=2 order=user,agent`; `verify_t2_3` → `semantic=1 facts=1 source=ok`; `verify_t2_4` → `workflow=1 steps=3 start=ingest`; `verify_t3_1` → `handoffs=1 edge=1`; `verify_t3_2` → `tenant_a=3 tenant_b=0`; `verify_t3_3` → `writers=16 distinct=16 same=1` (all exit 0; each idempotent on re-run). `uv run python health.py` → `FalkorDB OK — MATCH (n) RETURN count(n) => 1`. Engine: `backend/app/memory_service.py` (full contract: episodic/semantic/procedural/handoff), `cockpit.py` (read projections), `db.py` (`named_graph` router, D10). Resolutions A3/A4/A6/A9/A10 applied; `TENANT_INDEX_SPECS` (11 MERGE keys) provisioned once per tenant per process.
- **Track 01 verified:** `cd backend && uv run python scripts/verify_track1.py` → `TRACK1 OK` exit 0 — load idempotent (628 nodes / 1129 rels; files=107 symbols=521 tests=17; `CALLS=51`), `demo_symbol=backend_app_db_named_graph`, `blast_radius(hops=2): hop1=3 hop2=1 rows=4`, `hotspots(top1)` numeric, `shortest_dep_path` hops=2. Rule-3 counter-proof: `FALKORDB_PORT=6399` → `redis.exceptions.ConnectionError`, exit 1. `graph_sync.py` loads `graphify-out/graph.json` into `code:graphhacks`; `falkor_action.py` returns a `DecisionTrace` (action, graph, params, cypher, node_ids, edges, hop_buckets, row_count, elapsed_ms).
- **Track 03 verified:** `cd backend && uv run python scripts/verify_track3.py` → `track3 OK — repo=graphhacks people=1 commits=19 files=168 symbols=292 docs=48 owners=1 trace_docs=1 spec_drift=382 doc_drift=0 cited=100%` exit 0 (local `git log --numstat` + docs + `graph.json` only; PRs deferred — no GitHub token). `falkor_brain.py` implements `who_owns`/`trace_why`/`detect_drift`; removed symbols are flagged `present=false`, never deleted, so drift is detectable.
- **Cockpit wired to the real route (T4.1/T4.2, rule 3):** `GET /api/tenants`, `/api/graph/nodes?tenant=`, `/api/graph/edges?tenant=` (F2) return real JSON (`curl` 200) and `{"detail":"FalkorDB unavailable (ConnectionError)"}` HTTP 503 when FalkorDB is stopped; the Vite/nginx `/api` proxy and `src/data/remote.ts` have **no fallback** — `App.tsx` shows `ErrorScreen`, then `Retry` renders after restart (F1/F3). Verified: `docker stop falkordb` → HTTP 503; `docker start falkordb` → HTTP 200.
- **Submission packet (T4.4, uncommitted, this slice):** root `README.md` (pitch · three-track positioning · architecture · four-tier model + three named graphs · run instructions · rule-11 disclosure · vibe→principal narrative), root `queries.cypher` (real parameterised Cypher copied from `backend/app/*.py`), `docs/guides/DEMO-SCRIPT.md` (3-minute click-by-click). All six rule-10 items covered.
- **F5 compose (files landed):** `docker-compose.yml`, `Dockerfile`, `backend/Dockerfile`, `deploy/nginx.conf` present; `docker compose config` exit 0. Full `docker compose up --build` not re-run in this packet slice.
- **D8/D9 history:** the Python port (D8) superseded the Node backend (`dump/node-backend/` retained); the frontend was modularized under `src/` (D9) with a single `src/data/` seam. Both remain valid; D9 was a pure refactor (`npm run build` exit 0, CSS byte-identical at the time).

## Recent commits

- `chore(graph): refresh graphify graph after T1 (457 nodes, 560 edges)` — incremental `graphify update .` at HEAD; deleted root-duplicate subtree (24 nodes) gone; new scripts/debug-drill/package nodes; verify: graph.json parses = 457 nodes / 560 edges (2026-10-16)
- `feat(memory): real FalkorDB client + health check + write/read smoke (T1.3, T1.4)` — official `falkordb@6.8.0`; `npm run health` prints `MATCH (n) RETURN count(n) => 1` exit 0; smoke MERGE writes/reads `smoke-1` text back, count stays 1; Node v18 vs `engines>=22` risk noted (2026-10-16)
- `docs(debug): T1.2 drill — "6379 refused" (ECONNREFUSED); FalkorDB restored UP` — reproduced by stopping container; root cause container stopped; 5 hypotheses tested; `nc` exit 1→0, `redis-cli PONG` after restart (2026-10-16)
- `docs(progress): mark T1.1 done — FalkorDB up (nc -z localhost 6379 = 0)` (2026-10-16)
- `chore(repo): remove root↔src duplicate cockpit (T0.2)` — root duplicate deleted; `src/` copy canonical; `npm run build` exit 0 (2026-10-16)
