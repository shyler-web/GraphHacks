"""Agent and Docker-runner checks using a small, owned Python fixture."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.characterization import CandidateResult, CommandResult, _run, freeze_suite
from app.cognitive_debt import score_python_source
from app.docker_executor import DockerExecutor
from app.refactor_agent import AgentError, run_refactor
from app.refactor_validation import evaluate_refactor


class FixtureExecutor:
    """Run only this test module's authored fixture, while recording calls."""

    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    def run(self, argv: list[str], workspace: Path, timeout: int):
        self.calls.append(argv)
        return _run(argv, workspace, timeout)


class RefactorAgentTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="clarify-agent-test-")
        self.root = Path(self.temporary.name)
        self.repo = self.root / "original"
        tests = self.repo / "tests"
        tests.mkdir(parents=True)
        self.original_source = (
            "def price(quantity):\n"
            "    if quantity <= 0:\n"
            "        return 0\n"
            "    return quantity * 5\n"
        )
        (self.repo / "price.py").write_text(self.original_source, encoding="utf-8")
        (tests / "test_existing.py").write_text(
            "import unittest\nfrom price import price\n"
            "class TestExisting(unittest.TestCase):\n"
            "    def test_zero(self): self.assertEqual(price(0), 0)\n",
            encoding="utf-8",
        )
        (tests / "test_characterization.py").write_text(
            "import unittest\nfrom price import price\n"
            "class TestCharacterization(unittest.TestCase):\n"
            "    def test_positive(self): self.assertEqual(price(3), 15)\n"
            "    def test_negative(self): self.assertEqual(price(-2), 0)\n",
            encoding="utf-8",
        )
        self.bundle = self.root / "frozen"
        self.output = self.root / "proposal"
        python = sys.executable
        freeze_suite(
            self.repo, "price.py", ["tests/test_characterization.py"],
            [python, "-m", "unittest", "discover", "-s", "tests", "-p", "test_existing.py"],
            [python, "-m", "unittest", "discover", "-s", "tests", "-p", "test_characterization.py"],
            self.bundle, allow_local_execution=True,
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_verified_patch_is_saved_without_editing_original(self) -> None:
        executor = FixtureExecutor()
        result = run_refactor(
            self.repo, "price.py", self.bundle, self.output,
            generator=lambda _system, _user: {
                "source": "def price(quantity):\n    return max(quantity, 0) * 5\n",
                "summary": "Simplify the branch while preserving zero and negative inputs",
            },
            executor=executor,
        )
        self.assertEqual(result.status, "verified")
        self.assertTrue(result.validation.accepted)
        self.assertGreaterEqual(result.validation.structural_drop, 1.0)
        self.assertTrue(result.verification.baseline.passed)
        self.assertTrue(result.verification.characterization.passed)
        self.assertEqual(len(executor.calls), 2)
        self.assertEqual((self.repo / "price.py").read_text(encoding="utf-8"), self.original_source)
        self.assertIn("return max(quantity, 0) * 5", (self.output / "proposal.diff").read_text(encoding="utf-8"))
        self.assertTrue((self.output / "result.json").is_file())

    def test_behavior_change_is_rejected_but_reviewable(self) -> None:
        executor = FixtureExecutor()
        result = run_refactor(
            self.repo, "price.py", self.bundle, self.output,
            generator=lambda _system, _user: {
                "source": self.original_source.replace("quantity * 5", "quantity * 6"),
                "summary": "A deliberately incorrect edit",
            },
            executor=executor,
        )
        self.assertEqual(result.status, "rejected")
        self.assertFalse(result.validation.checks["frozen_tests_passed"])
        self.assertTrue(result.verification.baseline.passed)
        self.assertFalse(result.verification.characterization.passed)
        self.assertTrue((self.output / "proposal.diff").is_file())
        self.assertEqual((self.repo / "price.py").read_text(encoding="utf-8"), self.original_source)

    def test_documentation_only_score_drop_is_rejected(self) -> None:
        executor = FixtureExecutor()
        documented = (
            '"""Pricing behavior."""\n\n'
            "def price(quantity):\n"
            '    """Return the price for a quantity."""\n'
            "    if quantity <= 0:\n"
            "        return 0\n"
            "    return quantity * 5\n"
        )
        result = run_refactor(
            self.repo, "price.py", self.bundle, self.output,
            generator=lambda _system, _user: {
                "source": documented, "summary": "Only added docstrings"
            },
            executor=executor,
        )
        self.assertTrue(result.verification.passed)
        self.assertEqual(result.status, "rejected")
        self.assertGreater(result.validation.intent_drop, 0)
        self.assertFalse(result.validation.checks["structural_score_improved"])

    def test_unchanged_complexity_split_across_helpers_is_rejected(self) -> None:
        before = score_python_source(
            "def classify(x):\n"
            "    if x > 0:\n        return 1\n"
            "    if x < 0:\n        return -1\n"
            "    return 0\n"
        )
        after = score_python_source(
            "def positive(x):\n"
            "    if x > 0:\n        return 1\n"
            "    return 0\n\n"
            "def negative(x):\n"
            "    if x < 0:\n        return -1\n"
            "    return 0\n\n"
            "def classify(x):\n"
            "    return positive(x) + negative(x)\n"
        )
        passed = CommandResult(["python"], 0, True, False, 1, "", "")
        verification = CandidateResult(True, True, passed, passed)
        decision = evaluate_refactor(before, after, verification, changed=True)
        self.assertEqual(decision.before_complexity, decision.after_complexity)
        self.assertEqual(decision.before_branch_points, decision.after_branch_points)
        self.assertFalse(decision.checks["complexity_not_relocated"])
        self.assertFalse(decision.accepted)

    def test_rejected_patch_demo_writes_a_failed_case(self) -> None:
        backend = Path(__file__).resolve().parents[1]
        demo_output = self.root / "rejected-demo"
        process = subprocess.run(
            [sys.executable, "-B", str(backend / "scripts" / "demo_rejected_patch.py"),
             str(demo_output)],
            cwd=backend, capture_output=True, text=True, check=False,
        )
        self.assertEqual(process.returncode, 0, process.stderr)
        self.assertEqual(json.loads(process.stdout)["case"],
                         "deliberately injected regression")
        report = json.loads((demo_output / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(report["status"], "rejected")
        self.assertTrue(report["verification"]["baseline"]["passed"])
        self.assertFalse(report["verification"]["characterization"]["passed"])

    def test_stale_frozen_target_is_rejected_before_generation(self) -> None:
        (self.repo / "price.py").write_text("def price(quantity): return 1\n", encoding="utf-8")
        with self.assertRaisesRegex(AgentError, "changed since the tests were frozen"):
            run_refactor(
                self.repo, "price.py", self.bundle, self.output,
                generator=lambda _system, _user: self.fail("Model should not be called"),
                executor=FixtureExecutor(),
            )
        self.assertFalse(self.output.exists())

    def test_invalid_model_source_is_rejected_before_tests(self) -> None:
        executor = FixtureExecutor()
        with self.assertRaisesRegex(AgentError, "does not parse"):
            run_refactor(
                self.repo, "price.py", self.bundle, self.output,
                generator=lambda _system, _user: {"source": "def broken(:\n"},
                executor=executor,
            )
        self.assertEqual(executor.calls, [])

    def test_default_generator_uses_existing_nebius_adapter(self) -> None:
        executor = FixtureExecutor()
        with patch("app.refactor_agent.llm.generate_json", return_value={
            "source": "def price(quantity):\n    return max(quantity, 0) * 5\n",
            "summary": "Simplified",
        }) as generate:
            result = run_refactor(
                self.repo, "price.py", self.bundle, self.output,
                executor=executor,
            )
        self.assertEqual(result.status, "verified")
        generate.assert_called_once()
        self.assertIn("price.py", generate.call_args.args[1])


class DockerExecutorTests(unittest.TestCase):
    def test_runner_uses_disposable_offline_limited_container(self) -> None:
        with tempfile.TemporaryDirectory(prefix="clarify-docker-test-") as temporary:
            workspace = Path(temporary)
            completed = subprocess.CompletedProcess([], 0, stdout="pass", stderr="")
            with patch("app.docker_executor.subprocess.run", return_value=completed) as invoke:
                with patch.dict("os.environ", {"NEBIUS_API_KEY": "fixture-secret"}):
                    result = DockerExecutor().run(["python", "-m", "unittest"], workspace, 10)
            self.assertTrue(result.passed)
            args = invoke.call_args.args[0]
            self.assertIn("--network=none", args)
            self.assertIn("--read-only", args)
            self.assertIn("--cap-drop=ALL", args)
            self.assertIn("--pull=never", args)
            self.assertIn("--rm", args)
            self.assertNotIn("fixture-secret", str(args))
            self.assertNotIn("NEBIUS_API_KEY", invoke.call_args.kwargs["env"])

    def test_timeout_forces_container_cleanup(self) -> None:
        with tempfile.TemporaryDirectory(prefix="clarify-docker-test-") as temporary:
            timeout = subprocess.TimeoutExpired(["docker", "run"], 1)
            cleanup = subprocess.CompletedProcess([], 0, stdout="", stderr="")
            with patch("app.docker_executor.subprocess.run", side_effect=[timeout, cleanup]) as invoke:
                result = DockerExecutor().run(["python", "-m", "unittest"], Path(temporary), 1)
            self.assertTrue(result.timed_out)
            self.assertEqual(invoke.call_count, 2)
            self.assertEqual(invoke.call_args_list[1].args[0][:3], ["docker", "rm", "-f"])


if __name__ == "__main__":
    unittest.main()
