import requests
import json
from datetime import datetime
from zoneinfo import ZoneInfo
from tools.Tool import Tool

class TopicWritingTool:
    name = "topic_writing_tool"
    description = "Generate a report on a specific topic."
    parameter_schema = { "type": "object",
                         "properties": {
                             "topic": { "type": "string" },
                             "content": { "type": "string" },
                             "sources": { "type": "string" }
                         },
                         "required": ["topic", "content", "sources"] }

    def _invoke(self, **kwargs):
        topic = kwargs.get("topic")
        if not topic:
            return json.dumps({"error": "Topic is required"})

        content = kwargs.get("content")
        if not content:
            return json.dumps({"error": "Content is required"})

        sources = kwargs.get("sources")
        if not sources:
            return json.dumps({"error": "Sources are required"})

        return json.dumps({"topic": topic, "content": content, "sources": sources})
