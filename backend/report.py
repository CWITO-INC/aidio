import datetime
import json
from openai import OpenAI
import os
from dotenv import load_dotenv

from get_weather import get_weather

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENROUTER_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

TOOL_MAPPING = {
    "get_weather": get_weather
}

def call_llm(msgs):
    response = client.chat.completions.create(
        model="x-ai/grok-4-fast:free",
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "Fetch current weather data for a specified city.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "city": {
                                "type": "string",
                                "description": "Name of the city to get weather for"
                            }
                        },
                        "required": ["city"]
                    }
                }
            }
        ],
        messages=msgs
    )
    msgs.append(response.choices[0].message.dict())
    return response

def get_tool_response(tool_call):
    tool_name = tool_call.function.name
    tool_args = json.loads(tool_call.function.arguments)
    print(f"Calling tool {tool_name} with args {tool_args}")
    # Look up the correct tool locally, and call it with the provided arguments
    # Other tools can be added without changing the agentic loop
    tool_result = TOOL_MAPPING[tool_name](**tool_args)
    return {
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": json.dumps(tool_result),
    }

def Ω() -> str:

    max_iterations = 10
    iteration_count = 0

    _messages=[
        {
            "role": "system",
            "content": "You are a helpful assistant that generates weather reports. You can use the get_weather tool to fetch current weather data for specified city. Use the tool as needed to gather information before generating the final report as your last message."
        },
        {
            "role": "user",
            "content": "Generate a short report about the current weather in Helsinki and New York."
        }
    ]

    messages = _messages.copy()

    try:
        while iteration_count < max_iterations:
            iteration_count += 1
            resp = call_llm(messages)
            print(f"Iteration {iteration_count}: {resp.choices[0].message.content}")
            tool_calls = resp.choices[0].message.tool_calls or []
            if not tool_calls:
                break

            for tool_call in tool_calls:
                tool_response_message = get_tool_response(tool_call)
                messages.append(tool_response_message)
                print(f"Tool {tool_call.function.name} response: {tool_response_message['content']}")

        if iteration_count >= max_iterations:
            print("Warning: Maximum iterations reached")

        report_content = messages[-1]["content"]

    except Exception as e:
        report_content = f"Error generating report: {e}"

    now = datetime.datetime.now()
    report_with_timestamp = f"Report generated at: {now}\n\n{report_content}"

    if not os.path.exists("reports"):
        os.makedirs("reports")

    file_name = f"reports/report-{now.strftime('%Y-%m-%d_%H-%M-%S')}.txt"
    with open(file_name, "w") as f:
        f.write(report_with_timestamp)

    return report_with_timestamp
