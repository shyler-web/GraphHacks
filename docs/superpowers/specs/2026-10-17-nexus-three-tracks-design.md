# GraphHacks Nexus — Three-Track Design

**Status:** DESIGN — approved direction; no code yet. Implementation plan: `docs/superpowers/plans/2026-10-17-nexus-three-tracks.md`.
**Date:** 2026-10-17 · **Event:** WeMakeDevs × FalkorDB Graph Hacks · **Deadline:** Oct 18, 2026, 11:59 PM IST.
**Tracks targeted:** 01 (Agents That Act on Connected Data), 02 (Agent Memory & Coordination), 03 (Company Brain).

---

## 0 · Reality check (what this design corrects)

The source "Triple-Crown" plan was written against a different base repository. Grounded corrections:

| Source plan assumed | This repo's truth | Consequence |
|---|---|---|
| Base repo `graphify`; add `graphify/falkor_*.py` modules | `graphify` is an **installed uv tool** (`graphifyy v0.9.85`), not owned source. The repo is **GraphHacks**. | All new engine code lives under **`backend/app/`**. graphify is consumed as infrastructure (rule 1). |
| New `graphify/nexus_ui.py` zero-build SPA | A modular React+Vite+TS cockpit already exists (D9), byte-identical to the pre-refactor baseline. | **Reuse the cockpit.** Extend the `src/data/` seam. No second UI stack. |
| `db.select_graph("memory:<tenant>")` | `tenant:<id>` per D5, already implemented in `backend/app/db.py`. | Keep `tenant:<id>`; add `code:<repoId>` + `company:brain` under new decision D10. |
| Node side-car + Vite `configureServer` for `/api` | D8 moved the backend to Python/FastAPI. | FastAPI owns `/api/*`; Vite dev-proxies to it. |
| Track 01/03 greenfield | A real AST graph already exists at `graphify-out/graph.json` (457 nodes / 560 links). | Tracks 01/03 are fed by real in-repo data; no external API keys. |

**Facts verified live during this design:**
- FalkorDB is running (`docker` container `falkordb`, `:6379` / Browser `:3000`).
- FalkorDB ships native `algo.pageRank(label, rel-type)`, `algo.betweenness`, `algo.BFS`, `algo.SPpaths`/`SSpaths`, `algo.WCC`, `algo.labelPropagation`, `algo.maxFlow`, `algo.MSF` (docs.falkordb.com/algorithms).
- The **FalkorDB MCP server** is configured in `opencode.json` and connected this session (`list_graphs` returns real graphs).
- `graphify export falkordb --graph graphify-out/graph.json --push falkordb://localhost:6379` loads an existing graph without re-extraction; the custom loader below is preferred for `:File`/`:Symbol`/`:Test` labels and test detection.
- FalkorDB is **atomic per graph** and serializes writers; redis-py clients are thread-safe. `CREATE INDEX IF NOT EXISTS` is **unsupported** — tolerate the "already indexed" `ResponseError`.

---

## 1 · Positioning — one repo, three entries, one load-bearing graph

A single submission repo (`GraphHacks`) is entered in all three tracks. The FalkorDB engine is shared; each track is a distinct **projection** served through the same FastAPI backend and the same React cockpit:

- **Track 02 (anchor)** — `tenant:<id>` graphs: episodic + semantic + procedural memory, handoffs, isolation, concurrency. ~60% built (T2.2 has Python parity).
- **Track 01** — `code:<repoId>` graph: `graphify-out/graph.json` synced into FalkorDB, then blast-radius / PageRank / shortest-dependency-path actions with explainable traces.
- **Track 03** — `company:brain`: people (git authors) + commits + docs + code symbols, with source-cited `who_owns` / `trace_why` / `detect_drift`.

**Scope honesty (locked):** Track 02 is the guaranteed win (MISSION target, contract, T2.2 done). Tracks 01/03 are **real but thin** entries that reuse the substrate. The rule-3 flip for Track 02 must not be starved (`D8 ⚠ Risk accepted`). If hours collapse, ship Track 02 strongly and keep 01/03 at the same engine with a narrower feature set.

