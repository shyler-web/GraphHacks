# GraphHacks — Track 02 (Agent Memory and Coordination)

Hackathon project for the WeMakeDevs × FalkorDB **Graph Hacks** event (Oct 15–18, 2026). The app is a Vite + React + TS "cockpit" (`src/main.tsx` → `App()` in `src/graphsync_multi_agent_falkordb_memory_cockpit.tsx`). It is **currently a simulation** and must be wired to a **real FalkorDB** instance (rule 3: the graph must do real work).

## ALWAYS — locked context (do not reopen without recording a decision)

1. **Rules that bind us:** FalkorDB is the primary graph DB and must be load-bearing (rule 3). Track 02. Deadline Oct 18, 11:59 PM IST.
2. **Goal + exit criterion:** a deployed/local Track 02 demo where stopping FalkorDB visibly breaks the app. That flip is the submission.
3. **Locked decisions** (full records in `docs/decisions.md`): Node/TS backend · hand-rolled orchestration (no framework) · LangSmith tracing · local Docker Compose first. Do not silently change these.
4. **Health check:** `npm run health` (once built) prints `MATCH (n) RETURN count(n)` against FalkorDB. Run it after every change that touches data.

## Context graph — use graphify FIRST

This repo has a **graphify knowledge graph** at `graphify-out/graph.json`. For ANY question about the codebase, architecture, or the lessons, **query the graph before reading files**:

- `graphify query "<question>"` — broad context (BFS)
- `graphify path "<A>" "<B>"` — shortest path between two concepts
- `graphify explain "<Node>"` — plain-language explanation of a node

This graph is the project's durable, model-agnostic memory: a new session (any model) can rebuild context from it instead of re-reading the repo.

**Rebuild after significant changes** (incremental): `graphify update .`
Rail-map: `graphify-out/GRAPH_REPORT.md`. Interactive view: `graphify-out/graph.html`.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Memory | **FalkorDB** (Docker) | one named graph per tenant |
| Backend + agents | **Node.js + TypeScript** (Fastify/Express) | official `falkordb` npm client |
| Frontend | **React + Vite + TS** | the existing cockpit |
| LLM | **Gemini** | extraction + reasoning |
| Tools | **Tavily** | web-search tool the agent calls; available as MCP |
| Tool protocol | **MCP** | FalkorDB graph tools + Tavily |
| Observability | **LangSmith** | trace every LLM + tool call |
| Orchestration | **hand-rolled** state machine | persisted in FalkorDB |

See `reference/tool-integration.html` for the full wiring, and lesson `0202` for how it connects.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck + production build
- `npm run health` — (to add, T1.3) print node count from FalkorDB
- `docker run -p 6379:6379 -p 3000:3000 -it --rm falkordb/falkordb:latest` — start FalkorDB
- `graphify update .` — refresh the knowledge graph

## Teaching workspace

- `MISSION.md` — why this project exists; every task should trace to it.
- `GLOSSARY.md` — canonical terms; use them exactly.
- `RESOURCES.md` — trusted sources.
- `lessons/*.html` — one-win lessons: `0001–0012` build Track 02 · `0101–0111` engineering judgment · `0201–0205` toolchain & setup.
- `reference/*.html` — cheatsheets and playbooks (`insight.html` is the master plan; `tool-integration.html`, `opencode-setup.html`, `git-workflow.html`, `prompt-playbook.html`, `features.html`, `exit-criteria.html`, `graph-schema.html`, `cypher-cheatsheet.html`).
- `PROGRESS.md` — living status; the authoritative tasks are `reference/insight.html` §4.

## Subagents & skills

Use the project subagents for focused work (see `.opencode/agent/`): `researcher`, `teacher`, `planner`, `builder`, `reviewer`, `debugger`, `gitter`, `graphify-keeper`. Skills in `.opencode/skills/`: `prompt-playbook`, `verify-change`, `track02-build`.

## Git workflow — commit and push continuously

- Work in small, verified units. After a unit passes its exit criterion, **commit immediately** — do not batch.
- Commit messages brief future sessions (lesson 0110): what changed, the decision + why, and the evidence. Example:
  `feat(memory): persist Turns to FalkorDB via MERGE; decision: one graph per tenant (D2); verify: npm run health = 2`
- **Push to the remote after each verified commit** (`git push`). Keep the public repo the source of truth (rule 10).
- Never commit broken code as "done". If it is not verified, do not mark it done.

## Security — non-negotiable

- **Never read, print, or commit `.env`, `.env.*` (except `.env.example`), keys, or tokens.** Secrets live only in `.env` + the environment.
- Do not paste secrets into source, tests, commits, or the graph. If a secret is needed, reference it via `process.env`.
- Before any commit, confirm no secret is staged (`git diff --cached`).

## AI disclosure

AI coding assistants are used and **must be disclosed** in the submission (rule 11). Record what the assistant did in the README. The participant remains responsible for correctness (rule 12).

<!-- Keep this file concise: it is injected into every session. -->
