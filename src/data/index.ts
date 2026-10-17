// The cockpit data seam.
//
// Every read/write of tenant graph data goes through this module. Today it is
// backed by the hard-coded `INITIAL_TENANTS` seed; at T4.2 (rule 3) only this
// module changes to fetch from the Python backend over HTTP. The app must not
// import `./tenants` directly.
import { INITIAL_TENANTS } from './tenants';
import type { Tenant, TenantMap } from './types';

export type {
  ConceptNode,
  ConceptEdge,
  Episode,
  Playbook,
  Handoff,
  Tenant,
  TenantMap
} from './types';

/**
 * Seed the tenant map.
 *
 * Returns the shared seed object, matching the previous `useState(INITIAL_TENANTS)`
 * behavior exactly. When this becomes a remote fetch it will return fresh data.
 */
export function getInitialTenants(): TenantMap {
  return INITIAL_TENANTS;
}

/** Read a single tenant graph by key. */
export function getTenant(tenants: TenantMap, tenantKey: string): Tenant {
  return tenants[tenantKey];
}

/** First node id of a tenant — used to reset selection on tenant switch. */
export function getFirstNodeId(tenants: TenantMap, tenantKey: string): string {
  return tenants[tenantKey].nodes[0].id;
}

/** The default tenant shown on first load. */
export const DEFAULT_TENANT_KEY = 'graphsync_user1_ai_avatar_saas';
