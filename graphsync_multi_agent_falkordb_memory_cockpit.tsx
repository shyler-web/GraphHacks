import React, { useState, useEffect, useMemo } from 'react';
import {
  Network, ShieldAlert, Sparkles, Layers, Cpu, Database, BookOpen,
  Code2, Terminal, CheckCircle2, AlertTriangle, Play, RefreshCw,
  ArrowUpRight, GitBranch, Zap, Lock, DollarSign, BrainCircuit,
  Users, FileCode, Check, ChevronRight, Activity, Eye, Server,
  Sliders, MessageSquare, Plus, Search, HelpCircle, Copy, ExternalLink,
  Move, ZoomIn, ZoomOut, Maximize2, LayoutGrid
} from 'lucide-react';

const PERSONA_LEVELS = [
  {
    level: 0,
    short: 'L0',
    name: 'The Vibe Coder',
    tagline: 'Plain-English Features & Safe Re-Prompts',
    description: 'Zero code shown. Focuses on what the app does, live status, and bubble-up safety alerts from Senior Agents.',
    color: 'from-pink-500 to-rose-500',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40'
  },
  {
    level: 1,
    short: 'L1',
    name: 'Indie Hacker / PM',
    tagline: 'User Flows, Product Rules & API Economics',
    description: 'Exposes hidden AI assumptions, token costs per 1,000 users, and business logic rules.',
    color: 'from-amber-500 to-orange-500',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  {
    level: 2,
    short: 'L2',
    name: 'Junior / Bootcamp Dev',
    tagline: 'System Wiring & File Guides',
    description: 'Visualizes how Frontend talks to Backend API routes and Database tables.',
    color: 'from-emerald-500 to-teal-500',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    level: 3,
    short: 'L3',
    name: 'Full-Stack Engineer',
    tagline: 'Code Contracts, Schemas & Cypher Queries',
    description: 'Actual TypeScript interfaces, Python FastAPI endpoints, and FalkorDB graph schemas.',
    color: 'from-cyan-500 to-blue-500',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  {
    level: 4,
    short: 'L4',
    name: 'Senior Staff Engineer',
    tagline: 'Concurrency, Security, GIL & Blast Radius',
    description: 'Audits race conditions, unthrottled API spend, Python GIL bottlenecks, and idempotency locks.',
    color: 'from-violet-500 to-purple-500',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40'
  },
  {
    level: 5,
    short: 'L5',
    name: 'Principal / Researcher',
    tagline: 'Big-O Math, GraphBLAS & Distributed Theory',
    description: 'Formal algorithmic complexity, sparse matrix linear algebra, and academic citations.',
    color: 'from-indigo-500 to-fuchsia-500',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  }
];

const DOMAIN_LENSES = [
  { id: 'Frontend', label: '1. Frontend / UI', pillar: 'Engineering', color: '#38bdf8' },
  { id: 'Backend', label: '2. Backend / API', pillar: 'Engineering', color: '#34d399' },
  { id: 'Database', label: '3. Database (FalkorDB)', pillar: 'Engineering', color: '#f472b6' },
  { id: 'Learning', label: '4. Learning Bridge', pillar: 'Discovery', color: '#fbbf24' },
  { id: 'Research', label: '5. Research & Papers', pillar: 'Discovery', color: '#a78bfa' },
  { id: 'ExistingProjects', label: '6. Existing Projects', pillar: 'Discovery', color: '#94a3b8' },
  { id: 'EndUsers', label: '7. End Users', pillar: 'Discovery', color: '#fb7185' },
  { id: 'Mathematics', label: '8. Mathematics', pillar: 'Foundations', color: '#c084fc' },
  { id: 'TechStack', label: '9. Great Tech Stack', pillar: 'Foundations', color: '#2dd4bf' },
  { id: 'Brainstorming', label: '10. Brainstorming', pillar: 'Discovery', color: '#facc15' },
  { id: 'ProgrammingLanguage', label: '11. Prog. Language', pillar: 'Foundations', color: '#60a5fa' },
  { id: 'BusinessCost', label: '12. Business & Cost', pillar: 'Foundations', color: '#4ade80' },
  { id: 'AIModelsPrompts', label: '13. AI Models & Prompts', pillar: 'Engineering', color: '#e879f9' },
  { id: 'ExternalAPIs', label: '14. External APIs', pillar: 'Engineering', color: '#fb923c' },
  { id: 'Security', label: '15. Security & Auth', pillar: 'Production', color: '#f87171' },
  { id: 'InfraDevOps', label: '16. Infra & DevOps', pillar: 'Production', color: '#818cf8' },
  { id: 'TestingObservability', label: '17. Testing & Edge Cases', pillar: 'Production', color: '#a3e635' }
];

const INITIAL_TENANTS = {
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

export default function App() {
  const [activeTenantKey, setActiveTenantKey] = useState('graphsync_user1_ai_avatar_saas');
  const [tenants, setTenants] = useState(INITIAL_TENANTS);
  const [maturityLevel, setMaturityLevel] = useState(0); // Default L0 Vibe Coder!
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState('node_vibe_avatar_l0');
  const [activeTab, setActiveTab] = useState('cockpit'); // 'cockpit' | 'memory' | 'backend'
  const [promptInput, setPromptInput] = useState('');
  const [isRunningAgents, setIsRunningAgents] = useState(false);
  const [agentStepText, setAgentStepText] = useState('');
  const [lastBuildBanner, setLastBuildBanner] = useState(null);
  const [copiedCypher, setCopiedCypher] = useState(false);

  const [useLiveGemini, setUseLiveGemini] = useState(true);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachOutputs, setCoachOutputs] = useState({});
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingOutputs, setGroundingOutputs] = useState({});
  const [llmErrorBanner, setLlmErrorBanner] = useState(null);

  const svgRef = React.useRef(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [compactNodes, setCompactNodes] = useState(false);

  const currentTenant = tenants[activeTenantKey];

  // Convert screen mouse/touch coordinates to SVG canvas coordinates
  const getSvgCoords = (clientX, clientY) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const viewBoxWidth = 1000;
    const viewBoxHeight = 520;
    const rawX = ((clientX - rect.left) / rect.width) * viewBoxWidth;
    const rawY = ((clientY - rect.top) / rect.height) * viewBoxHeight;
    return {
      x: (rawX - viewTransform.x) / viewTransform.scale,
      y: (rawY - viewTransform.y) / viewTransform.scale,
      rawX,
      rawY
    };
  };

  const handleNodePointerDown = (e, node) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    const pt = getSvgCoords(e.clientX, e.clientY);
    setDraggingNodeId(node.id);
    setDragOffset({ x: pt.x - node.x, y: pt.y - node.y });
  };

  const handleCanvasPointerDown = (e) => {
    if (draggingNodeId) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 1000;
    const rawY = ((e.clientY - rect.top) / rect.height) * 520;
    setIsPanning(true);
    setPanStart({ x: rawX - viewTransform.x, y: rawY - viewTransform.y });
  };

  const handleCanvasPointerMove = (e) => {
    if (draggingNodeId) {
      const pt = getSvgCoords(e.clientX, e.clientY);
      const nextX = Math.round(pt.x - dragOffset.x);
      const nextY = Math.round(pt.y - dragOffset.y);
      setTenants((prev) => {
        const tenant = prev[activeTenantKey];
        return {
          ...prev,
          [activeTenantKey]: {
            ...tenant,
            nodes: tenant.nodes.map((n) =>
              n.id === draggingNodeId ? { ...n, x: nextX, y: nextY } : n
            )
          }
        };
      });
    } else if (isPanning && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 1000;
      const rawY = ((e.clientY - rect.top) / rect.height) * 520;
      setViewTransform((prev) => ({
        ...prev,
        x: rawX - panStart.x,
        y: rawY - panStart.y
      }));
    }
  };

  const handleCanvasPointerUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  const handleAutoDeclutter = (mode = 'hierarchy') => {
    setTenants((prev) => {
      const tenant = prev[activeTenantKey];
      const nodesCopy = [...tenant.nodes];

      if (mode === 'hierarchy') {
        // Group nodes by persona_level (L0..L5) and spread evenly horizontally with zero overlap
        for (let lvl = 0; lvl <= 5; lvl++) {
          const levelNodes = nodesCopy.filter((n) => n.persona_level === lvl);
          const count = levelNodes.length;
          levelNodes.forEach((node, idx) => {
            const spacing = Math.max(225, Math.floor(920 / Math.max(count, 1)));
            const startX = count === 1 ? 480 : 140;
            node.x = startX + idx * spacing;
            node.y = 65 + lvl * 74 + (idx % 2 === 1 ? 12 : 0);
          });
        }
      } else if (mode === 'domain') {
        // Group nodes by domain columns, preserving vertical L0..L5 depth
        const uniqueDomains = [...new Set(nodesCopy.map((n) => n.domain))];
        nodesCopy.forEach((node) => {
          const colIdx = uniqueDomains.indexOf(node.domain);
          const sameCell = nodesCopy.filter(
            (other) => other.domain === node.domain && other.persona_level === node.persona_level
          );
          const subIdx = sameCell.findIndex((o) => o.id === node.id);
          node.x = 140 + colIdx * 230 + subIdx * 35;
          node.y = 65 + node.persona_level * 74;
        });
      } else if (mode === 'repel') {
        // Force-directed repulsion pass so overlapping nodes push apart cleanly
        for (let iter = 0; iter < 30; iter++) {
          for (let i = 0; i < nodesCopy.length; i++) {
            for (let j = i + 1; j < nodesCopy.length; j++) {
              const a = nodesCopy[i];
              const b = nodesCopy[j];
              const dx = b.x - a.x || 1;
              const dy = b.y - a.y || 1;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = 210;
              if (dist < minDist) {
                const push = (minDist - dist) * 0.35;
                const ux = dx / dist;
                const uy = dy / dist;
                a.x = Math.round(a.x - ux * push);
                b.x = Math.round(b.x + ux * push);
                // Keep vertical level bands roughly aligned while separating horizontal overlap
                a.y = Math.round(a.y - uy * push * 0.25);
                b.y = Math.round(b.y + uy * push * 0.25);
              }
            }
          }
        }
      }

      return {
        ...prev,
        [activeTenantKey]: {
          ...tenant,
          nodes: nodesCopy
        }
      };
    });

    // Reset camera so all neatly organized nodes are framed
    if (mode !== 'repel') {
      setViewTransform({ x: 0, y: 0, scale: 1 });
    }
  };

  const callGeminiWithBackoff = async (payload) => {
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    const delays = [1000, 2000, 4000];

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      } catch (err) {
        if (attempt === delays.length) throw err;
        await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
  };

  // Filter nodes based on the Builder Maturity Dial (L0 -> L5) and Domain filter
  const visibleNodes = useMemo(() => {
    return currentTenant.nodes.filter((n) => {
      const levelMatch = n.persona_level <= maturityLevel;
      const domainMatch = selectedDomain === 'ALL' || n.domain === selectedDomain;
      return levelMatch && domainMatch;
    });
  }, [currentTenant, maturityLevel, selectedDomain]);

  // Identify any L4 CRITICAL risks that endanger L0 nodes (Bubble-Up Alerting!)
  const bubbleUpRisks = useMemo(() => {
    const risks = {};
    currentTenant.edges.forEach((edge) => {
      if (edge.type === 'ENDANGERS') {
        const sourceRisk = currentTenant.nodes.find((n) => n.id === edge.from && n.status === 'CRITICAL');
        if (sourceRisk) {
          risks[edge.to] = sourceRisk;
        }
      }
    });
    return risks;
  }, [currentTenant]);

  const selectedNode = useMemo(() => {
    return (
      currentTenant.nodes.find((n) => n.id === selectedNodeId) ||
      visibleNodes[0] ||
      currentTenant.nodes[0]
    );
  }, [currentTenant, selectedNodeId, visibleNodes]);

  // Dynamic Cypher query preview reflecting current UI state
  const liveCypherQuery = useMemo(() => {
    return `// FalkorDB Multigraph Tenant: ${activeTenantKey}
MATCH (n:ConceptNode)
WHERE n.persona_level <= ${maturityLevel}${selectedDomain !== 'ALL' ? ` AND n.domain = '${selectedDomain}'` : ''}
OPTIONAL MATCH (n)-[:DEEPER_AT|DEPENDS_ON*1..3]->(child:ConceptNode)
WHERE child.persona_level <= ${maturityLevel}
OPTIONAL MATCH (risk:ConceptNode {persona_level: 4, status: 'CRITICAL'})-[:ENDANGERS]->(n)
RETURN n, collect(DISTINCT child) AS connections, collect(DISTINCT risk) AS senior_alerts`;
  }, [activeTenantKey, maturityLevel, selectedDomain]);

  const handleApplySeniorFix = (riskNode, targetL0Node) => {
    setTenants((prev) => {
      const tenant = { ...prev[activeTenantKey] };
      tenant.nodes = tenant.nodes.map((n) => {
        if (n.id === riskNode.id) {
          return {
            ...n,
            status: 'FIXED',
            title: 'FIXED: Redis Sliding-Window Rate Limit Active (5 req/min)',
            summary: 'Guardrail enforced via Procedural Memory (:Playbook). Double-click idempotency lock and IP rate limiter injected.'
          };
        }
        if (targetL0Node && n.id === targetL0Node.id) {
          return {
            ...n,
            status: 'FIXED',
            vibe_translation: 'Protected by Senior Guardrail! Locked to 5 clicks/min per user so your OpenAI bill stays safe.'
          };
        }
        return n;
      });

      const newPlaybook = {
        id: `pb_${Date.now()}`,
        rule_name: 'Always Rate-Limit & Lock Paid External AI/Payment APIs',
        trigger_domain: 'ExternalAPIs / Security',
        enforced_action: 'Auto-inject Redis 5 req/min sliding window + idempotency key on all new L2/L3 routes.',
        learned_from: 'ep_101 (Approved by User at L0)'
      };

      const newEpisode = {
        id: `ep_${Date.now().toString().slice(-3)}`,
        session: 'Current Session (Live Fix)',
        prompt: '[One-Click Senior Fix Applied from L0 Card]',
        summary: 'Updated L4 Security node to FIXED and wrote new Procedural Memory (:Playbook) rule so future features inherit Redis rate-limiting automatically.',
        timestamp: 'Just now'
      };

      return {
        ...prev,
        [activeTenantKey]: {
          ...tenant,
          playbooks: [newPlaybook, ...tenant.playbooks],
          episodes: [newEpisode, ...tenant.episodes]
        }
      };
    });
  };

  const handleAskGeminiCoach = async (node) => {
    if (!node || coachLoading) return;
    setCoachLoading(true);
    setLlmErrorBanner(null);

    const persona = PERSONA_LEVELS[maturityLevel];
    const playbooksText = currentTenant.playbooks.map((p) => p.rule_name).join('; ') || 'None yet';

    const systemPrompt = `You are Agent 4 (The Level-Up Learning Coach) inside GraphSync, a FalkorDB multi-agent memory engine.
Explain the selected architectural node to a builder currently at Level ${maturityLevel} (${persona.name} — ${persona.tagline}).
Keep it concise, vivid, and practical. Include:
1. A 1-sentence plain analogy tailored to L${maturityLevel}.
2. Why this node matters for preventing Cognitive Debt.
3. One concrete "Next Level-Up Question" to help them advance from L${maturityLevel} to L${Math.min(5, maturityLevel + 1)}.
Active Tenant Playbooks in FalkorDB: ${playbooksText}`;

    const userQuery = `Node Title: "${node.title}"
Domain Lens: ${node.domain} (Node Native Level: L${node.persona_level})
Technical Summary: ${node.summary}
Code / Math Contract: ${node.code_or_math}`;

    try {
      const result = await callGeminiWithBackoff({
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              analogy: { type: "STRING" },
              cognitiveDebtImpact: { type: "STRING" },
              safeRepromptOrCommand: { type: "STRING" },
              levelUpChallenge: { type: "STRING" }
            },
            propertyOrdering: ["analogy", "cognitiveDebtImpact", "safeRepromptOrCommand", "levelUpChallenge"]
          }
        }
      });

      const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        setCoachOutputs((prev) => ({
          ...prev,
          [`${node.id}_L${maturityLevel}`]: parsed
        }));
      }
    } catch (err) {
      setLlmErrorBanner('Gemini Learning Coach encountered a temporary issue. Showing cached graph guidance.');
    } finally {
      setCoachLoading(false);
    }
  };

  const handleGroundedResearch = async (node) => {
    if (!node || groundingLoading) return;
    setGroundingLoading(true);
    setLlmErrorBanner(null);

    const systemPrompt = `Act as a Principal Staff Engineer & Graph Researcher (L4-L5). Provide a concise 3-bullet technical brief on best practices, real-world benchmarks, or CVE/security pitfalls for the given architecture node.`;
    const userQuery = `Research best engineering practices, production benchmarks, or prior art for: ${node.title} (${node.domain}) — ${node.summary}`;

    try {
      const result = await callGeminiWithBackoff({
        contents: [{ parts: [{ text: userQuery }] }],
        tools: [{ google_search: {} }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      });

      const candidate = result?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || 'No grounded summary returned.';
      let sources = [];
      const groundingMetadata = candidate?.groundingMetadata;
      if (groundingMetadata?.groundingAttributions) {
        sources = groundingMetadata.groundingAttributions
          .map((attr) => ({
            uri: attr.web?.uri,
            title: attr.web?.title
          }))
          .filter((s) => s.uri && s.title);
      }

      setGroundingOutputs((prev) => ({
        ...prev,
        [node.id]: { text, sources }
      }));
    } catch (err) {
      setLlmErrorBanner('Google Search Grounding call failed or timed out. Please try again.');
    } finally {
      setGroundingLoading(false);
    }
  };

  const handleRunMultiAgentPrompt = async (customPrompt) => {
    const rawPrompt = typeof customPrompt === 'string' ? customPrompt : promptInput;
    const textToRun = (rawPrompt && rawPrompt.trim()) || 'Add AI Voice Cloning Preview API using ElevenLabs';
    if (isRunningAgents) return;

    const targetTenantKey = activeTenantKey;
    const ts = Date.now();
    const newL0Id = `node_vibe_${ts}`;
    const newL1Id = `node_cost_${ts}`;
    const newL2Id = `node_wire_${ts}`;
    const newL3Id = `node_code_${ts}`;
    const newL4Id = `node_audit_${ts}`;
    const newL5Id = `node_math_${ts}`;

    setIsRunningAgents(true);
    setLlmErrorBanner(null);
    setSelectedDomain('ALL');
    setActiveTab('cockpit');

    const tenantSnapshot = tenants[targetTenantKey];
    const hasRateLimitPlaybook = tenantSnapshot.playbooks.some((p) =>
      p.rule_name.toLowerCase().includes('rate-limit')
    );

    let aiGeneratedSpec = null;

    if (useLiveGemini) {
      try {
        setAgentStepText(`Gemini 3 Flash: Reading ${tenantSnapshot.playbooks.length} :Playbook rules & ${tenantSnapshot.episodes.length} :Episodes from FalkorDB...`);

        const validDomains = DOMAIN_LENSES.map((d) => d.id).join(', ');
        const playbooksContext = tenantSnapshot.playbooks
          .map((p) => `- ${p.rule_name}: ${p.enforced_action}`)
          .join('\n') || 'None';
        const episodesContext = tenantSnapshot.episodes
          .slice(0, 3)
          .map((e) => `- Prompt: "${e.prompt}" -> ${e.summary}`)
          .join('\n');

        const systemPrompt = `You are the 4-Agent FalkorDB Squad (VibeArchitect L0-L1, FullStackBuilder L2-L3, SeniorAuditor L4, PrincipalResearcher L5).
Generate a 6-level progressive depth graph slice (L0 to L5) for the user's feature prompt.
CRITICAL MEMORY RULE:
Active Procedural Memory (:Playbook) rules in FalkorDB:
${playbooksContext}
Recent Episodic Memory (:Episode):
${episodesContext}
Has Rate-Limit Playbook Active: ${hasRateLimitPlaybook}
If Has Rate-Limit Playbook Active is true, L0, L3, and L4 MUST reflect that the feature was AUTOMATICALLY built with a Redis sliding-window rate limiter and idempotency lock enforced by Procedural Memory! If false, L4 must flag a CRITICAL security/spend risk that endangers L0.
Valid domain values: ${validDomains}`;

        const payload = {
          contents: [{ parts: [{ text: `Build feature across L0-L5: "${textToRun}"` }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                episodeSummary: { type: "STRING" },
                nodes: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      persona_level: { type: "INTEGER" },
                      domain: { type: "STRING" },
                      title: { type: "STRING" },
                      summary: { type: "STRING" },
                      vibe_translation: { type: "STRING" },
                      code_or_math: { type: "STRING" }
                    },
                    propertyOrdering: ["persona_level", "domain", "title", "summary", "vibe_translation", "code_or_math"]
                  }
                }
              },
              propertyOrdering: ["episodeSummary", "nodes"]
            }
          }
        };

        setAgentStepText('Gemini 3 Flash: Synthesizing L0->L5 Semantic Nodes & Cypher contracts...');
        const result = await callGeminiWithBackoff(payload);
        const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          aiGeneratedSpec = JSON.parse(jsonText);
        }
      } catch (e) {
        setLlmErrorBanner('Gemini API call fell back to deterministic graph synthesizer.');
      }
    } else {
      setAgentStepText(`Agent 1–4: Simulating multi-agent graph build for "${textToRun}"...`);
      await new Promise((r) => setTimeout(r, 800));
    }

    // Determine domain based on prompt keywords for fallback
    const lower = textToRun.toLowerCase();
    const detectedDomain = lower.includes('stripe') || lower.includes('pay')
      ? 'ExternalAPIs'
      : lower.includes('auth') || lower.includes('login')
      ? 'Security'
      : lower.includes('db') || lower.includes('graph')
      ? 'Database'
      : 'AIModelsPrompts';

    setTenants((prev) => {
      const tenant = prev[targetTenantKey];
      const existingL0Count = tenant.nodes.filter((n) => n.persona_level === 0).length;
      const baseX = Math.min(160 + existingL0Count * 220, 690);

      const getAiNode = (lvl) =>
        aiGeneratedSpec?.nodes?.find((n) => Number(n.persona_level) === lvl);

      const sanitizeDomain = (d, fallback) =>
        DOMAIN_LENSES.some((lens) => lens.id === d) ? d : fallback;

      const l0Ai = getAiNode(0);
      const l1Ai = getAiNode(1);
      const l2Ai = getAiNode(2);
      const l3Ai = getAiNode(3);
      const l4Ai = getAiNode(4);
      const l5Ai = getAiNode(5);

      const newNodes = [
        {
          id: newL0Id,
          domain: sanitizeDomain(l0Ai?.domain, detectedDomain),
          persona_level: 0,
          title: l0Ai?.title || textToRun,
          summary: l0Ai?.summary || `User-facing L0 Vibe Feature generated from prompt: "${textToRun}".`,
          vibe_translation:
            l0Ai?.vibe_translation ||
            (hasRateLimitPlaybook
              ? `Auto-Protected by Gemini + Playbook Memory! Built "${textToRun}" with a 5-click/min shield automatically.`
              : `Careful! "${textToRun}" calls a paid external API without a rate limit yet. Click Apply Senior Fix below!`),
          code_or_math:
            l0Ai?.code_or_math ||
            `// L0 Vibe View for: ${textToRun}\n// Status: ${hasRateLimitPlaybook ? 'Protected by Procedural Memory (:Playbook)' : 'Awaiting Senior Guardrail'}`,
          status: hasRateLimitPlaybook ? 'FIXED' : 'WARNING',
          created_by_agent: aiGeneratedSpec ? 'Gemini-VibeArchitect' : 'VibeArchitectAgent',
          x: baseX,
          y: 65
        },
        {
          id: newL1Id,
          domain: sanitizeDomain(l1Ai?.domain, 'BusinessCost'),
          persona_level: 1,
          title: l1Ai?.title || `Unit Cost & Quota Rule: ${textToRun.slice(0, 22)}`,
          summary: l1Ai?.summary || `Estimated cost: $0.015 per request. Product rule created for "${textToRun}".`,
          vibe_translation: l1Ai?.vibe_translation || 'Costs 1.5 cents per run. Capped at 10 free runs per user.',
          code_or_math: l1Ai?.code_or_math || 'Cost_Per_1k_Calls = $15.00 | Free_Tier_Quota = 10/day',
          status: 'OK',
          created_by_agent: aiGeneratedSpec ? 'Gemini-VibeArchitect' : 'VibeArchitectAgent',
          x: Math.min(baseX + 55, 730),
          y: 130
        },
        {
          id: newL2Id,
          domain: sanitizeDomain(l2Ai?.domain, 'Backend'),
          persona_level: 2,
          title: l2Ai?.title || `UI -> POST /api/feature-${ts.toString().slice(-3)} -> FalkorDB`,
          summary: l2Ai?.summary || `End-to-end wiring connecting React UI to FastAPI service and FalkorDB graph state for "${textToRun}".`,
          vibe_translation: l2Ai?.vibe_translation || 'Connects the frontend button to our Python backend route.',
          code_or_math: l2Ai?.code_or_math || `FeatureButton.tsx ──POST──> /api/feature_${ts.toString().slice(-3)} ──MERGE──> (:ConceptNode)`,
          status: 'OK',
          created_by_agent: aiGeneratedSpec ? 'Gemini-FullStackBuilder' : 'FullStackBuilderAgent',
          x: baseX,
          y: 195
        },
        {
          id: newL3Id,
          domain: sanitizeDomain(l3Ai?.domain, 'ExternalAPIs'),
          persona_level: 3,
          title: l3Ai?.title || `FastAPI Route + ${hasRateLimitPlaybook ? 'Enforced Redis Guardrail' : 'Unthrottled Client'}`,
          summary:
            l3Ai?.summary ||
            (hasRateLimitPlaybook
              ? 'FullStackBuilder queried (:Playbook) in FalkorDB before coding and automatically injected @rate_limit(5, 60) middleware!'
              : `Standard async endpoint for "${textToRun}" calling external provider.`),
          vibe_translation: l3Ai?.vibe_translation || 'The actual Python backend function that runs when clicked.',
          code_or_math:
            l3Ai?.code_or_math ||
            (hasRateLimitPlaybook
              ? `@router.post("/api/feature-${ts.toString().slice(-3)}")\n@enforced_playbook("rule_rate_limit_all_ai")\nasync def run_feature(req: Request):\n    await redis_guard.check(req.client.host, limit=5, window=60)\n    return await execute_service("${textToRun}")`
              : `@router.post("/api/feature-${ts.toString().slice(-3)}")\nasync def run_feature(req: Request):\n    # WARNING: Unthrottled external API call\n    return await execute_service("${textToRun}")`),
          status: hasRateLimitPlaybook ? 'FIXED' : 'OK',
          created_by_agent: aiGeneratedSpec ? 'Gemini-FullStackBuilder' : 'FullStackBuilderAgent',
          x: Math.min(baseX + 65, 730),
          y: 260
        },
        {
          id: newL4Id,
          domain: sanitizeDomain(l4Ai?.domain, 'Security'),
          persona_level: 4,
          title:
            l4Ai?.title ||
            (hasRateLimitPlaybook
              ? `Verified by Playbook: ${textToRun.slice(0, 18)} Protected`
              : `CRITICAL: Unthrottled Spend on "${textToRun.slice(0, 18)}"`),
          summary:
            l4Ai?.summary ||
            (hasRateLimitPlaybook
              ? 'SeniorAuditor verified that FullStackBuilder followed Procedural Memory Playbook #1. Zero rate-limit regression!'
              : `CRITICAL AUDIT: "${textToRun}" has no rate limiter or idempotency lock. Vulnerable to bot loops.`),
          vibe_translation:
            l4Ai?.vibe_translation ||
            (hasRateLimitPlaybook
              ? 'Senior Agent verified your learned security rule was applied automatically!'
              : 'Needs 1-Click Senior Fix to prevent API spend drain!'),
          code_or_math: l4Ai?.code_or_math || 'MATCH (p:Playbook)-[:GOVERNS]->(n:ConceptNode) RETURN p.enforced_action',
          status: hasRateLimitPlaybook ? 'FIXED' : 'CRITICAL',
          created_by_agent: aiGeneratedSpec ? 'Gemini-SeniorAuditor' : 'SeniorAuditorAgent',
          x: baseX,
          y: 325
        },
        {
          id: newL5Id,
          domain: sanitizeDomain(l5Ai?.domain, 'Mathematics'),
          persona_level: 5,
          title: l5Ai?.title || `Queueing & Graph Traversal Complexity: ${textToRun.slice(0, 16)}`,
          summary: l5Ai?.summary || `Formal Big-O and Little's Law throughput bound for "${textToRun}".`,
          vibe_translation: l5Ai?.vibe_translation || 'Mathematical proof that this feature scales under heavy traffic.',
          code_or_math: l5Ai?.code_or_math || 'L = λ · W | Subgraph Query: O(|V_slice| + |E_slice|)',
          status: 'OK',
          created_by_agent: aiGeneratedSpec ? 'Gemini-PrincipalAuditor' : 'SeniorAuditorAgent',
          x: Math.min(baseX + 55, 730),
          y: 390
        }
      ];

      const newEdges = [
        { from: newL0Id, to: newL1Id, type: 'DEEPER_AT' },
        { from: newL1Id, to: newL2Id, type: 'DEEPER_AT' },
        { from: newL2Id, to: newL3Id, type: 'DEEPER_AT' },
        { from: newL3Id, to: newL4Id, type: 'DEEPER_AT' },
        { from: newL4Id, to: newL5Id, type: 'DEEPER_AT' },
        ...(!hasRateLimitPlaybook ? [{ from: newL4Id, to: newL0Id, type: 'ENDANGERS' }] : [])
      ];

      const newEpisode = {
        id: `ep_${ts.toString().slice(-3)}`,
        session: aiGeneratedSpec ? 'Live Gemini 3 Flash Session' : 'Live Prompt Session',
        prompt: textToRun,
        summary:
          aiGeneratedSpec?.episodeSummary ||
          (hasRateLimitPlaybook
            ? `Agents queried FalkorDB Procedural Memory (:Playbook) first and automatically enforced Redis rate-limiting on "${textToRun}" across L0–L5!`
            : `Generated 6 linked nodes (L0–L5) for "${textToRun}". SeniorAuditor flagged missing rate limit and bubbled [:ENDANGERS] alert to L0.`),
        timestamp: 'Just now'
      };

      setLastBuildBanner({
        prompt: textToRun,
        protectedByPlaybook: hasRateLimitPlaybook,
        nodeCount: newNodes.length,
        usedGemini: Boolean(aiGeneratedSpec)
      });

      // Automatically place new feature stack in its own clean non-overlapping column
      const allUpdatedNodes = [...tenant.nodes, ...newNodes];
      for (let lvl = 0; lvl <= 5; lvl++) {
        const levelNodes = allUpdatedNodes.filter((n) => n.persona_level === lvl);
        levelNodes.forEach((n, idx) => {
          n.x = 140 + idx * 235;
          n.y = 65 + lvl * 74 + (idx % 2 === 1 ? 10 : 0);
        });
      }

      return {
        ...prev,
        [targetTenantKey]: {
          ...tenant,
          nodes: allUpdatedNodes,
          edges: [...tenant.edges, ...newEdges],
          episodes: [newEpisode, ...tenant.episodes],
          handoffs: [
            {
              id: `h_${ts}`,
              from: hasRateLimitPlaybook ? 'PlaybookMemory -> GeminiBuilder' : 'GeminiArchitect (L0-L1)',
              to: hasRateLimitPlaybook ? 'SeniorAuditor (Verified)' : 'SeniorAuditor (L4 Alert)',
              target: newL0Id,
              status: hasRateLimitPlaybook ? 'PLAYBOOK_ENFORCED' : 'ALERT_RAISED'
            },
            ...tenant.handoffs
          ]
        }
      };
    });

    setSelectedNodeId(newL0Id);
    setPromptInput('');
    setIsRunningAgents(false);
    setAgentStepText('');
  };

  const currentPersonaObj = PERSONA_LEVELS[maturityLevel];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">GraphSync</h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  FalkorDB Track 02 • Agent Memory & Coordination
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Solving Cognitive Debt via 17 Domain Lenses × 6 Builder Maturity Levels (L0 Vibe Coder → L5 Principal)
              </p>
            </div>
          </div>

          {/* Multi-Tenant Graph Switcher (Requirement #5) */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
              <Database className="w-4 h-4 text-pink-400" />
              <span className="text-xs text-slate-400">FalkorDB Tenant:</span>
              <select
                value={activeTenantKey}
                onChange={(e) => {
                  setActiveTenantKey(e.target.value);
                  setSelectedNodeId(INITIAL_TENANTS[e.target.value].nodes[0].id);
                }}
                className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
              >
                {Object.entries(tenants).map(([key, t]) => (
                  <option key={key} value={key} className="bg-slate-900 text-white">
                    {t.name} ({key})
                  </option>
                ))}
              </select>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('cockpit')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'cockpit'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                2D Graph Cockpit
              </button>
              <button
                onClick={() => setActiveTab('memory')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'memory'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                3-Tier Agent Memory ({currentTenant.episodes.length + currentTenant.playbooks.length})
              </button>
              <button
                onClick={() => setActiveTab('backend')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'backend'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                FalkorDB + Python Code
              </button>
            </div>
          </div>
        </div>
      </header>

      {}
      <section className="bg-slate-900/50 border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* The 6-Level Dial */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Builder Maturity Dial (Progressive Depth Control)
              </span>
              <span className="text-xs text-slate-400">
                Showing <strong className="text-white">{visibleNodes.length}</strong> of{' '}
                <strong className="text-white">{currentTenant.nodes.length}</strong> Semantic Graph Nodes (L0 → L{maturityLevel})
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {PERSONA_LEVELS.map((p) => {
                const isActive = maturityLevel === p.level;
                const isIncluded = p.level <= maturityLevel;
                return (
                  <button
                    key={p.level}
                    onClick={() => setMaturityLevel(p.level)}
                    className={`text-left p-2.5 rounded-xl border transition-all relative overflow-hidden ${
                      isActive
                        ? 'border-white/40 bg-slate-800/90 shadow-lg ring-2 ring-indigo-500/50'
                        : isIncluded
                        ? 'border-slate-700/80 bg-slate-900/70 hover:bg-slate-800/60'
                        : 'border-slate-800/50 bg-slate-950/60 opacity-55 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md bg-gradient-to-r ${p.color} text-white`}
                      >
                        {p.short}
                      </span>
                      {isIncluded && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{p.tagline}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Multi-Agent Prompt Bar */}
          <div className="lg:w-[460px] flex flex-col justify-between bg-slate-950/90 border border-slate-800 rounded-xl p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunMultiAgentPrompt(promptInput);
              }}
            >
              <div className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Gemini 3 Flash 4-Agent Squad:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseLiveGemini(!useLiveGemini)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer transition ${
                      useLiveGemini
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {useLiveGemini ? '✨ Live Gemini API: ON' : '⚡ Fast Sim: ON'}
                  </button>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {currentTenant.playbooks.length} :Playbooks
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Ask Gemini Squad to build a feature (e.g., Add Stripe Checkout)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isRunningAgents}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow disabled:opacity-50 cursor-pointer"
                >
                  {isRunningAgents ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Build
                </button>
              </div>
            </form>
            {isRunningAgents ? (
              <div className="mt-2 text-[11px] text-amber-300 font-mono flex items-center gap-1.5 animate-pulse">
                <Cpu className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{agentStepText}</span>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>1-Click Gemini Prompts:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleRunMultiAgentPrompt('Add ElevenLabs AI Voice Cloning Endpoint')
                    }
                    className="text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/70 px-2 py-0.5 rounded border border-indigo-500/30 cursor-pointer transition"
                  >
                    + ElevenLabs Voice API
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleRunMultiAgentPrompt('Add Real-Time Collaborative Cursor Sync via WebSockets')
                    }
                    className="text-emerald-300 hover:text-white bg-emerald-950/50 hover:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30 cursor-pointer transition"
                  >
                    + WebSocket Sync
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 17 DOMAIN LENS FILTER BAR */}
      <div className="bg-slate-950 border-b border-slate-800/60 px-4 py-2 overflow-x-auto">
        <div className="max-w-[1600px] mx-auto flex items-center gap-1.5 min-w-max">
          <button
            onClick={() => setSelectedDomain('ALL')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              selectedDomain === 'ALL'
                ? 'bg-white text-slate-950 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All 17 Domains ({currentTenant.nodes.length})
          </button>
          {DOMAIN_LENSES.map((lens) => {
            const count = currentTenant.nodes.filter((n) => n.domain === lens.id).length;
            return (
              <button
                key={lens.id}
                onClick={() => setSelectedDomain(lens.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  selectedDomain === lens.id
                    ? 'bg-indigo-600 text-white font-semibold'
                    : count > 0
                    ? 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800'
                    : 'bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-900'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: lens.color }}
                />
                {lens.label}
                {count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4">
        {llmErrorBanner && (
          <div className="mb-3 px-4 py-2 rounded-xl bg-amber-950/70 border border-amber-500/40 flex items-center justify-between text-xs text-amber-200">
            <span>{llmErrorBanner}</span>
            <button
              onClick={() => setLlmErrorBanner(null)}
              className="text-amber-300 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
        {lastBuildBanner && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-indigo-950/70 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-indigo-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>{lastBuildBanner.usedGemini ? 'Gemini 3 Flash 4-Agent Synthesis' : '4-Agent Build'} Complete:</strong> Added{' '}
                <strong>{lastBuildBanner.nodeCount} linked nodes (L0→L5)</strong> for{' '}
                <span className="text-white font-semibold">“{lastBuildBanner.prompt}”</span> into FalkorDB!{' '}
                {lastBuildBanner.protectedByPlaybook ? (
                  <span className="text-emerald-300 font-semibold">
                    (Auto-protected by your learned :Playbook guardrail!)
                  </span>
                ) : (
                  <span className="text-rose-300 font-semibold">
                    (L4 Senior Auditor raised a bubble-up alert on your new L0 node!)
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={() => setLastBuildBanner(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Dismiss ✕
            </button>
          </div>
        )}
        {activeTab === 'cockpit' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            {/* Center-Left Interactive 2D FalkorDB Graph Canvas (7 cols) */}
            <div className="lg:col-span-7 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${currentPersonaObj.badge}`}>
                    Viewing Mode: {currentPersonaObj.short} — {currentPersonaObj.name}
                  </span>
                  <span className="text-[11px] text-slate-400 hidden xl:inline">
                    Drag any node to move • Drag background to pan
                  </span>
                </div>

                {/* Declutter & Layout Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAutoDeclutter('hierarchy')}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                    title="Neatly align all nodes into non-overlapping columns & L0-L5 rows"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
                    Auto-Declutter Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoDeclutter('repel')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                    title="Push overlapping nodes apart using force repulsion"
                  >
                    <Move className="w-3.5 h-3.5 text-emerald-400" />
                    Spread Overlaps
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoDeclutter('domain')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium cursor-pointer transition"
                    title="Group columns by Domain Lens"
                  >
                    By Domain
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompactNodes(!compactNodes)}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-medium cursor-pointer transition ${
                      compactNodes
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {compactNodes ? 'Compact: ON' : 'Compact'}
                  </button>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setViewTransform((v) => ({ ...v, scale: Math.max(0.5, +(v.scale - 0.15).toFixed(2)) }))
                      }
                      className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-slate-400 px-1">
                      {Math.round(viewTransform.scale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setViewTransform((v) => ({ ...v, scale: Math.min(1.8, +(v.scale + 0.15).toFixed(2)) }))
                      }
                      className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewTransform({ x: 0, y: 0, scale: 1 })}
                      className="p-1 text-slate-400 hover:text-white cursor-pointer border-l border-slate-800"
                      title="Reset Pan & Zoom"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Draggable & Pannable SVG Graph Canvas */}
              <div className="relative flex-1 min-h-[490px] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] overflow-hidden select-none">
                <svg
                  ref={svgRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerLeave={handleCanvasPointerUp}
                  className={`w-full h-[490px] ${
                    draggingNodeId
                      ? 'cursor-grabbing'
                      : isPanning
                      ? 'cursor-grabbing'
                      : 'cursor-grab'
                  }`}
                  viewBox="0 0 1000 520"
                >
                  <defs>
                    <marker
                      id="arrow-normal"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
                    </marker>
                    <marker
                      id="arrow-danger"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
                    </marker>
                  </defs>

                  <g
                    transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}
                  >
                    {/* Horizontal Persona Depth Guides */}
                    {[0, 1, 2, 3, 4, 5].map((lvl) => (
                      <g key={lvl} opacity={lvl <= maturityLevel ? 0.35 : 0.1}>
                        <line
                          x1="-400"
                          y1={65 + lvl * 74}
                          x2="2200"
                          y2={65 + lvl * 74}
                          stroke="#334155"
                          strokeDasharray="4 4"
                        />
                        <text
                          x="14"
                          y={58 + lvl * 74}
                          fill="#94a3b8"
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          L{lvl}: {PERSONA_LEVELS[lvl].name}
                        </text>
                      </g>
                    ))}

                    {/* Render Smooth Curved Bezier Graph Edges */}
                    {currentTenant.edges.map((edge, idx) => {
                      const fromNode = currentTenant.nodes.find((n) => n.id === edge.from);
                      const toNode = currentTenant.nodes.find((n) => n.id === edge.to);
                      if (!fromNode || !toNode) return null;

                      const bothVisible =
                        visibleNodes.some((n) => n.id === fromNode.id) &&
                        visibleNodes.some((n) => n.id === toNode.id);
                      const isBubbleUpAlert =
                        edge.type === 'ENDANGERS' && fromNode.status === 'CRITICAL';

                      if (!bothVisible && !isBubbleUpAlert) return null;

                      const midY = (fromNode.y + toNode.y) / 2;
                      const curveOffset = edge.type === 'ENDANGERS' ? -45 : 0;
                      const pathData = `M ${fromNode.x} ${fromNode.y} C ${fromNode.x + curveOffset} ${midY}, ${toNode.x + curveOffset} ${midY}, ${toNode.x} ${toNode.y}`;

                      return (
                        <g key={idx}>
                          <path
                            d={pathData}
                            fill="none"
                            stroke={
                              edge.type === 'ENDANGERS'
                                ? '#f43f5e'
                                : edge.type === 'LEARN_CONCEPT'
                                ? '#fbbf24'
                                : '#6366f1'
                            }
                            strokeWidth={edge.type === 'ENDANGERS' ? 2.5 : 1.8}
                            strokeDasharray={edge.type === 'ENDANGERS' ? '6 4' : undefined}
                            markerEnd={
                              edge.type === 'ENDANGERS'
                                ? 'url(#arrow-danger)'
                                : 'url(#arrow-normal)'
                            }
                          />
                          <text
                            x={(fromNode.x + toNode.x) / 2 + curveOffset * 0.6}
                            y={(fromNode.y + toNode.y) / 2 - 6}
                            fill={edge.type === 'ENDANGERS' ? '#fda4af' : '#94a3b8'}
                            fontSize="9"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            [:{edge.type}]
                          </text>
                        </g>
                      );
                    })}

                    {/* Render Freely Draggable Nodes */}
                    {visibleNodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id;
                      const isDraggingThis = draggingNodeId === node.id;
                      const endangeredBy = bubbleUpRisks[node.id];
                      const lensObj = DOMAIN_LENSES.find((d) => d.id === node.domain);
                      const cardW = compactNodes ? 148 : 196;
                      const cardH = compactNodes ? 40 : 52;

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${node.x}, ${node.y})`}
                          onPointerDown={(e) => handleNodePointerDown(e, node)}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          {/* Pulsing Halo if Critical or Endangered at L0 */}
                          {(node.status === 'CRITICAL' || endangeredBy) && (
                            <circle
                              r={compactNodes ? '28' : '36'}
                              fill="none"
                              stroke="#f43f5e"
                              strokeWidth="2"
                              strokeDasharray="4 2"
                            />
                          )}

                          <rect
                            x={-cardW / 2}
                            y={-cardH / 2}
                            width={cardW}
                            height={cardH}
                            rx="12"
                            fill={isDraggingThis ? '#312e81' : isSelected ? '#1e1b4b' : '#0f172a'}
                            stroke={
                              node.status === 'CRITICAL' || endangeredBy
                                ? '#f43f5e'
                                : node.status === 'FIXED'
                                ? '#10b981'
                                : isSelected || isDraggingThis
                                ? '#818cf8'
                                : lensObj?.color || '#475569'
                            }
                            strokeWidth={isSelected || isDraggingThis ? '2.8' : '1.6'}
                          />

                          {/* Level & Domain Pill */}
                          <text
                            x={-cardW / 2 + 10}
                            y={-cardH / 2 + 15}
                            fill={lensObj?.color || '#38bdf8'}
                            fontSize="9"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            L{node.persona_level} • {node.domain.slice(0, compactNodes ? 8 : 16)}
                          </text>

                          {/* Status / Drag Grip Indicator */}
                          <text
                            x={cardW / 2 - 10}
                            y={-cardH / 2 + 15}
                            fill={
                              node.status === 'CRITICAL' || endangeredBy
                                ? '#fb7185'
                                : node.status === 'FIXED'
                                ? '#34d399'
                                : '#94a3b8'
                            }
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="end"
                            fontFamily="monospace"
                          >
                            {endangeredBy ? '🚨 ALERT' : `⠿ ${node.status}`}
                          </text>

                          {/* Node Title */}
                          <text
                            x="0"
                            y={compactNodes ? 10 : 12}
                            fill="#f8fafc"
                            fontSize={compactNodes ? '9' : '10'}
                            fontWeight="600"
                            textAnchor="middle"
                          >
                            {node.title.length > (compactNodes ? 20 : 26)
                              ? node.title.slice(0, compactNodes ? 18 : 24) + '…'
                              : node.title}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>

                {/* Floating Canvas Helper Pill */}
                <div className="absolute bottom-2.5 left-3 pointer-events-none flex items-center gap-2 bg-slate-950/85 border border-slate-800 px-2.5 py-1 rounded-full text-[10px] text-slate-400">
                  <Move className="w-3 h-3 text-indigo-400" />
                  <span>Tip: Drag any card to reposition • Click <strong>Auto-Declutter Grid</strong> or <strong>Spread Overlaps</strong> anytime</span>
                </div>
              </div>

              {/* Live Cypher Query Bar at Bottom of Graph */}
              <div className="p-3 bg-slate-950 border-t border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-indigo-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Live FalkorDB Cypher Traversal (Executed in O(1) Multigraph):
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(liveCypherQuery);
                      setCopiedCypher(true);
                      setTimeout(() => setCopiedCypher(false), 1500);
                    }}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedCypher ? 'Copied!' : 'Copy Cypher'}
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-emerald-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                  {liveCypherQuery}
                </pre>
              </div>
            </div>

            {/* Right Sidebar: Node Inspector + Bubble-Up Guardian + Multi-Agent Handoffs (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Selected Node Inspector */}
              {selectedNode && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          L{selectedNode.persona_level} ({PERSONA_LEVELS[selectedNode.persona_level].name})
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Domain: {selectedNode.domain}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-white">{selectedNode.title}</h2>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                        selectedNode.status === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : selectedNode.status === 'FIXED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {selectedNode.status}
                    </span>
                  </div>

                  {/* Vibe Coder Plain-English Translation Card */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/30">
                    <div className="text-[11px] font-semibold text-pink-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      L0 Vibe Coder Translation (Zero Jargon):
                    </div>
                    <p className="text-xs text-slate-100 leading-relaxed">
                      “{selectedNode.vibe_translation}”
                    </p>
                  </div>

                  {/* Technical Summary */}
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-1">
                      Architectural Context (Created by {selectedNode.created_by_agent}):
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.summary}</p>
                  </div>

                  {/* Code or Mathematical Proof Box */}
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
                      <span>Code Contract / Mathematical Proof (L3–L5):</span>
                      {maturityLevel === 0 && (
                        <button
                          onClick={() => setMaturityLevel(3)}
                          className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                        >
                          Turn Dial to L3 to expand all code →
                        </button>
                      )}
                    </div>
                    <pre className="text-[11px] font-mono bg-slate-950 text-cyan-300 p-3 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                      {selectedNode.code_or_math}
                    </pre>
                  </div>

                  {}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2.5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAskGeminiCoach(selectedNode)}
                        disabled={coachLoading}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                      >
                        {coachLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        ✨ Ask Gemini Coach (Explain at L{maturityLevel})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGroundedResearch(selectedNode)}
                        disabled={groundingLoading}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                      >
                        {groundingLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                        ) : (
                          <Search className="w-3.5 h-3.5 text-cyan-300" />
                        )}
                        🌐 Grounded Prior Art (Google Search)
                      </button>
                    </div>

                    {/* Gemini Level-Calibrated Learning Coach Output */}
                    {coachOutputs[`${selectedNode.id}_L${maturityLevel}`] && (
                      <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2 text-xs">
                        <div className="font-bold text-amber-300 flex items-center justify-between">
                          <span>🎓 Gemini Learning Bridge (Calibrated for L{maturityLevel} {currentPersonaObj.name})</span>
                          <span className="text-[10px] font-mono text-amber-400/80">Lens #4: Learning</span>
                        </div>
                        <p className="text-slate-200">
                          <strong className="text-amber-200">Mental Model:</strong>{' '}
                          {coachOutputs[`${selectedNode.id}_L${maturityLevel}`].analogy}
                        </p>
                        <p className="text-slate-300">
                          <strong className="text-amber-200">Cognitive Debt Impact:</strong>{' '}
                          {coachOutputs[`${selectedNode.id}_L${maturityLevel}`].cognitiveDebtImpact}
                        </p>
                        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-[11px] text-emerald-300">
                          Action / Prompt: {coachOutputs[`${selectedNode.id}_L${maturityLevel}`].safeRepromptOrCommand}
                        </div>
                        <p className="text-[11px] text-indigo-300 italic">
                          🚀 Level-Up Question (→ L{Math.min(5, maturityLevel + 1)}):{' '}
                          {coachOutputs[`${selectedNode.id}_L${maturityLevel}`].levelUpChallenge}
                        </p>
                      </div>
                    )}

                    {/* Gemini Google Search Grounding Output */}
                    {groundingOutputs[selectedNode.id] && (
                      <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 space-y-2 text-xs">
                        <div className="font-bold text-cyan-300 flex items-center justify-between">
                          <span>🌐 Live Web-Grounded Engineering Brief</span>
                          <span className="text-[10px] font-mono text-cyan-400/80">Lens #5 & #6: Research</span>
                        </div>
                        <div className="text-slate-200 whitespace-pre-line leading-relaxed">
                          {groundingOutputs[selectedNode.id].text}
                        </div>
                        {groundingOutputs[selectedNode.id].sources?.length > 0 && (
                          <div className="pt-1.5 border-t border-cyan-500/20">
                            <div className="text-[10px] font-mono text-cyan-400 mb-1">
                              Verified Web Citations:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {groundingOutputs[selectedNode.id].sources.slice(0, 4).map((src, i) => (
                                <a
                                  key={i}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-cyan-300 hover:underline border border-slate-700 flex items-center gap-1"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  {src.title.slice(0, 28)}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* THE KILLER DEMO LOOP: Bubble-Up Senior Guardian Alert & 1-Click Fix */}
                  {(bubbleUpRisks[selectedNode.id] || selectedNode.status === 'CRITICAL') && (
                    <div className="p-3.5 rounded-xl bg-rose-950/50 border-2 border-rose-500/60 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
                          L4 Senior Auditor Bubble-Up Alert ([:ENDANGERS])
                        </span>
                        <span className="text-[10px] font-mono bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded">
                          SEVERITY: CRITICAL
                        </span>
                      </div>
                      <p className="text-xs text-rose-100">
                        {bubbleUpRisks[selectedNode.id]
                          ? bubbleUpRisks[selectedNode.id].summary
                          : selectedNode.summary}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() =>
                            handleApplySeniorFix(
                              bubbleUpRisks[selectedNode.id] || selectedNode,
                              selectedNode
                            )
                          }
                          className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Apply 1-Click Senior Fix + Save to :Playbook Memory
                        </button>
                        <button
                          onClick={() => {
                            setMaturityLevel(Math.max(maturityLevel, 2));
                            setSelectedNodeId('node_learning_bridge_l2');
                          }}
                          className="py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Level Me Up (Why?)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Live 4-Agent Shared Graph Coordination Ledger */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-400" />
                      4-Agent Shared FalkorDB Handoff Ledger (:AgentTask)
                    </h3>
                    <span className="text-[11px] font-mono text-emerald-400">asyncio.gather()</span>
                  </div>
                  <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                    {currentTenant.handoffs.map((h) => (
                      <div
                        key={h.id}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-200">
                              {h.from} <span className="text-slate-500">→</span> {h.to}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              Target Node: {h.target}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                            h.status === 'PLAYBOOK_ENFORCED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : h.status === 'ALERT_RAISED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-indigo-500/20 text-indigo-300'
                          }`}
                        >
                          {h.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Procedural Memory Quick Status */}
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Learned <code className="text-amber-300">:Playbook</code> Guardrails in Graph:
                  </span>
                  <button
                    onClick={() => setActiveTab('memory')}
                    className="text-indigo-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                  >
                    Inspect {currentTenant.playbooks.length} Rules & {currentTenant.episodes.length} Episodes →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {}
        {activeTab === 'memory' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tier 1: Episodic Memory */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-pink-400" />
                  1. Episodic Memory (:Episode)
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300">
                  {currentTenant.episodes.length} Sessions
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Persistent conversation history linked via <code className="text-pink-300">[:MODIFIED]</code> edges to the exact ConceptNodes created or changed.
              </p>
              <div className="space-y-3 flex-1">
                {currentTenant.episodes.map((ep) => (
                  <div key={ep.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>{ep.session}</span>
                      <span>{ep.timestamp}</span>
                    </div>
                    <div className="text-xs font-semibold text-white mb-1">
                      Prompt: “{ep.prompt}”
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed">{ep.summary}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier 2: Semantic Memory */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  2. Semantic Memory (:ConceptNode)
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  {currentTenant.nodes.length} Nodes
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Structured architectural knowledge indexed across 17 Domain Lenses × 6 Builder Persona Levels (<code className="text-cyan-300">L0 → L5</code>).
              </p>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {currentTenant.nodes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setMaturityLevel(Math.max(maturityLevel, n.persona_level));
                      setSelectedNodeId(n.id);
                      setActiveTab('cockpit');
                    }}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono mb-0.5">
                      <span className="text-indigo-400">
                        L{n.persona_level} • {n.domain}
                      </span>
                      <span
                        className={
                          n.status === 'CRITICAL'
                            ? 'text-rose-400 font-bold'
                            : n.status === 'FIXED'
                            ? 'text-emerald-400 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {n.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white">{n.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier 3: Procedural Memory */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  3. Procedural Memory (:Playbook)
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {currentTenant.playbooks.length} Rules Learned
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Learned engineering guardrails. Whenever you click <strong>“Apply Senior Fix”</strong>, Agent 3 writes a <code className="text-emerald-300">:Playbook</code> node so future agents never repeat the mistake!
              </p>
              <div className="space-y-3 flex-1">
                {currentTenant.playbooks.map((pb) => (
                  <div
                    key={pb.id}
                    className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40"
                  >
                    <div className="text-xs font-bold text-emerald-300 mb-1">{pb.rule_name}</div>
                    <div className="text-[11px] font-mono text-slate-400 mb-1">
                      Trigger Domain: {pb.trigger_domain}
                    </div>
                    <div className="text-xs text-slate-200 mb-1.5">{pb.enforced_action}</div>
                    <div className="text-[10px] font-mono text-emerald-400">
                      Source: {pb.learned_from}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {}
        {activeTab === 'backend' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 max-w-4xl mx-auto space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" />
              Run GraphSync Locally with FalkorDB Docker + FastAPI
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              The complete backend implementation (`docker-compose.yml`, `database.py`, `seed_graph.py`, `agents.py`, and `main.py`) has also been added to your <strong>Hackathon Modular Execution Plan</strong> document so you can copy-paste each module directly into your repository.
            </p>
            <div className="space-y-2">
              <div className="text-xs font-mono text-indigo-300">1. Start FalkorDB (Port 6379 + Browser UI on Port 3000):</div>
              <pre className="text-xs font-mono bg-slate-950 text-emerald-300 p-3 rounded-xl border border-slate-800 overflow-x-auto">
{`docker run -p 6379:6379 -p 3000:3000 -it --rm falkordb/falkordb:latest`}
              </pre>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-mono text-indigo-300">2. Install Python Backend Dependencies & Seed the 17×6 Graph:</div>
              <pre className="text-xs font-mono bg-slate-950 text-cyan-300 p-3 rounded-xl border border-slate-800 overflow-x-auto">
{`pip install falkordb fastapi uvicorn pydantic litellm
python seed_graph.py
uvicorn main:app --reload --port 8000`}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}