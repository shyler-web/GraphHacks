"""A5 (T3.3) exit criterion — concurrency proof.

Run from `backend/`: `uv run python scripts/verify_t3_3.py`

Phase 1: 16 threads release a ``threading.Barrier`` and each writes a *distinct*
turn id — all 16 must land (no lost writes).
Phase 2: 16 threads write the *same* turn id — ``MERGE`` must dedupe to exactly
one node (total becomes 17).

Safe because ``db.tenant_graph`` opens a fresh client per call (no shared
connection state) and FalkorDB serializes writers atomically per graph. A
transient ``ResponseError`` is retried up to 3x — safe because writes are
``MERGE``-based. Prints exactly ``writers=16 distinct=16 same=1`` and exits 0.
"""

from __future__ import annotations

import concurrent.futures
import pathlib
import sys
import threading
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from redis.exceptions import ResponseError  # noqa: E402

from app import db  # noqa: E402
from app.config import FalkorDBConfig  # noqa: E402
from app.memory_service import TENANT_INDEX_SPECS, MemoryService  # noqa: E402
from app.models import WriteTurnInput  # noqa: E402

TENANT = "t3-3-demo"
WRITERS = 16


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def turn_count(graph) -> int:
    return int(graph.query("MATCH (t:Turn) RETURN count(t)").result_set[0][0])


def write_with_retry(memory: MemoryService, data: WriteTurnInput) -> None:
    last: ResponseError | None = None
    for attempt in range(3):
        try:
            memory.write_turn(TENANT, data)
            return
        except ResponseError as exc:  # transient; MERGE makes a retry safe
            last = exc
            time.sleep(0.05 * (attempt + 1))
    assert last is not None
    raise last


def run_batch(memory: MemoryService, ids: list[str], barrier: threading.Barrier) -> None:
    def worker(turn_id: str) -> None:
        barrier.wait(timeout=60)
        write_with_retry(
            memory,
            WriteTurnInput(
                id=turn_id,
                role="user",
                text=f"concurrent {turn_id}",
                user_id="user-conc",
            ),
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(ids)) as pool:
        # Surface any worker exception (e.g. exhausted retries) to the caller.
        for future in concurrent.futures.as_completed(
            [pool.submit(worker, turn_id) for turn_id in ids]
        ):
            future.result()


def main() -> int:
    cfg = FalkorDBConfig.from_env()

    with db.tenant_graph(TENANT, cfg) as graph:
        graph.query("MATCH (n) DETACH DELETE n")
    db.ensure_indexes(db.tenant_graph_key(TENANT), TENANT_INDEX_SPECS, cfg)

    memory = MemoryService(cfg)
    started = time.perf_counter()

    # Phase 1 — 16 distinct ids, released together. No write may be lost.
    run_batch(memory, [f"turn-conc-{i}" for i in range(WRITERS)], threading.Barrier(WRITERS))
    with db.tenant_graph(TENANT, cfg) as graph:
        distinct = turn_count(graph)
    if distinct != WRITERS:
        fail(f"phase 1 wrote {distinct} turns, expected {WRITERS} (lost writes)")

    # Phase 2 — 16 writers, the SAME id: MERGE must dedupe to one extra node.
    run_batch(memory, ["turn-conc-same"] * WRITERS, threading.Barrier(WRITERS))
    with db.tenant_graph(TENANT, cfg) as graph:
        total = turn_count(graph)
        same = int(
            graph.query(
                "MATCH (t:Turn {id: 'turn-conc-same'}) RETURN count(t)"
            ).result_set[0][0]
        )
    if total != WRITERS + 1:
        fail(f"phase 2 total turns={total}, expected {WRITERS + 1}")
    if same != 1:
        fail(f"phase 2 same-id node count={same}, expected 1 (race!)")

    elapsed_ms = (time.perf_counter() - started) * 1000
    print(f"t3.3 timing: writers={WRITERS} wall={elapsed_ms:.0f}ms", file=sys.stderr)
    print("writers=16 distinct=16 same=1")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
