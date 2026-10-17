"""Idempotently load the cockpit seed into FalkorDB (F2 / T4.1).

This is what makes the graph load-bearing: the React cockpit no longer ships its
`INITIAL_TENANTS` seed, it reads whatever is merged here. The seed is a faithful
port of `src/data/tenants.ts` (both tenants), written in the canonical memory
vocabulary so the projection in `app/cockpit.py` is a real graph read:

* ``:ConceptNode`` nodes + typed ``DEEPER_AT``/``ENDANGERS``/``LEARN_CONCEPT``
  edges (the 2D cockpit graph);
* ``:Turn`` -[:IN_SESSION]-> ``:Session``   → cockpit ``Episode``;
* ``:Workflow`` (+ ``:Step``)                → cockpit ``Playbook``;
* ``:Handoff`` with ``FROM_AGENT``/``TO_AGENT``/``TARGETS`` → ``Handoff``;
* the agent squad (VibeArchitect L0–L1, FullStackBuilder L2–L3, SeniorAuditor
  L4, PrincipalResearcher L5, LearningCoach) as ``:Agent`` nodes, linked with
  ``PRODUCED`` to the nodes they created — the "vibe coder → principal
  architect" narrative.

Run from `backend/`: `uv run python scripts/seed_cockpit.py`. Every write is
``MERGE``-based, so a re-run prints identical counts.
"""

from __future__ import annotations

import pathlib
import sys
from typing import Any

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import db  # noqa: E402
from app.config import FalkorDBConfig  # noqa: E402

# ---------------------------------------------------------------------------
# Agent squad (the narrative). `name` matches the seed's handoff display strings.
# ---------------------------------------------------------------------------

AGENTS: list[dict[str, str]] = [
    {
        "id": "agent:vibe-architect",
        "name": "VibeArchitect (L0-L1)",
        "persona_levels": "L0-L1",
        "role": "Turns a prompt into the L0 vibe view and its L1 unit economics.",
    },
    {
        "id": "agent:fullstack-builder",
        "name": "FullStackBuilder (L2-L3)",
        "persona_levels": "L2-L3",
        "role": "Wires UI → API → FalkorDB and writes the production code.",
    },
    {
        "id": "agent:senior-auditor",
        "name": "SeniorAuditor (L4-L5)",
        "persona_levels": "L4-L5",
        "role": "Audits security/spend and proves formal bounds.",
    },
    {
        "id": "agent:principal-researcher",
        "name": "PrincipalResearcher (L5)",
        "persona_levels": "L5",
        "role": "Researches external best practice and formal methods.",
    },
    {
        "id": "agent:learning-coach",
        "name": "LearningCoach (Lens #4)",
        "persona_levels": "-",
        "role": "Builds the level-up bridge from the audit back to L0.",
    },
]

AGENT_ID_BY_NAME = {a["name"]: a["id"] for a in AGENTS}

# `ConceptNode.created_by_agent` → the squad member that produced it.
AGENT_ID_BY_CREATOR = {
    "VibeArchitectAgent": "agent:vibe-architect",
    "FullStackBuilderAgent": "agent:fullstack-builder",
    "SeniorAuditorAgent": "agent:senior-auditor",
    "LearningCoachAgent": "agent:learning-coach",
}

# ---------------------------------------------------------------------------
# The seed — ported from `src/data/tenants.ts`.
# ---------------------------------------------------------------------------

