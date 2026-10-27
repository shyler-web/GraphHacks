"""Behavior checks for the baseline/freeze/verify boundary using owned fixtures."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from app.characterization import _copy_repo, VerificationError, freeze_suite, verify_candidate


class CharacterizationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="clarify-test-")
        self.root = Path(self.temporary.name)
        self.original = self.root / "original"
        tests = self.original / "tests"
        tests.mkdir(parents=True)
        (self.original / "price.py").write_text(
            "def price(quantity):\n"
            "    if quantity <= 0:\n"
            "        return 0\n"
            "    return quantity * 5\n",
            encoding="utf-8",
        )
        (tests / "test_existing.py").write_text(
            "import unittest\n"
            "from price import price\n"
            "class ExistingTests(unittest.TestCase):\n"
            "    def test_zero(self):\n"
            "        self.assertEqual(price(0), 0)\n",
            encoding="utf-8",
        )
        (tests / "test_characterization.py").write_text(
            "import unittest\n"
            "from price import price\n"
            "class CharacterizationTests(unittest.TestCase):\n"
            "    def test_three(self):\n"
            "        self.assertEqual(price(3), 15)\n",
            encoding="utf-8",
        )
        self.bundle = self.root / "frozen"
        self.baseline = [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_existing.py"]
        self.characterization = [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_characterization.py"]

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def freeze(self):
        return freeze_suite(
            self.original, "price.py", ["tests/test_characterization.py"],
            self.baseline, self.characterization, self.bundle,
            allow_local_execution=True,
        )

    def test_freeze_original_then_reject_behavior_change(self) -> None:
        frozen = self.freeze()
        self.assertTrue(frozen.baseline.passed)
        self.assertTrue(frozen.characterization.passed)
        self.assertTrue((self.bundle / "manifest.json").is_file())

        candidate = self.root / "candidate"
        shutil.copytree(self.original, candidate)
        unchanged = verify_candidate(candidate, self.bundle, allow_local_execution=True)
        self.assertTrue(unchanged.passed)
        self.assertFalse(unchanged.target_changed)

        (candidate / "price.py").write_text(
            (candidate / "price.py").read_text(encoding="utf-8").replace(
                "quantity * 5", "quantity * 6"
            ), encoding="utf-8",
        )
        rejected = verify_candidate(candidate, self.bundle, allow_local_execution=True)
        self.assertFalse(rejected.passed)
        self.assertTrue(rejected.target_changed)
        self.assertTrue(rejected.baseline.passed)
        self.assertFalse(rejected.characterization.passed)

    def test_modified_frozen_test_is_rejected_before_execution(self) -> None:
        self.freeze()
        candidate = self.root / "candidate"
        shutil.copytree(self.original, candidate)
        (candidate / "tests" / "test_characterization.py").write_text(
            "# removed the assertion\n", encoding="utf-8"
        )
        with self.assertRaisesRegex(VerificationError, "modified a frozen test"):
            verify_candidate(candidate, self.bundle, allow_local_execution=True)

    def test_characterization_must_pass_on_original_before_freeze(self) -> None:
        test_file = self.original / "tests" / "test_characterization.py"
        test_file.write_text(
            test_file.read_text(encoding="utf-8").replace("price(3), 15", "price(3), 99"),
            encoding="utf-8",
        )
        with self.assertRaisesRegex(VerificationError, "failed on original"):
            self.freeze()
        self.assertFalse(self.bundle.exists())

    def test_existing_baseline_must_pass_before_freeze(self) -> None:
        test_file = self.original / "tests" / "test_existing.py"
        test_file.write_text(
            test_file.read_text(encoding="utf-8").replace("price(0), 0", "price(0), 99"),
            encoding="utf-8",
        )
        with self.assertRaisesRegex(VerificationError, "Original baseline failed"):
            self.freeze()
        self.assertFalse(self.bundle.exists())

    def test_baseline_cannot_modify_the_target_and_still_pass(self) -> None:
        test_file = self.original / "tests" / "test_existing.py"
        test_file.write_text(
            "import unittest\nfrom pathlib import Path\n"
            "class ExistingTests(unittest.TestCase):\n"
            "    def test_rewrite(self):\n"
            "        Path('price.py').write_text('def price(quantity): return 99\\n')\n",
            encoding="utf-8",
        )
        with self.assertRaisesRegex(VerificationError, "modified the target file"):
            self.freeze()
        self.assertFalse(self.bundle.exists())

    def test_characterization_cannot_modify_the_target_and_still_pass(self) -> None:
        test_file = self.original / "tests" / "test_characterization.py"
        test_file.write_text(
            "import unittest\nfrom pathlib import Path\n"
            "class CharacterizationTests(unittest.TestCase):\n"
            "    def test_rewrite(self):\n"
            "        Path('price.py').write_text('def price(quantity): return 99\\n')\n",
            encoding="utf-8",
        )
        with self.assertRaisesRegex(VerificationError, "modified the target file"):
            self.freeze()
        self.assertFalse(self.bundle.exists())

    def test_local_execution_requires_explicit_opt_in(self) -> None:
        with self.assertRaisesRegex(VerificationError, "allow_local_execution"):
            freeze_suite(
                self.original, "price.py", ["tests/test_characterization.py"],
                self.baseline, self.characterization, self.bundle,
            )

    def test_staged_repo_excludes_env_files(self) -> None:
        (self.original / ".env").write_text("TEST_SECRET=dummy\n", encoding="utf-8")
        (self.original / ".env.local").write_text("TEST_SECRET=dummy\n", encoding="utf-8")
        (self.original / ".env.example").write_text("TEST_SECRET=\n", encoding="utf-8")
        staged = self.root / "staged"
        _copy_repo(self.original, staged)
        self.assertFalse((staged / ".env").exists())
        self.assertFalse((staged / ".env.local").exists())
        self.assertTrue((staged / ".env.example").is_file())

    def test_cli_freeze_and_verify(self) -> None:
        config = self.root / "config.json"
        config.write_text(json.dumps({
            "repo": str(self.original),
            "target": "price.py",
            "tests": ["tests/test_characterization.py"],
            "baseline_command": self.baseline,
            "characterization_command": self.characterization,
            "bundle": str(self.bundle),
        }), encoding="utf-8")
        backend = Path(__file__).resolve().parents[1]
        frozen = subprocess.run(
            [sys.executable, "-B", "-m", "app.characterization", "freeze",
             str(config), "--allow-local-execution"],
            cwd=backend, capture_output=True, text=True, check=False,
        )
        self.assertEqual(frozen.returncode, 0, frozen.stderr)
        self.assertTrue(json.loads(frozen.stdout)["characterization"]["passed"])

        candidate = self.root / "candidate"
        shutil.copytree(self.original, candidate)
        verified = subprocess.run(
            [sys.executable, "-B", "-m", "app.characterization", "verify",
             str(candidate), str(self.bundle), "--allow-local-execution"],
            cwd=backend, capture_output=True, text=True, check=False,
        )
        self.assertEqual(verified.returncode, 0, verified.stderr)
        self.assertTrue(json.loads(verified.stdout)["passed"])


if __name__ == "__main__":
    unittest.main()
