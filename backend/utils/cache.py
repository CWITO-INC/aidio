import os
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

_CACHE_DIR = "cache"
_DEFAULT_CACHE_DURATION = timedelta(minutes=1)

def _get_cache_file_path(tool_name: str) -> str:
    return os.path.join(_CACHE_DIR, f"{tool_name}_cache.json")

def _load_cache_file(cache_file_path: str) -> Dict[str, Any]:
    if not os.path.exists(cache_file_path):
        return {"timestamp": None, "data": {}}
    try:
        with open(cache_file_path, "r") as f:
            cache_data = json.load(f)
            if cache_data.get("timestamp"):
                cache_data["timestamp"] = datetime.fromisoformat(cache_data["timestamp"])
            return cache_data
    except (FileNotFoundError, json.JSONDecodeError):
        return {"timestamp": None, "data": {}}

def _save_cache_file(cache_file_path: str, cache_data: Dict[str, Any]):
    os.makedirs(_CACHE_DIR, exist_ok=True)
    serializable_cache = cache_data.copy()
    if serializable_cache.get("timestamp"):
        serializable_cache["timestamp"] = serializable_cache["timestamp"].isoformat()
    with open(cache_file_path, "w") as f:
        json.dump(serializable_cache, f, ensure_ascii=False, indent=2)

def get_cached_response(tool_name: str, cache_key: Optional[str] = None) -> Optional[Any]:
    cache_file_path = _get_cache_file_path(tool_name)
    cache = _load_cache_file(cache_file_path)
    now = datetime.now(timezone.utc)

    if cache["timestamp"] and (now - cache["timestamp"]) < _DEFAULT_CACHE_DURATION:
        if cache_key:
            return cache["data"].get(cache_key)
        return cache["data"]
    return None

def set_cached_response(tool_name: str, response_data: Any, cache_key: Optional[str] = None):
    cache_file_path = _get_cache_file_path(tool_name)
    cache = _load_cache_file(cache_file_path)
    now = datetime.now(timezone.utc)

    cache["timestamp"] = now
    if cache_key:
        if not isinstance(cache["data"], dict):
            cache["data"] = {}
        cache["data"][cache_key] = response_data
    else:
        cache["data"] = response_data
    _save_cache_file(cache_file_path, cache)
