import os
from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv

load_dotenv()

client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

def text_to_speech(text: str, voice: str = "21m00Tcm4TlvDq8ikWAM", output_path: str = None) -> bytes:
    """
    Convert text to speech using ElevenLabs.
    
    Args:
        text: The text to convert to speech
        voice: Voice ID (default: Rachel's ID)
        output_path: Optional path to save the audio file
        
    Returns:
        Audio data as bytes
    """
    try:
        voice_map = {
            "Rachel": "21m00Tcm4TlvDq8ikWAM",
            "Domi": "AZnzlk1XvdvUeBnXmlld",
            "Bella": "EXAVITQu4vr4xnSDxMaL",
            "Antoni": "ErXwobaYiN019PkySvjV",
            "Elli": "MF3mGyEYCl7XYWbV9V6O",
            "Josh": "TxGEqnHWrfWFTfGW9XjX",
            "Arnold": "VR6AewLTigWG4xSOukaG",
            "Adam": "pNInz6obpgDQGcFmaJgB",
            "Sam": "yoZ06aMxZJJ28mfd3POQ",
        }
        
        voice_id = voice_map.get(voice, voice)
        audio_generator = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128"
        )
        
        audio_bytes = b"".join(chunk for chunk in audio_generator)
        
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(audio_bytes)
        
        return audio_bytes
        
    except Exception as e:
        raise Exception(f"TTS generation failed: {str(e)}")


def get_available_voices():
    return [
        {"name": "Rachel", "voice_id": "21m00Tcm4TlvDq8ikWAM"},
        {"name": "Domi", "voice_id": "AZnzlk1XvdvUeBnXmlld"},
        {"name": "Bella", "voice_id": "EXAVITQu4vr4xnSDxMaL"},
        {"name": "Antoni", "voice_id": "ErXwobaYiN019PkySvjV"},
        {"name": "Elli", "voice_id": "MF3mGyEYCl7XYWbV9V6O"},
        {"name": "Josh", "voice_id": "TxGEqnHWrfWFTfGW9XjX"},
        {"name": "Arnold", "voice_id": "VR6AewLTigWG4xSOukaG"},
        {"name": "Adam", "voice_id": "pNInz6obpgDQGcFmaJgB"},
        {"name": "Sam", "voice_id": "yoZ06aMxZJJ28mfd3POQ"},
    ]