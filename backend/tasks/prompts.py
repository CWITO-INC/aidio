from datetime import datetime

def get_prompt_messages():
    today_date = datetime.now().strftime("%A %dth of %B, %Y")
    location = "Helsinki"
    lunch_place = "Unicafe Kumpula"
    electricity_region = "Helsinki"


    return [
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
                f"It is {today_date}. Generate a concise report about the current weather in {location}, "
                f"the lunch menu at {lunch_place} and most important electricity prices in {electricity_region}. "
                "Also give a summary of the news, the news should be in markdown link format "
                "[Short description of the article](url to article), each article should be on its own line."
            )
        }
    ]