"""T2.2 exit criterion (Python parity with ``dump/node-backend/scripts/verify-t2.2.ts``).

Writes two turns for tenant ``t2-2-demo`` — one ``role: "user"`` and one
``role: "agent"`` — re-writes the user turn to prove idempotency, then recalls in
ascending order. Exits 0 and prints exactly ``turns=2 order=user,agent``;
independently asserts ``MATCH (t:Turn) RETURN count(t)`` = 2.
"""

from __future__ import annotations

import pathlib
import sys
import time

# Make ``backend/`` importable when run as a script (``python backend/scripts/...``).
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import db  # noqa: E402
from app.config import FalkorDBConfig  # noqa: E402
from app.memory_service import MemoryService  # noqa: E402
from app.models import RecallTurnsQuery, WriteTurnInput  # noqa: E402

TENANT = "t2-2-demo"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> int:
    cfg = FalkorDBConfig.from_env()

    # Clear the tenant graph so the check is deterministic across re-runs.
    with db.tenant_graph(TENANT, cfg) as graph:
        graph.query("MATCH (n) DETACH DELETE n")

    memory = MemoryService(cfg)
    base = int(time.time())
    session_id = "session-t2-2"

    memory.write_turn(
        TENANT,
        WriteTurnInput(
            id="turn-user-1",
            timestamp=base,
            role="user",
            text="hello from the user",
            session_id=session_id,
            user_id="user-1",
        ),
    )
    memory.write_turn(
        TENANT,
        WriteTurnInput(
            id="turn-agent-1",
            timestamp=base + 1,
            role="agent",
            text="hello from the agent",
            session_id=session_id,
            agent_id="agent-1",
        ),
    )

    # Idempotency (contract §2): re-writing the SAME user turn id must not create
    # a duplicate Turn node or duplicate edges.
    memory.write_turn(
        TENANT,
        WriteTurnInput(
            id="turn-user-1",
            timestamp=base,
            role="user",
            text="hello from the user",
            session_id=session_id,
            user_id="user-1",
        ),
    )

    turns = memory.recall_turns(
        TENANT, RecallTurnsQuery(session_id=session_id, order="asc")
    )
    roles = ",".join(t.role for t in turns)
    if len(turns) != 2 or roles != "user,agent":
        fail(f"expected turns=2 order=user,agent, got turns={len(turns)} order={roles}")

    # Independent count assertion against the same tenant graph.
    with db.tenant_graph(TENANT, cfg) as graph:
        result = graph.query("MATCH (t:Turn) RETURN count(t)")
        count = int(result.result_set[0][0])
    if count != 2:
        fail(f"expected MATCH (t:Turn) RETURN count(t) = 2, got {count}")

    print("turns=2 order=user,agent")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
