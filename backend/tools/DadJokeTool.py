import json
import requests
from tools.Tool import Tool
from utils.cache import get_cached_response, set_cached_response

class DadJokeTool(Tool):
    name = "get_dad_joke"
    description = "Fetch a random dad joke from icanhazdadjoke API."
    parameter_schema = { "type": "object",
                         "properties": {},
                         "required": [] }

    def _invoke(self, **kwargs):
        cached_data = get_cached_response(self.name)
        if cached_data:
            return json.dumps(cached_data, ensure_ascii=False, indent=2)

        url = "https://icanhazdadjoke.com/"
        headers = {"Accept": "application/json"}

        try:
            resp = requests.get(url, headers=headers, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            result = {"joke": data.get("joke", "Couldn't fetch a dad joke.")}
        except requests.exceptions.RequestException as e:
            result = {"error": f"Error fetching dad joke: {e}"}

        set_cached_response(self.name, result)
        return json.dumps(result, ensure_ascii=False, indent=2)
