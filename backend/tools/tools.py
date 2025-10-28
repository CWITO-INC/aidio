from tools.UnicafeTool import UnicafeTool
from tools.WeatherTool import WeatherTool
from tools.ElecticityTool import ElectricityTool
from tools.NewsTool import NewsTool
from tools.DadJokeTool import DadJokeTool 
from tools.StadissaTool import StadissaTool 
from tools.Tool import Tool

TOOLS: list[Tool] = [
    WeatherTool(),
    UnicafeTool(),
    ElectricityTool(),
    NewsTool(),
    DadJokeTool(), 
    StadissaTool()
]

TOOL_MAPPING = {tool.name: tool.invoke for tool in TOOLS}

TOOL_DEFS = [tool.to_openai_tool() for tool in TOOLS]
