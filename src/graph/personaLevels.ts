import type { PersonaLevel } from '../shared/types';

// The 6 Builder Maturity Levels (L0 Vibe Coder → L5 Principal). Pure config.
export const PERSONA_LEVELS: PersonaLevel[] = [
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
