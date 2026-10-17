"""HTTP error translation for the FastAPI layer.

Only a *connection* failure means "FalkorDB unavailable" (503 — the rule-3
flip). Missing artifacts are a 409 (the demo prerequisites are not in place) and
anything else is a 500, so the cockpit can tell "start FalkorDB" apart from
"run the seed/sync".
"""

from __future__ import annotations

from fastapi import HTTPException
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError

# A connection refusal can surface as redis.ConnectionError/TimeoutError or a
# socket-level OSError subclass. Do NOT treat every OSError as a connection
# failure (a missing `git` binary is a 500, not "FalkorDB unavailable").
_CONNECTION_TYPES = (
    RedisConnectionError,
    RedisTimeoutError,
    ConnectionError,
    ConnectionRefusedError,
    ConnectionResetError,
    TimeoutError,
)


def service_error(exc: Exception) -> HTTPException:
    """Translate an engine exception into the right HTTP status."""
    if isinstance(exc, _CONNECTION_TYPES) or "Connection" in type(exc).__name__:
        return HTTPException(
            status_code=503,
            detail=f"FalkorDB unavailable ({type(exc).__name__})",
        )
    return HTTPException(
        status_code=500,
        detail=f"{type(exc).__name__}: {exc}",
    )


def missing_artifact(detail: str) -> HTTPException:
    """A required repo artifact (.git / graph.json / seed) is absent."""
    return HTTPException(status_code=409, detail=detail)
