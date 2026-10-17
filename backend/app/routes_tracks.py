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

import os
import pathlib
import subprocess
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from . import db
from .errors import missing_artifact, service_error
from .falkor_action import ActionEngine, DecisionTrace
from .falkor_brain import FalkorBrain
from .graph_sync import DEFAULT_REPO_ID, load_graph
from .memory_service import MemoryService
from .models import (
    RecordHandoffInput,
    SaveWorkflowInput,
    WriteTurnInput,
)
from .observability import span

router = APIRouter(prefix="/api", tags=["tracks"])

REPO_ID = DEFAULT_REPO_ID

# Cockpit relationship types the projection-write route may create. The type is
# inlined into Cypher (FalkorDB cannot parameterise it), so it must be an
# allow-list — never a client-supplied string.
_CONCEPT_EDGE_TYPES = {"DEEPER_AT", "ENDANGERS", "LEARN_CONCEPT", "GOVERNS"}


def _repo_root() -> pathlib.Path:
    """Repo root from ``REPO_ROOT`` first, then git, then the source location.

    The compose image mounts the repo at ``/repo`` (Dockerfile + compose), so the
    environment override is what makes Track 01/03 sync work in-container where
    there is no worktree behind ``git rev-parse``.
    """
    env_root = os.environ.get("REPO_ROOT")
    if env_root:
        return pathlib.Path(env_root)
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


def _graph_json_path() -> pathlib.Path:
    """The Track 01/03 AST artifact; ``GRAPH_JSON_PATH`` wins for containers."""
    env_path = os.environ.get("GRAPH_JSON_PATH")
    if env_path:
        return pathlib.Path(env_path)
    return _repo_root() / "graphify-out" / "graph.json"


def _clamp_int(value: object, lo: int, hi: int, default: int) -> int:
    """Coerce ``value`` to an int clamped into ``[lo, hi]`` (never interpolate raw)."""
    if value is None:
        return default
    try:
        parsed = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, parsed))


def _trace_dict(trace: DecisionTrace) -> dict[str, object]:
    """The JSON-safe decision trace the UI renders (Cypher + params + timing)."""
    return {
        "cypher": trace.cypher,
        "params": trace.params,
        "node_ids": trace.node_ids,
        "elapsed_ms": trace.elapsed_ms,
        "graph": trace.graph,
        "row_count": trace.row_count,
        "edges": [edge.model_dump() for edge in trace.edges],
        "hop_buckets": [
            bucket.model_dump() for bucket in (trace.hop_buckets or [])
        ],
    }


# ---------------------------------------------------------------------------
# Track 01 — Connected-Data Action Engine (code:<repoId>)
# ---------------------------------------------------------------------------


@router.get("/track1/hotspots")
def track1_hotspots(
    limit: int = Query(10, ge=1, le=100),
    repo: str = Query(REPO_ID, min_length=1),
) -> dict[str, object]:
    """Top CALLS-PageRank symbols. ``limit`` is clamped to the engine's 1..10."""
    engine = ActionEngine(repo)
    top = _clamp_int(limit, 1, 10, 10)
    try:
        with span("api.track1.hotspots"):
            result = engine.hotspots(repo, limit=top)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc
    return {"hotspots": result.data}


@router.get("/track1/blast-radius")
def track1_blast_radius(
    symbol: str = Query(..., min_length=1),
    hops: int = Query(3, ge=1, le=10),
    repo: str = Query(REPO_ID, min_length=1),
) -> dict[str, object]:
    """Affected symbols (hop buckets) that transitively CALL ``symbol``."""
    engine = ActionEngine(repo)
    max_hops = _clamp_int(hops, 1, 10, 3)
    try:
        with span("api.track1.blast_radius"):
            result = engine.blast_radius(repo, symbol, max_hops=max_hops)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc
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
    repo: str = Query(REPO_ID, min_length=1),
) -> dict[str, object]:
    """Shortest directed CALLS path from ``from`` to ``to``."""
    engine = ActionEngine(repo)
    length = _clamp_int(max_len, 1, 10, 6)
    try:
        with span("api.track1.shortest_path"):
            result = engine.shortest_dep_path(repo, from_, to, max_len=length)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc
    data = result.data
    return {
        "from": from_,
        "to": to,
        "node_ids": data["node_ids"],
        "edge_types": data["edge_types"],
        "trace": _trace_dict(result.trace),
    }


