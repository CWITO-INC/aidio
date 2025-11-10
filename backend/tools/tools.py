from tools.UnicafeTool import UnicafeTool
from tools.WeatherTool import WeatherTool
from tools.ElecticityTool import ElectricityTool
from tools.NewsTool import NewsTool
from tools.DadJokeTool import DadJokeTool 
from tools.StadissaTool import StadissaTool 
from tools.Tool import Tool
from tools.LocalEventsTool import LocalEventsTool

TOOLS: list[Tool] = [
    WeatherTool(),
    UnicafeTool(),
    ElectricityTool(),
    NewsTool(),
    DadJokeTool(), 
    StadissaTool(),
    LocalEventsTool()
]

TOOL_MAPPING = {tool.name: tool.invoke for tool in TOOLS}

TOOL_DEFS = [tool.to_openai_tool() for tool in TOOLS]
