from tools.UnicafeTool import UnicafeTool
from tools.WeatherTool import WeatherTool
from tools.Tool import Tool

TOOLS: list[Tool] = [
    WeatherTool(),
    UnicafeTool()
]

TOOL_MAPPING = {tool.name: tool.invoke for tool in TOOLS}

TOOL_DEFS = [tool.to_openai_tool() for tool in TOOLS]
