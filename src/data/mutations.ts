import type { ConceptEdge, ConceptNode, TenantMap } from './types';
import {
  loadTenants,
  writeTrack2Graph,
  writeTrack2Handoff,
  writeTrack2Turn,
  writeTrack2Workflow
} from './remote';
import { DOMAIN_LENSES } from '../graph/domainLenses';
import { declutterNodes, type DeclutterMode } from '../graph/layout';
import type { LastBuildBanner } from '../shared/types';

// Tenant-map write transforms. Each returns a NEW map (React-friendly) while
// preserving the previous in-place node mutation semantics where they existed.
// The cockpit never edits tenant data directly; it calls these and stores the
// result via setState. This is the write half of the data seam.

/** Move a single node to a new position (interactive drag). */
export function moveNode(
  tenants: TenantMap,
  tenantKey: string,
  nodeId: string,
  x: number,
  y: number
): TenantMap {
  const tenant = tenants[tenantKey];
  return {
    ...tenants,
    [tenantKey]: {
      ...tenant,
      nodes: tenant.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n))
    }
  };
}

/** Re-layout a tenant's nodes (auto-declutter grid / by-domain / repel). */
export function declutterTenant(
  tenants: TenantMap,
  tenantKey: string,
  mode: DeclutterMode
): TenantMap {
  const tenant = tenants[tenantKey];
  const nodesCopy = [...tenant.nodes];
  declutterNodes(nodesCopy, mode);

  return {
    ...tenants,
    [tenantKey]: {
      ...tenant,
      nodes: nodesCopy
    }
  };
}

/**
 * The 1-click senior fix: flip the L4 risk and endangered L0 node to FIXED and
 * persist a new :Playbook guardrail plus a new :Episode.
 */
export function applySeniorFix(
  tenants: TenantMap,
  tenantKey: string,
  riskNode: ConceptNode,
  targetL0Node: ConceptNode | null
): TenantMap {
  const tenant = { ...tenants[tenantKey] };
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
    ...tenants,
    [tenantKey]: {
      ...tenant,
      playbooks: [newPlaybook, ...tenant.playbooks],
      episodes: [newEpisode, ...tenant.episodes]
    }
  };
}

export interface FeatureStackInput {
  targetTenantKey: string;
  ts: number;
  textToRun: string;
  detectedDomain: string;
  hasRateLimitPlaybook: boolean;
  aiGeneratedSpec: any;
  newL0Id: string;
  newL1Id: string;
  newL2Id: string;
  newL3Id: string;
  newL4Id: string;
  newL5Id: string;
}

/**
 * Append a freshly synthesized L0→L5 feature stack (6 nodes + edges + episode +
 * handoff) to a tenant. Also returns the build banner the cockpit shows.
 */
