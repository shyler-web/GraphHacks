import type { ConceptNode } from '../data';

export type DeclutterMode = 'hierarchy' | 'domain' | 'repel';

/**
 * Re-layout the given nodes in place.
 *
 * Mutates `nodes` (the array passed in) and its node objects in place, matching
 * the previous in-file implementation so shared references keep the same behavior.
 */
export function declutterNodes(nodes: ConceptNode[], mode: DeclutterMode = 'hierarchy'): void {
  if (mode === 'hierarchy') {
    // Group nodes by persona_level (L0..L5) and spread evenly horizontally with zero overlap
    for (let lvl = 0; lvl <= 5; lvl++) {
      const levelNodes = nodes.filter((n) => n.persona_level === lvl);
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
    const uniqueDomains = [...new Set(nodes.map((n) => n.domain))];
    nodes.forEach((node) => {
      const colIdx = uniqueDomains.indexOf(node.domain);
      const sameCell = nodes.filter(
        (other) => other.domain === node.domain && other.persona_level === node.persona_level
      );
      const subIdx = sameCell.findIndex((o) => o.id === node.id);
      node.x = 140 + colIdx * 230 + subIdx * 35;
      node.y = 65 + node.persona_level * 74;
    });
  } else if (mode === 'repel') {
    // Force-directed repulsion pass so overlapping nodes push apart cleanly
    for (let iter = 0; iter < 30; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
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
}
