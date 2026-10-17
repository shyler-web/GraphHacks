"""Standalone health check — ``uv run python backend/health.py``.

Exit criterion (T1.3, now in Python): exit 0 and print a line containing the
literal query ``MATCH (n) RETURN count(n)`` and a numeric node count. Mirrors
``scripts/health.mjs`` (which is left in place until this replaces it).
"""

from __future__ import annotations

import sys

from app.config import FalkorDBConfig
from app.db import HEALTH_GRAPH, count_nodes


def main() -> int:
    cfg = FalkorDBConfig.from_env()
    try:
        count = count_nodes(HEALTH_GRAPH, cfg)
    except Exception as exc:
        print(
            "FalkorDB FAIL — could not run MATCH (n) RETURN count(n) against "
            f"{cfg.host}:{cfg.port}: {type(exc).__name__}",
            file=sys.stderr,
        )
        return 1
    print(f"FalkorDB OK — MATCH (n) RETURN count(n) => {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
