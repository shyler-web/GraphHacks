"""LangSmith tracing hook point (D3) — intentionally a no-op for now.

LangSmith is the chosen observability layer (``docs/decisions.md`` D3), but the
episodic parity slice must not depend on it: tracing is lazily enabled only when
``LANGSMITH_TRACING`` is set, and the import never blocks startup. This module
gives every call site a stable seam (``with span("memory.write_turn"):``) so
wiring the real ``@traceable`` later is a one-file change.
"""

from __future__ import annotations

import contextlib
import os
from typing import Iterator


@contextlib.contextmanager
def span(name: str) -> Iterator[None]:
    """No-op trace span.

    When LangSmith is configured this is the single place to emit a span; until
    then it is deliberately empty so no LLM/tracing credentials are required to
    run the memory tiers.
    """
    # Hook point: if os.environ.get("LANGSMITH_TRACING") == "true", start a real
    # LangSmith run here and finish it in the finally block.
    _ = name
    yield
