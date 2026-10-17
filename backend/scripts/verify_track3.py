"""Track 03 (Company Brain) exit criterion — plan Phase C, tasks C1–C8.

Run from `backend/`:

    uv run python scripts/verify_track3.py            # end-to-end (3.8)
    uv run python scripts/verify_track3.py --step 3.1 # single check

End-to-end prints exactly one line:

    track3 OK — repo=graphhacks people=1 commits=<N> files=<M> symbols=<K> \
docs=<D> owners=1 trace_docs=<R> spec_drift=<S> doc_drift=<U> cited=100%

and exits 0. Every check clears `company:brain` first for determinism. With
FalkorDB stopped the first query raises a connection error → non-zero exit
(rule-3).
"""

from __future__ import annotations

import argparse
import pathlib
import subprocess
import sys

# Make ``backend/`` importable when run as a script.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import db  # noqa: E402
from app.config import FalkorDBConfig  # noqa: E402
from app.falkor_brain import (  # noqa: E402
    FalkorBrain,
    _parse_git_log,
    _resolve_rename,
)

DEFAULT_REPO_ID = "graphhacks"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


# ---------------------------------------------------------------------------
# Small graph helpers
# ---------------------------------------------------------------------------


def _query(cypher: str, params: dict | None = None):
    with db.named_graph(db.BRAIN_GRAPH, FalkorDBConfig.from_env()) as graph:
        return graph.query(cypher, params=params or {})


def _count(cypher: str, params: dict | None = None) -> int:
    result = _query(cypher, params)
    return int(result.result_set[0][0]) if result.result_set else 0


def _scalar(cypher: str, params: dict | None = None):
    result = _query(cypher, params)
    if not result.result_set:
        return None
    return result.result_set[0][0]


def _clear_brain() -> None:
    _query("MATCH (n) DETACH DELETE n")


def _record_heartbeat() -> None:
    """Best-effort: keep the health graph usable without risking the run."""
    try:
        db.ensure_indexes(db.HEALTH_GRAPH, [("Node", "id")])
    except Exception:  # noqa: BLE001 - never let telemetry break the check
        pass


