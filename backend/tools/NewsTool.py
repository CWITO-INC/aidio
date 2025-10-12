import json
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from xml.etree import ElementTree as ET
from tools.Tool import Tool
from utils.cache import get_cached_response, set_cached_response

import requests
from bs4 import BeautifulSoup

RSS_FEEDS = {
    "latest": "https://yle.fi/rss/uutiset/tuoreimmat",
    "main": "https://yle.fi/rss/uutiset/paauutiset",
    "most_read": "https://yle.fi/rss/uutiset/luetuimmat",
    "domestic": "https://yle.fi/rss/t/18-34837/fi",
    "international": "https://yle.fi/rss/t/18-34953/fi",
    "economy": "https://yle.fi/rss/t/18-19274/fi",
    "politics": "https://yle.fi/rss/t/18-38033/fi",
    "culture": "https://yle.fi/rss/t/18-150067/fi",
    "sports": "https://yle.fi/rss/urheilu",
    "yle_news_english": "https://yle.fi/rss/news",
}

def _http_get(url: str, timeout: float = 10.0) -> str:
    """Perform GET request and return XML text."""
    headers = {
        "User-Agent": "NewsTool/1.0 (+https://yle.fi/rss/uutiset/tuoreimmat)",
        "Accept": "application/rss+xml, */*;q=0.8",
    }
    resp = requests.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.text


def _fetch_article_content(url: str) -> str:
    """Fetches the content of a given URL and extracts the main article text."""
    try:
        response = requests.get(url, timeout=10.0)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Attempt to find the main article content. This might need refinement
        # depending on the structure of the target websites.
        article_text = []
        for paragraph in soup.find_all('p'):
            article_text.append(paragraph.get_text())
        
        # Fallback if no paragraphs are found or if a more general approach is needed
        if not article_text:
            main_content = soup.find('main') or soup.find('article') or soup.find('body')
            if main_content:
                article_text = [p.get_text() for p in main_content.find_all('p')]
            
        return "\n\n".join(article_text) if article_text else "Could not extract article content."
    except requests.exceptions.RequestException as e:
        return f"Error fetching article from {url}: {e}"
    except Exception as e:
        return f"Error parsing article from {url}: {e}"


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


def _parse_rss(xml_text: str, rss_url: str) -> Dict[str, Any]:
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
        "url": rss_url,
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
    """Fetch the latest Yle “Tuoreimmat” news and return JSON, or fetch and return the content of a specific news article URL."""

    name: str = "yle_news"
    description: str = (
        "Fetch Yle's latest news (https://yle.fi/rss/uutiset/tuoreimmat) "
        "and return structured JSON with title, link, summary, categories, "
        "and publication time. Can also fetch the full content of a specific "
        "news article if a URL is provided."
    )
    parameter_schema: Dict[str, Any] = None

    def __post_init__(self) -> None:
        self.parameter_schema = {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "Optional: The news category to fetch. Defaults to 'latest'.",
                    "enum": list(RSS_FEEDS.keys()),
                    "default": "latest",
                },
                "article_url": {
                    "type": "string",
                    "description": "Optional: The URL of a news article to fetch its full content. This parameter is primarily for internal use or direct API calls, not for frontend selection.",
                }
            },
        }

    def _invoke(self, **kwargs) -> str:
        # If article_url is provided, it means the frontend is directly asking for article content
        # This bypasses the category selection and cache for RSS feeds.
        article_url = kwargs.get("article_url")
        if article_url:
            return _fetch_article_content(article_url)

        category = kwargs.get("category", "latest")
        rss_url = RSS_FEEDS.get(category, RSS_FEEDS["latest"])

        cached_data = get_cached_response(self.name, cache_key=category)
        if cached_data:
            return json.dumps(cached_data, ensure_ascii=False, indent=2)

        """Fetch the RSS feed and return structured JSON text."""
        try:
            xml_text = _http_get(rss_url, timeout=10.0)
            parsed = _parse_rss(xml_text, rss_url)
            output = {
                "source": parsed["source"],
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "count": len(parsed["items"]),
                "items": parsed["items"],
            }
            set_cached_response(self.name, output, cache_key=category)
            return json.dumps(output, ensure_ascii=False, indent=2)
        except Exception as e:
            result = {
                "source": {"url": rss_url},
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "error": {"type": e.__class__.__name__, "message": str(e)},
            }
            return json.dumps(result, ensure_ascii=False, indent=2)