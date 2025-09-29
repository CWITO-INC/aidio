from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, Optional

class Tool(ABC):
    """Abstract base class for tools that can be invoked and converted to OpenAI tool definitions."""

    name: str
    description: str
    parameter_schema: Dict[str, Any]

    def invoke(self, **kwargs) -> str:
        """Invoke the tool with the given keyword arguments."""
        print(f"Invoking tool {self.name} with args {kwargs}")
        return self._invoke(**kwargs)

    @abstractmethod
    def _invoke(self, **kwargs) -> str:
        """Internal method to be implemented by subclasses for actual tool logic."""
        pass

    def to_openai_tool(self) -> Dict[str, Any]:
        """Convert the tool to an OpenAI compatible tool definition."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameter_schema
            }
        }
