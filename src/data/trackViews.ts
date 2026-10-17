// Read-only projections of the real tenant graph for the Track 01/03 tabs (F4).
//
// These run NO new backend algorithms: they reshape the same nodes/edges/
// episodes/playbooks/handoffs the cockpit already loaded from FalkorDB, under a
// "borrowed schema" (Track 01 columns named like an action engine, Track 03
// columns named like the company brain). The graph still does the work; these
// are only its presentation.
import type { ConceptNode, Tenant } from './types';

export interface Track01Tool {
  id: string;
  label: string;
  domain: string;
  level: number;
  file: string;
  status: string;
}

export interface Track01TraceStep {
  from: string;
  to: string;
  type: string;
}

export interface Track03Entity {
  id: string;
  name: string;
  kind: 'agent' | 'concept';
  level: number | null;
  detail: string;
}

export interface Track03Source {
  id: string;
  label: string;
  kind: 'Episode' | 'Playbook' | 'Handoff';
}

export interface Track03Answer {
  question: string;
  answer: string;
  sources: Track03Source[];
  path: string[];
}

/** Best-effort file path mentioned in a node's code/math field. */
function fileFromCode(node: ConceptNode): string {
  const match = (node.code_or_math || '').match(
    /([\w./-]+\.(?:tsx|ts|py|js|mjs|json|md))/
  );
  return match ? match[1] : node.domain;
}

/** Track 01 "action targets": the L2+ nodes an engine could act on. */
export function deriveTrack01Tools(tenant: Tenant): Track01Tool[] {
  return tenant.nodes
    .filter((n) => n.persona_level >= 2)
    .map((n) => ({
      id: n.id,
      label: n.title,
      domain: n.domain,
      level: n.persona_level,
      file: fileFromCode(n),
      status: n.status
    }));
}

/** Track 01 "decision trace": the typed edges of the real graph. */
export function deriveTrack01Trace(tenant: Tenant): Track01TraceStep[] {
  return tenant.edges.map((e) => ({ from: e.from, to: e.to, type: e.type }));
}

/** Track 01 "blast radius": nodes reachable from a root via outgoing edges. */
export function deriveTrack01BlastRadius(tenant: Tenant, rootId: string): ConceptNode[] {
  const downstream = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    tenant.edges.forEach((e) => {
      if (e.from === current && !downstream.has(e.to)) {
        downstream.add(e.to);
        queue.push(e.to);
      }
    });
  }
  return tenant.nodes.filter((n) => downstream.has(n.id));
}

/** Track 03 "entities": the agent squad seen in the ledger + the concept nodes. */
export function deriveTrack03Entities(tenant: Tenant): Track03Entity[] {
  const agents = new Map<string, Track03Entity>();
  tenant.handoffs.forEach((h) => {
    if (h.from) {
      agents.set(h.from, {
        id: h.from,
        name: h.from,
        kind: 'agent',
        level: null,
        detail: `hands off to ${h.to}`
      });
    }
    if (h.to) {
      agents.set(h.to, {
        id: h.to,
        name: h.to,
        kind: 'agent',
        level: null,
        detail: `receives from ${h.from}`
      });
    }
  });
  const concepts: Track03Entity[] = tenant.nodes.map((n) => ({
    id: n.id,
    name: n.title,
    kind: 'concept',
    level: n.persona_level,
    detail: `${n.domain} • ${n.created_by_agent}`
  }));
  return [...agents.values(), ...concepts];
}

/** Track 03 "cited answer": a question over the graph with its source rows. */
export function deriveTrack03Answer(tenant: Tenant): Track03Answer {
  const top = tenant.nodes[0];
  const sources: Track03Source[] = [
    ...tenant.episodes.map((e) => ({
      id: e.id,
      label: `${e.session}: ${e.prompt}`,
      kind: 'Episode' as const
    })),
    ...tenant.playbooks.map((p) => ({
      id: p.id,
      label: p.rule_name,
      kind: 'Playbook' as const
    })),
    ...tenant.handoffs.map((h) => ({
      id: h.id,
      label: `${h.from} → ${h.to}`,
      kind: 'Handoff' as const
    }))
  ];
  return {
    question: `Who owns “${top?.title ?? tenant.name}”?`,
    answer: `Produced by ${top?.created_by_agent ?? 'an agent'} and tracked in the ${tenant.name} graph.`,
    sources,
    path: [
      top?.id ?? '',
      ...tenant.edges.filter((e) => e.from === top?.id).map((e) => e.to)
    ].filter(Boolean)
  };
}
