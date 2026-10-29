# One-file refactor workflow

This backend workflow is separate from the current React cockpit. It proposes a
change to one Python file, saves review artifacts, and can publish a GitHub PR
only when the operator explicitly runs the delivery command with `--publish`.
The original repository is never edited by the agent or PR delivery command.

## Prerequisites

- A Python repository with existing tests and at least one newly written
  characterization test for the target file. The characterization test must
  describe behavior observed in the original code.
- A working Docker CLI/daemon and a pre-pulled image containing the repository's
  test dependencies. For a standard-library-only project, `docker pull
  python:3.12-slim` is sufficient. Containers run without network access.
- `NEBIUS_API_KEY` set for live model generation. Set `NEBIUS_MODEL` to an
  available NVIDIA model suited to code edits; the existing Nebius adapter
  supplies its default when this is omitted.
- For optional PR publishing: authenticated Git push access to your GitHub
  repository and the authenticated GitHub CLI (`gh`). Use a trusted fork you
  control; the command does not publish to an arbitrary third-party repository.

## 1. Freeze the original behavior

Create a JSON config outside the repository. Use argument arrays, not shell
command strings. Example:

```json
{
  "repo": "C:/work/my-python-repo",
  "target": "src/calculate.py",
  "tests": ["tests/test_calculate_characterization.py"],
  "baseline_command": ["python", "-m", "unittest", "discover", "-s", "tests", "-p", "test_existing.py"],
  "characterization_command": ["python", "-m", "unittest", "discover", "-s", "tests", "-p", "test_calculate_characterization.py"],
  "bundle": "C:/work/frozen-calculate"
}
```

From `backend/`, run:

```text
python -m app.characterization freeze C:/work/freeze-config.json --docker-image python:3.12-slim
```

The existing tests run first without the new characterization file. That file
then has to pass against the original source. Only then is its content and hash
saved in the frozen bundle. A failing phase leaves no bundle.

## 2. Propose and verify one change

```text
python -m app.refactor_agent C:/work/my-python-repo src/calculate.py C:/work/frozen-calculate C:/work/proposal-1 --image python:3.12-slim
```

The agent sends only the target file and its A/B/E breakdown to Nemotron. It
accepts only a JSON response containing complete replacement Python source;
model-provided commands are never run. It writes the replacement into a
temporary copy, verifies that the frozen tests are unchanged, and runs baseline
and characterization commands in offline, resource-limited Docker containers.

The new output directory contains `proposed_source.py`, `proposal.diff`,
`INTENT_NOTE.md`, and `result.json`. The model must provide a concise summary,
an intent note, and one concrete question for a human reviewer. The intent is
clearly labeled as a model claim, while the note separately reports independent
test and score evidence. The result reports before/after A/B/E contributions and explicit
acceptance checks. A patch needs passing frozen tests, at least a one-point
overall and structural A+B improvement, and no unchanged complexity shifted
into new helpers. These thresholds are MVP heuristics. A passing test result
means behavior was preserved for the tested cases; it is not proof of full
equivalence or human comprehension. A rejected proposal is still saved for
review but is not applied to the repository.

For a predictable failure demonstration, run `python
scripts/demo_rejected_patch.py C:/work/rejected-demo` from `backend/`. It uses
an owned fixture and deliberately injects a wrong multiplication factor. Its
baseline passes, its frozen characterization test fails, and its result remains
`rejected`. It is labeled as a simulated failure, not a live model run.

The Docker image must already include dependencies because test containers have
no network access and do not install packages. Docker isolation still needs a
real daemon check on the deployment machine; the automated tests in this repo
use owned fixtures and a mocked Docker invocation.

## 3. Prepare and deliver the PR

Prepare the PR body first. This re-runs the frozen tests and structural checks
against the saved proposal, checks the proposal hash, and writes `PR_BODY.md`
inside the proposal directory. It does not push anything:

```text
python -m app.pr_delivery C:/work/my-python-repo C:/work/frozen-calculate C:/work/proposal-1 --image python:3.12-slim
```

Inspect `PR_BODY.md`, `INTENT_NOTE.md`, and `proposal.diff`. The PR body contains
the model-written intent, one question the reviewer should answer, and the
before/after score and frozen-test results. The reviewer question is a prompt
for human review, not an automated proof of comprehension.

To publish from a disposable fresh clone of the GitHub base branch:

```text
python -m app.pr_delivery C:/work/my-python-repo C:/work/frozen-calculate C:/work/proposal-1 --image python:3.12-slim --publish --base master --branch codex/simplify-calculate
```

The publisher checks that the remote base still matches the frozen original,
adds the refactored Python file and frozen characterization tests, runs the
frozen tests again in Docker, then commits, pushes, and opens the PR with `gh`.
It refuses rejected, changed, or stale proposals. GitHub credentials remain
with Git and `gh`; they are not passed into test containers. If publishing fails
after the push, the branch may already exist on GitHub and should be inspected
before retrying. The fixture tests cover this command's control flow, but an
actual Docker daemon, Nebius model call, and GitHub publication still need a
live integration run on the deployment machine.
