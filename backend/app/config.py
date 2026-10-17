"""FalkorDB connection settings.

Secrets are never read here: only the non-secret host/port (and an optional
username/password if the environment provides one) are consumed via
``os.environ`` (AGENTS.md security rule). Never import or read ``.env``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_HOST = "localhost"
DEFAULT_PORT = 6379


@dataclass(frozen=True)
class FalkorDBConfig:
    """Immutable connection settings resolved from the environment."""

    host: str = DEFAULT_HOST
    port: int = DEFAULT_PORT
    username: str | None = None
    password: str | None = None

    @classmethod
    def from_env(cls) -> "FalkorDBConfig":
        host = os.environ.get("FALKORDB_HOST") or DEFAULT_HOST
        port_raw = os.environ.get("FALKORDB_PORT")
        try:
            port = int(port_raw) if port_raw else DEFAULT_PORT
        except ValueError:
            port = DEFAULT_PORT
        # Optional; absent for the local unauthenticated Docker instance.
        username = os.environ.get("FALKORDB_USERNAME") or None
        password = os.environ.get("FALKORDB_PASSWORD") or None
        return cls(host=host, port=port, username=username, password=password)
