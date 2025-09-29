import requests
import os

def get_weather(city="Helsinki"):
    """
    Fetch weather data from OpenWeatherMap API

    Args:
        api_key (str): Your OpenWeatherMap API key
        city (str): City name to get weather for
        units (str): Temperature units ('metric', 'imperial', or 'kelvin')

    Returns:
        dict: Weather data or None if request fails
    """
    base_url = "http://api.openweathermap.org/data/2.5/weather"
    params = {
        'q': city,
        'appid': os.getenv("OPENWEATHERMAP_KEY"),
        'units': 'metric'
    }

    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching weather data: {e}")
        return None
