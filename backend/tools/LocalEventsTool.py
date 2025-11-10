import os
import json
import requests
from dataclasses import dataclass
from typing import Dict, Any
from datetime import datetime
from tools.Tool import Tool

@dataclass
class LocalEventsTool(Tool):
    """Finds local events using Ticketmaster API based on city and interests."""

    name: str = "local_events_tool"
    description: str = "Finds local events based on a city and optional interests. Uses personalization for defaults. ALWAYS returns a list of events in the 'events' field."
    parameter_schema: Dict[str, Any] = None
    api_key: str =  os.getenv("TICKETMASTER_API_KEY")
    def __post_init__(self) -> None:
        self.parameter_schema = {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "The city to search for events, e.g., 'Helsinki'. This should be based on the user's 'city' personalization."
                },
                "interests": {
                    "type": "string",
                    "description": "Optional: A comma-separated list of interests to filter by (e.g., 'music,art,sports'). This should be based on the user's 'interests' personalization."
                },
                "max_events": {
                    "type": "integer",
                    "description": "Maximum number of events to return (default: 10)",
                    "default": 10
                }
            },
            "required": ["city"]
        }

    def _map_interest_to_segment(self, interest: str) -> str:
        """Map user interests to Ticketmaster segment IDs."""
        interest_mapping = {
            "music": "KZFzniwnSyZfZ7v7nJ",
            "sports": "KZFzniwnSyZfZ7v7nE",
            "sport": "KZFzniwnSyZfZ7v7nE",
            "art": "KZFzniwnSyZfZ7v7na",
            "arts": "KZFzniwnSyZfZ7v7na",
            "theatre": "KZFzniwnSyZfZ7v7na",
            "theater": "KZFzniwnSyZfZ7v7na",
            "film": "KZFzniwnSyZfZ7v7nn",
            "movie": "KZFzniwnSyZfZ7v7nn",
            "movies": "KZFzniwnSyZfZ7v7nn",
            "family": "KZFzniwnSyZfZ7v7n1"
        }
        return interest_mapping.get(interest.lower(), None)

    def _invoke(self, **kwargs) -> str:
        city = kwargs.get("city")
        interests_input = kwargs.get("interests", "")
        max_events = kwargs.get("max_events", 10)
        
        if not city:
            return json.dumps({
                "error": "City parameter is required.",
                "city": None,
                "events": [],
                "summary": "Error: No city specified"
            })

        # Handle both string and list inputs for interests
        if isinstance(interests_input, list):
            interests = [i.strip().lower() for i in interests_input if i]
        elif isinstance(interests_input, str):
            interests = [i.strip().lower() for i in interests_input.split(",")] if interests_input else []
        else:
            interests = []

        try:
            # Ticketmaster Discovery API endpoint
            url = "https://app.ticketmaster.com/discovery/v2/events.json"
            
            # Build query parameters
            params = {
                "apikey": self.api_key if self.api_key and self.api_key != "YOUR_TICKETMASTER_API_KEY" else "YOUR_TICKETMASTER_API_KEY",
                "city": city,
                "countryCode": "FI",  # Finland
                "size": max_events,
                "sort": "date,asc",
                "locale": "*"  # All languages
            }
            
            # Add segment filter if interests are provided
            if interests:
                segment_ids = [self._map_interest_to_segment(i) for i in interests]
                segment_ids = [sid for sid in segment_ids if sid]  # Remove None values
                if segment_ids:
                    params["segmentId"] = ",".join(segment_ids)
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Get total elements from API
            total_elements = data.get('page', {}).get('totalElements', 0)
            
            # Check if events were found
            embedded = data.get("_embedded", {})
            events_data = embedded.get("events", [])
            
            # Format interests for display
            interests_str = ", ".join(interests) if interests else ""
            
            if not events_data or len(events_data) == 0:
                return json.dumps({
                    "city": city,
                    "interests_filter": interests,
                    "summary": f"No events found in {city}" + (f" matching interests: {interests_str}" if interests else ""),
                    "events": [],
                    "total_found": 0,
                    "timestamp": datetime.now().isoformat()
                }, ensure_ascii=False, indent=2)
            
            # Process events
            events = []
            for event in events_data:
                try:
                    # Extract event details
                    name = event.get("name", "Unknown Event")
                    event_url = event.get("url", "")
                    
                    # Get date/time
                    dates = event.get("dates", {})
                    start = dates.get("start", {})
                    local_date = start.get("localDate", "TBA")
                    local_time = start.get("localTime", "TBA")
                    
                    # Get venue
                    venues = event.get("_embedded", {}).get("venues", [])
                    venue_name = "TBA"
                    if venues and len(venues) > 0:
                        venue_name = venues[0].get("name", "TBA")
                    
                    # Get classifications (category)
                    classifications = event.get("classifications", [])
                    category = "General"
                    if classifications and len(classifications) > 0:
                        segment = classifications[0].get("segment", {})
                        genre = classifications[0].get("genre", {})
                        category = segment.get("name", genre.get("name", "General"))
                    
                    # Get price range
                    price_ranges = event.get("priceRanges", [])
                    price_info = "See website"
                    if price_ranges and len(price_ranges) > 0:
                        min_price = price_ranges[0].get("min")
                        max_price = price_ranges[0].get("max")
                        currency = price_ranges[0].get("currency", "EUR")
                        if min_price and max_price:
                            price_info = f"{min_price}-{max_price} {currency}"
                        elif min_price:
                            price_info = f"From {min_price} {currency}"
                    
                    # Get images
                    images = event.get("images", [])
                    image_url = None
                    if images and len(images) > 0:
                        image_url = images[0].get("url")
                    
                    events.append({
                        "name": name,
                        "venue": venue_name,
                        "category": category,
                        "date": local_date,
                        "time": local_time,
                        "price": price_info,
                        "url": event_url,
                        "image": image_url
                    })
                except Exception as e:
                    print(f"[LocalEventsTool] Warning: Failed to process event: {e}")
                    continue
            
            # Create summary
            summary = f"Found {len(events)} events in {city}"
            if interests:
                summary += f" matching interests: {interests_str}"
            
            result = {
                "city": city,
                "interests_filter": interests,
                "summary": summary,
                "events": events,
                "events_count": len(events),
                "total_found": total_elements,
                "timestamp": datetime.now().isoformat()
            }

            return json.dumps(result, ensure_ascii=False, indent=2)
            
        except requests.exceptions.Timeout:
            print(f"[LocalEventsTool] ERROR: Request timeout")
            return json.dumps({
                "error": "Request timeout",
                "message": "Ticketmaster API took too long to respond",
                "city": city,
                "events": [],
                "events_count": 0,
                "summary": f"Error: Could not fetch events for {city} (timeout)"
            }, ensure_ascii=False, indent=2)
            
        except requests.exceptions.RequestException as e:
            print(f"[LocalEventsTool] ERROR: API request failed: {e}")
            return json.dumps({
                "error": "API request failed",
                "message": str(e),
                "note": "Check if your API key is valid and you have internet connection",
                "city": city,
                "events": [],
                "events_count": 0,
                "summary": f"Error: Could not fetch events for {city}"
            }, ensure_ascii=False, indent=2)
            
        except Exception as e:
            print(f"[LocalEventsTool] ERROR: Unexpected error: {e}")
            return json.dumps({
                "error": "Unexpected error",
                "message": str(e),
                "city": city,
                "events": [],
                "events_count": 0,
                "summary": f"Error: Could not fetch events for {city}"
            }, ensure_ascii=False, indent=2)