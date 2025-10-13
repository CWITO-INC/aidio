from dataclasses import dataclass
import json
import requests
from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from tools.Tool import Tool
from utils.cache import get_cached_response, set_cached_response

class UnicafeTool(Tool):
    name: str = "get_unicafe_menu"
    description: str = "Get the current lunch menu for a specified Unicafe location in Helsinki."
    parameter_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "The name of the Unicafe location. Options are: Keskusta, Kumpula, Meilahti, Viikki."
            }
        },
        "required": ["location"]
    }

    location_names = [
        "Keskusta",
        "Kumpula",
        "Meilahti",
        "Viikki",
    ]

    def _invoke(self, **kwargs):
        location = kwargs.get("location")
        base_url = "https://unicafe.fi/wp-json/swiss/v1/restaurants/?lang=en"

        all_restaurants_data = get_cached_response(self.name)

        if not all_restaurants_data:
            try:
                response = requests.get(base_url)
                response.raise_for_status()
                all_restaurants_data = response.json()
                set_cached_response(self.name, all_restaurants_data)
                print("Fetched new unicafe menu data")
            except requests.exceptions.RequestException as e:
                err_msg = f"Error fetching unicafe menu data: {e}"
                print(err_msg)
                return err_msg

        # Filter restaurants by location
        restaurants = []
        for restaurant_data in all_restaurants_data:
            restaurant_location = list(map(lambda l: l["name"], restaurant_data['location']))[0]
            if location == restaurant_location:

                current_date = datetime.now().strftime("%a %d.%m.")
                menus = list(filter(lambda m: m["date"] == current_date, restaurant_data["menuData"]["menus"]))

                # Take the menus, name and visitingHours from the restaurant menuData field
                restaurant = {
                    "name": restaurant_data["menuData"]["name"],
                    "visitingHours": restaurant_data["menuData"]["visitingHours"],
                    "menus": menus
                }
                restaurants.append(restaurant)

        return json.dumps(restaurants)
