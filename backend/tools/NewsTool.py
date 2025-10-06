from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from xml.etree import ElementTree as ET
from tools.Tool import Tool

import requests

_RSS_URL = "https://yle.fi/rss/uutiset/tuoreimmat"


def _http_get(url: str, timeout: float = 10.0) -> str:
    """Perform GET request and return XML text."""
    headers = {
        "User-Agent": "NewsTool/1.0 (+https://yle.fi/rss/uutiset/tuoreimmat)",
        "Accept": "application/rss+xml, */*;q=0.8",
    }
    resp = requests.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.text


def _text(elem: Optional[ET.Element]) -> Optional[str]:
    if elem is None:
        return None
    val = (elem.text or "").strip()
    return val or None


def _strip_html(text: Optional[str]) -> Optional[str]:
    if text is None:
        return None
    clean = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", clean).strip() or None


def _guess_datetime(text: Optional[str]) -> Optional[str]:
    """Parse RSS pubDate → ISO‑8601 UTC string."""
    if not text:
        return None
    fmts = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M %z",
        "%Y-%m-%dT%H:%M:%S%z",
    ]
    for fmt in fmts:
        try:
            dt = datetime.strptime(text, fmt).astimezone(timezone.utc)
            return dt.isoformat()
        except Exception:
            continue
    return None


def _parse_rss(xml_text: str) -> Dict[str, Any]:
    """Convert RSS XML to normalized Python dict."""
    root = ET.fromstring(xml_text)
    channel = root.find("channel")
    if channel is None:
        raise ValueError("Invalid RSS: missing <channel>")

    feed = {
        "title": _text(channel.find("title")),
        "link": _text(channel.find("link")),
        "description": _text(channel.find("description")),
        "language": _text(channel.find("language")),
        "last_build_at": _guess_datetime(_text(channel.find("lastBuildDate"))),
        "url": _RSS_URL,
    }

    items: List[Dict[str, Any]] = []
    for entry in channel.findall("item"):
        items.append(
            {
                "title": _text(entry.find("title")),
                "link": _text(entry.find("link")),
                "summary": _strip_html(_text(entry.find("description"))),
                "id": _text(entry.find("guid")) or _text(entry.find("link")),
                "published_at": _guess_datetime(_text(entry.find("pubDate"))),
                "author": _text(entry.find("author")),
                "categories": [
                    c.text.strip()
                    for c in entry.findall("category")
                    if c.text and c.text.strip()
                ]
                or None,
            }
        )

    return {"source": feed, "items": items}


@dataclass
class NewsTool(Tool):
    """Fetch the latest Yle “Tuoreimmat” news and return JSON."""

    name: str = "yle_latest_news"
    description: str = (
        "Fetch Yle's latest news (https://yle.fi/rss/uutiset/tuoreimmat) "
        "and return structured JSON with title, link, summary, categories, "
        "and publication time."
    )
    parameter_schema: Dict[str, Any] = None

    def __post_init__(self) -> None:
        # No arguments needed
        self.parameter_schema = {"type": "object", "properties": {}}

    def _invoke(self, **kwargs) -> str:
        """Fetch the RSS feed and return structured JSON text."""
        try:
            xml_text = _http_get(_RSS_URL, timeout=10.0)
            parsed = _parse_rss(xml_text)
        except Exception as e:
            result = {
                "source": {"url": _RSS_URL},
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "error": {"type": e.__class__.__name__, "message": str(e)},
            }
            return json.dumps(result, ensure_ascii=False, indent=2)

        output = {
            "source": parsed["source"],
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "count": len(parsed["items"]),
            "items": parsed["items"],
        }

        return json.dumps(output, ensure_ascii=False, indent=2)