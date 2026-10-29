"""Review handoff and GitHub delivery checks on an owned, tiny fixture."""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.characterization import _run, freeze_suite
from app.pr_delivery import DeliveryError, prepare_pr, publish_pr
from app.refactor_agent import AgentError, run_refactor


class PRDeliveryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="clarify-pr-test-")
        self.root = Path(self.temporary.name)
        self.repo = self.root / "repo"
        tests = self.repo / "tests"
        tests.mkdir(parents=True)
        self.source = (
            "def price(quantity):\n"
            "    if quantity <= 0:\n"
            "        return 0\n"
            "    return quantity * 5\n"
        )
        (self.repo / "price.py").write_text(self.source, encoding="utf-8")
        (tests / "test_existing.py").write_text(
            "import unittest\nfrom price import price\n"
            "class Existing(unittest.TestCase):\n"
            "    def test_zero(self): self.assertEqual(price(0), 0)\n",
            encoding="utf-8",
        )
        (tests / "test_characterization.py").write_text(
            "import unittest\nfrom price import price\n"
            "class Characterization(unittest.TestCase):\n"
            "    def test_positive(self): self.assertEqual(price(3), 15)\n"
            "    def test_negative(self): self.assertEqual(price(-2), 0)\n",
            encoding="utf-8",
        )
        self.bundle = self.root / "bundle"
        self.output = self.root / "output"
        python = sys.executable
        freeze_suite(
            self.repo, "price.py", ["tests/test_characterization.py"],
            [python, "-m", "unittest", "discover", "-s", "tests", "-p", "test_existing.py"],
            [python, "-m", "unittest", "discover", "-s", "tests", "-p", "test_characterization.py"],
            self.bundle, allow_local_execution=True,
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    @staticmethod
    def execute(argv: list[str], workspace: Path, timeout: int):
        return _run(argv, workspace, timeout)

    def propose(self, *, wrong: bool = False) -> None:
        source = (self.source.replace("quantity * 5", "quantity * 6") if wrong
                  else "def price(quantity):\n    return max(quantity, 0) * 5\n")
        run_refactor(
            self.repo, "price.py", self.bundle, self.output,
            generator=lambda _system, _user: {
                "source": source,
                "summary": "Simplify the quantity branch while retaining observed behavior",
                "intent_note": "The clamp makes the nonpositive case explicit; the reviewer should check overflow assumptions.",
                "reviewer_question": "What price should the code return for a negative quantity?",
            },
            executor=type("Executor", (), {"run": staticmethod(self.execute)})(),
        )

    def test_plan_revalidates_and_contains_auditable_note(self) -> None:
        self.propose()
        plan = prepare_pr(self.repo, self.bundle, self.output, executor=self.execute)
        self.assertIn("model-written; reviewer must verify", plan.body)
        self.assertIn("What price should the code return", plan.body)
        self.assertIn("Frozen characterization: passed", plan.body)
        self.assertIn("code-structure proxy", plan.body)
        self.assertEqual(plan.target, "price.py")
        self.assertEqual((self.repo / "price.py").read_text(encoding="utf-8"), self.source)

    def test_rejected_or_tampered_proposal_cannot_be_delivered(self) -> None:
        self.propose(wrong=True)
        with self.assertRaisesRegex(DeliveryError, "previously verified"):
            prepare_pr(self.repo, self.bundle, self.output, executor=self.execute)
        report = json.loads((self.output / "result.json").read_text(encoding="utf-8"))
        report["status"] = "verified"
        (self.output / "result.json").write_text(json.dumps(report), encoding="utf-8")
        with self.assertRaisesRegex(DeliveryError, "Revalidation rejected"):
            prepare_pr(self.repo, self.bundle, self.output, executor=self.execute)

    def test_source_edit_after_agent_run_is_rejected(self) -> None:
        self.propose()
        (self.output / "proposed_source.py").write_text("def price(x): return 0\n", encoding="utf-8")
        with self.assertRaisesRegex(DeliveryError, "changed after"):
            prepare_pr(self.repo, self.bundle, self.output, executor=self.execute)

    def test_publish_uses_fresh_checkout_and_includes_frozen_test(self) -> None:
        self.propose()
        plan = prepare_pr(self.repo, self.bundle, self.output, executor=self.execute)
        calls: list[list[str]] = []

        def command(argv: list[str], cwd: Path | None) -> str:
            calls.append(argv)
            if argv[:4] == ["git", "remote", "get-url", "origin"]:
                return "https://github.com/example/fixture.git"
            if argv[:2] == ["git", "clone"]:
                shutil.copytree(self.repo, Path(argv[-1]))
            if argv[:3] == ["gh", "pr", "create"]:
                return "https://github.com/example/fixture/pull/42"
            return ""

        with patch("app.pr_delivery.shutil.which", return_value="gh"):
            url = publish_pr(
                self.repo, self.bundle, self.output, plan,
                branch="codex/simplify-price", executor=self.execute, command=command,
            )
        self.assertEqual(url, "https://github.com/example/fixture/pull/42")
        add = next(argv for argv in calls if argv[:2] == ["git", "add"])
        self.assertEqual(add[3:], ["price.py", "tests/test_characterization.py"])
        self.assertTrue(any(argv[:2] == ["git", "push"] for argv in calls))
        self.assertTrue(any(argv[:3] == ["gh", "pr", "create"] for argv in calls))

    def test_remote_drift_stops_before_push(self) -> None:
        self.propose()
        plan = prepare_pr(self.repo, self.bundle, self.output, executor=self.execute)
        calls: list[list[str]] = []

        def command(argv: list[str], cwd: Path | None) -> str:
            calls.append(argv)
            if argv[:4] == ["git", "remote", "get-url", "origin"]:
                return "https://github.com/example/fixture.git"
            if argv[:2] == ["git", "clone"]:
                checkout = Path(argv[-1])
                shutil.copytree(self.repo, checkout)
                (checkout / "price.py").write_text("def price(x): return 7\n", encoding="utf-8")
            return ""

        with patch("app.pr_delivery.shutil.which", return_value="gh"):
            with self.assertRaisesRegex(DeliveryError, "Remote base differs"):
                publish_pr(
                    self.repo, self.bundle, self.output, plan,
                    branch="codex/simplify-price", executor=self.execute, command=command,
                )
        self.assertFalse(any(argv[:2] == ["git", "push"] for argv in calls))

    def test_missing_reviewer_question_is_rejected_by_agent(self) -> None:
        with self.assertRaisesRegex(AgentError, "reviewer_question"):
            run_refactor(
                self.repo, "price.py", self.bundle, self.output,
                generator=lambda _system, _user: {
                    "source": "def price(quantity):\n    return max(quantity, 0) * 5\n",
                    "summary": "Simplify the quantity branch while retaining observed behavior",
                    "intent_note": "The clamp makes the nonpositive case explicit for readers.",
                },
                executor=type("Executor", (), {"run": staticmethod(self.execute)})(),
            )
        self.assertFalse(self.output.exists())


if __name__ == "__main__":
    unittest.main()
