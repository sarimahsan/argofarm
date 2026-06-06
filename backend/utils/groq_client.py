import os
import requests
from dotenv import load_dotenv

# Ensure env vars are loaded if run directly
load_dotenv()

def call_groq_completions(messages, model_name=None, temperature=0.7, max_tokens=1024):
    """
    Call Groq OpenAI-compatible Chat Completions API.
    
    Args:
        messages (list): List of dicts representing conversation history,
                         e.g., [{'role': 'user', 'content': 'Hello'}]
        model_name (str, optional): Groq model name. Defaults to GROQ_MODEL env var or 'llama3-8b-8192'.
        temperature (float, optional): Sampling temperature. Defaults to 0.7.
        max_tokens (int, optional): Maximum output tokens. Defaults to 1024.
        
    Returns:
        str: Response content from the model, or None if failed.
    """
    api_key = os.getenv('GROQ_API_KEY')
    model = model_name or os.getenv('GROQ_MODEL') or 'llama3-8b-8192'
    
    if not api_key:
        print("⚠️ GROQ_API_KEY is not set. Please set it in your environment or .env file.")
        return None
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=25)
        if response.ok:
            data = response.json()
            if 'choices' in data and len(data['choices']) > 0:
                return data['choices'][0]['message']['content']
            else:
                print(f"❌ Groq API response missing choices: {data}")
        else:
            print(f"❌ Groq API Error: Status {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception calling Groq API: {e}")
        
    return None


def call_groq_transcription(file_bytes, filename, mime_type="audio/webm"):
    """
    Call Groq Audio Transcriptions API using whisper-large-v3.
    
    Args:
        file_bytes (bytes): The audio file bytes.
        filename (str): The filename (e.g., 'audio.webm').
        mime_type (str): The MIME type of the file.
        
    Returns:
        str: Transcribed text, or None if failed.
    """
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        print("⚠️ GROQ_API_KEY is not set.")
        return None
        
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    files = {
        "file": (filename, file_bytes, mime_type)
    }
    data = {
        "model": "whisper-large-v3",
        "response_format": "json"
    }
    
    try:
        response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
        if response.ok:
            resp_data = response.json()
            return resp_data.get("text")
        else:
            print(f"❌ Groq Transcription API Error: Status {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception calling Groq Transcription API: {e}")
        
    return None

