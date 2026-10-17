"""A4 (T3.2) exit criterion — per-tenant isolation proof.

Run from `backend/`: `uv run python scripts/verify_t3_2.py`

Writes three turns to tenant A only. Tenant B must see zero of them — because
the two tenants resolve to *distinct graph keys* (D5: isolation is structural,
not a query filter). Prints exactly ``tenant_a=3 tenant_b=0`` and exits 0.
"""

from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import db  # noqa: E402
from app.config import FalkorDBConfig  # noqa: E402
from app.memory_service import MemoryService  # noqa: E402
from app.models import WriteTurnInput  # noqa: E402

TENANT_A = "t3-2-a"
TENANT_B = "t3-2-b"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def turn_count(graph) -> int:
    return int(graph.query("MATCH (t:Turn) RETURN count(t)").result_set[0][0])


def main() -> int:
    cfg = FalkorDBConfig.from_env()

    for tenant in (TENANT_A, TENANT_B):
        with db.tenant_graph(tenant, cfg) as graph:
            graph.query("MATCH (n) DETACH DELETE n")

    if db.tenant_graph_key(TENANT_A) == db.tenant_graph_key(TENANT_B):
        fail("tenant graph keys collide — isolation is not structural")

    memory = MemoryService(cfg)
    for i in range(3):
        memory.write_turn(
            TENANT_A,
            WriteTurnInput(
                id=f"turn-a-{i}",
                role="user",
                text=f"tenant A message {i}",
                user_id="user-a",
            ),
        )

    with db.tenant_graph(TENANT_A, cfg) as graph:
        count_a = turn_count(graph)
    with db.tenant_graph(TENANT_B, cfg) as graph:
        count_b = turn_count(graph)

    if count_a != 3:
        fail(f"tenant A Turn count={count_a}, expected 3")
    if count_b != 0:
        fail(f"tenant B Turn count={count_b}, expected 0 (leak!)")

    recalled_a = memory.recall_turns(TENANT_A)
    recalled_b = memory.recall_turns(TENANT_B)
    if len(recalled_a) != 3:
        fail(f"recall_turns(A) returned {len(recalled_a)}, expected 3")
    if recalled_b != []:
        fail(f"recall_turns(B) returned {len(recalled_b)} rows, expected []")

    print("tenant_a=3 tenant_b=0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
