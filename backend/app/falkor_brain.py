"""Company Brain engine (Track 03) — the ``company:brain`` named graph (D10).

Track 03 is built on **local data only** (no GitHub token; PRs/issues deferred):

* ``git -C <repo> log --numstat`` → people, commits, files, modifications;
* ``graphify-out/graph.json``       → code symbols + the files that define them;
* on-disk docs (``docs/``, ``reference/``, ``lessons/``) → documentation evidence.

Vocabulary (plan Phase C, §3 of the design):

* ``:Person {id/email, name}``
* ``:Commit {id/sha, repo, subject, at, author_email}``
* ``:File {id, repo, path, present}`` — ``:Doc`` is a *co-label* of ``:File``
* ``:Symbol {id, repo, name, label, source_file, source_location, present}``

Edges: ``:AUTHORED``, ``:MODIFIED {path, insertions, deletions, at}``,
``:DEFINES``, ``:MENTIONS``, ``:DOCUMENTED_IN``.

Every write is ``MERGE``-based and idempotent. Removal is never ``DETACH DELETE``:
a pre-pass flags existing nodes ``present = false`` and the current pass sets
``present = true`` for what it sees, so a removed symbol/file is the drift
signal (plan C2/C3, Review Focus #5).
"""

from __future__ import annotations

import json
import pathlib
import re
import subprocess
from dataclasses import dataclass, field

from . import db
from .config import FalkorDBConfig
from .observability import span

#: Docs live under these repo-relative prefixes (plan C4 default).
DEFAULT_DOC_PREFIXES: tuple[str, ...] = ("docs/", "reference/", "lessons/")

#: Hard ceiling for clamped ``LIMIT`` values (Review Focus #2).
MAX_LIMIT = 100

_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
_TOKEN_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.S | re.I)
_H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S | re.I)
_HEADING_TAG_RE = re.compile(r"<h[1-6][^>]*>(.*?)</h[1-6]>", re.S | re.I)


# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------


@dataclass
class IngestStats:
    """Counts from one ingest pass (used by the verifier)."""

    people: int = 0
    commits: int = 0
    files: int = 0
    symbols: int = 0
    docs: int = 0
    edges: int = 0


@dataclass
class Owner:
    """One person who touched a file/symbol (``who_owns``, plan C5)."""

    person_id: str
    name: str
    commits: int
    insertions: int
    deletions: int
    last_touched: int
    file_ids: list[str] = field(default_factory=list)


@dataclass
class TraceSource:
    """One cited evidence row for a ``trace_why`` answer (plan C6)."""

    doc_id: str | None
    doc_path: str | None
    doc_title: str | None
    commit_id: str | None
    subject: str | None
    at: int | None
    person_id: str | None
    person_name: str | None


@dataclass
class Trace:
    """Why a symbol/file exists: target + the docs/sources that justify it."""

    target_id: str
    kind: str
    doc_paths: list[str] = field(default_factory=list)
    sources: list[TraceSource] = field(default_factory=list)


@dataclass
class DriftItem:
    """One drift finding (plan C7)."""

    kind: str
    id: str
    path_or_name: str
    last_touched: int | None = None
    doc_paths: list[str] = field(default_factory=list)


@dataclass
class DriftReport:
    """Spec drift (files/symbols changed but undocumented) + doc drift."""

    repo_id: str
    since: int
    spec_drift: list[DriftItem] = field(default_factory=list)
    doc_drift: list[DriftItem] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _clamp(value: object, lo: int = 1, hi: int = MAX_LIMIT, default: int = 5) -> int:
    """Coerce to an int and clamp into ``[lo, hi]`` (never interpolate raw)."""
    try:
        parsed = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        parsed = default
    return max(lo, min(hi, parsed))


def _is_doc_path(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in DEFAULT_DOC_PREFIXES)


def _clean_symbol_name(label: str, fallback: str) -> str:
    """Normalise a graphify label to a human symbol name.

    ``.write_turn()`` and ``write_turn(user, session, text)`` both become
    ``write_turn`` so doc mentions and ``who_owns``/``trace_why`` resolve to the
    same name the docs use (D10 scope: graphify labels carry signatures).
    """
    name = (label or "").strip()
    if name.startswith("."):
        name = name[1:]
    paren = name.find("(")
    if paren > 0:
        name = name[:paren]
    name = name.strip()
    return name or fallback


