import datetime
import json
import os
from dotenv import load_dotenv

from tools.tools import TOOLS
from utils.llm import get_client_and_model

load_dotenv()

client, model = get_client_and_model()


def call_llm(msgs, allowed_tool_defs):
    response = client.chat.completions.create(
        model=model,
        tools=allowed_tool_defs,
        messages=msgs
    )
    message_dict = response.choices[0].message.dict()
    # Remove keys with None values
    filtered_message = {k: v for k, v in message_dict.items() if v is not None}
    msgs.append(filtered_message)
    return response


def get_tool_response(tool_call, allowed_tool_mapping):
    tool_name = tool_call.function.name
    tool_args = json.loads(tool_call.function.arguments)
    print(f"Calling tool {tool_name} with args {tool_args}")
    tool_result = allowed_tool_mapping[tool_name](**tool_args)
    return {
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": json.dumps(tool_result),
    }


def generate_report() -> str:
    max_iterations = 10
    iteration_count = 0

    # Correct current date
    today = datetime.datetime.now()
    today_str = today.strftime("%A, %B %d, %Y")

    # Load report preferences
    preferences_path = os.path.join(os.path.dirname(__file__), "../report_personalization.json")
    try:
        with open(preferences_path, "r") as pref_file:
            report_prefs_dict = json.load(pref_file)
    except Exception as e:
        report_prefs_dict = {}

    report_prefs = ""
    allowed_tools = []
    if report_prefs_dict:
        for key, value in report_prefs_dict.items():
            if key == "include_tools" and isinstance(value, list):
                allowed_tools = value
            if isinstance(value, list):
                value_str = ", ".join(map(str, value))
            else:
                value_str = str(value)
            report_prefs += f"\n- {key}: {value_str}"

    # Filter tools based on allowed_tools
    allowed_tool_defs = [tool.to_openai_tool() for tool in TOOLS if tool.name in allowed_tools]
    allowed_tool_mapping = {tool.name: tool.invoke for tool in TOOLS if tool.name in allowed_tools}

    # Build styling rules based on allowed tools
    styling_rules = ["- Report must be written in full words suitable for text-to-speech."]
    
    if "get_weather" in allowed_tools:
        styling_rules.append("- The weather temperature must be shown as an integer (no decimals).")
    
    if "get_electricity_prices" in allowed_tools:
        styling_rules.append("- Give summary of the most important electricity prices. Instead of 'c/kWh', write 'cents per kilowatt hour'.")
    
    if "yle_news" in allowed_tools:
        styling_rules.append("- The news should be in markdown link format: [Short description](url), one per line.")
    
    # Add tone instruction
    tone_instruction = ""
    if report_prefs_dict.get("tone"):
        tone = report_prefs_dict["tone"]
        styling_rules.append(f"Write the entire report in a {tone} tone. Maintain this tone consistently throughout.")

    styling_rules_text = "\n".join(styling_rules) if len(styling_rules) > 1 else ""

    _messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant that generates daily reports. "
                "Use only the tools you have access to. "
                "Generate the concise final report as your last message."
            )
        },
        {
            "role": "user",
            "content": (
                f"It is {today_str}. Generate a concise report using only the available tools. "
                "Do not mention or create sections for content you cannot retrieve. "
                "Do not ask clarifying questions for missing inputs, use reasonable defaults. "
                f"Content preferences: {report_prefs}"
                "You must present the information in the same order as the tools are listed in content preferences."
                f"Report style rules: {styling_rules_text}" if styling_rules_text else ""
            )
        }
    ]

    messages = _messages.copy()
    # Fetch news items
    if "yle_news" in allowed_tools:
        news_tool = allowed_tool_mapping["yle_news"]
        news_result_str = news_tool(_invoke=True, category="latest")
        news_result = json.loads(news_result_str)

        news_links_for_llm = ""
        if "items" in news_result:
            news_links_for_llm += "\n\nHere are some recent news articles (pre-formatted as markdown links). Integrate them seamlessly into your news summary:\n"
            for item in news_result["items"][:5]:
                title = item.get("title", "No Title")
                link = item.get("link", "#")
                news_links_for_llm += f"- [{title}]({link})\n"

        messages[1]["content"] += news_links_for_llm

    # Fetch Stadissa events
    if "stadissa_tool" in allowed_tools:
        stadissa_tool = allowed_tool_mapping["stadissa_tool"]
        stadissa_result_str = stadissa_tool(category="musiikki")
        stadissa_result = json.loads(stadissa_result_str)

        stadissa_events_for_llm = ""
        if stadissa_result.get("status") == "success":
            stadissa_events_for_llm += "\n\nHere is a summary of events from Stadissa.fi:\n"
            stadissa_events_for_llm += stadissa_result.get(
                "summary", "No summary available.")
            if stadissa_result.get("events"):
                stadissa_events_for_llm += "\n\nFull list of events:\n"
                for event in stadissa_result["events"][:5]:  # Limit to 5 events
                    stadissa_events_for_llm += f"- {event.get('title')} at {event.get('venue')} ({event.get('url')})\n"
        else:
            stadissa_events_for_llm += f"\n\nNo events found from Stadissa.fi: {stadissa_result.get("message", "Unknown error")}"

        messages[1]["content"] += stadissa_events_for_llm

    try:
        while iteration_count < max_iterations:
            iteration_count += 1
            resp = call_llm(messages, allowed_tool_defs)
            print(
                f"Iteration {iteration_count}: {resp.choices[0].message.content}")
            tool_calls = resp.choices[0].message.tool_calls or []
            if not tool_calls:
                break

            for tool_call in tool_calls:
                tool_response_message = get_tool_response(tool_call, allowed_tool_mapping)
                messages.append(tool_response_message)
                print(
                    f"Tool {tool_call.function.name} response: {tool_response_message['content']}")

        if iteration_count >= max_iterations:
            print("Warning: Maximum iterations reached")

        report_content = messages[-1]["content"]

    except Exception as e:
        report_content = f"Error generating report: {e}"


    # Add timestamp
    report_with_timestamp = f"Report generated at: {today}\n\n{report_content}"

    if not os.path.exists("reports"):
        os.makedirs("reports")

    file_name = f"reports/report-{today.strftime('%Y-%m-%d_%H-%M-%S')}.txt"
    with open(file_name, "w") as f:
        f.write(report_with_timestamp)

    return report_with_timestamp