TENANTS: dict[str, dict[str, Any]] = {
    "graphsync_user1_ai_avatar_saas": {
        "name": "Tenant A: AI Avatar & Video SaaS",
        "nodes": [
            {
                "id": "node_vibe_avatar_l0",
                "domain": "Frontend",
                "persona_level": 0,
                "title": "1-Click AI Avatar Generator Button",
                "summary": "Users upload a selfie and click one button to generate a 3D Cyberpunk Avatar.",
                "vibe_translation": "Careful! Anyone on the internet can spam this button 10,000 times and drain your OpenAI credit card ($200/min risk).",
                "code_or_math": "// L0 Vibe View: No raw code shown. Safe Re-Prompt ready.",
                "status": "WARNING",
                "created_by_agent": "VibeArchitectAgent",
                "x": 130,
                "y": 80,
            },
            {
                "id": "node_cost_avatar_l1",
                "domain": "BusinessCost",
                "persona_level": 1,
                "title": "Unit Economics: $0.04 per Avatar Run",
                "summary": "Hidden AI assumption: Free tier users currently have unlimited generations. 1,000 users x 10 clicks = $400/day burn.",
                "vibe_translation": "Each click costs 4 cents. We need a daily limit for free users.",
                "code_or_math": "Margin_per_User = LTV - (Generations_per_Day * $0.04 * 30)",
                "status": "OK",
                "created_by_agent": "VibeArchitectAgent",
                "x": 340,
                "y": 135,
            },
            {
                "id": "node_wiring_avatar_l2",
                "domain": "Backend",
                "persona_level": 2,
                "title": "AvatarFlow.tsx -> POST /api/avatar -> FalkorDB",
                "summary": "React frontend sends base64 image to FastAPI route, which calls OpenAI Images API and logs metadata in FalkorDB.",
                "vibe_translation": "Connects the upload button to our Python server and database.",
                "code_or_math": "AvatarUpload.tsx ──HTTP POST──> routers/avatar.py ──Cypher──> (:AvatarAsset)",
                "status": "OK",
                "created_by_agent": "FullStackBuilderAgent",
                "x": 240,
                "y": 225,
            },
            {
                "id": "node_lang_gil_l3",
                "domain": "ProgrammingLanguage",
                "persona_level": 3,
                "title": "Python 3.12 Asyncio + Pydantic v2 Contract",
                "summary": "Uses async def endpoint with Pydantic structured validation, but synchronous PIL image resizing blocks the event loop.",
                "vibe_translation": "Written in Python using modern async functions.",
                "code_or_math": (
                    "async def generate_avatar(req: AvatarRequest) -> AvatarResponse:\n"
                    "    # Warning: sync CPU image resize inside async loop\n"
                    "    img = Image.open(req.bytes).resize((1024, 1024))\n"
                    "    return await openai_client.images.generate(...)"
                ),
                "status": "OK",
                "created_by_agent": "FullStackBuilderAgent",
                "x": 490,
                "y": 250,
            },
            {
                "id": "node_security_audit_l4",
                "domain": "Security",
                "persona_level": 4,
                "title": "Unthrottled OpenAI Spend & Missing Redis Lock",
                "summary": "CRITICAL AUDIT: No sliding-window rate limiter or idempotency key on POST /api/avatar. Vulnerable to double-click race condition and wallet-draining bot attacks.",
                "vibe_translation": "Hackers or impatient double-clickers can bankrupt your API key! Click \"Apply Senior Fix\" to add a shield.",
                "code_or_math": (
                    "// Redis Lua Atomic Sliding Window Rate Limiter\n"
                    'const current = redis.incr("rate:avatar:" + user_ip);\n'
                    'if (current === 1) redis.expire("rate:avatar:" + user_ip, 60);\n'
                    'if (current > 5) throw new TooManyRequestsError("Max 5/min");'
                ),
                "status": "CRITICAL",
                "created_by_agent": "SeniorAuditorAgent",
                "x": 160,
                "y": 350,
            },
            {
                "id": "node_learning_bridge_l2",
                "domain": "Learning",
                "persona_level": 2,
                "title": "Level-Up Bridge: Rate Limiting & Idempotency",
                "summary": "Interactive 60-second mental model explaining why Vibe Coders need API rate limiters and how Python async differs from CPU parallelism.",
                "vibe_translation": "Think of Rate Limiting like a nightclub bouncer who only lets 5 people in per minute so the building never catches fire.",
                "code_or_math": "Mental Model: L0 (Button) -> L2 (API Bouncer) -> L4 (Atomic Redis Counter)",
                "status": "OK",
                "created_by_agent": "LearningCoachAgent",
                "x": 670,
                "y": 150,
            },
            {
                "id": "node_math_graphblas_l5",
                "domain": "Mathematics",
                "persona_level": 5,
                "title": "Sparse Adjacency Matrix & Little’s Law Queueing",
                "summary": "Models concurrent avatar worker backpressure via Little’s Law (L = λW) and stores user similarity graphs in FalkorDB sparse matrices O(V + E).",
                "vibe_translation": "Mathematical proof that our server will not crash when 10,000 users join.",
                "code_or_math": "L = λ · W  |  Graph Traversal Complexity: O(|V| + |E|) via GraphBLAS CSR Matrix Multiplication",
                "status": "OK",
                "created_by_agent": "SeniorAuditorAgent",
                "x": 660,
                "y": 375,
            },
        ],
        "edges": [
            ("node_vibe_avatar_l0", "node_cost_avatar_l1", "DEEPER_AT"),
            ("node_cost_avatar_l1", "node_wiring_avatar_l2", "DEEPER_AT"),
            ("node_wiring_avatar_l2", "node_lang_gil_l3", "DEEPER_AT"),
            ("node_lang_gil_l3", "node_security_audit_l4", "DEEPER_AT"),
            ("node_security_audit_l4", "node_math_graphblas_l5", "DEEPER_AT"),
            ("node_security_audit_l4", "node_vibe_avatar_l0", "ENDANGERS"),
            ("node_vibe_avatar_l0", "node_learning_bridge_l2", "LEARN_CONCEPT"),
            ("node_security_audit_l4", "node_learning_bridge_l2", "LEARN_CONCEPT"),
        ],
        "episodes": [
            {
                "id": "ep_101",
                "session": "Session #1 (Yesterday)",
                "prompt": "Add a 1-click AI avatar generator using OpenAI",
                "summary": "4 agents coordinated in FalkorDB: VibeArchitect created L0/L1 nodes; FullStackBuilder wired L2/L3 Python code; SeniorAuditor flagged CRITICAL L4 unthrottled spend risk.",
                "timestamp": "Oct 15, 00:12 IST",
            }
        ],
        "playbooks": [
            {
                "id": "pb_init_1",
                "rule_name": "Isolate Tenant Graphs via select_graph()",
                "trigger_domain": "Database",
                "enforced_action": "Always partition user memory using FalkorDB multigraph topology.",
                "learned_from": "System Bootstrap",
            }
        ],
        "handoffs": [
            {
                "id": "h1",
                "from": "VibeArchitect (L0-L1)",
                "to": "FullStackBuilder (L2-L3)",
                "target": "node_wiring_avatar_l2",
                "status": "COMPLETED",
            },
            {
                "id": "h2",
                "from": "FullStackBuilder (L2-L3)",
                "to": "SeniorAuditor (L4-L5)",
                "target": "node_security_audit_l4",
                "status": "ALERT_RAISED",
            },
            {
                "id": "h3",
                "from": "SeniorAuditor (L4-L5)",
                "to": "LearningCoach (Lens #4)",
                "target": "node_learning_bridge_l2",
                "status": "COMPLETED",
            },
        ],
    },
    "graphsync_user2_fintech_ledger": {
        "name": "Tenant B: Stripe Webhook & FinTech Ledger",
        "nodes": [
            {
                "id": "node_fin_l0",
                "domain": "ExternalAPIs",
                "persona_level": 0,
                "title": "Instant Pro Subscription Upgrade",
                "summary": "Unlocks Pro features immediately when a user completes Stripe Checkout.",
                "vibe_translation": "Lets customers pay and get instant access.",
                "code_or_math": "// L0 Vibe View: Stripe Checkout active.",
                "status": "OK",
                "created_by_agent": "VibeArchitectAgent",
                "x": 200,
                "y": 120,
            },
            {
                "id": "node_fin_l3",
                "domain": "Database",
                "persona_level": 3,
                "title": "FalkorDB Cypher Ledger Transaction",
                "summary": "Records (:User)-[:SUBSCRIBED_TO]->(:Plan) with webhook event_id.",
                "vibe_translation": "Saves the customer payment receipt in the graph.",
                "code_or_math": 'MERGE (u:User {id: $uid})-[:PAID {tx_id: $tx}]->(p:Plan {tier: "PRO"})',
                "status": "OK",
                "created_by_agent": "FullStackBuilderAgent",
                "x": 470,
                "y": 260,
            },
        ],
        "edges": [
            ("node_fin_l0", "node_fin_l3", "DEEPER_AT"),
        ],
        "episodes": [
            {
                "id": "ep_201",
                "session": "Session #1",
                "prompt": "Connect Stripe checkout to unlock Pro tier",
                "summary": "Created isolated tenant graph for FinTech ledger.",
                "timestamp": "Oct 15, 00:30 IST",
            }
        ],
        "playbooks": [],
        "handoffs": [
            {
                "id": "h_fin_1",
                "from": "VibeArchitect (L0-L1)",
                "to": "FullStackBuilder (L2-L3)",
                "target": "node_fin_l3",
                "status": "COMPLETED",
            }
        ],
    },
}