def _git_author_email(repo_path: pathlib.Path) -> str:
    proc = subprocess.run(
        ["git", "-C", str(repo_path), "log", "--format=%ae", "-1"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        fail(f"git author lookup failed: {proc.stderr.strip()}")
    return proc.stdout.strip()


def _prepare(
    brain: FalkorBrain, repo_id: str, root: pathlib.Path, graph_json: pathlib.Path
):
    """Clear + full ingest; used by every check that needs populated data."""
    _clear_brain()
    brain.ensure_schema()
    stats_commits = brain.ingest_commits(repo_id, root)
    stats_symbols = brain.ingest_symbols(repo_id, graph_json)
    stats_docs = brain.ingest_docs(repo_id, root)
    return stats_commits, stats_symbols, stats_docs


def _graph_counts() -> dict[str, int]:
    """Node + edge counts used to prove ingest idempotency (Review Focus #5)."""
    return {
        "Person": _count("MATCH (n:Person) RETURN count(n)"),
        "Commit": _count("MATCH (n:Commit) RETURN count(n)"),
        "File": _count("MATCH (n:File) RETURN count(n)"),
        "Symbol": _count("MATCH (n:Symbol) RETURN count(n)"),
        "Doc": _count("MATCH (n:Doc) RETURN count(n)"),
        "AUTHORED": _count("MATCH ()-[r:AUTHORED]->() RETURN count(r)"),
        "MODIFIED": _count("MATCH ()-[r:MODIFIED]->() RETURN count(r)"),
        "DEFINES": _count("MATCH ()-[r:DEFINES]->() RETURN count(r)"),
        "MENTIONS": _count("MATCH ()-[r:MENTIONS]->() RETURN count(r)"),
        "DOCUMENTED_IN": _count("MATCH ()-[r:DOCUMENTED_IN]->() RETURN count(r)"),
    }


def _reingest(
    brain: FalkorBrain, repo_id: str, root: pathlib.Path, graph_json: pathlib.Path
) -> None:
    brain.ingest_commits(repo_id, root)
    brain.ingest_symbols(repo_id, graph_json)
    brain.ingest_docs(repo_id, root)


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------


def check_3_1(brain: FalkorBrain, repo_id, root, graph_json) -> int:
    if db.BRAIN_GRAPH != "company:brain":
        fail(f"BRAIN_GRAPH = {db.BRAIN_GRAPH!r}, expected 'company:brain'")
    # Idempotent: a second call must raise nothing.
    brain.ensure_schema()
    brain.ensure_schema()
    print("3.1 ok — graph=company:brain")
    return 0


def check_3_2(brain: FalkorBrain, repo_id, root: pathlib.Path, graph_json) -> int:
    _clear_brain()
    brain.ensure_schema()
    brain.ingest_commits(repo_id, root)

    authored = _count("MATCH (:Person)-[a:AUTHORED]->(:Commit) RETURN count(a)")
    modified = _count("MATCH (:Commit)-[m:MODIFIED]->(:File) RETURN count(m)")
    if authored < 1:
        fail(f"expected :AUTHORED edges > 0, got {authored}")
    if modified < 1:
        fail(f"expected :MODIFIED edges > 0, got {modified}")

    email = _git_author_email(root)
    resolved = _count("MATCH (p:Person {id: $email}) RETURN count(p)", {"email": email})
    if resolved < 1:
        fail(f"git author email {email!r} did not resolve as :Person.id")

    git_commits = _count("MATCH (c:Commit) RETURN count(c)")
    files = _count("MATCH (f:File) RETURN count(f)")

    # Review Focus #5 — re-running ingest must not change counts.
    brain.ingest_commits(repo_id, root)
    rerun_commits = _count("MATCH (c:Commit) RETURN count(c)")
    rerun_files = _count("MATCH (f:File) RETURN count(f)")
    rerun_authored = _count("MATCH (:Person)-[a:AUTHORED]->(:Commit) RETURN count(a)")
    if (rerun_commits, rerun_files) != (git_commits, files):
        fail(
            "ingest_commits not idempotent: "
            f"commits {git_commits}->{rerun_commits}, files {files}->{rerun_files}"
        )
    if rerun_authored != authored:
        fail(f"AUTHORED edges changed on re-run: {authored}->{rerun_authored}")

    # Review Focus #4 — `--numstat` binary (`-`) and rename lines must not crash
    # the parser or create phantom files.
    sha = "a" * 40
    synthetic = (
        f"{sha}|Alice|alice@example.com|1700000000|add assets\n"
        "-\t-\tassets/logo.png\n"
        "1\t2\tdocs/{old => new}.md\n"
        "3\t4\tdir/{a => b}/file.py\n"
        "5\t6\told/name.py => new/name.py\n"
    )
    parsed_commits, parsed_modified, parsed_people = _parse_git_log(synthetic)
    parsed_paths = {row["path"]: row for row in parsed_modified}
    if len(parsed_commits) != 1 or parsed_people.get("alice@example.com") != "Alice":
        fail("synthetic parse: commit header not parsed")
    binary = parsed_paths.get("assets/logo.png")
    if not binary or binary["insertions"] != 0 or binary["deletions"] != 0:
        fail("binary '-' numstat was not coerced to 0")
    for expected in ("docs/new.md", "dir/b/file.py", "new/name.py"):
        if expected not in parsed_paths:
            fail(f"rename destination {expected!r} missing from parse")
    if _resolve_rename("plain/file.py") != "plain/file.py":
        fail("_resolve_rename changed a plain path")

    people = _count("MATCH (p:Person) RETURN count(p)")
    print(f"3.2 ok — people={people} commits={rerun_commits} files={rerun_files}")
    return 0


def check_3_3(brain: FalkorBrain, repo_id, root, graph_json) -> int:
    _prepare(brain, repo_id, root, graph_json)

    # Review Focus #5 — running every ingest pass twice leaves counts unchanged.
    before = _graph_counts()
    _reingest(brain, repo_id, root, graph_json)
    after = _graph_counts()
    if before != after:
        fail(f"re-ingest not idempotent: {before} -> {after}")

    defines = _count(
        "MATCH (:File)-[d:DEFINES]->(s:Symbol {present: true}) RETURN count(d)"
    )
    if defines < 1:
        fail("expected (:File)-[:DEFINES]->(:Symbol {present:true}) count > 0")

    symbol_id = _scalar("MATCH (s:Symbol {present: true}) RETURN s.id LIMIT 1")
    if not symbol_id:
        fail("no present symbol to exercise staleness")

    # Stale symbol: flag it false, re-ingest, and prove it was NOT deleted.
    _query("MATCH (s:Symbol {id: $id}) SET s.present = false", {"id": symbol_id})
    brain.ingest_symbols(repo_id, graph_json)
    still_there = _count("MATCH (s:Symbol {id: $id}) RETURN count(s)", {"id": symbol_id})
    if still_there != 1:
        fail(f"stale symbol {symbol_id!r} was deleted (count={still_there})")

    symbols = _count("MATCH (s:Symbol) RETURN count(s)")
    print(f"3.3 ok — symbols={symbols}")
    return 0


def check_3_4(brain: FalkorBrain, repo_id, root, graph_json) -> int:
    _prepare(brain, repo_id, root, graph_json)

    docs = _count("MATCH (d:Doc) RETURN count(d)")
    mentions = _count("MATCH (:Doc)-[m:MENTIONS]->(:Symbol) RETURN count(m)")
    documented = _count("MATCH (:Symbol)-[x:DOCUMENTED_IN]->(:Doc) RETURN count(x)")
    untitled = _count(
        "MATCH (d:Doc) WHERE d.title IS NULL OR d.title = '' RETURN count(d)"
    )
    if docs < 1:
        fail("expected :Doc count > 0")
    if mentions < 1:
        fail("expected (:Doc)-[:MENTIONS]->(:Symbol) count > 0")
    if documented < 1:
        fail("expected (:Symbol)-[:DOCUMENTED_IN]->(:Doc) count > 0")
    if untitled != 0:
        fail(f"{untitled} docs have no title")

    # Plan C4's example: docs/contracts/memory-service.md names `write_turn`.
    write_turn = _count(
        "MATCH (d:Doc {path: $path})-[:MENTIONS]->(s:Symbol {name: $name}) "
        "RETURN count(s)",
        {"path": "docs/contracts/memory-service.md", "name": "write_turn"},
    )
    if write_turn < 1:
        fail("docs/contracts/memory-service.md does not :MENTIONS write_turn")

    print(f"3.4 ok — docs={docs} mentions={mentions}")
    return 0


def check_3_5(brain: FalkorBrain, repo_id, root, graph_json) -> int:
    _prepare(brain, repo_id, root, graph_json)

    owners = brain.who_owns(repo_id, "docs/decisions.md")
    if not owners:
        fail("who_owns('docs/decisions.md') returned []")
    if owners[0].commits < 1:
        fail(f"owner commits={owners[0].commits}, expected >= 1")

    # Review Focus #1 — unknown target returns [] and never raises.
    if brain.who_owns(repo_id, "no/such/file.xyz") != []:
        fail("who_owns(unknown) did not return []")
    if brain.who_owns(repo_id, "") != []:
        fail("who_owns('') did not return []")

    # Review Focus #2 — clamp 1..100.
    if len(brain.who_owns(repo_id, "docs/decisions.md", limit=10_000)) > 100:
        fail("who_owns(limit=10000) exceeded 100")
    if len(brain.who_owns(repo_id, "docs/decisions.md", limit=0)) != 1:
        fail("who_owns(limit=0) did not clamp to 1")

    print(f"3.5 ok — owners={len(owners)}")
    return 0


def check_3_6(brain: FalkorBrain, repo_id, root, graph_json) -> int:
    _prepare(brain, repo_id, root, graph_json)

    doc_trace = brain.trace_why("docs/contracts/memory-service.md")
    if doc_trace.kind != "Doc":
        fail(f"trace_why(doc).kind={doc_trace.kind!r}, expected 'Doc'")
    if not doc_trace.sources:
        fail("trace_why(doc) returned no sources")
    with_commit = [s for s in doc_trace.sources if s.commit_id and s.person_id]
    if not with_commit:
        fail("trace_why(doc) returned no source carrying commit_id + person_id")

    sym_trace = brain.trace_why("write_turn")
    if sym_trace.kind != "Symbol":
        fail(f"trace_why('write_turn').kind={sym_trace.kind!r}, expected 'Symbol'")
    if not sym_trace.doc_paths:
        fail("trace_why('write_turn') returned empty doc_paths")

    # Review Focus #3 — every source is cited (doc_path truthy), even when the
    # doc has no commit.
    for source in doc_trace.sources + sym_trace.sources:
        if not source.doc_path:
            fail(f"uncited source for {source.doc_id!r}")

    # Review Focus #3 — a doc with no commit is still a cited source.
    temp_doc_id = f"{repo_id}#__verify_no_commit__.md"
    _query(
        "MERGE (d:File {id: $id}) SET d:Doc "
        "SET d.repo = $repo, d.path = $path, d.title = $title "
        "WITH d MATCH (s:Symbol {name: 'write_turn'}) "
        "MERGE (s)-[:DOCUMENTED_IN]->(d)",
        {
            "id": temp_doc_id,
            "repo": repo_id,
            "path": "__verify_no_commit__.md",
            "title": "No-commit fixture",
        },
    )
    temp_trace = brain.trace_why("write_turn")
    no_commit = [
        s
        for s in temp_trace.sources
        if s.doc_path == "__verify_no_commit__.md" and s.commit_id is None
    ]
    if not no_commit:
        fail("a doc with no commit was not surfaced as a cited source")

    # Review Focus #1 — unknown target resolves to an empty trace.
    unknown = brain.trace_why("no-such-symbol-xyz")
    if unknown.doc_paths or unknown.sources:
        fail("trace_why(unknown) was not empty")
    if brain.trace_why("").sources:
        fail("trace_why('') was not empty")

    print(f"3.6 ok — trace_docs={len(doc_trace.doc_paths)} cited=100%")
    return 0


def check_3_7(brain: FalkorBrain, repo_id, root, graph_json) -> int:
    _prepare(brain, repo_id, root, graph_json)

    # Fixture: a symbol that is still MENTIONed but no longer present.
    symbol_id = _scalar(
        "MATCH (d:Doc)-[:MENTIONS]->(s:Symbol {name: 'write_turn'}) "
        "RETURN s.id LIMIT 1"
    )
    if not symbol_id:
        fail("no MENTIONed 'write_turn' symbol to mark stale")
    _query("MATCH (s:Symbol {id: $id}) SET s.present = false", {"id": symbol_id})

    # Fixture: a file modified inside the window that no doc mentions.
    file_id = _scalar(
        "MATCH (c:Commit)-[m:MODIFIED]->(f:File) "
        "RETURN f.id ORDER BY m.at DESC LIMIT 1"
    )
    if file_id:
        _query("MATCH (f:File {id: $id}) SET f.present = false", {"id": file_id})

    report = brain.detect_drift(repo_id)
    if not report.spec_drift:
        fail("detect_drift returned empty spec_drift")
    if not report.doc_drift:
        fail("detect_drift returned empty doc_drift (removed-symbol)")

    print(
        f"3.7 ok — spec_drift={len(report.spec_drift)} "
        f"doc_drift={len(report.doc_drift)}"
    )
    return 0


def check_3_8(brain: FalkorBrain, repo_id, root: pathlib.Path, graph_json) -> int:
    _record_heartbeat()
    _prepare(brain, repo_id, root, graph_json)

    people = _count("MATCH (p:Person) RETURN count(p)")
    commits = _count("MATCH (c:Commit) RETURN count(c)")
    files = _count("MATCH (f:File) RETURN count(f)")
    symbols = _count("MATCH (s:Symbol) RETURN count(s)")
    docs = _count("MATCH (d:Doc) RETURN count(d)")

    if people < 1 or commits < 1 or files < 1 or symbols < 1 or docs < 1:
        fail(
            "empty projection: "
            f"people={people} commits={commits} files={files} "
            f"symbols={symbols} docs={docs}"
        )

    owners = brain.who_owns(repo_id, "docs/decisions.md")
    if not owners:
        fail("who_owns('docs/decisions.md') returned []")

    trace = brain.trace_why("docs/contracts/memory-service.md")
    if not trace.sources:
        fail("trace_why(doc) returned no sources")
    if any(not source.doc_path for source in trace.sources):
        fail("trace_why(doc) produced an uncited source")

    drift = brain.detect_drift(repo_id)

    print(
        f"track3 OK — repo={repo_id} people={people} commits={commits} "
        f"files={files} symbols={symbols} docs={docs} owners={len(owners)} "
        f"trace_docs={len(trace.doc_paths)} spec_drift={len(drift.spec_drift)} "
        f"doc_drift={len(drift.doc_drift)} cited=100%"
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Track 03 company-brain verifier")
    parser.add_argument("--step", default=None, help="3.1 .. 3.7 (default: 3.8)")
    args = parser.parse_args(argv)

    root = pathlib.Path(__file__).resolve().parents[2]
    graph_json = root / "graphify-out" / "graph.json"
    repo_id = DEFAULT_REPO_ID
    brain = FalkorBrain(FalkorDBConfig.from_env())

    steps = {
        "3.1": lambda: check_3_1(brain, repo_id, root, graph_json),
        "3.2": lambda: check_3_2(brain, repo_id, root, graph_json),
        "3.3": lambda: check_3_3(brain, repo_id, root, graph_json),
        "3.4": lambda: check_3_4(brain, repo_id, root, graph_json),
        "3.5": lambda: check_3_5(brain, repo_id, root, graph_json),
        "3.6": lambda: check_3_6(brain, repo_id, root, graph_json),
        "3.7": lambda: check_3_7(brain, repo_id, root, graph_json),
        "3.8": lambda: check_3_8(brain, repo_id, root, graph_json),
    }

    if args.step:
        step = steps.get(args.step)
        if step is None:
            fail(f"unknown step {args.step!r} (expected 3.1 .. 3.8)")
        return step()
    return check_3_8(brain, repo_id, root, graph_json)


if __name__ == "__main__":
    raise SystemExit(main())