export function addFeatureStack(
  tenants: TenantMap,
  input: FeatureStackInput
): { tenants: TenantMap; banner: LastBuildBanner } {
  const {
    targetTenantKey,
    ts,
    textToRun,
    detectedDomain,
    hasRateLimitPlaybook,
    aiGeneratedSpec,
    newL0Id,
    newL1Id,
    newL2Id,
    newL3Id,
    newL4Id,
    newL5Id
  } = input;

  const tenant = tenants[targetTenantKey];
  const existingL0Count = tenant.nodes.filter((n) => n.persona_level === 0).length;
  const baseX = Math.min(160 + existingL0Count * 220, 690);

  const getAiNode = (lvl: number) =>
    aiGeneratedSpec?.nodes?.find((n) => Number(n.persona_level) === lvl);

  const sanitizeDomain = (d: string, fallback: string) =>
    DOMAIN_LENSES.some((lens) => lens.id === d) ? d : fallback;

  const l0Ai = getAiNode(0);
  const l1Ai = getAiNode(1);
  const l2Ai = getAiNode(2);
  const l3Ai = getAiNode(3);
  const l4Ai = getAiNode(4);
  const l5Ai = getAiNode(5);

  const newNodes: ConceptNode[] = [
    {
      id: newL0Id,
      domain: sanitizeDomain(l0Ai?.domain, detectedDomain),
      persona_level: 0,
      title: l0Ai?.title || textToRun,
      summary: l0Ai?.summary || `User-facing L0 Vibe Feature generated from prompt: "${textToRun}".`,
      vibe_translation:
        l0Ai?.vibe_translation ||
        (hasRateLimitPlaybook
          ? `Auto-Protected by Nebius + Playbook Memory! Built "${textToRun}" with a 5-click/min shield automatically.`
          : `Careful! "${textToRun}" calls a paid external API without a rate limit yet. Click Apply Senior Fix below!`),
      code_or_math:
        l0Ai?.code_or_math ||
        `// L0 Vibe View for: ${textToRun}\n// Status: ${hasRateLimitPlaybook ? 'Protected by Procedural Memory (:Playbook)' : 'Awaiting Senior Guardrail'}`,
      status: hasRateLimitPlaybook ? 'FIXED' : 'WARNING',
      created_by_agent: aiGeneratedSpec ? 'Nebius-VibeArchitect' : 'VibeArchitectAgent',
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
      created_by_agent: aiGeneratedSpec ? 'Nebius-VibeArchitect' : 'VibeArchitectAgent',
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
      created_by_agent: aiGeneratedSpec ? 'Nebius-FullStackBuilder' : 'FullStackBuilderAgent',
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
      created_by_agent: aiGeneratedSpec ? 'Nebius-FullStackBuilder' : 'FullStackBuilderAgent',
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
      created_by_agent: aiGeneratedSpec ? 'Nebius-SeniorAuditor' : 'SeniorAuditorAgent',
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
      created_by_agent: aiGeneratedSpec ? 'Nebius-PrincipalAuditor' : 'SeniorAuditorAgent',
      x: Math.min(baseX + 55, 730),
      y: 390
    }
  ];

  const newEdges: ConceptEdge[] = [
    { from: newL0Id, to: newL1Id, type: 'DEEPER_AT' },
    { from: newL1Id, to: newL2Id, type: 'DEEPER_AT' },
    { from: newL2Id, to: newL3Id, type: 'DEEPER_AT' },
    { from: newL3Id, to: newL4Id, type: 'DEEPER_AT' },
    { from: newL4Id, to: newL5Id, type: 'DEEPER_AT' },
    ...(!hasRateLimitPlaybook ? [{ from: newL4Id, to: newL0Id, type: 'ENDANGERS' }] : [])
  ];

  const newEpisode = {
    id: `ep_${ts.toString().slice(-3)}`,
    session: aiGeneratedSpec ? 'Live Nebius Session' : 'Live Prompt Session',
    prompt: textToRun,
    summary:
      aiGeneratedSpec?.episodeSummary ||
      (hasRateLimitPlaybook
        ? `Agents queried FalkorDB Procedural Memory (:Playbook) first and automatically enforced Redis rate-limiting on "${textToRun}" across L0–L5!`
        : `Generated 6 linked nodes (L0–L5) for "${textToRun}". SeniorAuditor flagged missing rate limit and bubbled [:ENDANGERS] alert to L0.`),
    timestamp: 'Just now'
  };

  const banner: LastBuildBanner = {
    prompt: textToRun,
    protectedByPlaybook: hasRateLimitPlaybook,
    nodeCount: newNodes.length,
    usedGemini: Boolean(aiGeneratedSpec)
  };

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
    tenants: {
      ...tenants,
      [targetTenantKey]: {
        ...tenant,
        nodes: allUpdatedNodes,
        edges: [...tenant.edges, ...newEdges],
        episodes: [newEpisode, ...tenant.episodes],
        handoffs: [
          {
            id: `h_${ts}`,
            from: hasRateLimitPlaybook ? 'PlaybookMemory -> NebiusBuilder' : 'NebiusArchitect (L0-L1)',
            to: hasRateLimitPlaybook ? 'SeniorAuditor (Verified)' : 'SeniorAuditor (L4 Alert)',
            target: newL0Id,
            status: hasRateLimitPlaybook ? 'PLAYBOOK_ENFORCED' : 'ALERT_RAISED'
          },
          ...tenant.handoffs
        ]
      }
    },
    banner
  };
}