# FalkorDB cannot parameterise a relationship type, but the seed only ever uses
# these three, so each gets an explicit, injection-safe query.
_EDGE_CYPHER = {
    "DEEPER_AT": (
        "MATCH (a:ConceptNode {id:$from}), (b:ConceptNode {id:$to}) "
        "MERGE (a)-[:DEEPER_AT]->(b)"
    ),
    "ENDANGERS": (
        "MATCH (a:ConceptNode {id:$from}), (b:ConceptNode {id:$to}) "
        "MERGE (a)-[:ENDANGERS]->(b)"
    ),
    "LEARN_CONCEPT": (
        "MATCH (a:ConceptNode {id:$from}), (b:ConceptNode {id:$to}) "
        "MERGE (a)-[:LEARN_CONCEPT]->(b)"
    ),
}

_NODE_CYPHER = """
MERGE (n:ConceptNode {id: $id})
SET n.domain = $domain, n.persona_level = $persona_level, n.title = $title,
    n.summary = $summary, n.vibe_translation = $vibe_translation,
    n.code_or_math = $code_or_math, n.status = $status,
    n.created_by_agent = $created_by_agent, n.x = $x, n.y = $y
"""

_AGENT_CYPHER = """
MERGE (a:Agent {id: $id})
SET a.name = $name, a.persona_levels = $persona_levels, a.role = $role
"""

