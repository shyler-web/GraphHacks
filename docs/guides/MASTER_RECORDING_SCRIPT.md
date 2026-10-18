# 🎬 GraphSync Nexus — The Master Recording Script & Live Proof Guide

> **HOW TO USE THIS GUIDE:**  
> Keep this document open on a side monitor or split tab while recording.  
> - **Left Screen:** Cockpit UI (`http://localhost:5173`)  
> - **Right Screen:** FalkorDB Browser (`http://localhost:3000`)  
> - **Alt+Tab:** Terminal  

---

## ⏱️ ACT 0: The Setup (0:00 – 0:30)

### 🖥️ Screen Action:
1. Show your **Terminal** running `docker compose up`.
2. In another terminal tab, run the seed command:
   ```bash
   docker compose exec backend uv run python scripts/seed_cockpit.py
   ```
3. Show the terminal output: `registry tenants=2`, `seed_cockpit OK`.
4. Switch to your **Split Screen**: Left side Cockpit (`:5173`), Right side FalkorDB Browser (`:3000`).

### 🎙️ What to Say:
> *"Hello judges! Welcome to **GraphSync Nexus**, built for the WeMakeDevs × FalkorDB Graph Hacks hackathon.  
> We entered **Track 02: Agent Memory and Coordination**, while unifying Track 01 and Track 03 on the exact same FalkorDB database instance.  
> We start with a single Docker command and seed our graph database.  
> On the left is our React cockpit. On the right is FalkorDB Browser.  
> Every card, node, edge, and conversation you see on the left is queried live from FalkorDB on the right. There is zero hardcoded mock data."*

---

## ⏱️ ACT 1: The Rule-3 Test — Kill the Database (0:30 – 1:00)

### 🖥️ Screen Action:
1. **Alt+Tab to Terminal**: Run:
   ```bash
   docker stop falkordb
   ```
2. **Left Screen (Cockpit)**: Refresh the page $\rightarrow$ Show the red **`ErrorScreen` ("FalkorDB unavailable")**.

### 🎙️ What to Say:
> *"This proves Hackathon Rule 3: our graph is 100% load-bearing. If FalkorDB goes down, the application stops working immediately by design. There is no fake fallback."*

### 🖥️ Screen Action:
3. **Alt+Tab to Terminal**: Run:
   ```bash
   docker start falkordb
   ```
4. **Left Screen (Cockpit)**: Click the **"Retry"** button $\rightarrow$ The live graph renders again instantly!

### 🎙️ What to Say:
> *"We turn FalkorDB back on, click Retry, and the entire graph comes back to life."*

---

## ⏱️ ACT 2: 2D Cockpit, Maturity Dial & The Live Cypher Box (1:00 – 2:15)

### 🖥️ Screen Action (Left Screen):
1. Stay on the **`2D Graph Cockpit`** tab.
2. Click through the **Builder Maturity Dial**:
   - Click **L0 (The Vibe Coder)**: Plain-English vibe card.
   - Click **L1 (PM)**: Business rules and cost per user.
   - Click **L3 (Full-Stack)**: Python code contracts.
   - Click **L4 (Senior)**: Security and rate limit checks.
   - Click **L5 (Principal)**: Mathematical proofs and GraphBLAS.

### 🎙️ What to Say:
> *"In software, different team members have different needs. A beginner founder wants zero jargon. A PM wants cost estimates. A junior wants file guides. A senior worries about security. And an architect cares about math.  
> Our single FalkorDB graph stores all six levels of technical depth simultaneously."*

### 🔍 Point at the Live Cypher Box (Bottom Left):
* Point your mouse at **`Live FalkorDB Cypher Traversal`** at the bottom of the canvas.
* Click **L0**, then click **L3**, then click **L5**:
* Click the domain pill: **`Backend`**:

### 🎙️ What to Say:
> *"Look at this Live Cypher box at the bottom:  
> When I click L0, the query updates to `WHERE n.persona_level <= 0`.  
> When I click L5, it updates live to `<= 5`.  
> When I filter by 'Backend', it adds `AND n.domain = 'Backend'`.  
> Every view is a real Cypher traversal executed in O(1) time."*

