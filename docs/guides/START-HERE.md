# START HERE — GraphHacks Nexus

You built a real FalkorDB-backed system entered in **all three tracks**. Nothing here is a simulation: stop FalkorDB and the app visibly breaks.

## What exists now

| Track | What it does | Named graph | Prove it |
|---|---|---|---|
| **02 — Memory & Coordination** | episodic + semantic + procedural memory, handoff ledger, per-tenant isolation, high-concurrency writes | `tenant:<id>` | `cd backend && uv run python scripts/verify_t2_2.py` … `verify_t3_3.py` |
| **01 — Agents That Act on Connected Data** | AST graph loaded into FalkorDB; blast-radius, PageRank hotspots, shortest dependency path, with a `DecisionTrace` (exact Cypher + node ids + ms) | `code:graphhacks` | `cd backend && uv run python scripts/verify_track1.py` → `TRACK1 OK` |
| **03 — Company Brain** | people + commits + docs + code symbols; `who_owns`, `trace_why`, `detect_drift`, 100% source-cited | `company:brain` | `cd backend && uv run python scripts/verify_track3.py` → `track3 OK … cited=100%` |

## Run it (30 seconds)

```bash
# 1. FalkorDB
docker run -d --name falkordb -p 6379:6379 -p 3000:3000 falkordb/falkordb:latest
# 2. Backend (owns /api/*)
cd backend && uv run uvicorn app.main:app --port 8000
# 3. Cockpit
npm run dev            # http://localhost:5173
```

One command instead of 1–3: `docker compose up --build` (FalkorDB + backend + nginx frontend on `:5173`).

## The rule-3 flip (the whole submission)

```bash
docker stop falkordb
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:8000/api/graph/nodes?tenant=graphsync_user1_ai_avatar_saas'  # → 503
# reload http://localhost:5173 → ErrorScreen ("FalkorDB unavailable …") + Retry
docker start falkordb    # → Retry renders again
```

## Guides to walk through

| File | What it is |
|---|---|
| `reference/nexus-guide.html` | **The full walkthrough** — architecture, run commands, per-track walkthrough with real Cypher, the rule-3 flip, decisions D5/D6/D8/D9/D10, and the **vibe coder → principal architect** narrative. Open this first. |
| `README.md` | Submission packet (rule 10): pitch, data model, setup, AI disclosure (rule 11). |
| `queries.cypher` | The real parameterised Cypher each track depends on. |
| `docs/guides/DEMO-SCRIPT.md` | 3-minute, click-by-click demo. |
| `docs/decisions.md` | D5/D6/D8/D9/D10 — what was decided, why, and how to explain it (rule 12). |
| `docs/superpowers/specs/2026-10-17-nexus-three-tracks-design.md` | The design. |
| `docs/superpowers/plans/2026-10-17-nexus-three-tracks.md` | The implementation plan (task-by-task). |

## The vibe-coder → principal-architect arc

The 4-agent squad is persisted in the graph: **VibeArchitect (L0–L1) → FullStackBuilder (L2–L3) → SeniorAuditor (L4) → PrincipalResearcher (L5)**. `persona_level` and `created_by_agent` on each `:ConceptNode`, plus the `HANDED_TO` ledger, record the escalation. The guide's §6 shows how to narrate your own arc using this project as evidence.

## API cheat-sheet (backend `:8000`)

```
GET  /api/tenants
GET  /api/graph/nodes?tenant=<id>        GET /api/graph/edges?tenant=<id>
GET  /api/track1/hotspots?limit=
GET  /api/track1/blast-radius?symbol=<id>&hops=     GET /api/track1/shortest-path?from=&to=
POST /api/track1/sync
GET  /api/track3/who-owns?target=&limit=
GET  /api/track3/trace?target=           GET /api/track3/drift
POST /api/track3/sync
```

## MCP

The FalkorDB MCP server (`opencode.json`) exposes `query_graph`, `list_graphs`, `get_graph_schema`, etc., so any MCP-capable agent can query all three graphs directly.
