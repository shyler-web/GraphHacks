import type { DomainLens } from '../shared/types';

// The 17 Domain Lenses (Engineering / Discovery / Foundations / Production).
// Pure config; `id` is the value stored on each ConceptNode's `domain`.
export const DOMAIN_LENSES: DomainLens[] = [
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
