---
name: verify-change
description: The per-change verification loop — run the exit criterion immediately after each state-changing step, never batch to the end. Use after writing code, wiring data, or before committing.
---

# Verify Every Step

Errors compound; verify per change, not at the end (lesson 0107).

## The loop
1. State the exit criterion you are satisfying.
2. Make the smallest change.
3. Run its `verify:` check **immediately**.
4. If it passes, move on; if it fails, fix here — you are still one step from green.

## This project's checks
- `npm run build` — typecheck + build passes.
- `npm run health` — prints `MATCH (n) RETURN count(n)` from FalkorDB (T1.3).
- `nc -z localhost 6379` — FalkorDB is up.
- `curl localhost:5173/api/graph/nodes` — the read route returns real JSON (T4.1).
- **Rule-3 flip:** with the app running, `docker stop` FalkorDB → the app must visibly error.

## Rules
- A verification is a command with observable output, not "looks good".
- Do not mark a task done in `PROGRESS.md` until its exit criterion passes.
- Before committing, confirm no secrets are staged (`git diff --cached`).
