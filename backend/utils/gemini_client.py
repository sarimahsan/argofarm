import os
import json
import logging
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


def call_gemini(prompt, system_instruction=None, temperature=0.7, max_tokens=1024, json_mode=False):
    """
    Call Google Gemini 2.5 Flash via REST API.

    Args:
        prompt (str): The user prompt text.
        system_instruction (str, optional): System-level instruction for the model.
        temperature (float): Sampling temperature (0.0 - 1.0).
        max_tokens (int): Maximum output tokens.
        json_mode (bool): If True, request JSON output from the model.

    Returns:
        str: The model's text response, or None on failure.
    """
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        logger.warning("⚠️ GEMINI_API_KEY is not set. Please add it to your .env file.")
        return None

    model = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    # Build the request payload
    contents = [{"role": "user", "parts": [{"text": prompt}]}]

    generation_config = {
        "temperature": temperature,
        "maxOutputTokens": max_tokens,
    }
    if json_mode:
        generation_config["responseMimeType"] = "application/json"

    payload = {
        "contents": contents,
        "generationConfig": generation_config,
    }

    # Add system instruction if provided
    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    headers = {"Content-Type": "application/json"}

    try:
        logger.info(f"Calling Gemini API (model={model}, temp={temperature}, max_tokens={max_tokens})")
        response = requests.post(url, headers=headers, json=payload, timeout=30)

        if response.ok:
            data = response.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    text = parts[0].get("text", "")
                    logger.info(f"✅ Gemini response received ({len(text)} chars)")
                    return text
            logger.warning(f"Gemini API returned no candidates: {data}")
        else:
            logger.error(f"❌ Gemini API Error: Status {response.status_code} - {response.text[:500]}")
    except Exception as e:
        logger.error(f"❌ Exception calling Gemini API: {e}")

    return None


def call_gemini_vision(prompt, base64_image, mime_type="image/jpeg", system_instruction=None, temperature=0.2, max_tokens=1500, json_mode=False):
    """
    Call Google Gemini 2.5 Flash with base64 image data via REST API.

    Args:
        prompt (str): The prompt text.
        base64_image (str): Base64-encoded image string.
        mime_type (str): MIME type of the image.
        system_instruction (str, optional): System instructions.
        temperature (float): Sampling temperature.
        max_tokens (int): Max tokens to generate.
        json_mode (bool): Output in JSON format if True.

    Returns:
        str: Model text response, or None on failure.
    """
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        logger.warning("⚠️ GEMINI_API_KEY is not set. Please add it to your .env file.")
        return None

    model = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    # Build multimodal content with prompt and image
    contents = [{
        "role": "user",
        "parts": [
            {"text": prompt},
            {
                "inlineData": {
                    "mimeType": mime_type,
                    "data": base64_image
                }
            }
        ]
    }]

    generation_config = {
        "temperature": temperature,
        "maxOutputTokens": max_tokens,
    }
    if json_mode:
        generation_config["responseMimeType"] = "application/json"

    payload = {
        "contents": contents,
        "generationConfig": generation_config,
    }

    # Add system instruction if provided
    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    headers = {"Content-Type": "application/json"}

    try:
        logger.info(f"Calling Gemini Vision API (model={model}, temp={temperature}, max_tokens={max_tokens})")
        response = requests.post(url, headers=headers, json=payload, timeout=45)

        if response.ok:
            data = response.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    text = parts[0].get("text", "")
                    logger.info(f"✅ Gemini Vision response received ({len(text)} chars)")
                    return text
            logger.warning(f"Gemini Vision API returned no candidates: {data}")
        else:
            logger.error(f"❌ Gemini Vision API Error: Status {response.status_code} - {response.text[:500]}")
    except Exception as e:
        logger.error(f"❌ Exception calling Gemini Vision API: {e}")

    return None