/**
 * Apply the senior fix through the real backend, then reload the projection.
 *
 * Persists the new :Workflow (playbook), :Turn (episode), the approval :Handoff
 * and the two flipped :ConceptNode rows; the returned map is a fresh FalkorDB
 * read, so the UI cannot claim persistence the graph did not receive.
 */
export async function applySeniorFixAndPersist(
  tenants: TenantMap,
  tenantKey: string,
  riskNode: ConceptNode,
  targetL0Node: ConceptNode | null
): Promise<TenantMap> {
  const optimistic = applySeniorFix(tenants, tenantKey, riskNode, targetL0Node);
  const tenant = optimistic[tenantKey];
  const playbook = tenant.playbooks[0];
  const episode = tenant.episodes[0];
  const fixHandoffId = `h_fix_${Date.now()}`;

  await writeTrack2Handoff(tenantKey, {
    id: fixHandoffId,
    reason: playbook.enforced_action,
    status: 'PLAYBOOK_ENFORCED',
    fromAgentId: 'agent:senior-auditor',
    toAgentId: 'agent:fullstack-builder',
    targetEntityId: targetL0Node?.id ?? riskNode.id
  });
  await writeTrack2Workflow(tenantKey, {
    id: playbook.id,
    name: playbook.rule_name,
    triggerDomain: playbook.trigger_domain,
    learnedFrom: fixHandoffId,
    steps: [
      {
        order: 0,
        action: playbook.enforced_action,
        expectedResult: 'Guardrail enforced on the target route'
      }
    ],
    toolIds: []
  });
  await writeTrack2Turn(tenantKey, {
    id: episode.id,
    role: 'agent',
    text: `${episode.prompt} — ${episode.summary}`,
    sessionId: `session:${episode.session}`,
    agentId: 'agent:senior-auditor'
  });
  await writeTrack2Graph(
    tenantKey,
    tenant.nodes.filter(
      (n) => n.id === riskNode.id || (targetL0Node !== null && n.id === targetL0Node.id)
    ),
    []
  );

  return loadTenants();
}

/**
 * Add a feature stack through the real backend, then reload the projection.
 *
 * Persists the six L0–L5 :ConceptNode rows + DEEPER_AT/ENDANGERS edges, the new
 * :Turn (episode) and the coordination :Handoff. The caller gets a fresh
 * FalkorDB read plus a banner marked `persisted: true`.
 */
export async function addFeatureStackAndPersist(
  tenants: TenantMap,
  input: FeatureStackInput
): Promise<{ tenants: TenantMap; banner: LastBuildBanner }> {
  const { tenants: optimistic, banner } = addFeatureStack(tenants, input);
  const tenant = optimistic[input.targetTenantKey];
  const newIds = new Set([
    input.newL0Id,
    input.newL1Id,
    input.newL2Id,
    input.newL3Id,
    input.newL4Id,
    input.newL5Id
  ]);
  const newNodes = tenant.nodes.filter((n) => newIds.has(n.id));
  const newEdges = tenant.edges.filter(
    (e) => newIds.has(e.from) && newIds.has(e.to)
  );
  const episode = tenant.episodes[0];
  const handoff = tenant.handoffs[0];

  await writeTrack2Graph(input.targetTenantKey, newNodes, newEdges);
  await writeTrack2Turn(input.targetTenantKey, {
    id: episode.id,
    role: 'agent',
    text: episode.summary,
    sessionId: `session:${episode.session}`,
    agentId: 'agent:vibe-architect'
  });
  await writeTrack2Handoff(input.targetTenantKey, {
    id: handoff.id,
    reason: episode.summary,
    status: handoff.status,
    fromAgentId: input.hasRateLimitPlaybook
      ? 'agent:fullstack-builder'
      : 'agent:vibe-architect',
    toAgentId: 'agent:senior-auditor',
    targetEntityId: input.newL0Id
  });

  return { tenants: await loadTenants(), banner: { ...banner, persisted: true } };
}
