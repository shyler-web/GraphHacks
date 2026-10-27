"""Deterministic Python comprehension-risk ranking.

This is a code-structure proxy, not a measurement of human comprehension.
It reads source files only: no LLM, FalkorDB, code execution, or writes.

A: nested control-flow complexity (50% of the score)
B: file/function size and branching overhead (40%)
E: missing module/function docstrings (10%)

The weights and normalization thresholds are explicit heuristics. In
particular, adding documentation can change the total score by at most 10
points; it cannot by itself count as a structural improvement.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path


WEIGHTS = {"A": 0.50, "B": 0.40, "E": 0.10}
EXCLUDED_DIRS = {
    ".git", ".venv", "venv", "node_modules", "__pycache__", ".tox",
    "build", "dist", ".mypy_cache", ".pytest_cache", "site-packages",
}
MAX_FILE_BYTES = 1_000_000


@dataclass(frozen=True)
class Signal:
    name: str
    risk: float  # normalized to 0..1; higher means harder to understand
    contribution: float  # points contributed to the 0..100 total
    evidence: dict[str, int | bool]


@dataclass(frozen=True)
class FileRisk:
    path: str
    score: float
    signals: dict[str, Signal]


@dataclass(frozen=True)
class SkippedFile:
    path: str
    reason: str


@dataclass(frozen=True)
class Ranking:
    root: str
    files: list[FileRisk]
    skipped: list[SkippedFile]
    methodology: dict[str, object]


class _Complexity(ast.NodeVisitor):
    """Count branches, with extra cost for nesting, inside one code unit."""

    BRANCHES = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.Try,
                ast.TryStar, ast.ExceptHandler, ast.IfExp, ast.Match)

    def __init__(self) -> None:
        self.depth = 0
        self.score = 0
        self.branches = 0

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        # Nested functions are scored independently by _function_nodes().
        return

    visit_AsyncFunctionDef = visit_FunctionDef

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        # Methods are scored independently; class bodies rarely contain flow.
        return

    def generic_visit(self, node: ast.AST) -> None:
        if isinstance(node, self.BRANCHES):
            self.branches += 1
            self.score += 1 + self.depth
            self.depth += 1
            super().generic_visit(node)
            self.depth -= 1
        elif isinstance(node, ast.BoolOp):
            extra = max(0, len(node.values) - 1)
            self.branches += extra
            self.score += extra
            super().generic_visit(node)
        else:
            super().generic_visit(node)


def _function_nodes(tree: ast.AST) -> list[ast.FunctionDef | ast.AsyncFunctionDef]:
    return [node for node in ast.walk(tree)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]


def _unit_complexity(statements: list[ast.stmt]) -> tuple[int, int]:
    visitor = _Complexity()
    for statement in statements:
        visitor.visit(statement)
    return visitor.score, visitor.branches


def _signal(name: str, risk: float, evidence: dict[str, int | bool]) -> Signal:
    risk = min(1.0, max(0.0, risk))
    return Signal(name, round(risk, 4), round(100 * WEIGHTS[name] * risk, 2), evidence)


def _soft_norm(value: int, reference: int) -> float:
    """Keep large files distinguishable instead of clipping at a threshold."""
    return value / (value + reference)


def score_python_source(source: str, path: str = "<source>") -> FileRisk:
    """Score one parseable Python file; raises SyntaxError for invalid source."""
    tree = ast.parse(source, filename=path)
    functions = _function_nodes(tree)
    units = [_unit_complexity(node.body) for node in functions]
    top_score, top_branches = _unit_complexity(tree.body)
    total_complexity = top_score + sum(score for score, _ in units)
    total_branches = top_branches + sum(branches for _, branches in units)
    max_complexity = max([top_score, *(score for score, _ in units)])
    max_branches = max([top_branches, *(branches for _, branches in units)])

    lines = source.splitlines()
    code_lines = sum(bool(line.strip()) and not line.lstrip().startswith("#")
                     for line in lines)
    max_function_lines = max(
        (max(1, (node.end_lineno or node.lineno) - node.lineno + 1)
         for node in functions), default=code_lines
    )
    documented = sum(bool(ast.get_docstring(node)) for node in functions)
    module_docstring = bool(ast.get_docstring(tree))

    # The total term prevents a complexity drop from simply extracting helpers.
    a_risk = (0.5 * _soft_norm(max_complexity, 15)
              + 0.5 * _soft_norm(total_complexity, 40))
    b_risk = (0.5 * _soft_norm(max_function_lines, 80)
              + 0.25 * _soft_norm(code_lines, 300)
              + 0.25 * _soft_norm(1 + max_branches, 20))
    if functions:
        e_risk = 1 - (0.8 * documented / len(functions)
                      + 0.2 * int(module_docstring))
    else:
        e_risk = 1 - int(module_docstring)

    signals = {
        "A": _signal("A", a_risk, {
            "total_complexity": total_complexity,
            "max_unit_complexity": max_complexity,
            "branch_points": total_branches,
        }),
        "B": _signal("B", b_risk, {
            "code_lines": code_lines,
            "max_function_lines": max_function_lines,
            "max_unit_branch_points": max_branches,
        }),
        "E": _signal("E", e_risk, {
            "functions": len(functions),
            "documented_functions": documented,
            "module_docstring": module_docstring,
        }),
    }
    return FileRisk(path, round(sum(s.contribution for s in signals.values()), 2), signals)


def rank_python_files(root: str | Path) -> Ranking:
    """Rank non-test Python files worst-first, skipping unreadable/invalid files."""
    repo = Path(root).expanduser().resolve()
    if not repo.is_dir():
        raise ValueError(f"Repository directory does not exist: {repo}")

    files: list[FileRisk] = []
    skipped: list[SkippedFile] = []
    for directory, dirs, names in os.walk(repo, followlinks=False):
        dirs[:] = sorted(name for name in dirs
                         if name not in EXCLUDED_DIRS
                         and not (Path(directory) / name).is_symlink())
        for name in sorted(names):
            if (not name.endswith(".py") or name.startswith(("test_", "verify_"))
                    or name.endswith("_test.py") or name == "conftest.py"):
                continue
            path = Path(directory) / name
            if path.is_symlink() or "tests" in path.relative_to(repo).parts:
                continue
            relative = path.relative_to(repo).as_posix()
            try:
                if path.stat().st_size > MAX_FILE_BYTES:
                    skipped.append(SkippedFile(relative, "larger than 1 MB"))
                    continue
                source = path.read_text(encoding="utf-8")
                files.append(score_python_source(source, relative))
            except (OSError, UnicodeError, SyntaxError) as exc:
                skipped.append(SkippedFile(relative, f"{type(exc).__name__}: {exc}"))

    files.sort(key=lambda item: (-item.score, item.path))
    return Ranking(
        str(repo), files, skipped,
        {
            "label": "Python comprehension-risk proxy; not validated human comprehension",
            "weights": WEIGHTS,
            "A": "Nested control-flow cost: half worst function or module body, half file total; smooth references 15 and 40",
            "B": "Half longest function, quarter file code lines, quarter worst unit branch count; smooth references 80, 300 and 20",
            "E": "Missing docstrings: 80% function coverage, 20% module docstring; maximum 10 score points",
            "excluded": "Tests, common generated/dependency directories, symlinks and files over 1 MB",
        },
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Rank Python files by explainable comprehension-risk proxy")
    parser.add_argument("repo", nargs="?", default=".", help="repository directory to read")
    parser.add_argument("--limit", type=int, default=20, help="maximum ranked files to show")
    parser.add_argument("--json", action="store_true", help="machine-readable report")
    args = parser.parse_args()
    if args.limit < 1:
        parser.error("--limit must be at least 1")
    try:
        report = rank_python_files(args.repo)
    except ValueError as exc:
        parser.error(str(exc))
    shown = report.files[:args.limit]
    if args.json:
        payload = asdict(report)
        payload["files"] = [asdict(item) for item in shown]
        payload["total_ranked"] = len(report.files)
        print(json.dumps(payload, indent=2))
    else:
        print(f"Python comprehension-risk proxy — {len(report.files)} files ranked, "
              f"{len(report.skipped)} skipped")
        print("Risk  A    B    E    File (signal columns are score points)")
        for item in shown:
            parts = item.signals
            print(f"{item.score:5.1f} {parts['A'].contribution:4.1f} "
                  f"{parts['B'].contribution:4.1f} {parts['E'].contribution:4.1f}  {item.path}")
            for key in ("A", "B", "E"):
                facts = ", ".join(f"{k}={v}" for k, v in parts[key].evidence.items())
                print(f"      {key}: {facts}")
        for item in report.skipped:
            print(f"Skipped {item.path}: {item.reason}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
