// Remote data adapter — the HTTP half of the cockpit data seam (F3 / T4.2).
//
// The cockpit no longer ships `INITIAL_TENANTS`: `loadTenants()` fetches the
// real graphs from the FastAPI backend (`/api`, dev-proxied to :8000 per F1).
// A FalkorDB failure surfaces as a rejected promise → `ErrorScreen`. There is
// deliberately **no fallback to seed data** — the graph is load-bearing (rule 3).
import type {
  ConceptEdge,
  ConceptNode,
  Episode,
  Handoff,
  Playbook,
  Tenant,
  TenantMap
} from './types';

/** An HTTP/transport failure talking to the backend. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface NodesPayload {
  tenant: string;
  nodes: ConceptNode[];
  episodes: Episode[];
  playbooks: Playbook[];
  handoffs: Handoff[];
}

interface EdgesPayload {
  tenant: string;
  edges: ConceptEdge[];
}

interface TenantsPayload {
  tenants: { key: string; name: string }[];
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (err) {
    // Network-level failure (backend down, proxy refused, ...).
    throw new ApiError(`Cannot reach the backend: ${(err as Error).message}`, 0);
  }
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body — keep the status line */
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}

/** Fetch one tenant's full graph (nodes + edges + all three tiers). */
export async function fetchTenant(key: string, name: string): Promise<Tenant> {
  const encoded = encodeURIComponent(key);
  const [nodesPayload, edgesPayload] = await Promise.all([
    getJson<NodesPayload>(`/api/graph/nodes?tenant=${encoded}`),
    getJson<EdgesPayload>(`/api/graph/edges?tenant=${encoded}`)
  ]);

  return {
    name,
    nodes: nodesPayload.nodes ?? [],
    edges: edgesPayload.edges ?? [],
    episodes: nodesPayload.episodes ?? [],
    playbooks: nodesPayload.playbooks ?? [],
    handoffs: nodesPayload.handoffs ?? []
  };
}

/** Fetch the tenant registry, then every tenant graph. */
export async function fetchTenants(): Promise<TenantMap> {
  const payload = await getJson<TenantsPayload>('/api/tenants');
  const summaries = payload.tenants ?? [];
  const entries = await Promise.all(
    summaries.map(async (t) => [t.key, await fetchTenant(t.key, t.name)] as const)
  );
  return Object.fromEntries(entries) as TenantMap;
}

/** The cockpit's entry point for real data. */
export async function loadTenants(): Promise<TenantMap> {
  return fetchTenants();
}

// ---------------------------------------------------------------------------
// Track 01 + Track 03 (D10) — real action/brain projections over separate
// named graphs. Same no-fallback rule as the tenant reads (rule 3).
// ---------------------------------------------------------------------------

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  } catch (err) {
    throw new ApiError(`Cannot reach the backend: ${(err as Error).message}`, 0);
  }
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body — keep the status line */
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}

// -- Repos (any-repo loading) ------------------------------------------------
//
// The cockpit can point Track 01/03 at any GitHub repo by pasting a URL. The
// backend clones + graphifies it into a `code:<slug>` projection and ingests
// it into `company:brain` (filtered by repo), then registers it; `repo` on the
// Track 01/03 fetchers defaults to the bundled `graphhacks` demo repo so the
// existing panels keep working before a load.

/** The bundled demo repo the Track 01/03 engines read by default (D10). */
export const DEFAULT_REPO_ID = 'graphhacks';

export interface RepoSummary {
  id: string;
  name: string;
  url: string;
  loaded_at: number;
}

export interface RepoLoadResult {
  repo_id: string;
  name: string;
  url: string;
  files: number;
  symbols: number;
  nodes_total: number;
  commits: number;
  owners: number;
}

/** List repos already loaded into the backend (from `GET /api/repos`). */
export async function fetchRepos(): Promise<RepoSummary[]> {
  const payload = await getJson<{ repos: RepoSummary[] }>('/api/repos');
  return payload.repos ?? [];
}

/** Clone + graphify a GitHub URL into a new repo (`POST /api/repos/load`). */
export async function loadRepo(url: string): Promise<RepoLoadResult> {
  return postJson<RepoLoadResult>('/api/repos/load', { url });
}

