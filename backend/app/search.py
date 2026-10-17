"""Tavily web-search adapter — replaces the Gemini ``google_search`` grounding.

Reads ``TAVILY_API_KEY`` from the environment. Returns a list of cited sources
(``{uri, title, content}``) so the L4/L5 "prior art" step is verifiable, not
asserted. A missing key raises :class:`SearchUnavailable` (mapped to 503).
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

TAVILY_URL = "https://api.tavily.com/search"
TIMEOUT = 30


class SearchUnavailable(Exception):
    """No Tavily key, or an upstream/parse failure."""


def is_configured() -> bool:
    return bool((os.environ.get("TAVILY_API_KEY") or "").strip())


def search(query: str, max_results: int = 5) -> list[dict]:
    """Search the web and return ``[{uri, title, content}]`` (empty on no hits)."""
    key = (os.environ.get("TAVILY_API_KEY") or "").strip()
    if not key:
        raise SearchUnavailable("TAVILY_API_KEY is not configured on the backend")

    body = {
        "api_key": key,
        "query": query,
        "max_results": max(1, min(int(max_results), 10)),
        "search_depth": "basic",
    }
    req = urllib.request.Request(
        TAVILY_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise SearchUnavailable(f"Tavily error {exc.code}: {detail}") from exc
    except Exception as exc:  # network / timeout / parse
        raise SearchUnavailable(f"Tavily request failed ({type(exc).__name__})") from exc

    return [
        {
            "uri": r.get("url", ""),
            "title": r.get("title", ""),
            "content": (r.get("content") or "")[:500],
        }
        for r in (data.get("results") or [])
    ]
