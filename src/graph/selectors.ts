import type { ConceptNode, Tenant } from '../data';

// Read-only derivations over a tenant graph. Pure functions (no state).

/** Nodes shown under the Builder Maturity Dial and the Domain Lens filter. */
export function getVisibleNodes(
  tenant: Tenant,
  maturityLevel: number,
  selectedDomain: string
): ConceptNode[] {
  return tenant.nodes.filter((n) => {
    const levelMatch = n.persona_level <= maturityLevel;
    const domainMatch = selectedDomain === 'ALL' || n.domain === selectedDomain;
    return levelMatch && domainMatch;
  });
}

/**
 * L4 CRITICAL risks that endanger another node (Bubble-Up Alerting).
 * Returns a map of endangered node id -> the CRITICAL source node.
 */
export function getBubbleUpRisks(tenant: Tenant): Record<string, ConceptNode> {
  const risks: Record<string, ConceptNode> = {};
  tenant.edges.forEach((edge) => {
    if (edge.type === 'ENDANGERS') {
      const sourceRisk = tenant.nodes.find((n) => n.id === edge.from && n.status === 'CRITICAL');
      if (sourceRisk) {
        risks[edge.to] = sourceRisk;
      }
    }
  });
  return risks;
}

/** The currently selected node, falling back to the first shown then first node. */
export function getSelectedNode(
  tenant: Tenant,
  selectedNodeId: string,
  visibleNodes: ConceptNode[]
): ConceptNode {
  return (
    tenant.nodes.find((n) => n.id === selectedNodeId) ||
    visibleNodes[0] ||
    tenant.nodes[0]
  );
}
