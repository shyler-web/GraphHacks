---
name: prompt-playbook
description: How to write a task for the AI on this project — the 5-point spec card (exit criterion first), locked decisions, and verification. Use whenever the user is about to ask the AI to build, fix, or change something, or says "prompt", "spec", "task", "how should I ask".
---

# Prompt Playbook

Before handing any task to the AI, write a **spec card** (lesson 0103). Five lines:

1. **What it builds** — one sentence.
2. **Exit criterion** — a specific, runnable check. Not "feature works". Example: `npm run health` prints a number.
3. **Out of scope** — what the AI must not touch.
4. **Locked decisions** — what may not be reopened (see `docs/decisions.md`, `AGENTS.md` §ALWAYS).
5. **Verify step** — the exact command the AI runs to prove done.

## Rules
- The exit criterion is the most important line. If you cannot write a check for it, the task is not ready.
- Point at files via the graphify graph first: `graphify query "<area>"` — do not ask the AI to re-read the whole repo.
- State the work type (build / fix / explain) and, for big tasks, the autonomy tier (see lesson 0109).
- One task = one card. Do not bundle.
- End with: "Stop and report if blocked; do not improvise."

See `reference/prompt-playbook.html` for worked examples, and lessons 0101/0103 for the why.
