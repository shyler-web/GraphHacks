"""HTTP routes that make Track 01 and Track 03 really work through the API.

These endpoints expose the two non-tenant projections described in D10:

* **Track 01** — ``code:<repoId>`` (``falkor_action.ActionEngine``): hotspots
  (PageRank), hop-bucketed blast radius, shortest dependency path, and the
  idempotent ``graphify-out/graph.json`` sync.
* **Track 03** — ``company:brain`` (``falkor_brain.FalkorBrain``): source-cited
  ``who_owns`` / ``trace_why`` / ``detect_drift``, and the local ingest sync.

Every handler resolves its named graph through ``app.db`` (never builds a key)
and converts the engine's dataclasses/Pydantic models into plain JSON dicts.

Failure contract (matches ``app.main``): any FalkorDB error becomes a
``503 FalkorDB unavailable (<ExcType>)`` so the cockpit shows its ErrorScreen and
never silently falls back (rule 3). ``hops``/``limit`` are validated and clamped
before they reach an engine (Track 01 inlines them into ``LIMIT``/``*..N``).
"""

from __future__ import annotations

import pathlib
import subprocess
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Query

from .falkor_action import ActionEngine, DecisionTrace
from .falkor_brain import FalkorBrain
from .graph_sync import DEFAULT_REPO_ID, load_graph
from .observability import span

router = APIRouter(prefix="/api", tags=["tracks"])

REPO_ID = DEFAULT_REPO_ID


def _repo_root() -> pathlib.Path:
    """Repo root via ``git rev-parse --show-toplevel``, with a safe fallback.

    ``backend/app/routes_tracks.py`` → parents[2] is the repo root, which is the
    same directory git reports for this checkout.
    """
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return pathlib.Path(proc.stdout.strip())
    except OSError:
        pass
    return pathlib.Path(__file__).resolve().parents[2]


def _clamp_int(value: object, lo: int, hi: int, default: int) -> int:
    """Coerce ``value`` to an int clamped into ``[lo, hi]`` (never interpolate raw)."""
    if value is None:
        return default
    try:
        parsed = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, parsed))


def _unavailable(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail=f"FalkorDB unavailable ({type(exc).__name__})",
    )


def _trace_dict(trace: DecisionTrace) -> dict[str, object]:
    """The JSON-safe decision trace the UI renders (Cypher + timing + evidence)."""
    return {
        "cypher": trace.cypher,
        "node_ids": trace.node_ids,
        "elapsed_ms": trace.elapsed_ms,
        "graph": trace.graph,
        "row_count": trace.row_count,
        "edges": [edge.model_dump() for edge in trace.edges],
    }


# ---------------------------------------------------------------------------
# Track 01 — Connected-Data Action Engine (code:<repoId>)
# ---------------------------------------------------------------------------


@router.get("/track1/hotspots")
def track1_hotspots(limit: int = Query(10, ge=1, le=100)) -> dict[str, object]:
    """Top CALLS-PageRank symbols. ``limit`` is clamped to the engine's 1..10."""
    engine = ActionEngine(REPO_ID)
    top = _clamp_int(limit, 1, 10, 10)
    try:
        with span("api.track1.hotspots"):
            result = engine.hotspots(REPO_ID, limit=top)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise _unavailable(exc) from exc
    return {"hotspots": result.data}


@router.get("/track1/blast-radius")
def track1_blast_radius(
    symbol: str = Query(..., min_length=1),
    hops: int = Query(3, ge=1, le=10),
) -> dict[str, object]:
    """Affected symbols (hop buckets) that transitively CALL ``symbol``."""
    engine = ActionEngine(REPO_ID)
    max_hops = _clamp_int(hops, 1, 10, 3)
    try:
        with span("api.track1.blast_radius"):
            result = engine.blast_radius(REPO_ID, symbol, max_hops=max_hops)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise _unavailable(exc) from exc
    trace = result.trace
    return {
        "symbol": symbol,
        "hops": [
            {"hop": bucket.hop, "ids": bucket.ids}
            for bucket in (trace.hop_buckets or [])
        ],
        "tests": [row["id"] for row in result.data if row.get("is_test")],
        "trace": _trace_dict(trace),
    }


@router.get("/track1/shortest-path")
def track1_shortest_path(
    from_: str = Query(..., alias="from", min_length=1),
    to: str = Query(..., min_length=1),
    max_len: int = Query(6, ge=1, le=10),
) -> dict[str, object]:
    """Shortest directed CALLS path from ``from`` to ``to``."""
    engine = ActionEngine(REPO_ID)
    length = _clamp_int(max_len, 1, 10, 6)
    try:
        with span("api.track1.shortest_path"):
            result = engine.shortest_dep_path(REPO_ID, from_, to, max_len=length)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise _unavailable(exc) from exc
    data = result.data
    return {
        "from": from_,
        "to": to,
        "node_ids": data["node_ids"],
        "edge_types": data["edge_types"],
        "trace": _trace_dict(result.trace),
    }


@router.post("/track1/sync")
def track1_sync() -> dict[str, object]:
    """Idempotently load ``graphify-out/graph.json`` into ``code:graphhacks``."""
    graph_path = _repo_root() / "graphify-out" / "graph.json"
    try:
        with span("api.track1.sync"):
            stats = load_graph(graph_path, REPO_ID)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise _unavailable(exc) from exc
    return stats.model_dump()


# ---------------------------------------------------------------------------
# Track 03 — Company Brain (company:brain)
# ---------------------------------------------------------------------------


@router.get("/track3/who-owns")
def track3_who_owns(
    target: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=100),
) -> dict[str, object]:
    """People who modified the file(s) carrying ``target`` (path or symbol)."""
    brain = FalkorBrain()
    top = _clamp_int(limit, 1, 100, 5)
    try:
        with span("api.track3.who_owns"):
            owners = brain.who_owns(REPO_ID, target, limit=top)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise _unavailable(exc) from exc
    return {"owners": [asdict(owner) for owner in owners]}


@router.get("/track3/trace")
def track3_trace(target: str = Query(..., min_length=1)) -> dict[str, object]:
    """Why ``target`` exists: its docs, commits, and people (100% cited)."""
    brain = FalkorBrain()
    try:
        with span("api.track3.trace"):
            trace = brain.trace_why(target)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise _unavailable(exc) from exc
    return asdict(trace)


@router.get("/track3/drift")
def track3_drift(since: int | None = Query(None, ge=0)) -> dict[str, object]:
    """Spec drift (undocumented changes) + doc drift (removed symbols)."""
    brain = FalkorBrain()
    try:
        with span("api.track3.drift"):
            report = brain.detect_drift(REPO_ID, since_epoch=since)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise _unavailable(exc) from exc
    return asdict(report)


@router.post("/track3/sync")
def track3_sync() -> dict[str, object]:
    """Ingest local commits + symbols + docs into ``company:brain`` (idempotent)."""
    root = _repo_root()
    graph_json = root / "graphify-out" / "graph.json"
    brain = FalkorBrain()
    try:
        with span("api.track3.sync"):
            brain.ensure_schema()
            commits = brain.ingest_commits(REPO_ID, root)
            symbols = brain.ingest_symbols(REPO_ID, graph_json)
            docs = brain.ingest_docs(REPO_ID, root)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise _unavailable(exc) from exc
    return {
        "repo_id": REPO_ID,
        "people": commits.people,
        "commits": commits.commits,
        "files": commits.files,
        "symbols": symbols.symbols,
        "docs": docs.docs,
        "edges": commits.edges + docs.edges,
    }
