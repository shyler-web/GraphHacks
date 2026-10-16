/**
 * Memory Service — episodic tier (T2.2).
 *
 * Implements `writeTurn` and `recallTurns` from the contract at
 * `docs/contracts/memory-service.md` against a real FalkorDB instance.
 * Every other `MemoryService` method is a stub for T2.3/T2.4.
 *
 * Tenant isolation (D5): one named graph per tenant, key `tenant:<tenantId>`.
 * All Cypher is parameterised (`$param`); user values are never concatenated.
 */
import { randomUUID } from 'node:crypto';
import { FalkorDB } from 'falkordb';
import type { Graph } from 'falkordb';
import type {
  Entity,
  Fact,
  Handoff,
  MemoryService,
  QueryEntitiesQuery,
  ReadHandoffsQuery,
  RecallFactsQuery,
  RecallTurnsQuery,
  RecordHandoffInput,
  SaveWorkflowInput,
  TenantId,
  Turn,
  TurnRole,
  UpsertEntityInput,
  UpsertFactInput,
  Workflow,
  WorkflowReplay,
  WriteTurnInput,
} from '../../docs/contracts/memory-service.types.ts';

export interface MemoryServiceOptions {
  host?: string;
  port?: number;
}

/** Cypher parameter values used by this tier. */
type Params = Record<string, string | number | boolean>;

/** Raw row shape returned by `recallTurns`. */
interface TurnRow {
  id: string;
  timestamp: number;
  role: TurnRole;
  text: string;
  responseQuality?: number | null;
  userId?: string | null;
  agentId?: string | null;
  sessionId?: string | null;
  topic?: string | null;
  mentions?: Array<string | null> | null;
}

const NOT_IMPLEMENTED = 'not implemented yet (T2.3/T2.4)';

function notImplemented(): never {
  throw new Error(NOT_IMPLEMENTED);
}

/**
 * Build a `MemoryService` bound to a FalkorDB instance. Each call opens a
 * short-lived client, selects the tenant graph, runs, and closes (mirrors
 * `scripts/health.mjs`).
 */