**Out of scope (do NOT build):** auth/billing, cloud deploy, vector recall (A7), PRs/issues via GitHub (no token — local `git log` only), a second UI framework/router, `algo.betweenness`/`WCC`/`labelPropagation` beyond what a demo needs, production hardening.

---

## 2 · Architecture

```
                 React cockpit (src/ — REUSE, D9)
   App.tsx + panels/{Track01Studio,Track03Brain}.tsx  (+ existing panels)
                       │  HTTP/JSON  (Vite dev-proxy /api → :8000)
              FastAPI  backend/app/main.py
                       │
   ┌───────────────────┼─────────────────────────────────────┐
   │ Track 01 engine    │ Track 02 MemoryService (extend)      │ Track 03 engine
   │ falkor_action.py   │ memory_service.py                    │ falkor_brain.py
   │ blast/PageRank/SP  │ episodic·semantic·procedural·handoff │ who_owns/trace_why/drift
   └───────────────────┴─────────────────────────────────────┘
                       │   falkor_engine (H0) — db.named_graph router, indexes, telemetry
                       ▼
   FalkorDB named graphs:  tenant:<id>  ·  code:<repoId>  ·  company:brain
                       ▲
   graph_sync.py ◄── graphify-out/graph.json    git log + docs/ (Track 03)
```

**H0 foundation** generalizes `backend/app/db.py`: a `named_graph(graph_key, config)` context manager, a generic idempotent `ensure_indexes(...)`, the graph-key helpers (`tenant_graph_key`, `repo_graph_key`, `BRAIN_GRAPH`), and optional Cypher telemetry (ms) carried in every engine's `DecisionTrace`.

---

## 3 · Decisions

- Bound and unchanged: **D2** hand-rolled orchestration · **D3** LangSmith · **D4** local Docker Compose · **D5** one graph per tenant · **D6** MemoryService contract · **D8** Python backend · **D9** modular cockpit reuse.
- New: **D10** — named graphs `code:<repoId>` and `company:brain` in addition to `tenant:<id>` (records that D5's "one graph per tenant" is preserved and extended, not replaced). Recorded in `docs/decisions.md`.
- Contract ambiguity resolutions A1–A8 stand; the plan adds **A9** (derived `Step.id = "<workflow_id>:step:<order>"`) and **A10** (`replay_workflow` executor resolved via `LEARNED_FROM → FROM_AGENT`, else a synthetic `agent:replay`), appended to the contract/decisions.

---

## 4 · Verification gates (all tasks)

- **Gate 1 — contract/unit:** `cd backend && uv run pytest` (engine + memory), plus per-slice `verify_*.py` scripts.
- **Gate 2 — live FalkorDB:** `uv run python health.py` → `FalkorDB OK — MATCH (n) RETURN count(n) => N`; `npm run health` (Node mirror) stays green.
- **Gate 3 — visual / rule 3:** `npm run dev`; create a node in FalkorDB → it appears on reload; **stop FalkorDB → the app visibly errors** (that flip is the submission).
- **Exit criteria** are runnable commands with a fixed expected stdout line (see the plan). Commit after every passing criterion with a decision-bearing message + `verify:` line (AGENTS.md git workflow).

---

## 5 · Risks

1. **Scope explosion** (3 tracks, solo, beginner, < 36h) → anchor+thin scoping above; Track 02 first.
2. **Track-02 starvation** by 01/03 → do the rule-3 flip (F3) before Track 01/03.
3. **Stale AST graph** (`graph.json` predates D8/D9) → refresh is Track 01 Task 0.
4. **`CREATE INDEX IF NOT EXISTS` unsupported** → tolerate "already indexed"; index the MERGE keys.
5. **Rule 12** → keep `queries.cypher` and this design current; narrate model/queries/decisions cold.

---

## 6 · Task-ID map

Existing T0–T4 (`reference/insight.html` §4) continue for Track 02. The plan adds:
- **M-01** H0 foundation · **F1–F5** frontend/proxy/routes/rule-3/UI/compose.
- **Track 01:** Task 0 refresh · Task 1 `graph_sync` · Task 2 `falkor_action` · Task 3 `verify_track1`.
- **Track 03:** T3.1–T3.8 (`falkor_brain`).
- **Ship:** README + graph model, `queries.cypher`, demo video, local setup, AI disclosure (rule 10/11).
