"""Independent acceptance checks for a one-file refactor proposal.

Tests establish observed behavior. The A/B/E score is only a code-structure
proxy, so its reduction is reported separately and cannot be treated as proof
of human comprehension. Thresholds here are explicit MVP heuristics.
"""

from __future__ import annotations

from dataclasses import dataclass

from .characterization import CandidateResult
from .cognitive_debt import FileRisk


MIN_SCORE_DROP = 1.0
MIN_STRUCTURAL_DROP = 1.0


@dataclass(frozen=True)
class ValidationReport:
    accepted: bool
    reasons: list[str]
    checks: dict[str, bool]
    before_score: float
    after_score: float
    score_drop: float
    before_structural: float
    after_structural: float
    structural_drop: float
    intent_drop: float
    before_complexity: int
    after_complexity: int
    before_branch_points: int
    after_branch_points: int


def _structural(score: FileRisk) -> float:
    return score.signals["A"].contribution + score.signals["B"].contribution


def evaluate_refactor(
    before: FileRisk,
    after: FileRisk,
    verification: CandidateResult | None,
    *,
    changed: bool,
) -> ValidationReport:
    """Require frozen tests and a structural improvement, rejecting score games."""
    before_structural = _structural(before)
    after_structural = _structural(after)
    score_drop = round(before.score - after.score, 2)
    structural_drop = round(before_structural - after_structural, 2)
    intent_drop = round(
        before.signals["E"].contribution - after.signals["E"].contribution, 2
    )
    before_a = before.signals["A"].evidence
    after_a = after.signals["A"].evidence
    before_total = int(before_a["total_complexity"])
    after_total = int(after_a["total_complexity"])
    before_branches = int(before_a["branch_points"])
    after_branches = int(after_a["branch_points"])

    # Splitting an unchanged control-flow graph across new helpers can lower the
    # worst-function number without actually removing module-level complexity.
    complexity_relocated = (
        int(after.signals["E"].evidence["functions"])
        > int(before.signals["E"].evidence["functions"])
        and int(after_a["max_unit_complexity"])
        < int(before_a["max_unit_complexity"])
        and after_total >= before_total
        and after_branches >= before_branches
    )
    checks = {
        "code_changed": changed,
        "frozen_tests_passed": bool(verification and verification.passed),
        "overall_score_improved": score_drop >= MIN_SCORE_DROP,
        "structural_score_improved": structural_drop >= MIN_STRUCTURAL_DROP,
        "complexity_not_relocated": not complexity_relocated,
    }
    messages = {
        "code_changed": "Model proposed no code change",
        "frozen_tests_passed": "A frozen baseline or characterization test failed",
        "overall_score_improved": "Overall risk score did not drop by at least 1 point",
        "structural_score_improved": "Structural A+B score did not drop by at least 1 point",
        "complexity_not_relocated": "Complexity moved into new functions without reducing module totals",
    }
    reasons = [messages[name] for name, passed in checks.items() if not passed]
    return ValidationReport(
        accepted=not reasons,
        reasons=reasons,
        checks=checks,
        before_score=before.score,
        after_score=after.score,
        score_drop=score_drop,
        before_structural=round(before_structural, 2),
        after_structural=round(after_structural, 2),
        structural_drop=structural_drop,
        intent_drop=intent_drop,
        before_complexity=before_total,
        after_complexity=after_total,
        before_branch_points=before_branches,
        after_branch_points=after_branches,
    )