export function createMemoryService(options: MemoryServiceOptions = {}): MemoryService {
  const host = options.host ?? process.env.FALKORDB_HOST ?? 'localhost';
  const port = options.port ?? Number(process.env.FALKORDB_PORT ?? 6379);

  async function withGraph<T>(tenant: TenantId, fn: (graph: Graph) => Promise<T>): Promise<T> {
    const db = await FalkorDB.connect({ socket: { host, port } });
    try {
      const graph = db.selectGraph(`tenant:${tenant}`);
      return await fn(graph);
    } finally {
      await db.close();
    }
  }

  return {
    // -----------------------------------------------------------------------
    // Episodic (T2.2)
    // -----------------------------------------------------------------------
    async writeTurn(tenant: TenantId, input: WriteTurnInput): Promise<Turn> {
      const id = input.id ?? randomUUID();
      const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
      const role = input.role;
      const mentions = input.mentions ?? [];

      const clauses: string[] = [];
      const params: Params = { id, timestamp, role, text: input.text };

      // Actor: user turns participate, agent turns produce (ambiguity A5).
      if (role === 'user' && input.userId) {
        clauses.push('MERGE (actor:User {id: $userId})');
        params.userId = input.userId;
      } else if (role === 'agent' && input.agentId) {
        clauses.push('MERGE (actor:Agent {id: $agentId})');
        params.agentId = input.agentId;
      }

      if (input.sessionId) {
        clauses.push('MERGE (session:Session {id: $sessionId})');
        params.sessionId = input.sessionId;
      }
      if (input.topic) {
        clauses.push('MERGE (topic:Topic {name: $topic})');
        params.topic = input.topic;
      }
      mentions.forEach((entityId, i) => {
        clauses.push(`MERGE (entity${i}:Entity {id: $entity${i}})`);
        params[`entity${i}`] = entityId;
      });

      // Idempotent write (contract §2): MERGE the Turn by id, only setting its
      // properties on first creation so a re-write of the same id is a no-op.
      clauses.push(
        'MERGE (t:Turn {id: $id}) ON CREATE SET t.timestamp = $timestamp, t.role = $role, t.text = $text'
      );
      if (input.responseQuality !== undefined) {
        clauses.push('SET t.response_quality = $responseQuality');
        params.responseQuality = input.responseQuality;
      }

      if (role === 'user' && input.userId) clauses.push('MERGE (actor)-[:PARTICIPATED]->(t)');
      else if (role === 'agent' && input.agentId) clauses.push('MERGE (actor)-[:PRODUCED]->(t)');
      if (input.sessionId) clauses.push('MERGE (t)-[:IN_SESSION]->(session)');
      if (input.topic) clauses.push('MERGE (t)-[:ABOUT]->(topic)');
      mentions.forEach((_, i) => clauses.push(`MERGE (t)-[:MENTIONS]->(entity${i})`));

      await withGraph(tenant, (graph) => graph.query(clauses.join('\n'), { params }));

      const turn: Turn = { id, timestamp, role, text: input.text };
      if (input.responseQuality !== undefined) turn.responseQuality = input.responseQuality;
      if (input.sessionId) turn.sessionId = input.sessionId;
      if (input.userId) turn.userId = input.userId;
      if (input.agentId) turn.agentId = input.agentId;
      if (input.topic) turn.topic = input.topic;
      if (mentions.length > 0) turn.mentions = mentions;
      return turn;
    },

    async recallTurns(tenant: TenantId, query?: RecallTurnsQuery): Promise<Turn[]> {
      const direction = (query?.order ?? 'desc') === 'asc' ? 'ASC' : 'DESC';
      const clauses: string[] = ['MATCH (t:Turn)'];
      const params: Params = {};

      if (query?.sessionId) {
        clauses.push('MATCH (t)-[:IN_SESSION]->(:Session {id: $sessionId})');
        params.sessionId = query.sessionId;
      }
      if (query?.topic) {
        clauses.push('MATCH (t)-[:ABOUT]->(:Topic {name: $topic})');
        params.topic = query.topic;
      }
      if (query?.userId) {
        clauses.push('MATCH (:User {id: $userId})-[:PARTICIPATED]->(t)');
        params.userId = query.userId;
      }

      // Linkage fields are optional on `Turn`; OPTIONAL MATCH keeps turns that
      // lack any one of them. `mentions` is collected so multiple edges do not
      // multiply rows.
      clauses.push(
        'OPTIONAL MATCH (u:User)-[:PARTICIPATED]->(t)',
        'OPTIONAL MATCH (a:Agent)-[:PRODUCED]->(t)',
        'OPTIONAL MATCH (t)-[:IN_SESSION]->(s:Session)',
        'OPTIONAL MATCH (t)-[:ABOUT]->(tp:Topic)',
        'OPTIONAL MATCH (t)-[:MENTIONS]->(e:Entity)',
        'RETURN t.id AS id, t.timestamp AS timestamp, t.role AS role, t.text AS text, t.response_quality AS responseQuality, u.id AS userId, a.id AS agentId, s.id AS sessionId, tp.name AS topic, collect(e.id) AS mentions',
        `ORDER BY t.timestamp ${direction}, t.id ${direction}`
      );
      if (query?.limit !== undefined) {
        clauses.push('LIMIT $limit');
        params.limit = query.limit;
      }

      const rows = await withGraph(tenant, async (graph) => {
        const result = await graph.query<TurnRow>(clauses.join('\n'), { params });
        return result.data ?? [];
      });

      return rows.map((row) => {
        const turn: Turn = {
          id: row.id,
          timestamp: row.timestamp,
          role: row.role,
          text: row.text,
        };
        if (row.responseQuality !== undefined && row.responseQuality !== null) {
          turn.responseQuality = row.responseQuality;
        }
        if (row.userId !== undefined && row.userId !== null) turn.userId = row.userId;
        if (row.agentId !== undefined && row.agentId !== null) turn.agentId = row.agentId;
        if (row.sessionId !== undefined && row.sessionId !== null) turn.sessionId = row.sessionId;
        if (row.topic !== undefined && row.topic !== null) turn.topic = row.topic;
        const mentions = (row.mentions ?? []).filter((m): m is string => m !== null);
        if (mentions.length > 0) turn.mentions = mentions;
        return turn;
      });
    },

    // -----------------------------------------------------------------------
    // Semantic (T2.3) — stubs
    // -----------------------------------------------------------------------
    async upsertEntity(_tenant: TenantId, _input: UpsertEntityInput): Promise<Entity> {
      return notImplemented();
    },
    async upsertFact(_tenant: TenantId, _input: UpsertFactInput): Promise<Fact> {
      return notImplemented();
    },
    async recallFacts(_tenant: TenantId, _query: RecallFactsQuery): Promise<Fact[]> {
      return notImplemented();
    },
    async queryEntities(_tenant: TenantId, _query: QueryEntitiesQuery): Promise<Entity[]> {
      return notImplemented();
    },

    // -----------------------------------------------------------------------
    // Procedural (T2.4) — stubs
    // -----------------------------------------------------------------------
    async saveWorkflow(_tenant: TenantId, _input: SaveWorkflowInput): Promise<Workflow> {
      return notImplemented();
    },
    async getWorkflow(_tenant: TenantId, _workflowId: string): Promise<Workflow | null> {
      return notImplemented();
    },
    async replayWorkflow(_tenant: TenantId, _workflowId: string): Promise<WorkflowReplay> {
      return notImplemented();
    },

    // -----------------------------------------------------------------------
    // Coordination (T3.1) — stubs
    // -----------------------------------------------------------------------
    async recordHandoff(_tenant: TenantId, _input: RecordHandoffInput): Promise<Handoff> {
      return notImplemented();
    },
    async readHandoffs(_tenant: TenantId, _query?: ReadHandoffsQuery): Promise<Handoff[]> {
      return notImplemented();
    },
  };
}
