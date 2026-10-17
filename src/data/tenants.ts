import type { TenantMap } from './types';

// Hard-coded seed for the simulation. This is the ONLY place the seed data
// lives; the rest of the app reads it through `src/data/index.ts`.
export const INITIAL_TENANTS: TenantMap = {
  'graphsync_user1_ai_avatar_saas': {
    name: 'Tenant A: AI Avatar & Video SaaS',
    nodes: [
      {
        id: 'node_vibe_avatar_l0',
        domain: 'Frontend',
        persona_level: 0,
        title: '1-Click AI Avatar Generator Button',
        summary: 'Users upload a selfie and click one button to generate a 3D Cyberpunk Avatar.',
        vibe_translation: 'Careful! Anyone on the internet can spam this button 10,000 times and drain your OpenAI credit card ($200/min risk).',
        code_or_math: '// L0 Vibe View: No raw code shown. Safe Re-Prompt ready.',
        status: 'WARNING',
        created_by_agent: 'VibeArchitectAgent',
        x: 130,
        y: 80
      },
      {
        id: 'node_cost_avatar_l1',
        domain: 'BusinessCost',
        persona_level: 1,
        title: 'Unit Economics: $0.04 per Avatar Run',
        summary: 'Hidden AI assumption: Free tier users currently have unlimited generations. 1,000 users x 10 clicks = $400/day burn.',
        vibe_translation: 'Each click costs 4 cents. We need a daily limit for free users.',
        code_or_math: 'Margin_per_User = LTV - (Generations_per_Day * $0.04 * 30)',
        status: 'OK',
        created_by_agent: 'VibeArchitectAgent',
        x: 340,
        y: 135
      },
      {
        id: 'node_wiring_avatar_l2',
        domain: 'Backend',
        persona_level: 2,
        title: 'AvatarFlow.tsx -> POST /api/avatar -> FalkorDB',
        summary: 'React frontend sends base64 image to FastAPI route, which calls OpenAI Images API and logs metadata in FalkorDB.',
        vibe_translation: 'Connects the upload button to our Python server and database.',
        code_or_math: 'AvatarUpload.tsx ──HTTP POST──> routers/avatar.py ──Cypher──> (:AvatarAsset)',
        status: 'OK',
        created_by_agent: 'FullStackBuilderAgent',
        x: 240,
        y: 225
      },
      {
        id: 'node_lang_gil_l3',
        domain: 'ProgrammingLanguage',
        persona_level: 3,
        title: 'Python 3.12 Asyncio + Pydantic v2 Contract',
        summary: 'Uses async def endpoint with Pydantic structured validation, but synchronous PIL image resizing blocks the event loop.',
        vibe_translation: 'Written in Python using modern async functions.',
        code_or_math: 'async def generate_avatar(req: AvatarRequest) -> AvatarResponse:\n    # Warning: sync CPU image resize inside async loop\n    img = Image.open(req.bytes).resize((1024, 1024))\n    return await openai_client.images.generate(...)',
        status: 'OK',
        created_by_agent: 'FullStackBuilderAgent',
        x: 490,
        y: 250
      },
      {
        id: 'node_security_audit_l4',
        domain: 'Security',
        persona_level: 4,
        title: 'Unthrottled OpenAI Spend & Missing Redis Lock',
        summary: 'CRITICAL AUDIT: No sliding-window rate limiter or idempotency key on POST /api/avatar. Vulnerable to double-click race condition and wallet-draining bot attacks.',
        vibe_translation: 'Hackers or impatient double-clickers can bankrupt your API key! Click "Apply Senior Fix" to add a shield.',
        code_or_math: '// Redis Lua Atomic Sliding Window Rate Limiter\nconst current = redis.incr("rate:avatar:" + user_ip);\nif (current === 1) redis.expire("rate:avatar:" + user_ip, 60);\nif (current > 5) throw new TooManyRequestsError("Max 5/min");',
        status: 'CRITICAL',
        created_by_agent: 'SeniorAuditorAgent',
        x: 160,
        y: 350
      },
      {
        id: 'node_learning_bridge_l2',
        domain: 'Learning',
        persona_level: 2,
        title: 'Level-Up Bridge: Rate Limiting & Idempotency',
        summary: 'Interactive 60-second mental model explaining why Vibe Coders need API rate limiters and how Python async differs from CPU parallelism.',
        vibe_translation: 'Think of Rate Limiting like a nightclub bouncer who only lets 5 people in per minute so the building never catches fire.',
        code_or_math: 'Mental Model: L0 (Button) -> L2 (API Bouncer) -> L4 (Atomic Redis Counter)',
        status: 'OK',
        created_by_agent: 'LearningCoachAgent',
        x: 670,
        y: 150
      },
      {
        id: 'node_math_graphblas_l5',
        domain: 'Mathematics',
        persona_level: 5,
        title: 'Sparse Adjacency Matrix & Little’s Law Queueing',
        summary: 'Models concurrent avatar worker backpressure via Little’s Law (L = λW) and stores user similarity graphs in FalkorDB sparse matrices O(V + E).',
        vibe_translation: 'Mathematical proof that our server will not crash when 10,000 users join.',
        code_or_math: 'L = λ · W  |  Graph Traversal Complexity: O(|V| + |E|) via GraphBLAS CSR Matrix Multiplication',
        status: 'OK',
        created_by_agent: 'SeniorAuditorAgent',
        x: 660,
        y: 375
      }
    ],
    edges: [
      { from: 'node_vibe_avatar_l0', to: 'node_cost_avatar_l1', type: 'DEEPER_AT' },
      { from: 'node_cost_avatar_l1', to: 'node_wiring_avatar_l2', type: 'DEEPER_AT' },
      { from: 'node_wiring_avatar_l2', to: 'node_lang_gil_l3', type: 'DEEPER_AT' },
      { from: 'node_lang_gil_l3', to: 'node_security_audit_l4', type: 'DEEPER_AT' },
      { from: 'node_security_audit_l4', to: 'node_math_graphblas_l5', type: 'DEEPER_AT' },
      { from: 'node_security_audit_l4', to: 'node_vibe_avatar_l0', type: 'ENDANGERS' },
      { from: 'node_vibe_avatar_l0', to: 'node_learning_bridge_l2', type: 'LEARN_CONCEPT' },
      { from: 'node_security_audit_l4', to: 'node_learning_bridge_l2', type: 'LEARN_CONCEPT' }
    ],
    episodes: [
      {
        id: 'ep_101',
        session: 'Session #1 (Yesterday)',
        prompt: 'Add a 1-click AI avatar generator using OpenAI',
        summary: '4 agents coordinated in FalkorDB: VibeArchitect created L0/L1 nodes; FullStackBuilder wired L2/L3 Python code; SeniorAuditor flagged CRITICAL L4 unthrottled spend risk.',
        timestamp: 'Oct 15, 00:12 IST'
      }
    ],
    playbooks: [
      {
        id: 'pb_init_1',
        rule_name: 'Isolate Tenant Graphs via select_graph()',
        trigger_domain: 'Database',
        enforced_action: 'Always partition user memory using FalkorDB multigraph topology.',
        learned_from: 'System Bootstrap'
      }
    ],
    handoffs: [
      { id: 'h1', from: 'VibeArchitect (L0-L1)', to: 'FullStackBuilder (L2-L3)', target: 'node_wiring_avatar_l2', status: 'COMPLETED' },
      { id: 'h2', from: 'FullStackBuilder (L2-L3)', to: 'SeniorAuditor (L4-L5)', target: 'node_security_audit_l4', status: 'ALERT_RAISED' },
      { id: 'h3', from: 'SeniorAuditor (L4-L5)', to: 'LearningCoach (Lens #4)', target: 'node_learning_bridge_l2', status: 'COMPLETED' }
    ]
  },
  'graphsync_user2_fintech_ledger': {
    name: 'Tenant B: Stripe Webhook & FinTech Ledger',
    nodes: [
      {
        id: 'node_fin_l0',
        domain: 'ExternalAPIs',
        persona_level: 0,
        title: 'Instant Pro Subscription Upgrade',
        summary: 'Unlocks Pro features immediately when a user completes Stripe Checkout.',
        vibe_translation: 'Lets customers pay and get instant access.',
        code_or_math: '// L0 Vibe View: Stripe Checkout active.',
        status: 'OK',
        created_by_agent: 'VibeArchitectAgent',
        x: 200,
        y: 120
      },
      {
        id: 'node_fin_l3',
        domain: 'Database',
        persona_level: 3,
        title: 'FalkorDB Cypher Ledger Transaction',
        summary: 'Records (:User)-[:SUBSCRIBED_TO]->(:Plan) with webhook event_id.',
        vibe_translation: 'Saves the customer payment receipt in the graph.',
        code_or_math: 'MERGE (u:User {id: $uid})-[:PAID {tx_id: $tx}]->(p:Plan {tier: "PRO"})',
        status: 'OK',
        created_by_agent: 'FullStackBuilderAgent',
        x: 470,
        y: 260
      }
    ],
    edges: [
      { from: 'node_fin_l0', to: 'node_fin_l3', type: 'DEEPER_AT' }
    ],
    episodes: [
      {
        id: 'ep_201',
        session: 'Session #1',
        prompt: 'Connect Stripe checkout to unlock Pro tier',
        summary: 'Created isolated tenant graph for FinTech ledger.',
        timestamp: 'Oct 15, 00:30 IST'
      }
    ],
    playbooks: [],
    handoffs: [
      { id: 'h_fin_1', from: 'VibeArchitect (L0-L1)', to: 'FullStackBuilder (L2-L3)', target: 'node_fin_l3', status: 'COMPLETED' }
    ]
  }
};
