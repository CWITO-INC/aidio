from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from tasks.report import generate_report
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
    return generate_report()

@app.get("/latest-report")
def get_latest_report():
    list_of_files = glob.glob('reports/*.txt') 
    if not list_of_files:
        return {"error": "No reports found."}
    latest_file = max(list_of_files, key=os.path.getctime)
    with open(latest_file, 'r') as f:
        content = f.read()
    return {"report": content}

@app.get("/")
def read_root():
    return {"Hello": "Worldsss"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str|None = None):
    return {"item_id": item_id, "5": q}
