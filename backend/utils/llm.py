import os
import time
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List

import requests
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API = "https://openrouter.ai/api/v1"
OPENROUTER_KEY = os.getenv("OPENROUTER_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL")

# Gemini via OpenAI-compatible endpoint
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_KEY = os.getenv("GEMINI_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
LLM_PREFER = os.getenv("LLM_PREFER", "gemini").lower()

_cached_model: Optional[str] = None
_blocked_models: Dict[str, float] = {}


def _is_free_model(entry: dict) -> bool:
    mid = str(entry.get("id", ""))
    return bool(entry.get("free")) or mid.endswith(":free")


def get_best_free_model(force_provider: Optional[str] = None) -> str:
    """
    Fetch best available free model from OpenRouter (largest context first).
    Optional force_provider: e.g., "deepseek", "gemini", "meta" to bias selection.
    """
    global _cached_model

    if _cached_model and _cached_model not in _blocked_models:
        if not force_provider or force_provider.lower() in _cached_model.lower():
            return _cached_model

    try:
        res = requests.get(f"{OPENROUTER_API}/models", timeout=10)
        res.raise_for_status()
        data = res.json().get("data", [])

        free_models = [
            m for m in data if _is_free_model(m) and m["id"] not in _blocked_models
        ]
        if not free_models:
            print("[OpenRouter] No free models found — using fallback.")
            _cached_model = "gpt-4o-mini"
            return _cached_model

        candidates = free_models
        if force_provider:
            preferred = [
                m for m in free_models if force_provider.lower() in m["id"].lower()
            ]
            if preferred:
                candidates = preferred

        candidates.sort(key=lambda m: m.get("context_length", 0), reverse=True)
        _cached_model = candidates[0]["id"]
        print(f"[OpenRouter] Selected free model: {_cached_model}")
        return _cached_model

    except Exception as e:
        print(f"[OpenRouter] Error fetching models: {e}")
        _cached_model = "gpt-4o-mini"
        return _cached_model


def mark_model_blocked(model_id: str) -> None:
    _blocked_models[model_id] = time.time()
    print(
        f"[OpenRouter] Model '{model_id}' marked as blocked (rate/quota/deprecated).")


def get_openrouter_client_and_model(
    force_provider: Optional[str] = None,
) -> Tuple[OpenAI, str]:
    """
    Returns OpenAI-compatible client for OpenRouter + best free model.
    """
    if not OPENROUTER_KEY:
        raise ValueError("Missing environment variable: OPENROUTER_KEY")

    client = OpenAI(
        api_key=OPENROUTER_KEY,
        base_url=OPENROUTER_API,
        default_headers={
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "My Python LLM App",
        },
    )
    model = OPENROUTER_MODEL or get_best_free_model(
        force_provider=force_provider)
    return client, model


def get_gemini_client_and_model(model: Optional[str] = None) -> Tuple[OpenAI, str]:
    """
    Returns an OpenAI-compatible client for Gemini using the OpenAI bridge endpoint.
    """
    if not GEMINI_KEY:
        raise ValueError("Missing environment variable: GEMINI_KEY")

    client = OpenAI(
        api_key=GEMINI_KEY,
        base_url=GEMINI_BASE_URL,
    )
    return client, (model or GEMINI_MODEL)


# -------------------------
# Rate limit handling (OpenRouter)
# -------------------------

class RateLimitExceeded(Exception):
    def __init__(self, reset_ts_ms: Optional[int], message: str = "Rate limit exceeded"):
        self.reset_ts_ms = reset_ts_ms
        super().__init__(message)

    @property
    def reset_time(self) -> Optional[datetime]:
        if self.reset_ts_ms is None:
            return None
        return datetime.fromtimestamp(self.reset_ts_ms / 1000.0)


def _parse_reset_ms(headers) -> Optional[int]:
    reset_ms = headers.get("X-RateLimit-Reset")
    try:
        return int(reset_ms) if reset_ms is not None else None
    except Exception:
        return None


def _remaining_quota(headers) -> Optional[int]:
    rem = headers.get("X-RateLimit-Remaining")
    try:
        return int(rem) if rem is not None else None
    except Exception:
        return None


def chat_with_rate_limit(
    client: OpenAI,
    model: str,
    messages: List[Dict[str, str]],
    block_until_reset: bool = False,
    max_wait_seconds: int = 3600,
    **kwargs,
):
    """
    Chat completion with rate-limit handling for OpenRouter.
    On 429 or exhausted quota:
      - If block_until_reset=True and reset is known, sleeps (up to max_wait_seconds) and retries once.
      - Else raises RateLimitExceeded with reset timestamp so caller can queue/switch.
    """
    try:
        resp = client.chat.completions.create(
            model=model, messages=messages, **kwargs)
        return resp
    except Exception as e:
        text = str(e).lower()

        reset_ms = None
        remaining = None
        response = getattr(e, "response", None)
        if response is not None:
            try:
                headers = response.headers or {}
                reset_ms = _parse_reset_ms(headers)
                remaining = _remaining_quota(headers)
            except Exception:
                pass

        is_rl = "rate limit" in text or "quota" in text or "429" in text
        if is_rl or remaining == 0:
            if block_until_reset and reset_ms:
                wait_s = max(0, int(reset_ms / 1000) - int(time.time()))
                wait_s = min(wait_s, max_wait_seconds)
                if wait_s > 0:
                    human = datetime.fromtimestamp(
                        time.time() + wait_s).isoformat()
                    print(
                        f"[OpenRouter] Rate limit hit. Waiting {wait_s}s (until {human})...")
                    time.sleep(wait_s)
                    return client.chat.completions.create(
                        model=model, messages=messages, **kwargs
                    )

            mark_model_blocked(model)
            raise RateLimitExceeded(reset_ms, message=str(e)) from e

        if "model_not_found" in text or "not found" in text or "404" in text:
            global _cached_model
            _cached_model = None
            mark_model_blocked(model)
            raise

        raise


def get_client_and_model(
    # "gemini" or "openrouter"; overrides env if provided
    prefer: Optional[str] = None,
    # bias OpenRouter model selection, e.g., "deepseek"
    force_provider: Optional[str] = None,
) -> Tuple[OpenAI, str]:
    """
    Returns a single OpenAI-compatible client and model, preferring provider
    based on env LLM_PREFER (or 'prefer' arg), with fallback to the other.
    """
    choice = (prefer or LLM_PREFER).lower()
    print(choice)
    # Try preferred provider first
    if choice == "gemini" and GEMINI_KEY:
        try:
            return get_gemini_client_and_model()
        except Exception as e:
            print(
                f"[Gemini] Preferred failed: {e}. Falling back to OpenRouter...")

    if choice == "openrouter" and OPENROUTER_KEY:
        try:
            return get_openrouter_client_and_model(force_provider=force_provider)
        except Exception as e:
            print(
                f"[OpenRouter] Preferred failed: {e}. Falling back to Gemini...")

    # Fallback to whichever is available
    if GEMINI_KEY:
        try:
            return get_gemini_client_and_model()
        except Exception as e:
            print(f"[Gemini] Fallback failed: {e}")

    if OPENROUTER_KEY:
        return get_openrouter_client_and_model(force_provider=force_provider)
    print("KEY IS: ", GEMINI_KEY)
    raise RuntimeError(
        "No available provider. Set GEMINI_KEY and/or OPENROUTER_KEY.")
