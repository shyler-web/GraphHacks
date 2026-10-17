// UI-only types shared across the cockpit modules.

/** The three track views the cockpit can render (F4). */
export type TrackId = 'track02' | 'track01' | 'track03';

export interface PersonaLevel {
  level: number;
  short: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  badge: string;
}

export interface DomainLens {
  id: string;
  label: string;
  pillar: string;
  color: string;
}

export interface CoachOutput {
  analogy: string;
  cognitiveDebtImpact: string;
  safeRepromptOrCommand: string;
  levelUpChallenge: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface GroundingOutput {
  text: string;
  sources: GroundingSource[];
}

export interface LastBuildBanner {
  prompt: string;
  protectedByPlaybook: boolean;
  nodeCount: number;
  usedGemini: boolean;
  /** True only when the stack was written to FalkorDB (not a local preview). */
  persisted?: boolean;
}
