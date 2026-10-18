# 🎬 GraphSync Nexus — Step-by-Step Video Walkthrough & Cheatsheet

> **Keep this file open on your screen or side monitor while recording.**  
> Everything is written in simple, natural English. You do not need to memorize anything. Just follow step by step!

---

## 🖥️ Screen Layout Before Starting

- **Left Half of Screen**: Cockpit UI (`http://localhost:5173`)
- **Right Half of Screen**: FalkorDB Browser (`http://localhost:3000`)
- **Background / Alt+Tab**: Terminal

---

## ⏱️ Step 0: Initial Setup & Seeding (0:00 – 0:30)

### What to show on screen:
1. Show your **Terminal**.
2. Run (or show):
   ```bash
   docker compose exec backend uv run python scripts/seed_cockpit.py
   ```
   Show output: `registry tenants=2`, `seed_cockpit OK`.
3. Open your browser in **Split Screen**: Left side Cockpit (`:5173`), Right side FalkorDB Browser (`:3000`).

### What to say:
> *"Hello judges! Welcome to **GraphSync Nexus** for Track 02 (Agent Memory & Coordination).  
> We start with a single Docker command, and seed our graph database.  
> On the left is our React cockpit. On the right is FalkorDB Browser.  
> Everything on the left is queried live from FalkorDB on the right. There is zero mock data."*

---

## ⏱️ Step 1: The Rule-3 Test (Kill FalkorDB) (0:30 – 1:00)

### What to do:
1. **Alt+Tab to Terminal**: Run:
   ```bash
   docker stop falkordb
   ```
2. **Left Screen (Cockpit)**: Refresh page $\rightarrow$ Show the red **`ErrorScreen` ("FalkorDB unavailable")**.
3. **Say this**:
   > *"This proves Hackathon Rule 3: our graph is load-bearing. If FalkorDB stops, the app breaks immediately by design."*
4. **Alt+Tab to Terminal**: Run:
   ```bash
   docker start falkordb
   ```
5. **Left Screen (Cockpit)**: Click **Retry** $\rightarrow$ Show the app instantly recover!
6. **Say this**:
   > *"We turn FalkorDB back on, click Retry, and the entire graph comes back to life."*

---

## ⏱️ Step 2: 2D Cockpit & The Builder Maturity Dial (1:00 – 2:00)

### What to do on Left Screen (Cockpit):
1. Stay on the **`2D Graph Cockpit`** tab.
2. Click through the **Maturity Dial**:
   - Click **L0 (The Vibe Coder)**: Plain-English vibe card.
   - Click **L1 (PM)**: Business rules and cost per user.
   - Click **L3 (Full-Stack)**: Python code contracts.
   - Click **L4 (Senior)**: Security and rate limit checks.
   - Click **L5 (Principal)**: Mathematical proofs and GraphBLAS.

### What to say:
> *"In software, a beginner founder wants plain English, while a senior architect needs security and math. Our single FalkorDB graph stores all six levels of technical depth simultaneously."*

### 🔍 How the Live Cypher Box Changes:
* **Point your mouse at**: The dark box at the bottom of the canvas: **`Live FalkorDB Cypher Traversal`**.
* **Click L0, then click L3, then click L5**:
* **Say this**:
  > *"Look at this Live Cypher box at the bottom:  
  > When I click L0, the query filters `WHERE n.persona_level <= 0`.  
  > When I click L5, it updates live to `<= 5`.  
  > And if I click a domain pill like 'Backend', it adds `AND n.domain = 'Backend'`.  
  > Every view is a real Cypher traversal executed in O(1) time."*

### ⚡ Live Proof in FalkorDB (Right Screen):
* **Select graph**: `tenant:graphsync_user1_ai_avatar_saas`
* **Paste and click Run**:
  ```cypher
  MATCH (n:ConceptNode) 
  RETURN n.title, n.persona_level, n.domain 
  ORDER BY n.persona_level ASC 
  LIMIT 10
  ```
* **Say this**:
  > *"And on the right, you can see these exact concept nodes directly inside FalkorDB with their persona levels 0 through 5."*

---

## ⏱️ Step 3: 4-Agent Squad & The 1-Click Senior Fix (2:00 – 3:15)

### What to do on Left Screen (Cockpit):
1. **Point to top right**: The `Nebius 4-Agent Squad` prompt bar.
2. **Scroll to bottom right**: The `4-Agent Shared Handoff Ledger`.
3. **Say this**:
   > *"We have a 4-agent squad: VibeArchitect creates the idea, FullStackBuilder writes the code, SeniorAuditor checks for risks, and LearningCoach explains the fix."*
4. **Click the node**: `Add Real-Time Collaborative Cursor Sync via WebSockets`.
5. **Point to the red box in the Inspector**: `L4 Senior Auditor Bubble-Up Alert`.
6. **Say this**:
   > *"The builder created the WebSocket feature, but the Senior Auditor caught a critical risk: it has no rate limiter!  
   > In FalkorDB, the auditor drew an `[:ENDANGERS]` arrow straight to the beginner card, creating this red alert."*
7. **Point to the Ledger (Bottom Right)**: Show `ALERT_RAISED`.
8. **Click the green button**: **`Apply 1-Click Senior Fix + Save to :Playbook Memory`**.
9. **Show**: The ledger badge turns green: **`PLAYBOOK_ENFORCED`**!
10. **Say this**:
   > *"When I click 'Apply Senior Fix', the status turns to `PLAYBOOK_ENFORCED`, and the fix is saved as a permanent Playbook rule in FalkorDB so future agents never repeat this mistake!"*

