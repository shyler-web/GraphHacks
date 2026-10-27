"""Deterministic demo: a deliberately wrong patch is rejected by frozen tests.

This script runs only the tiny fixture authored below. It uses local Python for
that trusted fixture, so it needs neither Docker nor a Nebius key. It does not
represent a live-model or container integration test.
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.characterization import _run, freeze_suite  # noqa: E402
from app.refactor_agent import run_refactor  # noqa: E402


class TrustedFixtureExecutor:
    def run(self, argv: list[str], workspace: Path, timeout_seconds: int):
        return _run(argv, workspace, timeout_seconds)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", help="new directory for rejected proposal artifacts")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="clarify-rejected-demo-") as temporary:
        root = Path(temporary)
        repo = root / "repo"
        tests = repo / "tests"
        tests.mkdir(parents=True)
        source = (
            "def price(quantity):\n"
            "    if quantity <= 0:\n"
            "        return 0\n"
            "    return quantity * 5\n"
        )
        (repo / "price.py").write_text(source, encoding="utf-8")
        (tests / "test_existing.py").write_text(
            "import unittest\nfrom price import price\n"
            "class Existing(unittest.TestCase):\n"
            "    def test_zero(self): self.assertEqual(price(0), 0)\n",
            encoding="utf-8",
        )
        (tests / "test_characterization.py").write_text(
            "import unittest\nfrom price import price\n"
            "class Characterization(unittest.TestCase):\n"
            "    def test_positive(self): self.assertEqual(price(3), 15)\n",
            encoding="utf-8",
        )
        baseline = [sys.executable, "-m", "unittest", "discover", "-s", "tests",
                    "-p", "test_existing.py"]
        characterization = [sys.executable, "-m", "unittest", "discover", "-s",
                            "tests", "-p", "test_characterization.py"]
        bundle = root / "frozen"
        freeze_suite(
            repo, "price.py", ["tests/test_characterization.py"],
            baseline, characterization, bundle, allow_local_execution=True,
        )
        result = run_refactor(
            repo, "price.py", bundle, args.output,
            generator=lambda _system, _user: {
                "source": source.replace("quantity * 5", "quantity * 6"),
                "summary": "Deliberately injected regression for a rejection demo",
            },
            executor=TrustedFixtureExecutor(),
        )
    print(json.dumps({"case": "deliberately injected regression",
                      "result": asdict(result)}, indent=2))
    return 0 if (result.status == "rejected"
                 and result.verification is not None
                 and not result.verification.characterization.passed) else 1


if __name__ == "__main__":
    raise SystemExit(main())
