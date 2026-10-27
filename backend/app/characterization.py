"""Freeze tests against original Python code, then verify candidate refactors.

The caller supplies existing-test and characterization-test commands as argv
lists. This module never generates tests or edits the input repositories. It
uses a fresh temporary copy for each run and accepts local execution only when
explicitly enabled. A sandbox executor is still required before accepting
untrusted repositories in a hosted service.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import time
from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import Any, Callable


EXCLUDED_DIRS = {
    ".git", ".venv", "venv", "node_modules", "__pycache__", ".pytest_cache",
    ".mypy_cache", ".tox", "build", "dist",
}
MANIFEST = "manifest.json"
MAX_OUTPUT_CHARS = 4_000


class VerificationError(Exception):
    """A prerequisite, original test, or frozen-test integrity check failed."""


@dataclass(frozen=True)
class CommandResult:
    argv: list[str]
    exit_code: int | None
    passed: bool
    timed_out: bool
    elapsed_ms: int
    stdout: str
    stderr: str


@dataclass(frozen=True)
class FrozenSuite:
    bundle: str
    target_sha256: str
    baseline: CommandResult
    characterization: CommandResult


@dataclass(frozen=True)
class CandidateResult:
    passed: bool
    target_changed: bool
    baseline: CommandResult
    characterization: CommandResult


CommandExecutor = Callable[[list[str], Path, int], CommandResult]


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _unchanged_target(workspace: Path, relative: str, expected_sha: str) -> bool:
    target = workspace / relative
    if target.is_symlink():
        return False
    try:
        return target.is_file() and _sha256(target) == expected_sha
    except OSError:
        return False


def _inside_repo(repo: Path, relative: str) -> Path:
    item = Path(relative)
    if item.is_absolute() or not item.parts or ".." in item.parts:
        raise VerificationError(f"Expected a repository-relative path: {relative}")
    resolved = (repo / item).resolve()
    if not resolved.is_relative_to(repo) or not resolved.is_file():
        raise VerificationError(f"File is missing or outside repository: {relative}")
    if (repo / item).is_symlink():
        raise VerificationError(f"Symlinked test/source files are unsupported: {relative}")
    return resolved


def _argv(value: Any) -> list[str]:
    if not isinstance(value, list) or not value or not all(
        isinstance(part, str) and part for part in value
    ):
        raise VerificationError("Test commands must be nonempty lists of arguments")
    return value


def _copy_repo(repo: Path, destination: Path) -> None:
    def ignore(directory: str, names: list[str]) -> set[str]:
        return {name for name in names if name in EXCLUDED_DIRS
                or (name.lower().startswith(".env") and name.lower() != ".env.example")
                or (Path(directory) / name).is_symlink()}

    shutil.copytree(repo, destination, ignore=ignore)


def _clean_environment() -> dict[str, str]:
    # Do not pass Nebius, GitHub, or other credentials to repository test code.
    allowed = {"PATH", "SystemRoot", "WINDIR", "TEMP", "TMP", "TMPDIR",
               "USERPROFILE", "HOME", "LOCALAPPDATA", "APPDATA", "LANG"}
    environment = {key: value for key, value in os.environ.items()
                   if key in allowed}
    environment["PYTHONIOENCODING"] = "utf-8"
    return environment


def _run(argv: list[str], cwd: Path, timeout_seconds: int) -> CommandResult:
    started = time.monotonic()
    try:
        process = subprocess.run(
            argv, cwd=cwd, env=_clean_environment(), shell=False,
            capture_output=True, text=True, errors="replace",
            timeout=timeout_seconds, check=False,
        )
        return CommandResult(
            argv, process.returncode, process.returncode == 0, False,
            round((time.monotonic() - started) * 1000),
            process.stdout[-MAX_OUTPUT_CHARS:], process.stderr[-MAX_OUTPUT_CHARS:],
        )
    except subprocess.TimeoutExpired as exc:
        return CommandResult(
            argv, None, False, True, round((time.monotonic() - started) * 1000),
            str(exc.stdout or "")[-MAX_OUTPUT_CHARS:],
            str(exc.stderr or "")[-MAX_OUTPUT_CHARS:],
        )
    except OSError as exc:
        return CommandResult(
            argv, None, False, False, round((time.monotonic() - started) * 1000),
            "", f"{type(exc).__name__}: {exc}",
        )


def _run_two_phases(
    baseline_workspace: Path,
    characterization_workspace: Path,
    test_files: dict[str, Path],
    target_file: str,
    baseline_command: list[str],
    characterization_command: list[str],
    timeout_seconds: int,
    executor: CommandExecutor,
) -> tuple[CommandResult, CommandResult]:
    # Existing tests run without the newly authored characterization files.
    for relative in test_files:
        (baseline_workspace / relative).unlink()
    baseline_sha = _sha256(baseline_workspace / target_file)
    baseline = executor(baseline_command, baseline_workspace, timeout_seconds)
    if baseline.passed and not _unchanged_target(baseline_workspace, target_file, baseline_sha):
        baseline = replace(baseline, passed=False,
                           stderr=baseline.stderr + "\nBaseline tests modified the target file")
    if not baseline.passed:
        return baseline, CommandResult(characterization_command, None, False, False, 0, "", "Not run: baseline failed")
    for relative, frozen_path in test_files.items():
        destination = characterization_workspace / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(frozen_path, destination)
    characterization_sha = _sha256(characterization_workspace / target_file)
    characterization = executor(characterization_command, characterization_workspace,
                                timeout_seconds)
    if (characterization.passed and not _unchanged_target(
            characterization_workspace, target_file, characterization_sha)):
        characterization = replace(
            characterization, passed=False,
            stderr=characterization.stderr + "\nCharacterization tests modified the target file",
        )
    return baseline, characterization


def freeze_suite(
    repo_path: str | Path,
    target_file: str,
    characterization_files: list[str],
    baseline_command: list[str],
    characterization_command: list[str],
    bundle_path: str | Path,
    *,
    allow_local_execution: bool = False,
    executor: CommandExecutor | None = None,
    timeout_seconds: int = 60,
) -> FrozenSuite:
    """Require both test phases to pass on original code, then freeze files."""
    if not allow_local_execution and executor is None:
        raise VerificationError("Local code execution requires allow_local_execution=True")
    runner = executor or _run
    repo = Path(repo_path).expanduser().resolve()
    if not repo.is_dir():
        raise VerificationError(f"Repository directory does not exist: {repo}")
    target = _inside_repo(repo, target_file)
    if not characterization_files or len(set(characterization_files)) != len(characterization_files):
        raise VerificationError("Provide one or more distinct characterization test files")
    tests = {name: _inside_repo(repo, name) for name in characterization_files}
    baseline_command = _argv(baseline_command)
    characterization_command = _argv(characterization_command)
    if timeout_seconds < 1:
        raise VerificationError("timeout_seconds must be positive")
    bundle = Path(bundle_path).expanduser().resolve()
    if bundle.exists() or bundle.is_relative_to(repo):
        raise VerificationError("Bundle must be a new directory outside the repository")

    with tempfile.TemporaryDirectory(prefix="clarify-original-") as temporary:
        baseline_workspace = Path(temporary) / "baseline"
        characterization_workspace = Path(temporary) / "characterization"
        _copy_repo(repo, baseline_workspace)
        _copy_repo(repo, characterization_workspace)
        baseline, characterization = _run_two_phases(
            baseline_workspace, characterization_workspace, tests, target_file,
            baseline_command, characterization_command,
            timeout_seconds, runner,
        )
    if not baseline.passed:
        raise VerificationError(f"Original baseline failed: {baseline.stderr or baseline.stdout}")
    if not characterization.passed:
        raise VerificationError(
            f"Characterization tests failed on original code: "
            f"{characterization.stderr or characterization.stdout}"
        )

    bundle.parent.mkdir(parents=True, exist_ok=True)
    temporary_bundle = Path(tempfile.mkdtemp(prefix="clarify-freeze-", dir=bundle.parent))
    try:
        manifest = {
            "schema_version": 1,
            "target_file": target_file,
            "target_sha256": _sha256(target),
            "baseline_command": baseline_command,
            "characterization_command": characterization_command,
            "test_files": [],
        }
        for relative, source in tests.items():
            destination = temporary_bundle / "tests" / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
            manifest["test_files"].append({"path": relative, "sha256": _sha256(destination)})
        (temporary_bundle / MANIFEST).write_text(
            json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
        )
        temporary_bundle.rename(bundle)
    finally:
        if temporary_bundle.exists():
            shutil.rmtree(temporary_bundle)
    return FrozenSuite(str(bundle), manifest["target_sha256"], baseline, characterization)


def verify_candidate(
    candidate_path: str | Path,
    bundle_path: str | Path,
    *,
    allow_local_execution: bool = False,
    executor: CommandExecutor | None = None,
    timeout_seconds: int = 60,
) -> CandidateResult:
    """Run the original commands with unchanged frozen tests on a candidate."""
    if not allow_local_execution and executor is None:
        raise VerificationError("Local code execution requires allow_local_execution=True")
    runner = executor or _run
    candidate = Path(candidate_path).expanduser().resolve()
    bundle = Path(bundle_path).expanduser().resolve()
    if not candidate.is_dir():
        raise VerificationError(f"Candidate directory does not exist: {candidate}")
    try:
        manifest = json.loads((bundle / MANIFEST).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise VerificationError(f"Frozen manifest unavailable: {exc}") from exc
    if manifest.get("schema_version") != 1:
        raise VerificationError("Unsupported frozen manifest version")
    target = _inside_repo(candidate, manifest["target_file"])
    baseline_command = _argv(manifest["baseline_command"])
    characterization_command = _argv(manifest["characterization_command"])
    if timeout_seconds < 1:
        raise VerificationError("timeout_seconds must be positive")
    tests: dict[str, Path] = {}
    for item in manifest["test_files"]:
        relative = item["path"]
        frozen = _inside_repo(bundle / "tests", relative)
        if _sha256(frozen) != item["sha256"]:
            raise VerificationError(f"Frozen test has changed: {relative}")
        current = _inside_repo(candidate, relative)
        if _sha256(current) != item["sha256"]:
            raise VerificationError(f"Candidate modified a frozen test: {relative}")
        tests[relative] = frozen

    with tempfile.TemporaryDirectory(prefix="clarify-candidate-") as temporary:
        baseline_workspace = Path(temporary) / "baseline"
        characterization_workspace = Path(temporary) / "characterization"
        _copy_repo(candidate, baseline_workspace)
        _copy_repo(candidate, characterization_workspace)
        baseline, characterization = _run_two_phases(
            baseline_workspace, characterization_workspace, tests,
            manifest["target_file"], baseline_command, characterization_command,
            timeout_seconds, runner,
        )
    return CandidateResult(
        baseline.passed and characterization.passed,
        _sha256(target) != manifest["target_sha256"],
        baseline, characterization,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Freeze and verify Python characterization tests")
    subcommands = parser.add_subparsers(dest="action", required=True)
    freeze = subcommands.add_parser("freeze", help="check original tests, then freeze")
    freeze.add_argument("config", help="JSON file with repo, target, tests, commands, bundle")
    verify = subcommands.add_parser("verify", help="check a candidate against frozen tests")
    verify.add_argument("candidate", help="candidate repository directory")
    verify.add_argument("bundle", help="frozen bundle directory")
    for command in (freeze, verify):
        command.add_argument("--allow-local-execution", action="store_true",
                             help="run tests locally only for a repository you trust")
        command.add_argument("--docker-image",
                             help="run tests in an offline, pre-pulled Docker image")
        command.add_argument("--timeout", type=int, default=60, help="seconds per phase")
    args = parser.parse_args()
    try:
        runner = None
        if args.docker_image:
            from .docker_executor import DockerExecutor
            runner = DockerExecutor(image=args.docker_image).run
        if args.action == "freeze":
            config = json.loads(Path(args.config).read_text(encoding="utf-8"))
            result = freeze_suite(
                config["repo"], config["target"], config["tests"],
                config["baseline_command"], config["characterization_command"],
                config["bundle"], allow_local_execution=args.allow_local_execution,
                executor=runner,
                timeout_seconds=args.timeout,
            )
            print(json.dumps(asdict(result), indent=2))
            return 0
        result = verify_candidate(
            args.candidate, args.bundle,
            allow_local_execution=args.allow_local_execution,
            executor=runner,
            timeout_seconds=args.timeout,
        )
        print(json.dumps(asdict(result), indent=2))
        return 0 if result.passed else 1
    except (VerificationError, OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(2, f"Verification error: {exc}\n")


if __name__ == "__main__":
    raise SystemExit(main())
