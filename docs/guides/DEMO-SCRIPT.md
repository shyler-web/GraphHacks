# Demo script — GraphHacks Nexus (3 minutes, click-by-click)

**Track entered:** 02 — Agent Memory and Coordination (with real, thin Track 01 / Track 03 entries on the same FalkorDB engine).
**Setup before recording:** start Docker, run Option A or B from the README, seed once, and leave the cockpit open at `http://localhost:5173`. Keep two terminals visible: one for `docker`, one for `uv run` scripts. Have FalkorDB Browser (`http://localhost:3000`) open in a third tab for the graph-view beat.

> **Golden rule for the recording:** the graph must do the work. Never read a value off a slide that you could show coming out of FalkorDB. The one moment that matters most is step 2 — **stop the database and watch the app break**.

---

## 0:00–0:25 · Spin up + orient

**Click:** show the terminal running `docker compose up --build` (or the four Option-A commands), then the seeded log line:

```
graphsync_user1_ai_avatar_saas nodes=7 edges=8 episodes=1 playbooks=1 handoffs=3
graphsync_user2_fintech_ledger nodes=2 edges=1 episodes=1 playbooks=0 handoffs=1
registry tenants=2
seed_cockpit OK
```

**Click:** switch to the browser at `http://localhost:5173`. Say: *"One repo, three tracks. One FalkorDB instance holding three named graphs — `tenant:<id>` for agent memory, `code:<repoId>` for the code graph, and `company:brain` for the company brain. Nothing here is simulated: the cockpit just fetched every node you can see from FalkorDB."*

**Point at** the header tabs: `2D Graph Cockpit · 3-Tier Agent Memory · Track 01 · Action Studio · Track 03 · Company Brain`.

---

## 0:25–0:50 · Rule-3 flip (the submission)

**Click:** terminal → `docker compose stop falkordb` (or `docker stop falkordb`).

**Click:** reload the cockpit tab.

**Show:** the **ErrorScreen** — `FalkorDB unavailable (ConnectionError)`. Say: *"There is no fallback to seed data. If the graph database is down, the app is down. The graph is load-bearing."*

**Click:** `docker compose start falkordb`, then click **Retry** in the cockpit.

**Show:** the graph renders again. This up/down/up is the rule-3 proof.

---

## 0:50–1:30 · Track 02 — three tiers in one connected graph

**Click:** header tab **2D Graph Cockpit**. Select a node (e.g. the L0 vibe node) in the canvas; show the **Node Inspector** on the right.

**Click:** header tab **3-Tier Agent Memory**. Say: *"Episode on the left is the episodic tier — a `:Turn` persisted inside a `:Session`. Playbooks in the middle are procedural — the stored `:Workflow` the team can replay. And the handoffs on the right are coordination."*

**Click:** the tenant switcher in the Control Panel → **Tenant B: Stripe Webhook & FinTech Ledger**. Show that tenant B has **different** nodes, episodes, and handoffs. Say: *"Isolation is structural — tenant B is a different FalkorDB graph key. Tenant A sees 3 turns; tenant B sees 0. That's `tenant_a=3 tenant_b=0`."*

**Optional (5 s):** drop to a terminal and run, from `backend/`:

```bash
uv run python scripts/verify_t2_2.py   # turns=2 order=user,agent
uv run python scripts/verify_t2_3.py   # semantic=1 facts=1 source=ok
uv run python scripts/verify_t2_4.py   # workflow=1 steps=3 start=ingest
```

---

## 1:30–2:00 · Track 02 — the swarm and how the graph persists escalation

**Click:** still on **3-Tier Agent Memory** — scroll to the **handoff ledger**. Trace the chain on screen:

`VibeArchitect (L0-L1) → FullStackBuilder (L2-L3) → SeniorAuditor (L4-L5) → LearningCoach`, with one handoff marked **`ALERT_RAISED`**.

Say: *"The vibe prompt escalates to an audit. Every step is a `:Handoff` node with `FROM_AGENT`, `TO_AGENT`, and `TARGETS` edges pointing at the real agent and the affected concept node — so the escalation is a queryable path, not a log line. When the audit is done, `save_workflow` records what the team learned as a replayable `:Workflow` linked back with `LEARNED_FROM`, and replaying it writes one `EXECUTED` edge. That's the vibe-coder → principal-architect arc, persisted in the graph."*

