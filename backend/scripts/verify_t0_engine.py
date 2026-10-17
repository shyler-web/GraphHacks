"""A0 (H0) exit criterion — named-graph router + idempotent index provisioner.

Run from `backend/`: `uv run python scripts/verify_t0_engine.py`
Prints `h0 ok — named_graph + ensure_indexes idempotent` and exits 0.
"""

from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import db  # noqa: E402


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> int:
    # Router reachable + graph keys distinct.
    if db.tenant_graph_key("a") != "tenant:a":
        fail("tenant_graph_key")
    if db.repo_graph_key("r") != "code:r":
        fail("repo_graph_key")
    if db.BRAIN_GRAPH != "company:brain":
        fail("BRAIN_GRAPH")

    with db.named_graph("verify:h0") as graph:
        graph.query("MATCH (n) DETACH DELETE n")
        graph.query("CREATE (:Node {id: 'x'})")
        count = int(graph.query("MATCH (n) RETURN count(n)").result_set[0][0])
    if count != 1:
        fail(f"named_graph count={count}")

    created_first = db.ensure_indexes("verify:h0", [("Node", "id")])
    created_second = db.ensure_indexes("verify:h0", [("Node", "id")])
    if created_first != 1:
        fail(f"first ensure_indexes created={created_first} (expected 1)")
    if created_second != 0:
        fail(f"second ensure_indexes created={created_second} (expected 0, already indexed)")

    print("h0 ok — named_graph + ensure_indexes idempotent")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