@router.get("/track1/graph")
def track1_graph(
    repo: str = Query(REPO_ID, min_length=1),
    limit: int = Query(40, ge=5, le=120),
) -> dict[str, object]:
    """A bounded 2D view of the repo's own code graph (top-PageRank symbols +
    the CALLS/IMPORTS/CONTAINS/INHERITS edges among them) for the cockpit canvas."""
    engine = ActionEngine(repo)
    top = _clamp_int(limit, 5, 120, 40)
    try:
        with span("api.track1.graph"):
            return engine.graph_view(repo, limit=top)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc


@router.post("/track1/sync")
def track1_sync() -> dict[str, object]:
    """Replace ``code:graphhacks`` from ``graphify-out/graph.json`` (mark-and-sweep).

    ``reset=True`` deletes the previous projection first, so code removed from
    the AST graph cannot linger in FalkorDB.
    """
    graph_path = _graph_json_path()
    if not graph_path.is_file():
        raise missing_artifact(
            f"AST graph missing: {graph_path} (run `graphify update .`)"
        )
    try:
        with span("api.track1.sync"):
            stats = load_graph(graph_path, REPO_ID, reset=True)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc
    return stats.model_dump()


# ---------------------------------------------------------------------------
# Track 03 — Company Brain (company:brain)
# ---------------------------------------------------------------------------


@router.get("/track3/who-owns")
def track3_who_owns(
    target: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=100),
    repo: str = Query(REPO_ID, min_length=1),
) -> dict[str, object]:
    """People who modified the file(s) carrying ``target`` (path or symbol)."""
    brain = FalkorBrain()
    top = _clamp_int(limit, 1, 100, 5)
    try:
        with span("api.track3.who_owns"):
            owners = brain.who_owns(repo, target, limit=top)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc
    return {"owners": [asdict(owner) for owner in owners]}


@router.get("/track3/trace")
def track3_trace(target: str = Query(..., min_length=1)) -> dict[str, object]:
    """Why ``target`` exists: its docs, commits, and people (100% cited)."""
    brain = FalkorBrain()
    try:
        with span("api.track3.trace"):
            trace = brain.trace_why(target)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc
    return asdict(trace)


@router.get("/track3/drift")
def track3_drift(
    since: int | None = Query(None, ge=0),
    repo: str = Query(REPO_ID, min_length=1),
) -> dict[str, object]:
    """Spec drift (undocumented changes) + doc drift (removed symbols)."""
    brain = FalkorBrain()
    try:
        with span("api.track3.drift"):
            report = brain.detect_drift(repo, since_epoch=since)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc
    return asdict(report)


@router.post("/track3/sync")
def track3_sync() -> dict[str, object]:
    """Ingest local commits + symbols + docs into ``company:brain`` (idempotent)."""
    root = _repo_root()
    graph_json = _graph_json_path()
    if not graph_json.is_file():
        raise missing_artifact(
            f"AST graph missing: {graph_json} (run `graphify update .`)"
        )
    if not (root / ".git").exists():
        raise missing_artifact(
            f"git history missing under {root} (mount .git or run outside Docker)"
        )
    brain = FalkorBrain()
    try:
        with span("api.track3.sync"):
            brain.ensure_schema()
            commits = brain.ingest_commits(REPO_ID, root)
            symbols = brain.ingest_symbols(REPO_ID, graph_json)
            docs = brain.ingest_docs(REPO_ID, root)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc
    return {
        "repo_id": REPO_ID,
        "people": commits.people,
        "commits": commits.commits,
        "files": commits.files,
        "symbols": symbols.symbols,
        "docs": docs.docs,
        "edges": commits.edges + docs.edges,
    }


# ---------------------------------------------------------------------------
# Track 02 — cockpit write path (:Turn / :Workflow / :Handoff, @tenant graph)
#
# The cockpit's senior-fix and feature-stack controls used to mutate React state
# only. These routes are the write half of the data seam: every call goes through
# `MemoryService`, then the cockpit reloads the projection from FalkorDB.
# ---------------------------------------------------------------------------