def _strip_html(text: str) -> str:
    return _TAG_RE.sub(" ", text)


def _collapse(text: str) -> str:
    return _WS_RE.sub(" ", text).strip()


def _tokens(text: str) -> set[str]:
    return set(_TOKEN_RE.findall(text))


def _extract_title(raw: str, rel_path: str) -> str:
    """Best-effort doc title; always non-empty (falls back to the path)."""
    match = _TITLE_RE.search(raw)
    if match:
        title = _collapse(_strip_html(match.group(1)))
        if title:
            return title
    match = _H1_RE.search(raw)
    if match:
        title = _collapse(_strip_html(match.group(1)))
        if title:
            return title
    for line in raw.splitlines():
        candidate = line.strip()
        if not candidate:
            continue
        if candidate.startswith("#"):
            candidate = candidate.lstrip("#").strip()
        else:
            candidate = _collapse(_strip_html(candidate))
        if candidate:
            return candidate
    return rel_path


def _headings_text(raw: str) -> str:
    """Heading-only text (markdown ``#`` lines + HTML ``<h1..6>``)."""
    parts: list[str] = [
        line for line in raw.splitlines() if line.lstrip().startswith("#")
    ]
    parts.extend(_HEADING_TAG_RE.findall(raw))
    return _strip_html(" \n ".join(parts))


def _resolve_rename(path: str) -> str:
    """Destination path of a ``--numstat`` rename (``old => new`` / ``{a => b}``)."""
    if "{" in path and "}" in path and " => " in path:
        start = path.find("{")
        end = path.find("}", start)
        old, _, new = path[start + 1 : end].partition(" => ")
        destination = new or old
        return (path[:start] + destination + path[end + 1 :]).replace("//", "/")
    if " => " in path:
        return path.split(" => ", 1)[1]
    return path