_PRODUCED_CYPHER = """
MATCH (a:Agent {id: $agent_id}), (n:ConceptNode {id: $node_id})
MERGE (a)-[:PRODUCED]->(n)
"""

_EPISODE_CYPHER = """
MERGE (s:Session {id: $session_id})
SET s.name = $session
MERGE (t:Turn {id: $id})
SET t.text = $prompt, t.summary = $summary, t.timestamp = $timestamp, t.role = 'agent'
MERGE (t)-[:IN_SESSION]->(s)
"""

_PLAYBOOK_CYPHER = """
MERGE (w:Workflow {id: $id})
SET w.name = $rule_name, w.trigger_domain = $trigger_domain,
    w.enforced_action = $enforced_action, w.learned_from = $learned_from
MERGE (st:Step {id: $step_id})
SET st.order = 1, st.action = $enforced_action
MERGE (w)-[:START]->(st)
"""

_HANDOFF_CYPHER = """
MERGE (h:Handoff {id: $id})
SET h.status = $status
WITH h
MATCH (fa:Agent {id: $from_id})
MERGE (h)-[:FROM_AGENT]->(fa)
WITH h
MATCH (ta:Agent {id: $to_id})
MERGE (h)-[:TO_AGENT]->(ta)
"""

_HANDOFF_TARGET_CYPHER = """
MATCH (h:Handoff {id: $id}), (tg:ConceptNode {id: $target})
MERGE (h)-[:TARGETS]->(tg)
"""