// -- Grounded guidance + research (Nebius / Tavily) --------------------------
//
// The L0→L5 guidance is now grounded in the active repo's graph facts
// (`/api/guidance`) and the prior-art step cites real web sources
// (`/api/research`, Tavily). Both go through the backend so no key ever ships
// to the browser.

export interface GuidanceFacts {
  hotspots?: unknown[];
  blast_radius?: unknown;
  owners?: unknown[];
  drift?: unknown;
}

export interface GuidanceTrace {
  cypher?: string[];
  elapsed_ms?: number;
}

export interface GuidanceResponse {
  repo: string;
  level: number;
  answer: string;
  facts: GuidanceFacts;
  trace: GuidanceTrace;
}

export interface GuidanceRequest {
  repo: string;
  level: number;
  symbol?: string;
}

/** Graph-grounded maturity guidance (Nebius over `/api/guidance`). */
export async function fetchGuidance(body: GuidanceRequest): Promise<GuidanceResponse> {
  return postJson<GuidanceResponse>('/api/guidance', body);
}

export interface ResearchSource {
  uri: string;
  title: string;
  content: string;
}

export interface ResearchResponse {
  query: string;
  sources: ResearchSource[];
}

/** Web-grounded prior-art search (Tavily over `/api/research`). */
export async function fetchResearch(query: string): Promise<ResearchResponse> {
  return postJson<ResearchResponse>('/api/research', { query });
}

// -- Track 01 ---------------------------------------------------------------

export interface Track01Hotspot {
  id: string;
  label: string;
  file: string;
  score: number;
}

export interface Track01HopBucket {
  hop: number;
  ids: string[];
}

export interface TraceEdge {
  source: string;
  target: string;
  type: string;
}

/** The explainable-answer trace every Track 01 action carries. */
export interface DecisionTraceView {
  cypher: string;
  params: Record<string, unknown>;
  node_ids: string[];
  elapsed_ms: number;
  graph: string;
  row_count: number;
  edges: TraceEdge[];
  hop_buckets: Track01HopBucket[];
}

export interface Track01BlastRadius {
  symbol: string;
  hops: Track01HopBucket[];
  tests: string[];
  trace: DecisionTraceView;
}

export interface Track01ShortestPath {
  from: string;
  to: string;
  node_ids: string[];
  edge_types: string[];
  trace: DecisionTraceView;
}

export interface Track01SyncStats {
  files: number;
  symbols: number;
  tests: number;
  edges: Record<string, number>;
  nodes_total: number;
  elapsed_ms: number;
}

/** Top CALLS-PageRank symbols in `code:<repo>`. */
export async function fetchTrack01Hotspots(
  limit = 10,
  repo: string = DEFAULT_REPO_ID
): Promise<Track01Hotspot[]> {
  const payload = await getJson<{ hotspots: Track01Hotspot[] }>(
    `/api/track1/hotspots?repo=${encodeURIComponent(repo)}&limit=${limit}`
  );
  return payload.hotspots ?? [];
}

/** Hop-bucketed blast radius of a symbol + its Cypher/ms trace. */
export async function fetchTrack01BlastRadius(
  symbol: string,
  hops = 3,
  repo: string = DEFAULT_REPO_ID
): Promise<Track01BlastRadius> {
  return getJson<Track01BlastRadius>(
    `/api/track1/blast-radius?repo=${encodeURIComponent(repo)}` +
      `&symbol=${encodeURIComponent(symbol)}&hops=${hops}`
  );
}

/** Shortest directed CALLS path + its Cypher/ms trace. */
export async function fetchTrack01ShortestPath(
  from: string,
  to: string,
  maxLen = 6,
  repo: string = DEFAULT_REPO_ID
): Promise<Track01ShortestPath> {
  return getJson<Track01ShortestPath>(
    `/api/track1/shortest-path?repo=${encodeURIComponent(repo)}` +
      `&from=${encodeURIComponent(from)}` +
      `&to=${encodeURIComponent(to)}&max_len=${maxLen}`
  );
}

/** Idempotently re-sync `graphify-out/graph.json` into `code:graphhacks`. */
export async function syncTrack01(): Promise<Track01SyncStats> {
  return postJson<Track01SyncStats>('/api/track1/sync');
}

