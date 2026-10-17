"""Graph-grounded maturity guidance (W2) — ``POST /api/guidance``.

Explains a repository at a chosen maturity level (L0..L5) using **real facts
pulled from FalkorDB** — hotspots (PageRank), blast radius, who-owns, and drift —
not generic LLM knowledge. The LLM is provably unable to produce the good answer
without the graph: every claim it makes must cite the concrete fact values in
the prompt, and the endpoint returns the facts alongside the answer so the
grounding is verifiable.

Provider seam: the single LLM adapter ``app.llm`` (Nebius, OpenAI-compatible).
A missing ``NEBIUS_API_KEY`` (or any upstream LLM failure) **degrades, never
fails**: the endpoint returns HTTP 200 with ``answer=null`` plus the facts, so
the endpoint is keyless-safe. Only a FalkorDB failure is a 503 (rule 3) — the
graph is the hard dependency.

This router is wired into ``app.main`` by the integrator; it never imports or
reads ``.env`` (AGENTS.md security rule).
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict

from fastapi import APIRouter
from pydantic import BaseModel

from . import llm
from .errors import service_error
from .falkor_action import ActionEngine
from .falkor_brain import FalkorBrain
from .graph_sync import DEFAULT_REPO_ID
from .observability import span

router = APIRouter(prefix="/api", tags=["guidance"])

#: The maturity persona per level (design §API contracts, L0..L5). The system
#: prompt states this persona and hard-grounds the model in the provided facts.
_PERSONAS: dict[int, str] = {
    0: "Vibe Coder — plain English, zero jargon: what does this repo do, and where is the interesting action?",
    1: "Product Manager — frame guidance in terms of features, effort, cost, and business impact, not code internals.",
    2: "Junior developer — practical, step-by-step guidance on how the modules wire together and where to start reading.",
    3: "Full-stack engineer — concrete, code-level guidance: name the files and functions and how they interact.",
    4: "Senior engineer focused on security and blast radius — point at the most load-bearing (most-called) code, what breaks when it changes, and the risk.",
    5: "Principal engineer focused on complexity and math — quantify coupling, hotspots, drift, and structural complexity; speak to systemic risk.",
}

#: Max affected rows kept in the ``blast_radius`` fact (prompt stays small).
_BLAST_FACT_LIMIT = 10
#: Max files kept per owner row (prompt stays small).
_OWNER_FILES_LIMIT = 5

#: Fixed list of the graph queries the answer is grounded in (the trace report).
_FACT_QUERIES = ["hotspots", "blast_radius", "who_owns", "drift"]


class GuidanceRequest(BaseModel):
    """``POST /api/guidance`` body (design §API contracts)."""

    repo: str = DEFAULT_REPO_ID
    level: int | None = None  # clamped to 0..5 in the handler (default 2)
    symbol: str | None = None


def _clamp_level(level: int | None) -> int:
    """Coerce/clamp ``level`` into ``[0, 5]`` (default 2)."""
    if level is None:
        return 2
    try:
        parsed = int(level)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        parsed = 2
    return max(0, min(5, parsed))


def _owner_dict(owner) -> dict:
    """``Owner`` dataclass -> plain dict, trimmed for the prompt."""
    data = asdict(owner)
    data["file_ids"] = list(data.get("file_ids") or [])[:_OWNER_FILES_LIMIT]
    return data


def _gather_facts(repo: str, symbol: str | None) -> tuple[dict, float]:
    """Pull the four grounding facts from FalkorDB.

    Returns ``(facts, elapsed_ms)`` where ``elapsed_ms`` is the accumulated query
    time (``DecisionTrace.elapsed_ms`` for the ActionEngine calls, wall-clock for
    the FalkorBrain calls which do not expose per-query timing). Raises the
    underlying exception on any FalkorDB failure — the handler translates it.
    """
    elapsed_ms = 0.0
    engine = ActionEngine(repo)
    brain = FalkorBrain()

    # 1. Hotspots — top CALLS-PageRank symbols (load-bearing code).
    with span("guidance.hotspots"):
        hotspots_result = engine.hotspots(repo, limit=5)
    elapsed_ms += hotspots_result.trace.elapsed_ms
    hotspots = list(hotspots_result.data)

    # 2. Blast radius — what transitively CALLS the requested (or demo) symbol.
    blast_symbol = symbol or engine.demo_changed_symbol(repo)
    blast_rows: list[dict] = []
    with span("guidance.blast_radius"):
        if blast_symbol:
            blast_result = engine.blast_radius(repo, blast_symbol, 3)
            elapsed_ms += blast_result.trace.elapsed_ms
            blast_rows = list(blast_result.data)
    blast_radius = {
        "symbol": blast_symbol or None,
        "max_hops": 3,
        "affected_count": len(blast_rows),
        "affected": blast_rows[:_BLAST_FACT_LIMIT],
    }

    # 3. Owners — who touched the symbol, else the top hotspot's file, else the
    #    canonical decisions doc (last resort).
    if symbol:
        owner_target = symbol
    elif hotspots:
        owner_target = hotspots[0].get("file") or "docs/decisions.md"
    else:
        owner_target = "docs/decisions.md"
    with span("guidance.who_owns"):
        started = time.perf_counter()
        owners = brain.who_owns(repo, owner_target, limit=3)
        elapsed_ms += (time.perf_counter() - started) * 1000.0
    owners_list = [_owner_dict(owner) for owner in owners]

    # 4. Drift — undocumented changes (spec drift) + stale doc mentions.
    with span("guidance.drift"):
        started = time.perf_counter()
        report = brain.detect_drift(repo)
        elapsed_ms += (time.perf_counter() - started) * 1000.0
    drift = {
        "spec_drift": len(report.spec_drift),
        "doc_drift": len(report.doc_drift),
    }

    facts = {
        "hotspots": hotspots,
        "blast_radius": blast_radius,
        "owners": owners_list,
        "drift": drift,
    }
    return facts, round(elapsed_ms, 3)


def _system_prompt(level: int) -> str:
    """Persona + hard grounding rules for the chosen maturity level."""
    persona = _PERSONAS[level]
    return (
        "You are a code mentor producing maturity-guidance for ONE specific "
        "repository.\n"
        f"Your persona for level L{level}: {persona}\n"
        "\n"
        "Hard rules:\n"
        "- Answer ONLY about the repository described by the provided facts. "
        "Never invent files, functions, people, or metrics that are not in the "
        "facts.\n"
        "- Ground every claim in the facts: cite the concrete values (symbol ids, "
        "file paths, scores, counts, owner names).\n"
        "- If a fact is empty or missing, say so plainly and advise what data "
        "would be needed — never fabricate.\n"
        "- Be concise and direct. Plain prose, no JSON, no markdown tables."
    )


def _user_prompt(repo: str, level: int, symbol: str | None, facts: dict) -> str:
    """The repository + the JSON-serialized graph facts the model must cite."""
    return (
        f"Repository: {repo}\n"
        f"Maturity level: L{level}\n"
        f"Requested symbol: {symbol or '(none)'}\n"
        "\n"
        "Graph facts (from FalkorDB — ground your answer ONLY in these):\n"
        f"{json.dumps(facts, indent=2)}\n"
        "\n"
        "Write maturity-level guidance for THIS repository, grounded in the facts "
        "above. Cite the concrete values from the facts in your answer."
    )


@router.post("/guidance")
def guidance(body: GuidanceRequest) -> dict[str, object]:
    """Graph-grounded L0..L5 guidance for a repository.

    FalkorDB failure -> 503 (rule 3). LLM failure (missing key / upstream) ->
    degrade to ``answer=null`` + facts, HTTP 200 (keyless-safe).
    """
    repo = (body.repo or "").strip() or DEFAULT_REPO_ID
    level = _clamp_level(body.level)
    symbol = (body.symbol or "").strip() or None

    try:
        facts, elapsed_ms = _gather_facts(repo, symbol)
    except Exception as exc:  # pragma: no cover - exercised by stopping FalkorDB
        raise service_error(exc) from exc

    try:
        answer = llm.chat_completion(_system_prompt(level), _user_prompt(repo, level, symbol, facts))
    except llm.LLMUnavailable:
        answer = None

    response: dict[str, object] = {
        "repo": repo,
        "level": level,
        "answer": answer,
        "facts": facts,
        "trace": {
            "elapsed_ms": elapsed_ms,
            "cypher": list(_FACT_QUERIES),
        },
    }
    if answer is None:
        response["note"] = (
            "LLM unavailable (NEBIUS_API_KEY not set); graph facts shown below"
        )
    return response
