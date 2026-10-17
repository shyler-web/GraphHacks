// The cockpit data seam.
//
// Every read/write of tenant graph data goes through this module. As of T4.2
// (rule 3) it fetches from the Python backend over HTTP. There is deliberately
// **no fallback**: if FalkorDB is down the fetch rejects and the app shows the
// ErrorScreen. The canonical seed lives only in
// `backend/scripts/seed_cockpit.py`; the old TypeScript duplicate is gone.
import { loadTenants } from './remote';
import type { Tenant, TenantMap } from './types';

export { loadTenants, fetchTenant, fetchTenants, ApiError } from './remote';

export type {
  ConceptNode,
  ConceptEdge,
  Episode,
  Playbook,
  Handoff,
  Tenant,
  TenantMap
} from './types';

/** Read a single tenant graph by key. */
export function getTenant(tenants: TenantMap, tenantKey: string): Tenant {
  return tenants[tenantKey];
}

/** First node id of a tenant — used to reset selection on tenant switch. */
export function getFirstNodeId(tenants: TenantMap, tenantKey: string): string {
  return tenants[tenantKey]?.nodes[0]?.id ?? '';
}

/** The default tenant shown on first load (falling back to the first returned). */
export const DEFAULT_TENANT_KEY = 'graphsync_user1_ai_avatar_saas';
