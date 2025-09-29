from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from tasks.report import generate_report
from tools.tools import TOOL_MAPPING,TOOL_DEFS
import os
import glob



app = FastAPI()

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(generate_report, 'interval', minutes=60)
    scheduler.start()

@app.post("/generate-report")
def trigger_generate_report():
    return {"report": generate_report() }

@app.get("/latest-report")
def get_latest_report():
    list_of_files = glob.glob('reports/*.txt')
    if not list_of_files:
        return {"error": "No reports found."}
    latest_file = max(list_of_files, key=os.path.getctime)
    with open(latest_file, 'r') as f:
        content = f.read()
    return {"report": content}

@app.get("/tools")
def list_tools():
    return {"tools": TOOL_DEFS}

@app.post("/tools/{tool_name}")
def invoke_tool(tool_name: str, tool_args: dict):
    if tool_name not in TOOL_MAPPING:
        return {"error": f"Tool {tool_name} not found."}
    try:
        result = TOOL_MAPPING[tool_name](**tool_args)
        return {"result": result}
    except Exception as e:
        return {"error": str(e)}
