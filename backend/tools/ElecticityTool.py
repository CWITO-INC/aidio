import requests
import json
from datetime import datetime
from zoneinfo import ZoneInfo
from tools.Tool import Tool

TIMEZONE = ZoneInfo("Europe/Helsinki")

class ElectricityTool(Tool):
    name = "get_electricity_prices"
    description = "Get upcoming hourly electricity spot prices."
    parameter_schema = { "type": "object",
                         "properties": {},
                         "required": [] }

    def _invoke(self, **kwargs):
        url = "https://api.porssisahko.net/v1/latest-prices.json"

        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except requests.exceptions.RequestException as e:
            return json.dumps({"error": f"Failed to fetch data: {e}"})

        prices = data.get("prices", [])
        if not prices:
            return json.dumps({"error": "No price data returned from API"})

        # Keep only upcoming prices at full hours, converted to Finland time
        upcoming_prices = []
        for p in prices:
            start_utc = datetime.fromisoformat(p["startDate"].replace("Z", "+00:00")).astimezone(TIMEZONE)
            end_utc = datetime.fromisoformat(p["endDate"].replace("Z", "+00:00")).astimezone(TIMEZONE)

            if end_utc > datetime.now(TIMEZONE) and start_utc.minute == 0:
                upcoming_prices.append({
                    "date": start_utc.strftime("%Y-%m-%d"),
                    "hour": start_utc.strftime("%H:00"),
                    "price": f"{round(p['price'], 2)} c/kWh"
                })

        if not upcoming_prices:
            return json.dumps({"error": "No upcoming full-hour price data available"})

        result = {
            "timezone": str(TIMEZONE),
            "upcoming_hours": upcoming_prices
        }

        return json.dumps(result)