// -- Track 03 ---------------------------------------------------------------

export interface Track03Owner {
  person_id: string;
  name: string;
  commits: number;
  insertions: number;
  deletions: number;
  last_touched: number;
  file_ids: string[];
}

export interface Track03TraceSource {
  doc_id: string | null;
  doc_path: string | null;
  doc_title: string | null;
  commit_id: string | null;
  subject: string | null;
  at: number | null;
  person_id: string | null;
  person_name: string | null;
}

export interface Track03Trace {
  target_id: string;
  kind: string;
  doc_paths: string[];
  sources: Track03TraceSource[];
}

export interface Track03DriftItem {
  kind: string;
  id: string;
  path_or_name: string;
  last_touched?: number | null;
  doc_paths: string[];
}

export interface Track03Drift {
  repo_id: string;
  since: number;
  spec_drift: Track03DriftItem[];
  doc_drift: Track03DriftItem[];
}

export interface Track03SyncStats {
  repo_id: string;
  people: number;
  commits: number;
  files: number;
  symbols: number;
  docs: number;
  edges: number;
}

/** People who modified the file(s) carrying a path or symbol. */
export async function fetchTrack03WhoOwns(
  target: string,
  limit = 5,
  repo: string = DEFAULT_REPO_ID
): Promise<Track03Owner[]> {
  const payload = await getJson<{ owners: Track03Owner[] }>(
    `/api/track3/who-owns?repo=${encodeURIComponent(repo)}` +
      `&target=${encodeURIComponent(target)}&limit=${limit}`
  );
  return payload.owners ?? [];
}

/** Why a symbol/file/doc exists, with docs + commits + people. */
export async function fetchTrack03Trace(target: string): Promise<Track03Trace> {
  return getJson<Track03Trace>(`/api/track3/trace?target=${encodeURIComponent(target)}`);
}

/** Spec drift (undocumented changes) + doc drift (removed symbols). */
export async function fetchTrack03Drift(
  repo: string = DEFAULT_REPO_ID
): Promise<Track03Drift> {
  return getJson<Track03Drift>(`/api/track3/drift?repo=${encodeURIComponent(repo)}`);
}

/** Idempotently re-ingest commits + symbols + docs into `company:brain`. */
export async function syncTrack03(): Promise<Track03SyncStats> {
  return postJson<Track03SyncStats>('/api/track3/sync');
}

// -- Track 02 write path ----------------------------------------------------
//
// The cockpit controls write real :Turn/:Workflow/:Handoff/:ConceptNode rows via
// `MemoryService`; `App` reloads the projection afterwards so nothing is a
// React-only illusion.

export interface Track2TurnInput {
  id?: string;
  timestamp?: number;
  role: 'user' | 'agent' | 'tool';
  text: string;
  responseQuality?: number;
  sessionId?: string;
  userId?: string;
  agentId?: string;
  topic?: string;
  mentions?: string[];
}

export interface Track2WorkflowInput {
  id?: string;
  name: string;
  triggerDomain: string;
  learnedFrom?: string;
  steps: { order: number; action: string; expectedResult?: string; id?: string }[];
  toolIds?: string[];
}

export interface Track2HandoffInput {
  id?: string;
  createdAt?: number;
  reason: string;
  status?: string;
  fromAgentId: string;
  toAgentId: string;
  targetEntityId?: string;
}

export async function writeTrack2Turn(
  tenant: string,
  turn: Track2TurnInput
): Promise<void> {
  await postJson('/api/track2/turn', { tenant, turn });
}

export async function writeTrack2Workflow(
  tenant: string,
  workflow: Track2WorkflowInput
): Promise<void> {
  await postJson('/api/track2/workflow', { tenant, workflow });
}

export async function writeTrack2Handoff(
  tenant: string,
  handoff: Track2HandoffInput
): Promise<void> {
  await postJson('/api/track2/handoff', { tenant, handoff });
}

/** Persist cockpit ConceptNodes + typed edges (projection write, D11). */
export async function writeTrack2Graph(
  tenant: string,
  nodes: ConceptNode[],
  edges: ConceptEdge[]
): Promise<void> {
  await postJson('/api/track2/graph', { tenant, nodes, edges });
}
