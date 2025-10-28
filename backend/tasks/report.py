import datetime
import json
import os
from dotenv import load_dotenv

from tools.tools import TOOL_DEFS, TOOL_MAPPING
from utils.llm import get_client_and_model

load_dotenv()

client, model = get_client_and_model()


def call_llm(msgs):
    response = client.chat.completions.create(
        model=model,
        tools=TOOL_DEFS,
        messages=msgs
    )
    message_dict = response.choices[0].message.dict()
    # Remove keys with None values
    filtered_message = {k: v for k, v in message_dict.items() if v is not None}
    msgs.append(filtered_message)
    return response


def get_tool_response(tool_call):
    tool_name = tool_call.function.name
    tool_args = json.loads(tool_call.function.arguments)
    print(f"Calling tool {tool_name} with args {tool_args}")
    tool_result = TOOL_MAPPING[tool_name](**tool_args)
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

    _messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant that generates daily reports about "
                "various timely and local topics. You should use all the provided tools "
                "to gather information for your report. Generate the concise final report as your last message."
            )
        },
        {
            "role": "user",
            "content": (
                f"It is {today_str}. Generate a concise report about the current weather in Helsinki, "
                "the lunch menu at Unicafe Kumpula and most important electricity prices. "
                "Also give a summary of the news, the news should be in markdown link format "
                "[Short description of the article](url to article), each article should be on its own line."
            )
        }
    ]

    messages = _messages.copy()

    # Fetch news items
    news_tool = TOOL_MAPPING["yle_news"]
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
    stadissa_tool = TOOL_MAPPING["StadissaTool"]
    stadissa_result_str = stadissa_tool(category="musiikki", city="helsinki")
    stadissa_result = json.loads(stadissa_result_str)

    stadissa_events_for_llm = ""
    if stadissa_result.get("status") == "success":
        stadissa_events_for_llm += "\n\nHere is a summary of events from Stadissa.fi:\n"
        stadissa_events_for_llm += stadissa_result.get("summary", "No summary available.")
        if stadissa_result.get("interesting_events"):
            stadissa_events_for_llm += "\n\nParticularly interesting events:\n"
            for event in stadissa_result["interesting_events"]:
                stadissa_events_for_llm += f"- {event.get('title')} at {event.get('venue')} ({event.get('url')})\n"
    else:
        stadissa_events_for_llm += f"\n\nNo events found from Stadissa.fi: {stadissa_result.get("message", "Unknown error")}"

    messages[1]["content"] += stadissa_events_for_llm

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

    # Fetch dad joke
    try:
        dad_joke_tool = TOOL_MAPPING["get_dad_joke"]
        dad_joke_result = dad_joke_tool()

        if isinstance(dad_joke_result, str):
            try:
                dad_joke_json = json.loads(dad_joke_result)
            except json.JSONDecodeError:
                dad_joke_json = {"joke": dad_joke_result}
        else:
            dad_joke_json = dad_joke_result

        if isinstance(dad_joke_json, list) and len(dad_joke_json) > 0:
            dad_joke_text = dad_joke_json[0].get("joke", "No joke found.")
        elif isinstance(dad_joke_json, dict) and "joke" in dad_joke_json:
            dad_joke_text = dad_joke_json["joke"]
        else:
            dad_joke_text = "No joke found."
    except Exception as e:
        dad_joke_text = f"Failed to fetch dad joke: {e}"

    # Insert dad joke before the news summary
    if "News Summary:" in report_content:
        parts = report_content.split("News Summary:")
        report_content = (
            parts[0]
            + f"\n\nDad Joke of the Day: {dad_joke_text}\n\n"
            + "News Summary:" + parts[1]
        )
    else:
        report_content += f"\n\nDad Joke of the Day: {dad_joke_text}"

    # Add timestamp
    report_with_timestamp = f"Report generated at: {today}\n\n{report_content}"

    if not os.path.exists("reports"):
        os.makedirs("reports")

    file_name = f"reports/report-{today.strftime('%Y-%m-%d_%H-%M-%S')}.txt"
    with open(file_name, "w") as f:
        f.write(report_with_timestamp)

    return report_with_timestamp
