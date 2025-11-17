import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from tasks.report import generate_report
from tools.tools import TOOL_MAPPING, TOOL_DEFS
from fastapi.responses import StreamingResponse
from services.tts import text_to_speech, get_available_voices
from pydantic import BaseModel
import glob
import io
import os
import json


app = FastAPI()


class TTSRequest(BaseModel):
    text: str
    voice: str = "Rachel"

class TTSSampleRequest(BaseModel):
    voice_id: str


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


# @app.on_event("startup")
# def start_scheduler():
#     scheduler = BackgroundScheduler()
#     scheduler.add_job(generate_report, 'interval', minutes=60)
#     scheduler.start()


@app.post("/generate-report")
def trigger_generate_report():
    return {"report": generate_report()}


@app.get("/latest-report")
def get_latest_report():
    list_of_files = glob.glob('reports/*.txt')
    print(list_of_files)
    if not list_of_files:
        return {"error": "No reports found."}
    latest_file = max(list_of_files, key=os.path.getctime)
    with open(latest_file, 'r') as f:
        content = f.read()
    return {"report": content}


@app.get("/tools")
def list_tools():
    return {"tools": TOOL_DEFS}


def ensure_personalization_file():
    """Create personalization file from template if it doesn't exist."""
    prefs_path = os.path.join(os.path.dirname(__file__), "report_personalization.json")
    template_path = os.path.join(os.path.dirname(__file__), "report_personalization.template.json")
    
    if not os.path.exists(prefs_path):
        try:
            # Copy template if it exists
            with open(template_path, "r") as template_file:
                default_prefs = json.load(template_file)

            # Write default preferences to new file
            with open(prefs_path, "w") as f:
                json.dump(default_prefs, f, indent=4)
                
        except Exception as e:
            logging.error(f"Failed to create personalization file: {e}")

@app.get("/personalization")
def get_personalization():
    """Return the current report personalization as JSON."""
    prefs_path = os.path.join(os.path.dirname(__file__), "report_personalization.json")
    ensure_personalization_file()
    try:
        with open(prefs_path, "r") as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        return {}
    except Exception as e:
        return {"error": str(e)}


@app.post("/personalization")
def set_personalization(prefs: dict):
    """Overwrite the report_personalization.json file with provided prefs."""
    prefs_path = os.path.join(os.path.dirname(__file__), "report_personalization.json")
    try:
        with open(prefs_path, "w") as f:
            json.dump(prefs, f, indent=4)
        return {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}


@app.post("/tools/{tool_name}")
def invoke_tool(tool_name: str, tool_args: dict):
    if tool_name not in TOOL_MAPPING:
        return {"error": f"Tool {tool_name} not found."}
    try:
        result = TOOL_MAPPING[tool_name](**tool_args)
        return {"result": result}
    except Exception as e:
        return {"error": str(e)}


@app.post("/tts")
def generate_tts(request: TTSRequest):
    """Generate speech from text and return as audio file."""
    try:
        audio_bytes = text_to_speech(request.text, request.voice)
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
    except Exception as e:
        return {"error": str(e)}
    
def transcribe_report(report_name: str):
    """Helper function to transcribe an audio file given its path."""
    # First check if transcription already exists
    audio_path = f'reports/audio/{report_name}.mp3'
    transcript_path = f'reports/transcripts/{report_name}.json'
    if os.path.exists(transcript_path):
        with open(transcript_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    try:
        with open(audio_path, 'rb') as f:
            audio_bytes = f.read()
        
        from services.stt import create_transcription
        transcription = create_transcription(audio_bytes)
        # Save transcription as JSON
        os.makedirs('reports/transcripts', exist_ok=True)
        with open(transcript_path, 'w', encoding='utf-8') as f:
            f.write(transcription.json())

        return transcription
    except Exception as e:
        raise Exception(f"Error transcribing audio file: {str(e)}")
    
@app.post("/transcribe-latest")
def transcribe_audio():
    """Transcribe the latest audio file in the 'reports/audio' directory."""
    import glob
    list_of_files = glob.glob('reports/audio/*')
    if not list_of_files:
        return {"error": "No audio files found."}
    latest_file = max(list_of_files, key=os.path.getctime)
    report_name = os.path.splitext(os.path.basename(latest_file))[0]
    return transcribe_report(report_name)

@app.post("/tts/sample")
def generate_sample_tts(request: TTSSampleRequest):
    """Generate a short sample for a given voice ID."""
    try:
        sample_text = "Hello! You can choose my voice for your daily reports."
        audio_bytes = text_to_speech(sample_text, voice=request.voice_id)
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
        )
    except Exception as e:
        logging.error(f"Error generating TTS sample: {e}")
        # Return a JSON error with a proper status code
        return {"error": str(e)}, 500

@app.post("/tts/report")
def generate_report_tts():
    """Generate TTS for the latest report."""
    audio_bytes = None

    # Check for latest report
    import glob
    list_of_files = glob.glob('reports/*.txt')
    if not list_of_files:
        return {"error": "No reports found."}

    latest_file = max(list_of_files, key=os.path.getctime)

    # Check if audio already exists for this report
    audio_file_path = latest_file.replace(
        '.txt', '.mp3').replace('reports/', 'reports/audio/')
    if os.path.exists(audio_file_path):
        with open(audio_file_path, 'rb') as f:
            audio_bytes = f.read()
    else:
        print("Generating new TTS for report:", latest_file)
        with open(latest_file, 'r') as f:
            content = f.read()

        # Load personalization to get the saved voice
        user_voice = "21m00Tcm4TlvDq8ikWAM" # Default (Rachel)
        prefs_path = os.path.join(os.path.dirname(__file__), "report_personalization.json")
        
        if os.path.exists(prefs_path):
            try:
                with open(prefs_path, "r") as f:
                    prefs = json.load(f)
                    user_voice = prefs.get("voice", user_voice)
            except Exception as e:
                logging.warning(f"Could not load voice from personalization, using default: {e}")
        
        try:
            # Pass the user_voice to the TTS function
            audio_bytes = text_to_speech(content, voice=user_voice)

            # Save audio to file
            os.makedirs('reports/audio', exist_ok=True)
            audio_filename = latest_file.replace(
                '.txt', '.mp3').replace('reports/', 'reports/audio/')
            with open(audio_filename, 'wb') as audio_file:
                audio_file.write(audio_bytes)
        except Exception as e:
            print("Error generating TTS:", e)
            return {"error": str(e)}

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
    )


@app.get("/tts/voices")
def list_voices():
    """Get available ElevenLabs voices."""
    try:
        voices = get_available_voices()
        return {"voices": voices}
    except Exception as e:
        return {"error": str(e)}
