// T1.3 exit criterion: `npm run health` exits 0 and prints a line containing
// the literal query `MATCH (n) RETURN count(n)` and a numeric node count.
import { FalkorDB } from 'falkordb';

const host = process.env.FALKORDB_HOST || 'localhost';
const port = Number(process.env.FALKORDB_PORT || 6379);

const db = await FalkorDB.connect({ socket: { host, port } });
try {
  const graph = db.selectGraph('graphhacks_health');
  const result = await graph.query('MATCH (n) RETURN count(n)');
  const count = result.data[0]['count(n)'];
  console.log(`FalkorDB OK — MATCH (n) RETURN count(n) => ${count}`);
} finally {
  await db.close();
}
