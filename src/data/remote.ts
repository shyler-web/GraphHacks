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
