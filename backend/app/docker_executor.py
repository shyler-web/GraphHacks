"""Run repository test commands in one disposable, resource-limited Docker container.

Only a temporary workspace is mounted. The container receives no application
credentials or network access. The image must already exist locally; builds,
downloads, and dependency installation are separate trusted setup steps.
"""

from __future__ import annotations

import os
import subprocess
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

from .characterization import CommandResult, MAX_OUTPUT_CHARS


def _docker_environment() -> dict[str, str]:
    allowed = {"PATH", "SystemRoot", "WINDIR", "USERPROFILE", "HOME",
               "LOCALAPPDATA", "APPDATA", "TEMP", "TMP", "TMPDIR"}
    return {key: value for key, value in os.environ.items() if key in allowed}


def _output(value: str | bytes | None) -> str:
    if isinstance(value, bytes):
        value = value.decode("utf-8", errors="replace")
    return (value or "")[-MAX_OUTPUT_CHARS:]


@dataclass(frozen=True)
class DockerExecutor:
    image: str = "python:3.12-slim"
    memory: str = "512m"
    cpus: str = "1"
    pids: int = 64

    def command(self, argv: list[str], workspace: Path, name: str) -> list[str]:
        """Build a shell-free invocation; only the temporary copy is mounted."""
        if not argv or not all(isinstance(part, str) and part for part in argv):
            raise ValueError("Test command must be a nonempty argument list")
        workspace = workspace.resolve()
        if not workspace.is_dir():
            raise ValueError(f"Workspace does not exist: {workspace}")
        # A frozen suite made on Windows may name its host Python executable.
        # The equivalent interpreter inside the image is simply `python`.
        executable = Path(argv[0]).name.lower()
        command = ["python" if executable in {"python.exe", "python3.exe"} else argv[0], *argv[1:]]
        return [
            "docker", "run", "--rm", "--name", name, "--pull=never",
            "--network=none", "--read-only", "--cap-drop=ALL",
            "--security-opt=no-new-privileges", "--user=65534:65534",
            f"--memory={self.memory}", f"--cpus={self.cpus}",
            f"--pids-limit={self.pids}",
            "--tmpfs=/tmp:rw,nosuid,nodev,noexec,size=64m",
            "--env=PYTHONDONTWRITEBYTECODE=1", "--env=PYTHONIOENCODING=utf-8",
            "--mount", f"type=bind,source={workspace},target=/workspace",
            "--workdir=/workspace", self.image, *command,
        ]

    def run(self, argv: list[str], workspace: Path, timeout_seconds: int) -> CommandResult:
        """Execute one command, forcibly removing a timed-out container."""
        name = f"clarify-check-{uuid.uuid4().hex[:12]}"
        command = self.command(argv, workspace, name)
        started = time.monotonic()
        try:
            process = subprocess.run(
                command, capture_output=True, text=True, errors="replace",
                timeout=timeout_seconds, check=False, env=_docker_environment(),
            )
            return CommandResult(
                argv, process.returncode, process.returncode == 0, False,
                round((time.monotonic() - started) * 1000),
                _output(process.stdout), _output(process.stderr),
            )
        except subprocess.TimeoutExpired as exc:
            try:
                subprocess.run(
                    ["docker", "rm", "-f", name], capture_output=True,
                    timeout=10, check=False, env=_docker_environment(),
                )
            except (OSError, subprocess.TimeoutExpired):
                pass
            return CommandResult(
                argv, None, False, True,
                round((time.monotonic() - started) * 1000),
                _output(exc.stdout), _output(exc.stderr),
            )
        except OSError as exc:
            return CommandResult(
                argv, None, False, False,
                round((time.monotonic() - started) * 1000),
                "", f"Docker unavailable ({type(exc).__name__}: {exc})",
            )
