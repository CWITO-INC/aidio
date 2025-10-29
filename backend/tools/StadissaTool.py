from utils.llm import get_client_and_model, chat_with_rate_limit
import json
import time
from datetime import datetime, timedelta
import re
from typing import List, Dict, Optional, Any
import pandas as pd
from urllib.parse import urljoin, urlparse
import logging
from tools.Tool import Tool
import asyncio
from bs4 import BeautifulSoup
from services.crawl4ai_service import Crawl4AIService
from utils.cache import get_cached_response, set_cached_response

# Set up logging
logger = logging.getLogger(__name__)


def extract_event_data(html_content: str, base_url: str) -> List[Dict]:
    """Extract event information from the HTML content."""
    soup = BeautifulSoup(html_content, 'html.parser')
    events = []

    event_containers = soup.select('div.calendarevent')
    if not event_containers:
        logger.warning(
            "No event containers found. Check selectors or page content.")

    for container in event_containers:
        event = {}
        title_elem = container.select_one('div.calendareventtitle a')
        if title_elem:
            event['title'] = title_elem.get_text(strip=True)
            event['url'] = urljoin(base_url, title_elem['href'])
            event['description'] = "See event details for more information."
            venue_elem = container.select_one('div.calendareventvenue')
            if venue_elem:
                event['venue'] = venue_elem.get_text(strip=True)
            else:
                event['venue'] = "Unknown Venue"
            events.append(event)
    return events


class StadissaAPI:
    """Simple API wrapper for easy integration with AI agents"""

    def __init__(self):
        self.crawl4ai_service = Crawl4AIService()
        self.base_url = "https://www.stadissa.fi"

    async def get_events(self, category: str = None, date: str = None) -> List[Dict]:
        url = self.base_url

        params = []
        if category:
            category_slug = category.lower().replace(" ", "-").replace("&", "ja")
            params.append(f"category={category_slug}")

        if date:
            params.append(f"date={date}")

        if params:
            url += "?" + "&".join(params)

        logger.info(f"Crawl4AIService fetching URL: {url}")
        try:
            headers = {"Cookie": "qc_cmp_consent=1;"}  # Generic consent cookie
            crawl_result = await self.crawl4ai_service.crawl(url, headers=headers)

            if crawl_result and "html" in crawl_result:
                return extract_event_data(crawl_result["html"], self.base_url)
            else:
                logger.error(
                    f"Crawl4AIService failed to fetch content for {url}")
                return []
        except Exception as e:
            logger.error(
                f"Error fetching page with Crawl4AIService for {url}: {e}")
            return []


class StadissaTool(Tool):
    name: str = "stadissa_tool"
    description: str = "A tool to fetch events from Stadissa.fi based on category and city filters and summarize them."

    def __init__(self):
        super().__init__()
        self.api = StadissaAPI()
        self.available_categories = [
            "musiikki", "urheilu", "teatteri & taide", "muut menot"]
        self.available_cities = ["helsinki"]

        self.parameter_schema: Dict[str, Any] = {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "Filter by event category",
                    "enum": self.available_categories
                },
                "city": {
                    "type": "string",
                    "description": "Filter by city",
                    "enum": self.available_cities
                }
            },
            "required": []
        }

    def _invoke(self, category: Optional[str] = None, city: Optional[str] = None) -> str:
        """
        Tool function for AI agents to get Stadissa events and summarize them.

        Args:
            category: Filter by event category (e.g., "kulttuuri", "urheilu")
            city: Filter by city (e.g., "helsinki")

        Returns:
            JSON string of event summary for easy parsing
        """
        # Generate a cache key based on category and city
        cache_key_parts = []
        if category: cache_key_parts.append(f"category_{category}")
        if city: cache_key_parts.append(f"city_{city}")
        cache_key = "_".join(cache_key_parts) if cache_key_parts else "all_events"

        cached_result = get_cached_response(self.name, cache_key=cache_key)
        if cached_result:
            logger.info(f"Cache hit for StadissaTool with key: {cache_key}")
            return json.dumps(cached_result, ensure_ascii=False, indent=2)

        try:
            current_date = datetime.now().strftime("%Y-%m-%d")
            events = asyncio.run(self.api.get_events(
                category=category, date=current_date))
            print("Fetched events:", events)
            if events:
                # Limit to 10 events for LLM processing
                events_for_llm_processing = events[:10]

                # Format events for LLM
                event_strings = []
                for event in events_for_llm_processing:
                    event_strings.append(
                        f"- {event.get('title')} at {event.get('venue')} ({event.get('url')})")
                events_for_llm = "\n".join(event_strings)

                # Get LLM client and model
                client, model = get_client_and_model()

                # Create prompt for LLM
                prompt = f"Summarize the following events from Stadissa.fi. Focus on key details like event name, venue, and provide a brief overview. If there are many events, group similar ones or highlight the most prominent ones. Events:\n{events_for_llm}"
                messages = [
                    {"role": "system",
                        "content": "You are a helpful assistant that summarizes events."},
                    {"role": "user", "content": prompt}
                ]

                # Get summary from LLM
                response = chat_with_rate_limit(client, model, messages)
                print("LLM Response:", response)
                summary = response.choices[0].message.content

                result = {
                    "status": "success",
                    "summary": summary,
                    "count": len(events),
                    "filters": {"category": category, "city": city},
                    "events": events # Include all fetched events in the result
                }
            else:
                result = {
                    "status": "no_events",
                    "message": "No events found matching your request",
                    "filters": {"category": category, "city": city}
                }

            set_cached_response(self.name, result, cache_key=cache_key)
            return json.dumps(result, ensure_ascii=False, indent=2)

        except Exception as e:
            error_result = {
                "status": "error",
                "message": f"Error processing events or generating summary: {str(e)}",
                "filters": {"category": category, "city": city}
            }
            return json.dumps(error_result)
