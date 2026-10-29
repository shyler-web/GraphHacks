# Clarify + GraphHacks Nexus

This repository contains **Clarify**, a Python refactor-review workflow being
built for the Nebius × NVIDIA Global AI Hackathon, alongside the earlier
**GraphHacks Nexus** FalkorDB cockpit documented below. Clarify currently runs
through backend commands; it is not connected to the React cockpit or hosted as
a separate web demo.

## Clarify: current Python workflow

Clarify ranks Python files by an **explainable comprehension-risk proxy**, then
proposes a one-file refactor through the existing Nebius Token Factory adapter.
The configured default is `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`; a different
available NVIDIA model can be selected with `NEBIUS_MODEL`. The score helps
prioritize review; it has **not** been validated as a measure of human
comprehension.

| Implemented capability | What it does |
|---|---|
| A/B/E scoring and ranking | Locally ranks Python source by control-flow cost (A), size and branch burden (B), and missing docstrings (E), with per-file evidence. Scoring uses no model tokens. |
| Frozen behavior checks | Runs the existing baseline and new characterization tests on the original file before freezing them. The same frozen tests check a candidate. |
| Isolated one-file proposal | Requests complete replacement source from Nemotron, writes it only to a temporary copy, and runs repository tests through an offline, resource-limited Docker executor. |
| Before/after validation | Requires passing frozen tests, at least a one-point overall and structural A+B score reduction, and rejects simple comment or helper-splitting score games. These are MVP heuristics. |
| Reviewer handoff | Saves `proposal.diff`, `result.json`, and `INTENT_NOTE.md` with a model-written intent note, one specific reviewer question, and separate test/score evidence. |
| PR delivery | Revalidates the saved patch, checks the fresh GitHub base, includes frozen tests, and opens a PR through `gh` only when explicitly run with `--publish`. It does not edit the original repository. |

### Try the local, keyless parts

With Python 3.12+ installed, run from `backend/`:

```bash
python -m app.cognitive_debt .. --limit 10
python -B -m unittest discover -s tests -q
python scripts/demo_rejected_patch.py C:/work/rejected-demo
```

The first command prints worst-file ranking and A/B/E evidence. The tests use
small owned fixtures. The last command deliberately makes an incorrect change:
its baseline passes, its frozen characterization test fails, and the proposal
is saved as `rejected`. Give the demo command a **new output directory**.

### Run a live proposal and deliver a PR

Follow the example configuration and commands in
[`backend/AGENT_WORKFLOW.md`](./backend/AGENT_WORKFLOW.md). The sequence is:

1. Write characterization tests for the target Python file and freeze them only
   after they pass on the original alongside the existing baseline.
2. Set `NEBIUS_API_KEY`, ensure a suitable NVIDIA model is available through
   Nebius Token Factory, and run the one-file refactor agent with Docker.
3. Inspect the diff, intent note, reviewer question, and validation report.
   Revalidate and prepare `PR_BODY.md` with `app.pr_delivery`.
4. On a trusted fork you control, verify `git remote -v`, then use
   `app.pr_delivery --publish` with an authenticated GitHub CLI to open the PR.

Docker needs a running daemon and a pre-pulled image containing the target
repository's test dependencies. Test containers have no network access or
provider credentials. **The 25 backend fixture tests passed locally**, but a
live Docker run, Nebius model call, and GitHub CLI publication have not yet been
verified for this Clarify workflow. Passing tests cover only their observed
cases and do not prove full behavioral equivalence. The earlier cockpit demo
links below demonstrate GraphHacks Nexus, not this Clarify workflow.

### Work added during the current hackathon build

GraphHacks Nexus existed before this submission period. The Clarify work added
the Python A/B/E ranking, frozen characterization and baseline checks, isolated
refactor proposal, before/after and anti-gaming validation, rejected-patch demo,
reviewer intent note, and guarded PR delivery. The separate guide above explains
how to run and inspect those new modules.

---

## Earlier project: GraphHacks Nexus — FalkorDB Multi-Agent Memory & Maturity Cockpit

> **Track Entered:** **Track 02 — Agent Memory and Coordination**  
> *(Unified with real Track 01 Code Graph and Track 03 Company Brain running on the same FalkorDB engine)*  
> **Event:** WeMakeDevs × FalkorDB Graph Hacks Hackathon