**Optional (5 s):** `uv run python scripts/verify_t3_1.py` → `handoffs=1 edge=1`, then `verify_t3_3.py` → `writers=16 distinct=16 same=1` for the concurrency claim.

---

## 2:00–2:30 · Track 01 — blast radius on the real code graph

**Click:** terminal (from `backend/`):

```bash
uv run python scripts/verify_track1.py
```

**Show the real output line-by-line:**

```
load#1 files=107 symbols=521 tests=17 nodes=628 edges={'CALLS': 51, 'IMPORTS': 188, 'CONTAINS': 360, 'INHERITS': 28}
demo_symbol=backend_app_db_named_graph
blast_radius(hops=2): hop1=3 hop2=1 rows=4
hotspots(top1): backend_app_config_falkordbconfig_from_env score=0.008703
shortest_dep_path: backend_app_db_named_graph -> backend_app_config_falkordbconfig_from_env hops=2
TRACK1 OK
```

Say: *"This is this repo's own AST graph loaded into `code:graphhacks`. Blast radius finds everything that transitively calls a changed symbol, bucketed by hop. Hotspots is native `algo.pageRank` over the `CALLS` subgraph. Shortest dependency path uses native `algo.SPpaths`. Every answer carries its Cypher, parameters, node and edge evidence, and query time — that's the decision trace."*

**Click:** header tab **Track 01 · Action Studio** to show the read-only cockpit view of the same graph (labelled "borrowed schema"). Click a row to jump back into the 2D cockpit.

---

## 2:30–2:55 · Track 03 — who owns it, and why

**Click:** terminal (from `backend/`):

```bash
uv run python scripts/verify_track3.py
```

**Show:**

```
track3 OK — repo=graphhacks people=1 commits=19 files=168 symbols=292 docs=48 owners=1 trace_docs=1 spec_drift=382 doc_drift=0 cited=100%
```

Say: *"`company:brain` is built from local git history, the docs on disk, and the AST graph — no GitHub token, so PRs are deferred, not faked. `who_owns('docs/decisions.md')` walks commit authorship over `MODIFIED` edges. `trace_why` resolves a symbol or doc to its sources — every answer is 100% cited, each source carrying a doc path, commit, and person. `detect_drift` finds files changed inside a 30-day window that no doc mentions. Removed symbols are flagged `present = false`, never deleted, so a doc that still mentions one becomes a drift signal."*

**Click:** header tab **Track 03 · Company Brain** to show the cited-answer projection, then select an entity to jump back to the cockpit.

---

## 2:55–3:00 · Wrap

**Click:** back to **2D Graph Cockpit**.

Say: *"One FalkorDB instance, three named graphs, one cockpit. Stop the database and everything you just saw breaks — that's the proof the graph is doing the real work. Track 02 is the anchor: episodic, semantic, procedural memory and multi-agent handoffs in one connected graph. Tracks 01 and 03 reuse the same engine on the same data. Queries are in `queries.cypher`; the data model is in the README."*

---

## Recording cheat-sheet

| Beat | Trigger | What must be visible |
|---|---|---|
| Rule-3 flip | `docker compose stop falkordb` → reload → `start` → Retry | **ErrorScreen**, then graph re-renders |
| Isolation | tenant switcher A → B | different graphs; `tenant_a=3 tenant_b=0` |
| Memory tiers | 3-Tier Agent Memory tab | episode + playbook + handoff all populated |
| Escalation | handoff ledger | `… → SeniorAuditor` with `ALERT_RAISED` |
| Track 01 | `uv run python scripts/verify_track1.py` | `TRACK1 OK`, hop1/hop2 blast radius |
| Track 03 | `uv run python scripts/verify_track3.py` | `track3 OK … cited=100%` |
| Real graph | FalkorDB Browser `:3000` (optional B-roll) | the same nodes live |

**If something fails on camera:** do not improvise around it. Show the error, check `nc -z localhost 6379` / `docker ps`, and restart FalkorDB — an honest recovery is stronger than a fake pass, and rule 12 expects you to explain what happened.
