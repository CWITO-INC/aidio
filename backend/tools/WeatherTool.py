from dataclasses import dataclass
import json
import requests
import os

from tools.Tool import Tool
from utils.cache import get_cached_response, set_cached_response

class WeatherTool(Tool):
    name = "get_weather"
    description = "Get current weather information for a specified city."
    parameter_schema = {
        "type": "object",
        "properties": {
            "city": {
                "type": "string",
                "description": "The name of the city to get the weather for."
            }
        },
        "required": ["city"]
    }

    def _invoke(self, **kwargs):
        city = kwargs.get("city")

        cached_data = get_cached_response(self.name, cache_key=city)
        if cached_data:
            return json.dumps(cached_data, ensure_ascii=False, indent=2)

        base_url = "http://api.openweathermap.org/data/2.5/weather"
        params = {
            'q': city,
            'appid': os.getenv("OPENWEATHERMAP_KEY"),
            'units': 'metric'
        }

        try:
            response = requests.get(base_url, params=params)
            response.raise_for_status()
            weather_data = response.json()
            set_cached_response(self.name, weather_data, cache_key=city)
            return json.dumps(weather_data)
        except requests.exceptions.RequestException as e:
            err_msg = f"Error fetching weather data: {e}"
            print(err_msg)
            return err_msg
