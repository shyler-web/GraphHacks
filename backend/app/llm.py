"""Provider-agnostic LLM adapter — Nebius Token Factory (OpenAI-compatible).

This is the **single LLM seam** (replaces the hard-coded Gemini REST call in
``main.py``). Nebius is OpenAI-compatible, so a chat completion is a plain
``/v1/chat/completions`` call with a Bearer token.

Environment (all read via ``os.environ``, never committed):

* ``NEBIUS_API_KEY``  — required (the provider token).
* ``NEBIUS_BASE_URL`` — default ``https://api.tokenfactory.nebius.com/v1``.
* ``NEBIUS_MODEL``    — default ``nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`` (a fast
  NVIDIA model with native JSON mode); set to any NVIDIA/NIM model id you have.

A missing key raises :class:`LLMUnavailable`, which the HTTP layer maps to a 503
so the cockpit falls back to its deterministic synthesizer instead of crashing.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

NEBIUS_BASE_URL = os.environ.get(
    "NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1"
).rstrip("/")
DEFAULT_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"
TIMEOUT = 90


class LLMUnavailable(Exception):
    """No provider key configured, or an upstream/parse failure."""


def is_configured() -> bool:
    return bool(_api_key())


def _api_key() -> str:
    return (os.environ.get("NEBIUS_API_KEY") or "").strip()


def _model() -> str:
    return (os.environ.get("NEBIUS_MODEL") or "").strip() or DEFAULT_MODEL


def chat_completion(
    system: str,
    user: str,
    *,
    json_mode: bool = False,
    temperature: float = 0.4,
) -> str:
    """One turn against Nebius; returns the assistant text (a JSON string when
    ``json_mode`` is set)."""
    key = _api_key()
    if not key:
        raise LLMUnavailable("NEBIUS_API_KEY is not configured on the backend")

    body: dict = {
        "model": _model(),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    req = urllib.request.Request(
        NEBIUS_BASE_URL + "/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise LLMUnavailable(f"LLM upstream error {exc.code}: {detail}") from exc
    except Exception as exc:  # network / timeout / parse
        raise LLMUnavailable(f"LLM request failed ({type(exc).__name__})") from exc

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMUnavailable("LLM returned an unexpected response shape") from exc


def generate_json(system: str, user: str, **kw) -> dict:
    """Return a parsed JSON object from a ``json_mode`` call.

    Tolerates models that wrap the JSON in a markdown code fence. Raises
    :class:`LLMUnavailable` on parse failure so callers can degrade gracefully.
    """
    raw = chat_completion(system, user, json_mode=True, **kw).strip()
    if raw.startswith("```"):
        raw = raw.lstrip("`").lstrip("json").strip()
        if raw.endswith("```"):
            raw = raw[:-3].strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LLMUnavailable(f"LLM JSON parse failed: {exc}") from exc
