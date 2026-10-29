"""Revalidate a saved proposal, then optionally open a review PR on GitHub.

Preparation is local and read-only for the input repo. Publishing is explicit:
it works in a disposable clone, includes frozen characterization tests, and
requires a working Docker runner plus authenticated git and GitHub CLI.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .characterization import (
    CommandExecutor, VerificationError, _copy_repo, _inside_repo, _sha256,
    verify_candidate,
)
from .cognitive_debt import score_python_source
from .docker_executor import DockerExecutor
from .refactor_agent import AgentError, AgentResult, _read_frozen_target, _review_text, render_intent_note
from .refactor_validation import evaluate_refactor


BRANCH_PATTERN = re.compile(r"codex/[a-z0-9][a-z0-9-]{0,63}\Z")
BASE_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9._/-]*\Z")
HTTPS_REMOTE = re.compile(r"https://github\.com/([\w.-]+)/([\w.-]+?)(?:\.git)?\Z")
SSH_REMOTE = re.compile(r"git@github\.com:([\w.-]+)/([\w.-]+?)(?:\.git)?\Z")
RunCommand = Callable[[list[str], Path | None], str]


class DeliveryError(Exception):
    """A proposal is unsafe to publish or a GitHub delivery command failed."""


@dataclass(frozen=True)
class PRPlan:
    target: str
    source_sha256: str
    title: str
    body: str


def _load_proposal(output: Path) -> tuple[dict, str]:
    try:
        report_path = output / "result.json"
        source_path = output / "proposed_source.py"
        if report_path.stat().st_size > 2_000_000 or source_path.stat().st_size > 120_000:
            raise DeliveryError("Saved proposal is too large")
        report = json.loads(report_path.read_text(encoding="utf-8"))
        source = source_path.read_text(encoding="utf-8")
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise DeliveryError(f"Cannot read saved proposal: {exc}") from exc
    if not isinstance(report, dict) or report.get("status") != "verified":
        raise DeliveryError("Only a previously verified proposal can be delivered")
    if hashlib.sha256(source.encode("utf-8")).hexdigest() != report.get("proposal_sha256"):
        raise DeliveryError("Proposed source changed after the agent saved it")
    try:
        ast.parse(source, filename=str(report.get("target")))
    except SyntaxError as exc:
        raise DeliveryError(f"Proposed source does not parse: {exc}") from exc
    return report, source


def _check_candidate(
    repo: Path, bundle: Path, target: str, source: str,
    executor: CommandExecutor, timeout_seconds: int,
) -> AgentResult:
    frozen_target, frozen_sha = _read_frozen_target(bundle)
    if target != frozen_target:
        raise DeliveryError("Proposal target does not match the frozen bundle")
    original_path = _inside_repo(repo, target)
    if _sha256(original_path) != frozen_sha:
        raise DeliveryError("Target changed since the tests were frozen")
    original = original_path.read_text(encoding="utf-8")
    if source == original:
        raise DeliveryError("Proposal contains no source change")
    with tempfile.TemporaryDirectory(prefix="clarify-delivery-check-") as temporary:
        candidate = Path(temporary) / "candidate"
        _copy_repo(repo, candidate)
        (candidate / target).write_text(source, encoding="utf-8")
        verification = verify_candidate(
            candidate, bundle, executor=executor, timeout_seconds=timeout_seconds,
        )
    before = score_python_source(original, target)
    after = score_python_source(source, target)
    validation = evaluate_refactor(before, after, verification, changed=True)
    if not validation.accepted:
        raise DeliveryError("Revalidation rejected proposal: " + "; ".join(validation.reasons))
    return AgentResult(
        "verified", "Frozen tests passed with structural improvement", target,
        "", "", "", hashlib.sha256(source.encode("utf-8")).hexdigest(),
        before, after, verification, validation, "",
    )


def prepare_pr(
    repo_path: str | Path, bundle_path: str | Path, output_path: str | Path,
    *, executor: CommandExecutor | None = None, timeout_seconds: int = 60,
) -> PRPlan:
    """Recheck saved source against frozen tests and build a reviewable PR body."""
    repo = Path(repo_path).expanduser().resolve()
    bundle = Path(bundle_path).expanduser().resolve()
    output = Path(output_path).expanduser().resolve()
    if not repo.is_dir() or not bundle.is_dir() or not output.is_dir():
        raise DeliveryError("Repository, frozen bundle, and proposal directories must exist")
    if output.is_relative_to(repo) or bundle.is_relative_to(repo):
        raise DeliveryError("Frozen bundle and proposal must be outside the repository")
    if timeout_seconds < 1:
        raise DeliveryError("timeout_seconds must be positive")
    report, source = _load_proposal(output)
    target = report.get("target")
    if not isinstance(target, str) or not target.endswith(".py"):
        raise DeliveryError("Saved target must be a Python file")
    summary = _review_text(report, "summary")
    intent = _review_text(report, "intent_note")
    question = _review_text(report, "reviewer_question", question=True)
    checked = _check_candidate(
        repo, bundle, target, source,
        executor or DockerExecutor().run, timeout_seconds,
    )
    result = AgentResult(
        checked.status, checked.reason, target, summary, intent, question,
        checked.proposal_sha256, checked.before, checked.after,
        checked.verification, checked.validation, str(output),
    )
    title = f"refactor: reduce Python risk in {Path(target).name}"
    return PRPlan(target, result.proposal_sha256, title, render_intent_note(result))


def _run_command(argv: list[str], cwd: Path | None = None) -> str:
    try:
        completed = subprocess.run(
            argv, cwd=cwd, shell=False, capture_output=True, text=True,
            errors="replace", timeout=120, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise DeliveryError(f"{argv[0]} could not run: {type(exc).__name__}") from exc
    if completed.returncode != 0:
        raise DeliveryError(f"{argv[0]} command failed: {completed.stderr[-1000:]}")
    return completed.stdout.strip()


def _github_repo(remote: str) -> str:
    match = HTTPS_REMOTE.fullmatch(remote) or SSH_REMOTE.fullmatch(remote)
    if not match:
        raise DeliveryError("Origin must be a GitHub HTTPS or SSH repository without embedded credentials")
    return f"{match.group(1)}/{match.group(2)}"


def _copy_frozen_tests(bundle: Path, checkout: Path) -> list[str]:
    try:
        manifest = json.loads((bundle / "manifest.json").read_text(encoding="utf-8"))
        entries = manifest["test_files"]
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as exc:
        raise DeliveryError(f"Frozen test manifest is invalid: {exc}") from exc
    paths: list[str] = []
    for entry in entries:
        relative = entry["path"]
        frozen = _inside_repo(bundle / "tests", relative)
        if _sha256(frozen) != entry["sha256"]:
            raise DeliveryError(f"Frozen test changed: {relative}")
        destination = checkout / relative
        if destination.resolve().is_relative_to(checkout) is False or destination.is_symlink():
            raise DeliveryError(f"Unsafe frozen test path: {relative}")
        if destination.exists() and _sha256(destination) != entry["sha256"]:
            raise DeliveryError(f"Remote base has a different test file: {relative}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(frozen, destination)
        paths.append(relative)
    return paths


def publish_pr(
    repo_path: str | Path, bundle_path: str | Path, output_path: str | Path,
    plan: PRPlan, *, branch: str, base: str = "master",
    executor: CommandExecutor | None = None, timeout_seconds: int = 60,
    command: RunCommand = _run_command,
) -> str:
    """Publish a verified one-file change from a disposable clone; return PR URL."""
    if not BRANCH_PATTERN.fullmatch(branch) or not BASE_PATTERN.fullmatch(base):
        raise DeliveryError("Use a codex/<lowercase-name> branch and a valid base branch")
    if shutil.which("gh") is None:
        raise DeliveryError("GitHub CLI (gh) is required to publish a PR")
    repo = Path(repo_path).expanduser().resolve()
    bundle = Path(bundle_path).expanduser().resolve()
    output = Path(output_path).expanduser().resolve()
    remote = command(["git", "remote", "get-url", "origin"], repo)
    github_repo = _github_repo(remote)
    report, source = _load_proposal(output)
    if report.get("target") != plan.target or hashlib.sha256(source.encode("utf-8")).hexdigest() != plan.source_sha256:
        raise DeliveryError("Proposal changed since the PR body was prepared")
    with tempfile.TemporaryDirectory(prefix="clarify-pr-") as temporary:
        checkout = Path(temporary) / "checkout"
        body_file = Path(temporary) / "PR_BODY.md"
        command(["git", "clone", "--quiet", "--branch", base, "--single-branch", "--", remote, str(checkout)], None)
        original = _inside_repo(checkout, plan.target)
        frozen_target, frozen_sha = _read_frozen_target(bundle)
        if frozen_target != plan.target or _sha256(original) != frozen_sha:
            raise DeliveryError("Remote base differs from the frozen original; freeze tests again")
        (checkout / plan.target).write_text(source, encoding="utf-8")
        tests = _copy_frozen_tests(bundle, checkout)
        # Recheck the actual remote base and included tests immediately before push.
        verified = verify_candidate(
            checkout, bundle, executor=executor or DockerExecutor().run,
            timeout_seconds=timeout_seconds,
        )
        if not verified.passed or not verified.target_changed:
            raise DeliveryError("Frozen tests failed in the fresh PR checkout")
        command(["git", "switch", "-c", branch], checkout)
        command(["git", "add", "--", plan.target, *tests], checkout)
        command(["git", "-c", "core.hooksPath=NUL", "commit", "-m", plan.title], checkout)
        command(["git", "push", "--set-upstream", "origin", branch], checkout)
        body_file.write_text(plan.body, encoding="utf-8")
        url = command([
            "gh", "pr", "create", "--repo", github_repo, "--base", base,
            "--head", branch, "--title", plan.title, "--body-file", str(body_file),
        ], checkout)
    if not url.startswith("https://github.com/") or "/pull/" not in url:
        raise DeliveryError("GitHub CLI did not return a pull request URL")
    return url


def main() -> int:
    parser = argparse.ArgumentParser(description="Recheck and optionally publish a verified refactor PR")
    parser.add_argument("repo", help="trusted local Git repository")
    parser.add_argument("bundle", help="frozen characterization bundle")
    parser.add_argument("proposal", help="verified agent output directory")
    parser.add_argument("--image", default="python:3.12-slim", help="pre-pulled Docker image")
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--publish", action="store_true", help="push a branch and create a GitHub PR")
    parser.add_argument("--branch", help="new codex/<name> branch, required with --publish")
    parser.add_argument("--base", default="master", help="GitHub base branch")
    args = parser.parse_args()
    try:
        runner = DockerExecutor(image=args.image).run
        plan = prepare_pr(args.repo, args.bundle, args.proposal,
                          executor=runner, timeout_seconds=args.timeout)
        body_file = Path(args.proposal) / "PR_BODY.md"
        body_file.write_text(plan.body, encoding="utf-8")
        if args.publish:
            if not args.branch:
                raise DeliveryError("--branch is required with --publish")
            url = publish_pr(
                args.repo, args.bundle, args.proposal, plan,
                branch=args.branch, base=args.base, executor=runner,
                timeout_seconds=args.timeout,
            )
            print(json.dumps({"url": url, "title": plan.title}, indent=2))
        else:
            print(json.dumps({"title": plan.title, "body_file": str(body_file)}, indent=2))
        return 0
    except (AgentError, DeliveryError, VerificationError, OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(2, f"PR delivery error: {exc}\n")


if __name__ == "__main__":
    raise SystemExit(main())
