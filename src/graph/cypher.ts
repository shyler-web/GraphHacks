// Dynamic Cypher query preview reflecting current UI state.
// String-only helper; it is not executed — it mirrors the live graph filters.
export function buildLiveCypherQuery(
  activeTenantKey: string,
  maturityLevel: number,
  selectedDomain: string
): string {
  return `// FalkorDB Multigraph Tenant: ${activeTenantKey}
MATCH (n:ConceptNode)
WHERE n.persona_level <= ${maturityLevel}${selectedDomain !== 'ALL' ? ` AND n.domain = '${selectedDomain}'` : ''}
OPTIONAL MATCH (n)-[:DEEPER_AT|DEPENDS_ON*1..3]->(child:ConceptNode)
WHERE child.persona_level <= ${maturityLevel}
OPTIONAL MATCH (risk:ConceptNode {persona_level: 4, status: 'CRITICAL'})-[:ENDANGERS]->(n)
RETURN n, collect(DISTINCT child) AS connections, collect(DISTINCT risk) AS senior_alerts`;
}
