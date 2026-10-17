// T1.4 exit criterion: writes ONE (:Smoke {id, text}) node via MERGE and reads
// it back by id, printing the same text and the node id; re-runs do not duplicate.
import { FalkorDB } from 'falkordb';

const host = process.env.FALKORDB_HOST || 'localhost';
const port = Number(process.env.FALKORDB_PORT || 6379);

const id = 'smoke-1';
const text = 'hello falkordb';

const db = await FalkorDB.connect({ socket: { host, port } });
try {
  const graph = db.selectGraph('graphhacks_health');

  await graph.query(
    'MERGE (s:Smoke {id: $id}) SET s.text = $text',
    { params: { id, text } }
  );

  const result = await graph.query(
    'MATCH (s:Smoke {id: $id}) RETURN s.id AS id, s.text AS text',
    { params: { id } }
  );

  const row = result.data[0];
  console.log(`wrote text="${text}" id="${id}"`);
  console.log(`read back text="${row.text}" id="${row.id}"`);

  const count = await graph.query(
    'MATCH (s:Smoke {id: $id}) RETURN count(s)',
    { params: { id } }
  );
  console.log(`Smoke nodes with id="${id}": ${count.data[0]['count(s)']}`);
} finally {
  await db.close();
}