def _git_log_numstat(repo_path: str | pathlib.Path) -> str:
    proc = subprocess.run(
        [
            "git",
            "-C",
            str(repo_path),
            "log",
            "--numstat",
            "--format=%H|%an|%ae|%at|%s",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        raise RuntimeError(f"git log failed: {proc.stderr.strip()}")
    return proc.stdout


def _git_head_paths(repo_path: str | pathlib.Path) -> set[str]:
    """Paths present in ``HEAD`` — so deleted files stay ``present = false``.

    Uses the git object tree (not the worktree) because the compose image mounts
    only ``.git`` for Track 03. Falls back to an empty set when git is
    unavailable, in which case the caller can use the on-disk check.
    """
    proc = subprocess.run(
        ["git", "-C", str(repo_path), "ls-tree", "-r", "--name-only", "HEAD"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        return set()
    return {line.strip() for line in proc.stdout.splitlines() if line.strip()}


def _parse_git_log(text: str) -> tuple[list[dict], list[dict], dict[str, str]]:
    """Parse ``--numstat`` output into commits, modified files, and people."""
    commits: list[dict] = []
    modified: list[dict] = []
    people: dict[str, str] = {}
    current: dict | None = None
    for line in text.splitlines():
        if not line.strip():
            continue
        parts = line.split("|", 4)
        if len(parts) == 5 and _SHA_RE.match(parts[0]):
            sha, name, email, at, subject = parts
            current = {"sha": sha, "email": email, "at": int(at), "subject": subject}
            commits.append(current)
            people[email] = name
            continue
        if current is None:
            continue
        cols = line.split("\t")
        if len(cols) != 3:
            continue
        ins_raw, del_raw, path = cols
        insertions = 0 if ins_raw.strip() == "-" else int(ins_raw)
        deletions = 0 if del_raw.strip() == "-" else int(del_raw)
        modified.append(
            {
                "sha": current["sha"],
                "path": _resolve_rename(path),
                "insertions": insertions,
                "deletions": deletions,
                "at": current["at"],
            }
        )
    return commits, modified, people


def _walk_docs(
    repo_path: str | pathlib.Path, prefixes: tuple[str, ...]
) -> list[tuple[str, pathlib.Path]]:
    root = pathlib.Path(repo_path)
    found: dict[str, pathlib.Path] = {}
    for prefix in prefixes:
        base = root / prefix
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if path.is_file():
                found[path.relative_to(root).as_posix()] = path
    return sorted(found.items())


# ---------------------------------------------------------------------------
# Cypher
# ---------------------------------------------------------------------------

_PERSON_CYPHER = """
UNWIND $people AS row
MERGE (p:Person {id: row.email})
SET p.email = row.email, p.name = row.name
"""

_COMMIT_CYPHER = """
UNWIND $commits AS row
MERGE (c:Commit {id: row.sha})
SET c.sha = row.sha, c.repo = row.repo, c.subject = row.subject,
    c.at = row.at, c.author_email = row.email
"""

_AUTHORED_CYPHER = """
UNWIND $commits AS row
MATCH (p:Person {id: row.email}), (c:Commit {id: row.sha})
MERGE (p)-[:AUTHORED]->(c)
"""

_FILE_CYPHER = """
UNWIND $files AS row
MERGE (f:File {id: row.id})
SET f.repo = row.repo, f.path = row.path, f.present = row.present
"""

_MARK_DOCS_CYPHER = """
UNWIND $ids AS id
MATCH (f:File {id: id})
SET f:Doc
"""

_MODIFIED_CYPHER = """
UNWIND $rows AS row
MATCH (f:File {id: row.fileId}), (c:Commit {id: row.sha})
MERGE (c)-[m:MODIFIED]->(f)
SET m.path = row.path, m.insertions = row.insertions,
    m.deletions = row.deletions, m.at = row.at
"""

_SYMBOL_CYPHER = """
UNWIND $symbols AS row
MERGE (s:Symbol {id: row.id})
SET s.repo = row.repo, s.name = row.name, s.label = row.label,
    s.source_file = row.source_file, s.source_location = row.source_location,
    s.present = true
"""

_DEFINES_CYPHER = """
UNWIND $symbols AS row
MATCH (s:Symbol {id: row.id})
MERGE (f:File {id: row.fileId})
ON CREATE SET f.repo = row.repo, f.path = row.source_file, f.present = false
MERGE (f)-[:DEFINES]->(s)
"""

_DOC_CYPHER = """
UNWIND $docs AS row
MERGE (d:File {id: row.id})
SET d:Doc
SET d.repo = row.repo, d.path = row.path, d.title = row.title, d.present = true
"""

_MENTIONS_SYMBOL_CYPHER = """
UNWIND $rows AS row
MATCH (d:Doc {id: row.docId}), (s:Symbol {name: row.name})
MERGE (d)-[:MENTIONS]->(s)
"""

_MENTIONS_FILE_CYPHER = """
UNWIND $rows AS row
MATCH (d:Doc {id: row.docId}), (f:File {id: row.fileId})
MERGE (d)-[:MENTIONS]->(f)
"""

_DOCUMENTED_IN_CYPHER = """
UNWIND $rows AS row
MATCH (d:Doc {id: row.docId}), (s:Symbol {name: row.name})
MERGE (s)-[:DOCUMENTED_IN]->(d)
"""

# Plan C5 W1 — resolve a path/symbol to the File ids that carry it. Repo is a
# parameter (never interpolated) so the same engine serves any projection.
_WHO_W1 = """
MATCH (f:File)
WHERE (f.id = $target OR f.path = $target) AND ($repo = '' OR f.repo = $repo)
RETURN DISTINCT f.id AS fileId, f.path AS path
UNION
MATCH (f:File)-[:DEFINES]->(s:Symbol)
WHERE (s.id = $target OR s.name = $target) AND ($repo = '' OR f.repo = $repo)
RETURN DISTINCT f.id AS fileId, f.path AS path
"""

# Plan C5 W2 — aggregate authorship over :MODIFIED. `{limit}` is the only
# interpolated value and it is clamped to 1..100 in Python.
_WHO_W2 = """
MATCH (p:Person)-[:AUTHORED]->(c:Commit)-[m:MODIFIED]->(f:File)
WHERE f.id IN $fileIds AND ($repo = '' OR f.repo = $repo)
RETURN p.id AS personId, p.name AS name, count(DISTINCT c) AS commits,
       sum(m.insertions) AS insertions, sum(m.deletions) AS deletions,
       max(m.at) AS lastTouched, collect(DISTINCT f.id) AS fileIds
ORDER BY commits DESC, lastTouched DESC
LIMIT {limit}
"""

# Plan C6 target resolution. Extended for this graph: a symbol's doc evidence is
# the union of `:DOCUMENTED_IN` (name in a heading) and `:MENTIONS` (name in a
# body) docs, so a real symbol like `write_turn` — present only in doc bodies —
# still yields a cited answer (100% cited).
_TRACE_TARGET = """
MATCH (e:Symbol)
WHERE (e.id = $target OR e.name = $target)
  AND coalesce(e.present, true) = true
OPTIONAL MATCH (e)-[:DOCUMENTED_IN]->(hd:Doc)
OPTIONAL MATCH (e)<-[:MENTIONS]-(md:Doc)
WITH e, collect(DISTINCT hd.id) AS hIds, collect(DISTINCT md.id) AS mIds
RETURN e.id AS id, 'Symbol' AS kind, hIds + mIds AS docIds
UNION
MATCH (e:File)
WHERE (e.id = $target OR e.path = $target) AND NOT e:Doc
  AND coalesce(e.present, true) = true
OPTIONAL MATCH (e)<-[:MENTIONS]-(md:Doc)
OPTIONAL MATCH (e)-[:DEFINES]->(:Symbol)<-[:MENTIONS]-(sd:Doc)
OPTIONAL MATCH (e)-[:DEFINES]->(:Symbol)-[:DOCUMENTED_IN]->(hd:Doc)
WITH e, collect(DISTINCT md.id) AS mIds,
     collect(DISTINCT sd.id) AS sIds, collect(DISTINCT hd.id) AS hIds
RETURN e.id AS id, 'File' AS kind, mIds + sIds + hIds AS docIds
UNION
MATCH (e:Doc)
WHERE (e.id = $target OR e.path = $target)
  AND coalesce(e.present, true) = true
RETURN e.id AS id, 'Doc' AS kind, [e.id] AS docIds
"""

# Plan C6 sources. OPTIONAL MATCH keeps a doc with no commit as a cited source
# (Review Focus #3): doc_path is always surfaced, commit/person may be null.
_TRACE_SOURCES = """
MATCH (d:Doc)
WHERE d.id IN $docIds AND coalesce(d.present, true) = true
OPTIONAL MATCH (c:Commit)-[:MODIFIED]->(d)
OPTIONAL MATCH (p:Person)-[:AUTHORED]->(c)
RETURN DISTINCT d.id AS docId, d.path AS docPath, d.title AS docTitle,
       c.id AS commitId, c.subject AS subject, c.at AS at,
       p.id AS personId, p.name AS personName
ORDER BY at DESC
LIMIT {limit}
"""

# Plan C7 — D0 window.
_DRIFT_WINDOW = """
MATCH (c:Commit) WHERE ($repo = '' OR c.repo = $repo)
RETURN max(c.at) AS maxAt
"""

# D1 — spec drift: files changed inside the window that no doc mentions.
_DRIFT_D1 = """
MATCH (:Person)-[:AUTHORED]->(c:Commit)-[m:MODIFIED]->(f:File)
WHERE ($repo = '' OR f.repo = $repo) AND m.at >= $since
WITH f, max(m.at) AS lastTouched
OPTIONAL MATCH (f)<-[:MENTIONS]-(md:Doc)
WITH f, lastTouched, count(md) AS mentioned
WHERE mentioned = 0
RETURN 'file' AS kind, f.id AS id, f.path AS path_or_name, lastTouched
ORDER BY lastTouched DESC
"""

# D2 — spec drift: symbols changed inside the window but never documented.
_DRIFT_D2 = """
MATCH (c:Commit)-[m:MODIFIED]->(f:File)-[:DEFINES]->(s:Symbol)
WHERE ($repo = '' OR f.repo = $repo) AND m.at >= $since
  AND s.present = true
WITH s, max(m.at) AS lastTouched
OPTIONAL MATCH (s)-[:DOCUMENTED_IN]->(dd:Doc)
WITH s, lastTouched, count(dd) AS documented
WHERE documented = 0
RETURN 'symbol' AS kind, s.id AS id, s.name AS path_or_name, lastTouched
ORDER BY lastTouched DESC
"""

# D3 — doc drift: a doc still mentions a symbol that is no longer present.
_DRIFT_D3 = """
MATCH (d:Doc)-[:MENTIONS]->(s:Symbol)
WHERE s.present = false AND ($repo = '' OR s.repo = $repo)
RETURN 'removed-symbol' AS kind, s.id AS id, s.name AS path_or_name,
       collect(DISTINCT d.path) AS docPaths
"""

# Constant (not user-supplied) trace-source ceiling; `LIMIT` needs an inline int.
_TRACE_SOURCE_LIMIT = 200


class FalkorBrain:
    """Track 03 company-brain engine over the ``company:brain`` graph."""

    def __init__(
        self, config: FalkorDBConfig | None = None, graph_key: str = db.BRAIN_GRAPH
    ) -> None:
        self._config = config
        self._graph_key = graph_key

    # -- plumbing ----------------------------------------------------------

    def _exec(self, cypher: str, params: dict | None = None):
        with db.named_graph(self._graph_key, self._config) as graph:
            return graph.query(cypher, params=params or {})

    def ensure_schema(self) -> None:
        """Idempotently create the range indexes the resolvers rely on (C1)."""
        with span("brain.ensure_schema"):
            db.ensure_indexes(
                self._graph_key,
                [
                    ("Person", "id"),
                    ("Commit", "id"),
                    ("File", "id"),
                    ("File", "path"),
                    ("Doc", "id"),
                    ("Symbol", "id"),
                    ("Symbol", "name"),
                ],
                self._config,
            )

    # -- ingest (C2/C3/C4) -------------------------------------------------

    def ingest_commits(self, repo_id: str, repo_path: str | pathlib.Path) -> IngestStats:
        """Parse local ``git log --numstat`` into Person/Commit/File/edges (C2)."""
        with span("brain.ingest_commits"):
            commits, modified, people = _parse_git_log(_git_log_numstat(repo_path))

            people_rows = [{"email": e, "name": n} for e, n in people.items()]
            commit_rows = [
                {
                    "sha": c["sha"],
                    "repo": repo_id,
                    "subject": c["subject"],
                    "at": c["at"],
                    "email": c["email"],
                }
                for c in commits
            ]

            present_paths = _git_head_paths(repo_path)
            file_map: dict[str, dict] = {}
            modified_rows: list[dict] = []
            doc_ids: list[str] = []
            for row in modified:
                file_id = f"{repo_id}#{row['path']}"
                # A historical path that no longer exists in HEAD is recorded
                # (so ownership/drift history is preserved) but never presented
                # as current.
                present = (
                    row["path"] in present_paths
                    if present_paths
                    else (pathlib.Path(repo_path) / row["path"]).exists()
                )
                file_map[file_id] = {"path": row["path"], "present": present}
                modified_rows.append(
                    {
                        "sha": row["sha"],
                        "fileId": file_id,
                        "path": row["path"],
                        "insertions": row["insertions"],
                        "deletions": row["deletions"],
                        "at": row["at"],
                    }
                )
                if _is_doc_path(row["path"]):
                    doc_ids.append(file_id)

            with db.named_graph(self._graph_key, self._config) as graph:
                # Pre-pass: flag every known file stale; the batch below restores
                # `present = true` for files seen in this pass (never delete).
                graph.query("MATCH (f:File) SET f.present = false", params={})
                if people_rows:
                    graph.query(_PERSON_CYPHER, params={"people": people_rows})
                if commit_rows:
                    graph.query(_COMMIT_CYPHER, params={"commits": commit_rows})
                    graph.query(_AUTHORED_CYPHER, params={"commits": commit_rows})
                if file_map:
                    files = [
                        {
                            "id": fid,
                            "repo": repo_id,
                            "path": meta["path"],
                            "present": meta["present"],
                        }
                        for fid, meta in file_map.items()
                    ]
                    graph.query(_FILE_CYPHER, params={"files": files})
                if doc_ids:
                    graph.query(
                        _MARK_DOCS_CYPHER, params={"ids": sorted(set(doc_ids))}
                    )
                if modified_rows:
                    graph.query(_MODIFIED_CYPHER, params={"rows": modified_rows})

            return IngestStats(
                people=len(people_rows),
                commits=len(commit_rows),
                files=len(file_map),
                edges=len(modified_rows),
            )

    def ingest_symbols(
        self, repo_id: str, graph_json_path: str | pathlib.Path
    ) -> IngestStats:
        """Load ``graph.json`` code nodes as ``:Symbol`` + ``:DEFINES`` (C3)."""
        with span("brain.ingest_symbols"):
            data = json.loads(
                pathlib.Path(graph_json_path).read_text(encoding="utf-8")
            )
            rows: list[dict] = []
            for node in data.get("nodes", []):
                if node.get("file_type") != "code":
                    continue
                source_file = node.get("source_file")
                node_id = node.get("id")
                if not source_file or not node_id:
                    continue
                label = str(node.get("label") or node_id)
                rows.append(
                    {
                        "id": f"{repo_id}#{node_id}",
                        "repo": repo_id,
                        "name": _clean_symbol_name(label, str(node_id)),
                        "label": label,
                        "source_file": source_file,
                        "source_location": node.get("source_location"),
                        "fileId": f"{repo_id}#{source_file}",
                    }
                )

            with db.named_graph(self._graph_key, self._config) as graph:
                # Stale symbols are flagged, never deleted (C3).
                graph.query("MATCH (s:Symbol) SET s.present = false", params={})
                if rows:
                    graph.query(_SYMBOL_CYPHER, params={"symbols": rows})
                    graph.query(_DEFINES_CYPHER, params={"symbols": rows})

            return IngestStats(symbols=len(rows))

    def ingest_docs(
        self,
        repo_id: str,
        repo_path: str | pathlib.Path,
        doc_prefixes: tuple[str, ...] = DEFAULT_DOC_PREFIXES,
    ) -> IngestStats:
        """Load on-disk docs: ``:Doc:File`` + title + MENTIONS/DOCUMENTED_IN (C4)."""
        with span("brain.ingest_docs"):
            with db.named_graph(self._graph_key, self._config) as graph:
                names_res = graph.query("MATCH (s:Symbol) RETURN DISTINCT s.name")
                symbol_names = {
                    r[0] for r in (names_res.result_set or []) if isinstance(r[0], str)
                }
                files_res = graph.query(
                    "MATCH (f:File) WHERE NOT f:Doc RETURN f.id, f.path"
                )
                path_to_id = {
                    r[1]: r[0]
                    for r in (files_res.result_set or [])
                    if isinstance(r[1], str)
                }

            doc_rows: list[dict] = []
            mention_symbol_rows: list[dict] = []
            mention_file_rows: list[dict] = []
            documented_rows: list[dict] = []

            for rel_path, abs_path in _walk_docs(repo_path, doc_prefixes):
                raw = abs_path.read_text(encoding="utf-8", errors="replace")
                body = _strip_html(raw)
                doc_id = f"{repo_id}#{rel_path}"
                doc_rows.append(
                    {
                        "id": doc_id,
                        "repo": repo_id,
                        "path": rel_path,
                        "title": _extract_title(raw, rel_path),
                    }
                )
                for name in _tokens(body) & symbol_names:
                    mention_symbol_rows.append({"docId": doc_id, "name": name})
                for path, file_id in path_to_id.items():
                    if path != rel_path and path in body:
                        mention_file_rows.append(
                            {"docId": doc_id, "fileId": file_id}
                        )
                for name in _tokens(_headings_text(raw)) & symbol_names:
                    documented_rows.append({"docId": doc_id, "name": name})

            with db.named_graph(self._graph_key, self._config) as graph:
                # Rebuild doc-derived evidence from scratch on every pass:
                # prune stale MENTIONS/DOCUMENTED_IN edges, then flag every known
                # doc stale (removed docs are never DETACH DELETEd — they are the
                # doc-drift signal).
                graph.query("MATCH (d:Doc)-[m:MENTIONS]->() DELETE m", params={})
                graph.query(
                    "MATCH ()-[x:DOCUMENTED_IN]->(d:Doc) DELETE x", params={}
                )
                graph.query("MATCH (d:Doc) SET d.present = false", params={})
                if doc_rows:
                    graph.query(_DOC_CYPHER, params={"docs": doc_rows})
                if mention_symbol_rows:
                    graph.query(
                        _MENTIONS_SYMBOL_CYPHER,
                        params={"rows": mention_symbol_rows},
                    )
                if mention_file_rows:
                    graph.query(
                        _MENTIONS_FILE_CYPHER, params={"rows": mention_file_rows}
                    )
                if documented_rows:
                    graph.query(
                        _DOCUMENTED_IN_CYPHER, params={"rows": documented_rows}
                    )

            return IngestStats(
                docs=len(doc_rows),
                edges=len(mention_symbol_rows)
                + len(mention_file_rows)
                + len(documented_rows),
            )

    # -- resolvers (C5/C6/C7) ---------------------------------------------

    def who_owns(
        self, repo_id: str, path_or_symbol: str, limit: int = 5
    ) -> list[Owner]:
        """People who modified the file(s) carrying a path or symbol (C5)."""
        with span("brain.who_owns"):
            if not path_or_symbol:
                return []
            clamped = _clamp(limit, 1, MAX_LIMIT, 5)
            resolved = self._exec(
                _WHO_W1, {"target": path_or_symbol, "repo": repo_id}
            )
            file_ids = [r[0] for r in (resolved.result_set or []) if r[0]]
            if not file_ids:
                return []
            result = self._exec(
                _WHO_W2.format(limit=clamped),
                {"fileIds": file_ids, "repo": repo_id},
            )

        owners: list[Owner] = []
        for row in result.result_set or []:
            owners.append(
                Owner(
                    person_id=row[0],
                    name=row[1] or "",
                    commits=int(row[2] or 0),
                    insertions=int(row[3] or 0),
                    deletions=int(row[4] or 0),
                    last_touched=int(row[5] or 0),
                    file_ids=[f for f in (row[6] or []) if f],
                )
            )
        return owners

    def trace_why(self, symbol_or_file: str) -> Trace:
        """Trace a symbol/file/doc to its docs, commits, and people (C6)."""
        with span("brain.trace_why"):
            if not symbol_or_file:
                return Trace(target_id="", kind="", doc_paths=[], sources=[])
            resolved = self._exec(_TRACE_TARGET, {"target": symbol_or_file})
            target_id = symbol_or_file
            kind = ""
            doc_ids: list[str] = []
            for row in resolved.result_set or []:
                if not kind:
                    target_id = row[0]
                    kind = row[1]
                for doc_id in row[2] or []:
                    if doc_id:
                        doc_ids.append(doc_id)
            doc_ids = list(dict.fromkeys(doc_ids))
            if not doc_ids:
                return Trace(target_id=target_id, kind=kind, doc_paths=[], sources=[])

            sources_res = self._exec(
                _TRACE_SOURCES.format(limit=_TRACE_SOURCE_LIMIT),
                {"docIds": doc_ids},
            )

        sources: list[TraceSource] = []
        for row in sources_res.result_set or []:
            sources.append(
                TraceSource(
                    doc_id=row[0],
                    doc_path=row[1],
                    doc_title=row[2],
                    commit_id=row[3],
                    subject=row[4],
                    at=int(row[5]) if row[5] is not None else None,
                    person_id=row[6],
                    person_name=row[7],
                )
            )

        doc_paths: list[str] = []
        for source in sources:
            if source.doc_path and source.doc_path not in doc_paths:
                doc_paths.append(source.doc_path)
        return Trace(
            target_id=target_id, kind=kind, doc_paths=doc_paths, sources=sources
        )

    def detect_drift(
        self, repo_id: str, since_epoch: int | None = None
    ) -> DriftReport:
        """Detect spec drift (D1/D2) and removed-symbol doc drift (D3) (C7)."""
        with span("brain.detect_drift"):
            window = self._exec(_DRIFT_WINDOW, {"repo": repo_id})
            max_at = None
            if window.result_set:
                max_at = window.result_set[0][0]
            if since_epoch is not None:
                since = int(since_epoch)
            elif max_at is not None:
                since = int(max_at) - 30 * 86_400
            else:
                since = 0

            d1 = self._exec(_DRIFT_D1, {"repo": repo_id, "since": since})
            d2 = self._exec(_DRIFT_D2, {"repo": repo_id, "since": since})
            d3 = self._exec(_DRIFT_D3, {"repo": repo_id})

        spec_drift = [
            DriftItem(
                kind=row[0],
                id=row[1],
                path_or_name=row[2],
                last_touched=int(row[3]) if row[3] is not None else None,
            )
            for row in (*d1.result_set, *d2.result_set)
            if row
        ]
        doc_drift = [
            DriftItem(
                kind=row[0],
                id=row[1],
                path_or_name=row[2],
                doc_paths=[p for p in (row[3] or []) if p],
            )
            for row in d3.result_set or []
            if row
        ]
        return DriftReport(
            repo_id=repo_id,
            since=since,
            spec_drift=spec_drift,
            doc_drift=doc_drift,
        )
