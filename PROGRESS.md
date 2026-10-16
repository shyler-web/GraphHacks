# Progress — GraphHacks Track 02

Living status. Update after every verified milestone (see `AGENTS.md` §Progress). The authoritative task list is `reference/insight.html` §4 (T0.1 → T4.5).

**Deadline:** Oct 18, 11:59 PM IST · **Mode:** solo · **Backend:** Node/TS · **Orchestration:** hand-rolled · **Tracing:** LangSmith · **Deploy:** local Docker first

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
| T2.1 | memory-service contract + decision record | typed signatures + schema decision | ⬜ todo |
| T2.2 | Episodic: write_turn / recall_turns | 2 messages → 2 Turn nodes in order | ⬜ todo |
| T2.3 | Semantic: facts & entities | message builds queryable Entity/Fact nodes | ⬜ todo |
| T2.4 | Procedural: workflow replay | stored Workflow fetched and re-run | ⬜ todo |
| T3.1 | Handoff ledger | agent B reads A's HANDED_TO | ⬜ todo |
| T3.2 | Per-tenant isolation | tenant B sees 0 of A's turns | ⬜ todo |
| T3.3 | Concurrency test | N writers → all N, no loss | ⬜ todo |
| T4.1 | Vite route `/api/graph/nodes` | curl returns real JSON | ⬜ todo |
| T4.2 | Cockpit reads real route | stop FalkorDB → app errors | ⬜ todo |
| T4.3 | Explainable answers | answer carries its subgraph + sources | ⬜ todo |
| T4.4 | Submission packet | all rule-10 items + AI disclosure | ⬜ todo |
| T4.5 | Rehearse rule-12 explanation | narrate model/queries/decisions cold | ⬜ todo |

## Blockers / notes

- FalkorDB running: `docker run -d --name falkordb -p 6379:6379 -p 3000:3000 falkordb/falkordb:latest` (container `falkordb`, Browser UI on `:3000`, Redis port `6379`). Restart with `docker start falkordb`.
- **Risk:** `falkordb@6.8.0` declares `engines.node >=22` but the host runs Node **v18.19.1**. Install prints `EBADENGINE`; the client was smoke-tested and works (`RETURN 1`, `MATCH (n) RETURN count(n)`, MERGE write/read all OK). Revisit if a Node-22-only API is hit or on a clean install elsewhere.

## Recent commits

- `chore(graph): refresh graphify graph after T1 (457 nodes, 560 edges)` — incremental `graphify update .` at HEAD; deleted root-duplicate subtree (24 nodes) gone; new scripts/debug-drill/package nodes; verify: graph.json parses = 457 nodes / 560 edges (2026-10-16)
- `feat(memory): real FalkorDB client + health check + write/read smoke (T1.3, T1.4)` — official `falkordb@6.8.0`; `npm run health` prints `MATCH (n) RETURN count(n) => 1` exit 0; smoke MERGE writes/reads `smoke-1` text back, count stays 1; Node v18 vs `engines>=22` risk noted (2026-10-16)
- `docs(debug): T1.2 drill — "6379 refused" (ECONNREFUSED); FalkorDB restored UP` — reproduced by stopping container; root cause container stopped; 5 hypotheses tested; `nc` exit 1→0, `redis-cli PONG` after restart (2026-10-16)
- `docs(progress): mark T1.1 done — FalkorDB up (nc -z localhost 6379 = 0)` (2026-10-16)
- `chore(repo): remove root↔src duplicate cockpit (T0.2)` — root duplicate deleted; `src/` copy canonical; `npm run build` exit 0 (2026-10-16)