def _seed_tenant(graph: object, tenant: dict[str, Any]) -> None:
    # Agents first so handoffs can resolve FROM_AGENT/TO_AGENT.
    for agent in AGENTS:
        graph.query(_AGENT_CYPHER, params=agent)  # type: ignore[attr-defined]

    for node in tenant["nodes"]:
        graph.query(_NODE_CYPHER, params=node)  # type: ignore[attr-defined]
        agent_id = AGENT_ID_BY_CREATOR.get(node["created_by_agent"])
        if agent_id:
            graph.query(  # type: ignore[attr-defined]
                _PRODUCED_CYPHER,
                params={"agent_id": agent_id, "node_id": node["id"]},
            )

    for source, target, edge_type in tenant["edges"]:
        graph.query(  # type: ignore[attr-defined]
            _EDGE_CYPHER[edge_type], params={"from": source, "to": target}
        )

    for episode in tenant["episodes"]:
        graph.query(  # type: ignore[attr-defined]
            _EPISODE_CYPHER,
            params={
                "id": episode["id"],
                "session_id": f"session:{episode['session']}",
                "session": episode["session"],
                "prompt": episode["prompt"],
                "summary": episode["summary"],
                "timestamp": episode["timestamp"],
            },
        )

    for playbook in tenant["playbooks"]:
        graph.query(  # type: ignore[attr-defined]
            _PLAYBOOK_CYPHER,
            params={**playbook, "step_id": f"{playbook['id']}:step:1"},
        )

    for handoff in tenant["handoffs"]:
        from_id = AGENT_ID_BY_NAME.get(handoff["from"])
        to_id = AGENT_ID_BY_NAME.get(handoff["to"])
        if from_id is None or to_id is None:
            raise SystemExit(f"unknown handoff agent in {handoff['id']}")
        graph.query(  # type: ignore[attr-defined]
            _HANDOFF_CYPHER,
            params={
                "id": handoff["id"],
                "status": handoff["status"],
                "from_id": from_id,
                "to_id": to_id,
            },
        )
        graph.query(  # type: ignore[attr-defined]
            _HANDOFF_TARGET_CYPHER,
            params={"id": handoff["id"], "target": handoff["target"]},
        )


def _count(graph: object, cypher: str) -> int:
    return int(graph.query(cypher).result_set[0][0])  # type: ignore[attr-defined]


def main() -> int:
    cfg = FalkorDBConfig.from_env()

    for key, tenant in TENANTS.items():
        with db.named_graph(db.tenant_graph_key(key), cfg) as graph:
            _seed_tenant(graph, tenant)
            counts = {
                "nodes": _count(graph, "MATCH (n:ConceptNode) RETURN count(n)"),
                "edges": _count(
                    graph, "MATCH (:ConceptNode)-[r]->(:ConceptNode) RETURN count(r)"
                ),
                "episodes": _count(
                    graph, "MATCH (t:Turn)-[:IN_SESSION]->(:Session) RETURN count(t)"
                ),
                "playbooks": _count(graph, "MATCH (w:Workflow) RETURN count(w)"),
                "handoffs": _count(graph, "MATCH (h:Handoff) RETURN count(h)"),
            }
        print(
            f"{key} "
            + " ".join(f"{name}={value}" for name, value in counts.items())
        )

    with db.named_graph(db.REGISTRY_GRAPH, cfg) as graph:
        for key, tenant in TENANTS.items():
            graph.query(
                "MERGE (t:Tenant {key: $key}) SET t.name = $name",
                params={"key": key, "name": tenant["name"]},
            )
        registry = _count(graph, "MATCH (t:Tenant) RETURN count(t)")
    print(f"registry tenants={registry}")

    print("seed_cockpit OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
