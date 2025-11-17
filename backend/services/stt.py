import json
import os
from elevenlabs.client import ElevenLabs
from elevenlabs import SpeechToTextChunkResponseModel
from dotenv import load_dotenv

def create_transcription(audio_bytes: bytes) -> SpeechToTextChunkResponseModel:
    """
    Create a transcription for the given audio bytes using ElevenLabs STT service.
    
    Args:
        audio_bytes (bytes): The audio data in bytes.
        output_path (str, optional): Path to save the transcript file. If None, the transcript is not saved.
        
    Returns:
        bytes: The original audio bytes.
    """
    load_dotenv()
    api_key = os.getenv("ELEVENLABS_API_KEY")
    client = ElevenLabs(api_key=api_key)

    try:
        # Try create transcript
        
        transcription = client.speech_to_text.convert(
            file=audio_bytes,
            model_id="scribe_v1",  # Currently only "scribe_v1" is supported
            tag_audio_events=True,  # Tag audio events like laughter, applause, etc.
            language_code="eng",  # Language of the audio file. Set to None for auto-detection
            diarize=False,  # Whether to annotate who is speaking
            num_speakers=1,
            timestamps_granularity="word",  # "word" or "sentence"
        )

        print(transcription)

        return transcription
    except Exception as e:
        raise Exception(f"STT transcription failed: {str(e)}")