[![FalkorDB](https://img.shields.io/badge/Database-FalkorDB-red.svg)](https://www.falkordb.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20(Python%203.12)-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TS-61DAFB.svg)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Orchestration-Docker%20Compose-2496ED.svg)](https://www.docker.com/)

---

## 📹 Submission Artifacts & Quick Links

- **Demo Video:** [https://youtu.be/mBmGK204FBM](https://youtu.be/mBmGK204FBM)
- **Architecture Blog & Deep Dive:** [https://graphhacks-nexus-architecture.vercel.app/blog.html](https://graphhacks-nexus-architecture.vercel.app/blog.html)
- **Interactive Architecture Diagrams (C4 Level):**
  - [System Context Diagram](https://graphhacks-nexus-architecture.vercel.app/nexus-context.html)
  - [Container Architecture Diagram](https://graphhacks-nexus-architecture.vercel.app/nexus-container.html)
  - [Backend Components Diagram](https://graphhacks-nexus-architecture.vercel.app/nexus-component.html)
- **Cypher Queries File:** [`queries.cypher`](./queries.cypher)

---

## 1. What It Is & The Core Innovation

GraphSync Nexus is a multi-agent engineering cockpit whose **memory and coordination layer is a real, load-bearing FalkorDB graph database**.

### The Problem: Cognitive Debt & Context Loss
In modern software teams:
1. **Beginner founders and vibe coders** talk in plain English feature ideas.
2. **Product Managers** track unit costs and API quotas.
3. **Junior developers** need endpoint wiring and file guides.
4. **Senior engineers** worry about concurrency, unthrottled external spend, and security.
5. **Principal architects** calculate Big-O complexity and graph algorithms.
6. When AI agents collaborate, their memory is usually lost in temporary RAM or fragmented across flat SQL tables and disjointed vector databases.

### The Solution:
GraphSync Nexus unifies all technical perspectives and agent memories into **one connected FalkorDB graph**:
- **The Builder Maturity Dial (L0 → L5):** A single graph is read at six progressive depths—from a plain-English "vibe" card (L0) to formal complexity proofs (L5).
- **17 Domain Lenses:** Every `:ConceptNode` carries an architectural domain (Frontend, Backend, Database, Security & Auth, External APIs, Mathematics, etc.).
- **4-Agent Collaborative Squad:** `VibeArchitect (L0-L1)` $\rightarrow$ `FullStackBuilder (L2-L3)` $\rightarrow$ `SeniorAuditor (L4-L5)` $\rightarrow$ `LearningCoach`.
- **Procedural Memory Guardrails:** When the Senior Auditor flags a missing rate limit on a WebSocket, it bubbles up an `[:ENDANGERS]` alert to L0. Clicking **1-Click Senior Fix** patches the code and saves a permanent `:Playbook` workflow to FalkorDB so future builds are born protected.

---

## 2. Load-Bearing Graph: The Real-Work Test (Rule 3)

The cockpit has **zero hardcoded fallback mock data**. If FalkorDB is offline, the app stops working by design:

```bash
# 1. Stop FalkorDB
# If running via Docker Compose (Option A):
docker compose stop falkordb
# If running standalone container (Option B):
docker stop falkordb

# 2. Reload http://localhost:5173
# -> Instantly renders the ErrorScreen ("FalkorDB unavailable (ConnectionError)")
# -> Backend answers HTTP 503

# 3. Start FalkorDB
# If running via Docker Compose (Option A):
docker compose start falkordb
# If running standalone container (Option B):
docker start falkordb

# 4. Click "Retry" in Cockpit -> The live graph renders cleanly!
```

---

## 3. The Graph Data Model

The graph model compositions live inside isolated FalkorDB named graphs (`tenant:<id>`), connected across four canonical tiers:

```mermaid
flowchart TD
    %% ── Coordination tier ─────────────────────────────
    subgraph COORD["Coordination · who did what"]
        A0[":Agent · VibeArchitect<br/>persona_level L0"]
        A1[":Agent · FullStackBuilder<br/>persona_level L3"]
        A2[":Agent · SeniorAuditor<br/>persona_level L4"]
        H[":Handoff<br/>reason ALERT_RAISED"]
        A0 -->|"HANDED_TO {at}"| A1
        A1 -->|"HANDED_TO {at}"| A2
        H -->|"FROM_AGENT"| A1
        H -->|"TO_AGENT"| A2
    end

    %% ── Episodic tier ─────────────────────────────────
    subgraph EPI["Episodic · what happened"]
        U[":User"]
        S[":Session<br/>started_at"]
        T[":Turn<br/>role · text · ts"]
        TP[":Topic"]
        U -->|"PARTICIPATED"| T
        T -->|"IN_SESSION"| S
        T -->|"ABOUT"| TP
    end

    %% ── Semantic tier ─────────────────────────────────
    subgraph SEM["Semantic · what is known"]
        E[":Entity"]
        F[":Fact<br/>statement · confidence"]
        C0[":ConceptNode<br/>L0 · Vibe"]
        C3[":ConceptNode<br/>L3 · Code"]
        C4[":ConceptNode<br/>L4 · Risk"]
        E -->|"HAS_FACT"| F
        C0 -->|"DEEPER_AT"| C3
        C4 -->|"ENDANGERS"| C0
    end

    %% ── Procedural tier ───────────────────────────────
    subgraph PROC["Procedural · how it's fixed"]
        W[":Workflow<br/>Playbook"]
        ST1[":Step<br/>order · action"]
        ST2[":Step<br/>order · action"]
        W -->|"START"| ST1
        ST1 -->|"NEXT_STEP"| ST2
    end

    %% ── Cross-tier links ──────────────────────────────
    A0 -->|"PRODUCED"| T
    T -->|"MENTIONS"| E
    F -->|"DERIVED_FROM"| T
    H -->|"TARGETS"| C4
    W -->|"LEARNED_FROM"| H
    A2 -->|"EXECUTED {at}"| W
    W -->|"GOVERNS"| C3

    classDef coord fill:#3730a3,stroke:#818cf8,stroke-width:2px,color:#e0e7ff;
    classDef epi fill:#155e75,stroke:#22d3ee,stroke-width:2px,color:#cffafe;
    classDef sem fill:#065f46,stroke:#34d399,stroke-width:2px,color:#d1fae5;
    classDef proc fill:#9a3412,stroke:#fb923c,stroke-width:2px,color:#ffedd5;
    classDef risk fill:#9f1239,stroke:#fb7185,stroke-width:2px,color:#ffe4e6;

    class A0,A1,A2,H coord;
    class U,S,T,TP epi;
    class E,F,C0,C3 sem;
    class C4 risk;
    class W,ST1,ST2 proc;
```

> **Reads as:** a `:User`/`:Agent` produces an episodic `:Turn` (in a `:Session`, about a `:Topic`); the turn [`MENTIONS`] semantic `:Entity`/`:Fact` nodes and the fix is captured as a replayable `:Workflow`. A `:SeniorAuditor` raises an L4 risk that `[:ENDANGERS]` the L0 card; the fix `[:LEARNED_FROM]` that `:Handoff` and `[:GOVERNS]` the L3 code concept.
>
> **Colour key:** violet = coordination · cyan = episodic · green = semantic · orange = procedural · red = L4 risk.

### 3.1 The Four Memory & Coordination Tiers

| Tier | Node Label | Key Properties | Purpose |
|---|---|---|---|
| **Episodic** | `:Session` | `id`, `started_at`, `title` | Contiguous conversational session |
| | `:Turn` | `id`, `timestamp`, `role`, `text`, `quality` | Atomic interaction/prompt event |
| **Semantic** | `:ConceptNode` | `id`, `name`, `persona_level`, `domain`, `status` | Architectural concept (L0 through L5) |
| | `:Entity` / `:Fact` | `id`, `statement`, `confidence` | Durable domain knowledge assertions |
| **Procedural** | `:Workflow` | `id`, `name`, `trigger_domain`, `learned_from` | Reusable engineering playbook |
| | `:Step` | `id`, `order`, `action`, `expected_result` | Action sequence inside a playbook |
| **Coordination** | `:Agent` | `id`, `name`, `role`, `persona_level` | Specialized squad member |
| | `:Handoff` | `id`, `created_at`, `reason`, `status` | State transfer ledger (`COMPLETED`, `ALERT_RAISED`, `PLAYBOOK_ENFORCED`) |

### 3.2 The Relationship Types (`[:]`)

- **`[:ENDANGERS]`**: Directed edge from an L4 security risk node to an L0 card, triggering the UI bubble-up alert.
- **`[:DEEPER_AT]`**: Connects a high-level concept down to its technical implementation.
- **`[:HANDED_TO]`**: Direct agent-to-agent coordination link.
- **`[:FROM_AGENT]` / `[:TO_AGENT]`**: Provenance ledger on `:Handoff` nodes.
- **`[:TARGETS]`**: Connects a handoff or audit to the specific `:ConceptNode` it inspected.
- **`[:LEARNED_FROM]`**: Links a procedural `:Workflow` back to the handoff alert that spawned it.
- **`[:IN_SESSION]` & `[:MODIFIED]`**: Links conversational turns to sessions and modified concept nodes.
- **`[:CALLS]`, `[:IMPORTS]`, `[:CONTAINS]`**: AST relationships in Track 01 code graphs.
- **`[:AUTHORED]`, `[:MODIFIED]`**: Git commit provenance in Track 03 company brain.

### 3.3 Named Graphs Topology

One FalkorDB instance holds all multi-tenant and multi-track projections via `db.named_graph(graph_key)`:

| Graph Key | Track / Role | What It Stores |
|---|---|---|
| **`tenant:<tenantId>`** | Track 02 Anchor | Four-tier agent memory, handoffs, and L0–L5 concept nodes |
| **`code:<repoId>`** | Track 01 Code Graph | Full AST symbol graph (`:File`, `:Symbol`, `:Test`, `[:CALLS]`, `[:IMPORTS]`) |
| **`company:brain`** | Track 03 Company Brain | Git commits, authors, file ownership, documentation drift |
| **`graphhacks_registry`** | Global Registry | Tenant workspaces (`:Tenant {key, name}`) |
| **`graphhacks_repos`** | Repo Registry | Repos loaded via "paste a GitHub URL" (`:Repo {id, name, url, loaded_at}`) |
| **`graphhacks_health`** | Health Monitor | Dedicated heartbeat graph (`MATCH (n) RETURN count(n)`) |

---

## 4. Local Setup Instructions

### Prerequisites
- **Docker & Docker Compose** (for FalkorDB and containerized execution)
- **Node.js 18+** & **npm** (for local frontend dev)
- **Python 3.12+** & [**uv**](https://docs.astral.sh/uv/) (for local backend dev)
- **Git** (to clone the repo)
- *(Optional)* **`graphify`** CLI — needed only for the "load any GitHub repo" feature: `uv tool install graphifyy`. Everything else runs without it.

### 0. Get the code
```bash
git clone https://github.com/shyler-web/GraphHacks.git
cd GraphHacks
```

---

---

### Option A: One-Command Setup with Docker Compose (Recommended)

1. **Start all services**:
   ```bash
   docker compose up --build
   ```
   *Starts FalkorDB on `6379` & `3000`, the FastAPI backend (internal to the Compose network), and the React Cockpit on `5173`. The cockpit proxies `/api` to the backend, so `:5173` is the only URL you need.*

2. **Seed the database (in a separate terminal)**:
   ```bash
   docker compose exec backend uv run python scripts/seed_cockpit.py
   ```
   *(Populates Tenant A, Tenant B, the Agent Squad, and initial memory graphs in FalkorDB)*

3. **Access the application**:
   - **React Cockpit UI:** [http://localhost:5173](http://localhost:5173)
   - **FalkorDB Web Browser:** [http://localhost:3000](http://localhost:3000)

---

### Option B: Native Step-by-Step Local Setup

1. **Start FalkorDB**:
   ```bash
   docker run -d --name falkordb -p 6379:6379 -p 3000:3000 falkordb/falkordb:latest
   ```

2. **Set up & Start Backend**:
   ```bash
   cd backend
   uv run python scripts/seed_cockpit.py
   uv run uvicorn app.main:app --port 8000
   ```
   > Runs **keyless** (no `.env` needed). To enable the optional LLM/search features, first `cp .env.example .env` in the repo root, fill in the keys, and add `--env-file ../.env` to the `uvicorn` command. Note: pass `--env-file ../.env` **only after** `.env` exists — uvicorn exits with `Invalid value for '--env-file': Path '../.env' does not exist` if the file is missing.

3. **Set up & Start Frontend** (from repository root):
   ```bash
   npm install
   npm run dev
   ```
   *Open [http://localhost:5173](http://localhost:5173) in your browser.*

---

### 4.1 Keyless-Safe Configuration

Only **FalkorDB** is a hard requirement. All external APIs degrade gracefully:
```bash
cp .env.example .env
```

| Key | Effect if Set | Fallback if Unset |
|---|---|---|
| `NEBIUS_API_KEY` | Live LLM agent squad synthesis & `/api/guidance` | Deterministic synthesizer used; guidance returns graph facts |
| `TAVILY_API_KEY` | Live cited web research for L4/L5 agents | Endpoint returns 503; UI degrades gracefully |
| `LANGSMITH_API_KEY` | Distributed tracing for all Cypher and LLM calls | Observability operations are silent no-ops |

How keys reach the backend:
- **Option B (native):** pass `--env-file ../.env` to `uvicorn` (after `cp .env.example .env`). Without the flag the backend simply runs keyless.
- **Option A (Compose):** the `backend` service reads `.env` automatically if present (`env_file` with `required: false`); absent, it runs keyless.

> **"Load any repo" needs the `graphify` CLI.** `POST /api/repos/load` (the cockpit's *paste a GitHub URL* bar) shells out to `git` + `graphify`. If `graphify` is not on `PATH`, it returns a clean `HTTP 409 {"detail":"graphify unavailable: …"}` and the UI shows an error banner — it never crashes. Install it with `uv tool install graphifyy` to enable that feature. All three tracks work on the bundled `graphhacks` repo without it.

---

## 5. Real Cypher Queries & Graph Algorithms

All production queries are located in [`queries.cypher`](./queries.cypher). Notable queries include:

### 1. Multi-Agent Bubble-Up Alerts (`[:ENDANGERS]`)
```cypher
MATCH (risk:ConceptNode {persona_level: 4, status: 'CRITICAL'})-[r:ENDANGERS]->(target:ConceptNode {persona_level: 0})
RETURN risk.name AS vulnerability, target.name AS affected_feature, r.severity AS severity;
```

### 2. Multi-Hop Blast Radius (Track 01)
```cypher
MATCH p=(root:Symbol {id: $symbolId})<-[:CALLS*1..2]-(affected:Symbol)
WHERE affected.id <> $symbolId
WITH affected, min(length(p)) AS hops
RETURN affected.id AS id, affected.label AS label, affected.source_file AS file,
       (affected:Test) AS is_test, hops
ORDER BY hops ASC, id ASC;
```

### 3. Native FalkorDB PageRank Hotspots (Track 01)
```cypher
CALL algo.pageRank('Symbol', 'CALLS')
YIELD node, score
RETURN node.label AS symbol, node.source_file AS file, score
ORDER BY score DESC
LIMIT 10;
```

### 4. Git Authorship Ownership Walk (Track 03)
```cypher
MATCH (f:File {path: $target})<-[m:MODIFIED]-(c:Commit)<-[:AUTHORED]-(p:Person)
RETURN p.name AS author, p.email AS email, count(c) AS commits,
       sum(m.insertions) AS insertions, sum(m.deletions) AS deletions
ORDER BY commits DESC;
```

---

## 6. Verification Proof Suite

Run the automated test suite from the `backend/` directory:

```bash
uv run python health.py                 # Graph health heartbeat (MATCH count)
uv run python scripts/verify_t2_2.py    # Episodic memory (turns order & persistence)
uv run python scripts/verify_t2_3.py    # Semantic memory & fact provenance
uv run python scripts/verify_t2_4.py    # Procedural memory (workflow step replay)
uv run python scripts/verify_t3_1.py    # Multi-agent coordination handoffs
uv run python scripts/verify_t3_2.py    # Structural per-tenant isolation (tenant_a=3, tenant_b=0)
uv run python scripts/verify_t3_3.py    # High-concurrency write safety
uv run python scripts/verify_track1.py  # Track 01 AST graph, PageRank & blast radius
uv run python scripts/verify_track3.py  # Track 03 100% cited provenance & drift detection
```

---

## 7. AI Assistant Disclosure (Rule 11)

AI coding assistants (Claude / Antigravity Agent for the earlier Nexus work and
Codex for the Clarify Python workflow) were used under participant supervision.
The earlier project used the multi-tier FalkorDB memory design and the
verification scripts listed above. For Clarify, the assistant implemented the
scoring, frozen-test, isolated-refactor, validation, reviewer-note, and PR
delivery modules; the 25 backend fixture tests passed locally. The Clarify
Docker, live Nebius, and GitHub publication paths still need integration checks
before claiming a fully verified end-to-end run.

---

## 8. Rule 10 Submission Checklist

- [x] **A public source-code repository** (this repository)
- [x] **A README with setup instructions and your graph data model** (Sections §3 and §4)
- [x] **The Cypher queries or graph algorithms the product depends on** ([`queries.cypher`](./queries.cypher) and Section §5)
- [x] **A demo video showing the working project** (Section §📹)
- [x] **Complete local setup instructions** (Section §4 — Docker Compose & Native Local verified)
- [x] **The track you are entering:** **Track 02 — Agent Memory and Coordination**
