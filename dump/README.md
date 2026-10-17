# dump/node-backend — retired Node/TS backend (revert point for D8)

This directory preserves the **Node.js + TypeScript** backend and its verification
scripts, retired when the project moved to a **Python** backend (decision **D8**,
which supersedes **D1**). It is kept so the port can be reverted cheaply if the
Python implementation cannot reach parity before the deadline.

## What's here

| Path | What it was |
|---|---|
| `server/memory/service.ts` | The `MemoryService`, with the episodic tier (T2.2) fully implemented: `writeTurn` / `recallTurns` against `tenant:<id>`, idempotent via `MERGE`. Semantic/procedural/coordination were stubs. |
| `scripts/verify-t2.2.ts` | Exit-criterion check for the episodic tier: 2 messages → 2 `Turn` nodes in order. |
| `scripts/smoke-write-read.mjs` | Minimal write/read smoke test against FalkorDB. |

`scripts/health.mjs` was intentionally **left in place** at the repo root until the
Python health check replaces it, so the project never loses its health invariant.

## How to revert (if needed)

1. `git mv dump/node-backend/server server`
2. `git mv dump/node-backend/scripts/verify-t2.2.ts scripts/verify-t2.2.ts`
3. `git mv dump/node-backend/scripts/smoke-write-read.mjs scripts/smoke-write-read.mjs`
4. Restore `"server"` to `tsconfig.json`'s `include`, and the `verify:t2.2` script to `package.json`.
5. Record the reversal in `docs/decisions.md` (per lesson 0110 — append, don't rewrite history).

The Node deps (`falkordb`, `tsx`) are still in `package.json`/`node_modules`, so a
revert needs no reinstall.
