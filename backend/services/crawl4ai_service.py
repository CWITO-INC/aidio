import httpx
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class Crawl4AIService:
    def __init__(self, base_url: str = "http://crawl4ai:11235"):
        self.base_url = base_url

    async def crawl(self, url: str, headers: Optional[Dict[str, str]] = None) -> Optional[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/crawl",
                    json={
                        "urls": [url],
                        "llm_extract": False,  # We will do our own extraction
                        "markdown": False  # We want the raw HTML
                    },
                    headers=headers,  # Pass headers here
                    timeout=30.0
                )
                return response.json()["results"][0]
        except httpx.RequestError as e:
            logger.error(
                f"An error occurred while requesting {e.request.url!r}: {e}")
            return None
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Error response {e.response.status_code} while requesting {e.request.url!r}: {e}")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred during crawl: {e}")
            return None