### ⚡ LIVE FALKORDB PROOF (Right Screen):
* Select graph: `tenant:graphsync_user1_ai_avatar_saas`
* Run:
  ```cypher
  MATCH (n:ConceptNode) 
  RETURN n.title, n.persona_level, n.domain 
  ORDER BY n.persona_level ASC 
  LIMIT 10
  ```
* **What Judges See**: Real rows showing the exact nodes and persona levels (0 to 5) directly inside FalkorDB!

---

## ⏱️ ACT 3: The 4-Agent Squad & The 1-Click Senior Fix (2:15 – 3:30)

### 🖥️ Screen Action (Left Screen):
1. Point to top right: The **`Nebius 4-Agent Squad`** prompt bar.
2. Scroll to bottom right: The **`4-Agent Shared Handoff Ledger`**.

### 🎙️ What to Say:
> *"We have a specialized squad of 4 AI agents:  
> VibeArchitect creates the idea, FullStackBuilder writes the code, SeniorAuditor checks for risks, and LearningCoach explains the fix."*

### 🖥️ Screen Action (Left Screen):
3. Click the node: **`Add Real-Time Collaborative Cursor Sync via WebSockets`**.
4. In the Node Inspector, point to the red box: **`L4 Senior Auditor Bubble-Up Alert`**.

### 🎙️ What to Say:
> *"Look at this card: The builder created the WebSocket feature, but the Senior Auditor caught a critical risk: **it has no rate limiter!** Anyone could spam it and crash our servers.  
> In FalkorDB, the auditor created a directed `[:ENDANGERS]` arrow straight to the beginner card, creating this red alert."*

### 🖥️ Screen Action (Left Screen):
5. Point to the Handoff Ledger (bottom right) showing: `FullStackBuilder → SeniorAuditor` with **`ALERT_RAISED`**.
6. Click the green button: **`Apply 1-Click Senior Fix + Save to :Playbook Memory`**.
7. Show the badge flip to green: **`PLAYBOOK_ENFORCED`**!

### 🎙️ What to Say:
> *"When I click 'Apply Senior Fix':  
> The status turns to `PLAYBOOK_ENFORCED`, the feature is patched, and the Senior Auditor saves this rate-limiting rule as a permanent Playbook in FalkorDB so future agents never make this mistake again!"*

### ⚡ LIVE FALKORDB PROOF (Right Screen):
* In FalkorDB Browser, run:
  ```cypher
  MATCH (h:Handoff) 
  RETURN h.reason, h.status 
  ORDER BY h.created_at DESC 
  LIMIT 2
  ```
* **What Judges See**: FalkorDB outputs the top row showing: `status = 'PLAYBOOK_ENFORCED'`! Proves the UI button triggered an actual write mutation into FalkorDB!

---

## ⏱️ ACT 4: 3-Tier Agent Memory & Tenant Isolation (3:30 – 4:45)

### 🖥️ Screen Action (Left Screen):
1. Click the tab: **`3-Tier Agent Memory`**.
2. Point across the 3 columns:
   - **Column 1**: Episodic Memory (`:Turn` & `:Session`) — past conversation timeline.
   - **Column 2**: Semantic Memory (`:ConceptNode`) — all 19 concepts, with Cursor Sync marked **`FIXED`**.
   - **Column 3**: Procedural Memory (`:Playbook`) — the new rate-limiting guardrail.

### 🎙️ What to Say:
> *"Human memory has three distinct tiers: what happened (Episodic), what we know (Semantic), and what rules we follow (Procedural).  
> FalkorDB unifies all three tiers in one connected graph."*

### 🖥️ Screen Action (Left Screen):
3. Click the **FalkorDB Tenant** dropdown at top left.
4. Switch from **Tenant A (AI Avatar SaaS)** $\rightarrow$ **Tenant B (FinTech Ledger)**.
5. Show that Tenant B has completely different nodes and zero chat turns!

### 🎙️ What to Say:
> *"FalkorDB also guarantees structural multi-tenant isolation. When I switch to Tenant B, the entire dataset changes. Tenant B has its own nodes and cannot see Tenant A's private turns."*