class Track2TurnRequest(BaseModel):
    tenant: str = Field(..., min_length=1)
    turn: WriteTurnInput


class Track2WorkflowRequest(BaseModel):
    tenant: str = Field(..., min_length=1)
    workflow: SaveWorkflowInput


class Track2HandoffRequest(BaseModel):
    tenant: str = Field(..., min_length=1)
    handoff: RecordHandoffInput


class ConceptNodeInput(BaseModel):
    """A cockpit projection node (D11) — snake_case matches `src/data/types.ts`."""

    id: str = Field(..., min_length=1)
    domain: str = ""
    persona_level: int = 0
    title: str = ""
    summary: str = ""
    vibe_translation: str = ""
    code_or_math: str = ""
    status: str = "OK"
    created_by_agent: str = ""
    x: float = 0
    y: float = 0


class ConceptEdgeInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: str = Field(..., alias="from", min_length=1)
    to: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)


class Track2GraphRequest(BaseModel):
    tenant: str = Field(..., min_length=1)
    nodes: list[ConceptNodeInput] = Field(default_factory=list)
    edges: list[ConceptEdgeInput] = Field(default_factory=list)


_CONCEPT_NODE_UPSERT = """
MERGE (n:ConceptNode {id: $id})
SET n.domain = $domain, n.persona_level = $persona_level, n.title = $title,
    n.summary = $summary, n.vibe_translation = $vibe_translation,
    n.code_or_math = $code_or_math, n.status = $status,
    n.created_by_agent = $created_by_agent, n.x = $x, n.y = $y
"""


@router.post("/track2/turn")
def track2_turn(body: Track2TurnRequest) -> dict[str, object]:
    """Persist one episodic Turn (the cockpit Episode write)."""
    memory = MemoryService()
    try:
        with span("api.track2.turn"):
            turn = memory.write_turn(body.tenant, body.turn)
    except Exception as exc:
        raise service_error(exc) from exc
    return turn.to_contract_dict()


@router.post("/track2/workflow")
def track2_workflow(body: Track2WorkflowRequest) -> dict[str, object]:
    """Persist a Playbook as a real ``:Workflow`` + ordered ``:Step`` chain."""
    memory = MemoryService()
    try:
        with span("api.track2.workflow"):
            workflow = memory.save_workflow(body.tenant, body.workflow)
    except Exception as exc:
        raise service_error(exc) from exc
    return workflow.to_contract_dict()


@router.post("/track2/handoff")
def track2_handoff(body: Track2HandoffRequest) -> dict[str, object]:
    """Persist a coordination Handoff node + ``HANDED_TO`` edge."""
    memory = MemoryService()
    try:
        with span("api.track2.handoff"):
            handoff = memory.record_handoff(body.tenant, body.handoff)
    except Exception as exc:
        raise service_error(exc) from exc
    return handoff.to_contract_dict()


@router.post("/track2/graph")
def track2_graph(body: Track2GraphRequest) -> dict[str, object]:
    """Upsert cockpit ``:ConceptNode`` projection rows + typed edges.

    This is the projection write that keeps newly built L0–L5 stacks and the
    senior-fix status flips visible after the reload. Relationship types are an
    allow-list because FalkorDB cannot parameterise them.
    """
    for edge in body.edges:
        if edge.type not in _CONCEPT_EDGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"unsupported concept edge type: {edge.type}",
            )
    try:
        with span("api.track2.graph"):
            with db.tenant_graph(body.tenant) as graph:
                for node in body.nodes:
                    graph.query(_CONCEPT_NODE_UPSERT, params=node.model_dump())
                for edge in body.edges:
                    graph.query(
                        f"MATCH (a:ConceptNode {{id: $from}}), "
                        f"(b:ConceptNode {{id: $to}}) "
                        f"MERGE (a)-[:{edge.type}]->(b)",
                        params={"from": edge.from_, "to": edge.to},
                    )
    except Exception as exc:
        raise service_error(exc) from exc
    return {
        "tenant": body.tenant,
        "nodes": len(body.nodes),
        "edges": len(body.edges),
    }
