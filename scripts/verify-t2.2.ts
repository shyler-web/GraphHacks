/**
 * T2.2 exit criterion: `npm run verify:t2.2` exits 0 and prints exactly
 * `turns=2 order=user,agent`.
 *
 * Clears `tenant:t2-2-demo` first so re-runs are deterministic, writes one
 * user turn and one agent turn (agent timestamp = user + 1), recalls them in
 * ascending order, and independently asserts `MATCH (t:Turn) RETURN count(t)` = 2.
 */
import { FalkorDB } from 'falkordb';
import { createMemoryService } from '../server/memory/service.ts';

const tenant = 't2-2-demo';
const host = process.env.FALKORDB_HOST || 'localhost';
const port = Number(process.env.FALKORDB_PORT || 6379);

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

// Clear the tenant graph so the check is deterministic across re-runs.
const clearDb = await FalkorDB.connect({ socket: { host, port } });
try {
  const graph = clearDb.selectGraph(`tenant:${tenant}`);
  await graph.query('MATCH (n) DETACH DELETE n');
} finally {
  await clearDb.close();
}

const memory = createMemoryService({ host, port });
const base = Math.floor(Date.now() / 1000);
const sessionId = 'session-t2-2';

await memory.writeTurn(tenant, {
  id: 'turn-user-1',
  timestamp: base,
  role: 'user',
  text: 'hello from the user',
  sessionId,
  userId: 'user-1',
});

await memory.writeTurn(tenant, {
  id: 'turn-agent-1',
  timestamp: base + 1,
  role: 'agent',
  text: 'hello from the agent',
  sessionId,
  agentId: 'agent-1',
});

// Idempotency (contract §2): re-writing the SAME user turn id must not create a
// duplicate Turn node or duplicate edges.
await memory.writeTurn(tenant, {
  id: 'turn-user-1',
  timestamp: base,
  role: 'user',
  text: 'hello from the user',
  sessionId,
  userId: 'user-1',
});

const turns = await memory.recallTurns(tenant, { sessionId, order: 'asc' });
const roles = turns.map((t) => t.role).join(',');
if (turns.length !== 2 || roles !== 'user,agent') {
  fail(`expected turns=2 order=user,agent, got turns=${turns.length} order=${roles}`);
}

// Independent count assertion against the same tenant graph.
const countDb = await FalkorDB.connect({ socket: { host, port } });
try {
  const graph = countDb.selectGraph(`tenant:${tenant}`);
  const result = await graph.query('MATCH (t:Turn) RETURN count(t)');
  const count = result.data?.[0]?.['count(t)'];
  if (count !== 2) {
    fail(`expected MATCH (t:Turn) RETURN count(t) = 2, got ${count}`);
  }
} finally {
  await countDb.close();
}

console.log('turns=2 order=user,agent');
