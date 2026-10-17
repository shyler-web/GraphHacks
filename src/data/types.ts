// Domain types for the cockpit's graph data.
//
// These describe the shape returned by the data seam (`src/data`). The seam is
// backed by the Python backend / FalkorDB projection (T4.2 / D11); only the
// seam implementation changes when the backing store changes.

export interface ConceptNode {
  id: string;
  domain: string;
  persona_level: number;
  title: string;
  summary: string;
  vibe_translation: string;
  code_or_math: string;
  status: string;
  created_by_agent: string;
  x: number;
  y: number;
}

export interface ConceptEdge {
  from: string;
  to: string;
  type: string;
}

export interface Episode {
  id: string;
  session: string;
  prompt: string;
  summary: string;
  timestamp: string;
}

export interface Playbook {
  id: string;
  rule_name: string;
  trigger_domain: string;
  enforced_action: string;
  learned_from: string;
}

export interface Handoff {
  id: string;
  from: string;
  to: string;
  target: string;
  status: string;
}

export interface Tenant {
  name: string;
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  episodes: Episode[];
  playbooks: Playbook[];
  handoffs: Handoff[];
}

/** Tenant key -> tenant graph. One named graph per tenant (decision D5/D6). */
export type TenantMap = Record<string, Tenant>;