### ⚡ LIVE FALKORDB PROOF (Right Screen):
* Switch the graph dropdown on the right to: **`tenant:graphsync_user2_fintech_ledger`**.
* Run:
  ```cypher
  MATCH (t:Turn) RETURN count(t)
  ```
* **What Judges See**: Returns **`0`**! Proves Tenant B's database graph is completely isolated and clean!
* *(Switch Left Screen back to Tenant A)*

---

## ⏱️ ACT 5: Track 01 · Connected-Data Action Studio (4:45 – 5:45)

### 🖥️ Screen Action (Left Screen):
1. Click the tab: **`Track 01 · Action Studio`**.
2. Point to **Hotspots** on the left:
   > *"Track 01 proves FalkorDB can run graph algorithms on real code. FalkorDB runs native **PageRank** over our `[:CALLS]` subgraph. `span()` in our observability file ranks #1 because almost every function in the repo calls it."*
3. Point to **Blast Radius & Decision Trace** on the right:
   > *"If an engineer edits `span()`, FalkorDB calculates in **9.7 milliseconds** that 62 symbols and 10 tests are affected across 2 hops.  
   > And look at the **Decision Trace**: we display the exact Cypher query and execution time for 100% explainability."*
4. Click: **`Explain graphhacks at L3`** under Graph-Grounded Guidance:
   > *"Our Nebius LLM explains this architecture using verified facts from FalkorDB. It cannot hallucinate."*

### ⚡ LIVE FALKORDB PROOF (Right Screen):
* Switch the graph dropdown on the right to: **`code:graphhacks`**.
* Run:
  ```cypher
  CALL algo.pageRank('Symbol', 'CALLS') 
  YIELD node, score 
  RETURN node.label, score 
  ORDER BY score DESC 
  LIMIT 3
  ```
* **What Judges See**: FalkorDB directly outputs `span()` at the top with score `0.016534`, matching the UI 1:1!

---

## ⏱️ ACT 6: Track 03 · Company Brain (5:45 – 6:30)

### 🖥️ Screen Action (Left Screen):
1. Click the tab: **`Track 03 · Company Brain`**.
2. Point to **`WHO OWNS IT`** (shows `kanhaiya`):
   > *"Track 03 connects Git Commits, Authors, and Documentation. When we inspect `observability.py`, it walks the commit graph over `[:AUTHORED]` and `[:MODIFIED]` edges to identify the author—kanhaiya."*
3. Point to **`WHY IT EXISTS`** (shows 4 sources):
   > *"It gives 100% cited provenance, linking the code to 4 official architecture diagrams."*
4. Point to **`DRIFT`** at the bottom:
   > *"And Drift Detection flags code modified in git that lacks documentation."*

### ⚡ LIVE FALKORDB PROOF (Right Screen):
* Switch the graph dropdown on the right to: **`company:brain`**.
* Run:
  ```cypher
  MATCH (f:File {path: 'backend/app/observability.py'})<-[m:MODIFIED]-(c:Commit)<-[:AUTHORED]-(p:Person) 
  RETURN p.name, p.email, count(c)
  ```
* **What Judges See**: FalkorDB returns `kanhaiya`, `kanhaiyahss22110@gmail.com` directly from the commit graph!

---

## ⏱️ ACT 7: The Grand Finale — FalkorDB Visual Graph (6:30 – 7:00)

### 🖥️ Screen Action (Right Screen - FalkorDB Browser):
1. Switch graph to: **`tenant:graphsync_user1_ai_avatar_saas`**.
2. Run this query:
   ```cypher
   MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 25
   ```
3. Click the **"Graph View"** toggle to display the visual circles and directed arrows!

### 🎙️ What to Say (The Winning Close):
> *"To close, let's look at the database itself:  
> - The circles are our **Nodes**—our agents, concepts, and playbooks.  
> - The arrows are our **`[:]` Relationships**—`[:ENDANGERS]`, `[:HANDED_TO]`, and `[:DEEPER_AT]`.  
> 
> GraphSync Nexus delivers on every single hackathon requirement: a load-bearing graph, 3-tier agent memory, multi-agent coordination, and code analytics—all running inside one fast FalkorDB instance.  
> Thank you so much!"*
