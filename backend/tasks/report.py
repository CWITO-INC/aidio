import datetime
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENROUTER_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

def generate_report():
    try:
        response = client.chat.completions.create(
            model="x-ai/grok-4-fast:free",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that generates reports."
                },
                {
                    "role": "user",
                    "content": "Generate a short report about the current state of the project."
                }
            ]
        )

        report_content = response.choices[0].message.content

    except Exception as e:
        report_content = f"Error generating report: {e}"

    now = datetime.datetime.now()
    report_with_timestamp = f"Report generated at: {now}\n\n{report_content}"

    if not os.path.exists("reports"):
        os.makedirs("reports")

    file_name = f"reports/report-{now.strftime('%Y-%m-%d_%H-%M-%S')}.txt"
    with open(file_name, "w") as f:
        f.write(report_with_timestamp)
