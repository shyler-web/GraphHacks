import type { ConceptNode, Tenant } from '../data';
import type { PersonaLevel } from '../shared/types';
import { DOMAIN_LENSES } from '../graph/domainLenses';

// Pure builders for the Gemini request payloads. No state, no fetch.

/** Agent 4 (Learning Coach): explain one node calibrated to the maturity level. */
export function buildCoachPayload(
  maturityLevel: number,
  persona: PersonaLevel,
  playbooksText: string,
  node: ConceptNode
) {
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

  return {
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
  };
}

/** L4-L5 grounded research brief using Google Search grounding. */
export function buildResearchPayload(node: ConceptNode) {
  const systemPrompt = `Act as a Principal Staff Engineer & Graph Researcher (L4-L5). Provide a concise 3-bullet technical brief on best practices, real-world benchmarks, or CVE/security pitfalls for the given architecture node.`;
  const userQuery = `Research best engineering practices, production benchmarks, or prior art for: ${node.title} (${node.domain}) — ${node.summary}`;

  return {
    contents: [{ parts: [{ text: userQuery }] }],
    tools: [{ google_search: {} }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };
}

/** The 4-Agent squad prompt: synthesize an L0→L5 slice, memory-aware. */
export function buildFeaturePayload(
  tenantSnapshot: Tenant,
  textToRun: string,
  hasRateLimitPlaybook: boolean
) {
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

  return {
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
}