### ⚡ Live Proof in FalkorDB (Right Screen):
* **Paste and click Run**:
  ```cypher
  MATCH (h:Handoff) 
  RETURN h.reason, h.status 
  ORDER BY h.created_at DESC 
  LIMIT 3
  ```
* **Say this**:
  > *"Look at FalkorDB on the right: the top handoff row literally shows `PLAYBOOK_ENFORCED` and `ALERT_RAISED` stored directly in the database."*

---

## ⏱️ Step 4: 3-Tier Agent Memory & Tenant Isolation (3:15 – 4:15)

### What to do on Left Screen (Cockpit):
1. Click the tab: **`3-Tier Agent Memory`**.
2. **Point to the 3 columns**:
   - **Column 1**: Episodic Memory (`:Turn` & `:Session`) — past conversation timeline.
   - **Column 2**: Semantic Memory (`:ConceptNode`) — the 19 concepts, with Cursor Sync marked **`FIXED`**.
   - **Column 3**: Procedural Memory (`:Playbook`) — the new rate-limiting guardrail.
3. **Say this**:
   > *"FalkorDB unifies all three tiers of human memory in one graph: Episodic turns, Semantic concepts, and Procedural playbooks."*
4. **Click the Tenant Dropdown (Top Left)**: Switch to **Tenant B: Stripe Webhook & FinTech Ledger**.
5. **Show**: The whole screen changes! Tenant B has different nodes and zero turns.
6. **Say this**:
   > *"Tenant isolation is structural. Tenant B has its own nodes and cannot see Tenant A's data."*
7. **Switch back to Tenant A**.

### ⚡ Live Proof in FalkorDB (Right Screen):
* **Select graph**: `tenant:graphsync_user2_fintech_ledger`
* **Paste and click Run**:
  ```cypher
  MATCH (t:Turn) RETURN count(t)
  ```
* **Show**: Returns `0` rows!
* **Say this**:
  > *"On the right, querying Tenant B's graph for turns returns zero. FalkorDB completely isolates tenant data by graph key."*

---

## ⏱️ Step 5: Track 01 · Code Graph & PageRank (4:15 – 5:15)

### What to do on Left Screen (Cockpit):
1. Click tab: **`Track 01 · Action Studio`**.
2. **Point to Hotspots (Left)**:
   > *"FalkorDB runs native PageRank on our code AST graph. `span()` in our observability file ranks #1 because almost every function calls it."*
3. **Point to Blast Radius & Decision Trace (Right)**:
   > *"If an engineer edits `span()`, FalkorDB calculates in 9.7 milliseconds that 62 symbols and 10 tests are affected across 2 hops."*
4. **Click**: `Explain graphhacks at L3` under Graph-Grounded Guidance.
   > *"Our Nebius LLM explains this architecture using verified facts from FalkorDB. It cannot hallucinate."*

### ⚡ Live Proof in FalkorDB (Right Screen):
* **Select graph**: `code:graphhacks`
* **Paste and click Run**:
  ```cypher
  CALL algo.pageRank('Symbol', 'CALLS') 
  YIELD node, score 
  RETURN node.label, score 
  ORDER BY score DESC 
  LIMIT 5
  ```
* **Say this**:
  > *"On the right, we run native FalkorDB `algo.pageRank` directly. You can see `span()` right at the top with the exact same score!"*

---

## ⏱️ Step 6: Track 03 · Company Brain (5:15 – 6:00)

### What to do on Left Screen (Cockpit):
1. Click tab: **`Track 03 · Company Brain`**.
2. **Point to `WHO OWNS IT`**: Shows `kanhaiya`.
   > *"Track 03 walks git commit history to find the real owner of `observability.py`—kanhaiya."*
3. **Point to `WHY IT EXISTS`**:
   > *"It gives 100% cited provenance, linking the code to 4 official architecture diagrams."*
4. **Point to `DRIFT` (Bottom)**:
   > *"And Drift Detection flags code modified in git that lacks documentation."*

### ⚡ Live Proof in FalkorDB (Right Screen):
* **Select graph**: `company:brain`
* **Paste and click Run**:
  ```cypher
  MATCH (f:File {path: 'backend/app/observability.py'})<-[m:MODIFIED]-(c:Commit)<-[:AUTHORED]-(p:Person) 
  RETURN p.name, p.email, count(c)
  ```
* **Say this**:
  > *"On the right, you can see FalkorDB traversing the commit and person graph to prove ownership."*

---

## ⏱️ Step 7: Grand Finale & Wrap Up (6:00 – 6:30)

### What to do on Right Screen (FalkorDB Browser):
* **Select graph**: `tenant:graphsync_user1_ai_avatar_saas`
* **Paste and click Run**:
  ```cypher
  MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 25
  ```
* **Switch to "Graph View"** (interactive visual circles and arrows).

### What to say:
> *"To wrap up, look at FalkorDB on the right:  
> - The circles are our Nodes—our agents, concepts, and playbooks.  
> - The arrows are our relationships—`[:ENDANGERS]`, `[:HANDED_TO]`, and `[:DEEPER_AT]`.  
> GraphSync Nexus delivers on every single hackathon requirement: a load-bearing graph, 3-tier agent memory, multi-agent coordination, and code analytics in one fast FalkorDB instance.  
> Thank you so much!"*
