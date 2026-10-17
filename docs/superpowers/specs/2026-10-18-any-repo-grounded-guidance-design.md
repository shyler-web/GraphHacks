# Design — Any-repo loading + graph-grounded guidance (Option B)

**Date:** 2026-10-18 · **Status:** agreed · **Supersedes:** none (extends the three-track design)

## Goal

Make GraphHacks Nexus point at **any GitHub repo by pasting a link**, and make the
L0→L5 maturity guidance **grounded in that repo's actual graph facts** — so L4 says
"*your* most-called function is unthrottled" rather than generic advice. LLM provider
is **Nebius Token Factory** (OpenAI-compatible); web research is **Tavily**; both keep
a keyless deterministic fallback everywhere.

## Scope

- **In:** paste-a-link repo loading · repo-first-class on Track 01/03 · graph-grounded
  guidance (`/api/guidance`) · Nebius (LLM) + Tavily (search) · frontend repo picker.
- **Out (deferred):** greenfield/empty-project mode — the demo runs on an existing repo.

## Architecture

```
paste URL → POST /api/repos/load → graphify clone/update → load_graph(code:<slug>)
                                     → FalkorBrain ingest (company:brain) → :Repo registry
            → GET /api/track1/*?repo=slug   (hotspots / blast-radius / shortest-path)
            → GET /api/track3/*?repo=slug   (who-owns / trace / drift)
            → POST /api/guidance {repo, level, symbol?}
                    = graph queries → Nebius → grounded L0..L5 answer + facts + trace
            → POST /api/research {query} → Tavily → cited sources
```

**Single LLM seam:** `backend/app/llm.py` (Nebius, OpenAI-compatible). **Single search
seam:** `backend/app/search.py` (Tavily). Both raise `*Unavailable` → HTTP 503 → UI
degrades; neither is imported until called, so FalkorDB remains the only hard dep.

## API contracts (the seams subagents build against)

### `POST /api/repos/load`
- Request: `{"url": "https://github.com/<owner>/<repo>"}`
- Response: `{"repo_id": "<slug>", "name": "<repo>", "url": "...", "files": N, "symbols": N, "nodes_total": N, "commits": N, "owners": N, "hotspots": N}`
- Errors: 409 when clone/graphify fails (missing artifact), 503 when FalkorDB down.

### `GET /api/repos`
- Response: `{"repos": [{"id": "<slug>", "name": "...", "url": "...", "loaded_at": <epoch>}]}`

### `GET /api/track1/hotspots?repo=slug&limit=8` (and blast-radius / shortest-path)
- `repo` optional; defaults to the registered active repo (fallback `graphhacks`).

### `GET /api/track3/who-owns?repo=slug&target=...` (and trace / drift)
- `repo` optional; same defaulting.

### `POST /api/guidance`
- Request: `{"repo": "<slug>", "level": 0..5, "symbol": "<optional symbol id>"}`
- Response: `{"repo": "...", "level": N, "answer": "<grounded text>",
  "facts": {"hotspots": [...], "blast_radius": {...}, "owners": [...], "drift": {...}},
  "trace": {"cypher": [...], "elapsed_ms": N}}`
- No key → 503 with a clear message (UI shows facts-only or an error banner).

### `POST /api/research`
- Request: `{"query": "..."}`
- Response: `{"query": "...", "sources": [{"uri": "...", "title": "...", "content": "..."}]}`

### `POST /api/gemini/generate` (legacy path, unchanged shape)
- Now proxied to Nebius; accepts the existing Gemini payload, returns the existing
  Gemini response shape. Frontend `src/orchestration/gemini.ts` is untouched.

## Environment (`.env`, never committed)

| Var | Default | Purpose |
|---|---|---|
| `NEBIUS_API_KEY` | — | Nebius provider token (required for LLM features) |
| `NEBIUS_BASE_URL` | `https://api.tokenfactory.nebius.com/v1` | override |
| `NEBIUS_MODEL` | `meta-llama/Llama-3.3-70B-Instruct` | any NVIDIA/NIM id |
| `TAVILY_API_KEY` | — | web-search grounding |
| `REPO_ROOT` / `GRAPH_JSON_PATH` | git root / `<root>/graphify-out/graph.json` | per-repo source (existing) |

## Files (ownership boundary — subagents must not collide)

| File | Owner |
|---|---|
| `backend/app/llm.py`, `search.py`, `main.py`, `.env.example` | integrator (done) |
| `backend/app/repos.py` (new) | W1 — repo loading |
| `backend/app/routes_tracks.py` (add `?repo=`) | W1 |
| `backend/app/guidance.py` (new) | W2 — grounded guidance |
| `src/panels/*`, `src/data/remote.ts`, `src/App.tsx`, `src/orchestration/*` | W4 — frontend |
| `README.md`, `queries.cypher`, `docs/guides/DEMO-SCRIPT.md` | integrator (W5) |

## Rule-3 proof (unchanged)

Stop FalkorDB → every `/api/*` read returns 503 → `ErrorScreen`; no fallback.
The new endpoints follow the same `service_error` translation (`errors.py`).
