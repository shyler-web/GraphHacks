# Teaching notes

## Learner profile
- Solo, limited hours before Oct 18 11:59 PM IST deadline.
- New to graph DBs/Cypher, LLM agent memory, and React/TS.
- Built the foundation (`graphsync_multi_agent_falkordb_memory_cockpit.tsx`) with AI acceleration; low conceptual clarity.
- Goal: **functional, deployed Track 02 demo** they can debug and direct AI on. Not extreme theoretical depth.
- Preference: **short HTML lessons, one tangible win each**. Wants many lessons produced quickly (comfortable with subagent-authored lessons).

## Teaching decisions
- Lessons stay pragmatic: "enough to engineer, debug, and direct AI."
- Every lesson ties back to a Track 02 key-focus point and the submission requirements.
- Citations required — no uncited claims.
- Lessons are one self-contained HTML file in `lessons/`, linking `../assets/lesson.css` and `../assets/quiz.js`.

## Working context
- The repo is a Vite + React + TS app. Entry `src/main.tsx` → `App()` in `src/graphsync_multi_agent_falkordb_memory_cockpit.tsx`.
- Graph of the codebase lives in `graphify-out/graph.json` (use `graphify query` for code questions).
- Known issues: root copy duplicates `src/` copy; backend is simulated, not real FalkorDB.

## Reference pages
- `reference/insight.html` — master insight page: snapshot findings, graph findings, lesson→project map, dependency-ordered to-do (T0.1–T4.5), rule compliance matrix. Regenerate/refresh when the snapshot changes.
- `reference/archify-guide.html` — Archify skill (diagrams as code): pipeline + package figures embedded from `assets/diagrams/` (reusable diagram assets; regenerate with the Archify CLI).
- `lessons/0111-capstone-the-engineers-prompt.html` — capstone summary of the 010* series.
