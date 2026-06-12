import os
import json
import logging
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


def call_gemini(prompt, system_instruction=None, temperature=0.7, max_tokens=4096, json_mode=False):
    """
    Call Google Gemini via REST API, with fallback support.

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

    primary_model = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
    # Build fallback model chain
    models_to_try = [primary_model]
    for fallback in ['gemini-2.5-flash', 'gemini-3.5-flash']:
        if fallback not in models_to_try:
            models_to_try.append(fallback)

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

    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    headers = {"Content-Type": "application/json"}

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            logger.info(f"Calling Gemini API (model={model}, temp={temperature}, max_tokens={max_tokens})")
            response = requests.post(url, headers=headers, json=payload, timeout=15)

            if response.ok:
                data = response.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text = parts[0].get("text", "")
                        logger.info(f"✅ Gemini response received via model={model} ({len(text)} chars)")
                        return text
                logger.warning(f"Gemini API (model={model}) returned no candidates: {data}")
            else:
                logger.warning(f"⚠️ Gemini API Error for model={model}: Status {response.status_code} - {response.text[:200]}")
                if response.status_code in [400, 401, 403]:
                    logger.error("❌ Critical authentication or bad request error (400/401/403). Stopping fallback attempts.")
                    break
        except Exception as e:
            logger.error(f"❌ Exception calling Gemini API with model={model}: {e}")

    logger.error("❌ All models in the Gemini text generation chain failed.")
    return None


def call_gemini_vision(prompt, base64_image, mime_type="image/jpeg", system_instruction=None, temperature=0.2, max_tokens=4096, json_mode=False):
    """
    Call Google Gemini Vision with base64 image data via REST API, with fallback support.

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

    primary_model = os.getenv('GEMINI_VISION_MODEL') or 'gemini-3.5-flash'
    # Build fallback vision model chain (preferring gemini-3.5-flash then falling back to gemini-2.5-flash)
    models_to_try = [primary_model]
    for fallback in ['gemini-3.5-flash', 'gemini-2.5-flash']:
        if fallback not in models_to_try:
            models_to_try.append(fallback)

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

    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    headers = {"Content-Type": "application/json"}

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            logger.info(f"Calling Gemini Vision API (model={model}, temp={temperature}, max_tokens={max_tokens})")
            response = requests.post(url, headers=headers, json=payload, timeout=15)

            if response.ok:
                data = response.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text = parts[0].get("text", "")
                        if json_mode:
                            try:
                                clean_text = extract_json_from_text(text)
                                json.loads(clean_text)
                                logger.info(f"✅ Gemini Vision response received and validated as JSON via model={model}")
                                return text
                            except Exception as json_err:
                                logger.warning(f"⚠️ Model {model} returned invalid JSON: {json_err}. Trying fallback model...")
                        else:
                            logger.info(f"✅ Gemini Vision response received via model={model} ({len(text)} chars)")
                            return text
                logger.warning(f"Gemini Vision API (model={model}) returned no candidates: {data}")
            else:
                logger.warning(f"⚠️ Gemini Vision API Error for model={model}: Status {response.status_code} - {response.text[:200]}")
                if response.status_code == 401:
                    logger.error("❌ Critical authentication error (401). Stopping fallback attempts.")
                    break
        except Exception as e:
            logger.error(f"❌ Exception calling Gemini Vision API with model={model}: {e}")

    logger.error("❌ All models in the Gemini Vision diagnostic chain failed.")
    return None


def extract_json_from_text(text):
    """
    Extracts a JSON substring from a text response that might contain reasoning traces,
    markdown formatting, or extra text.
    """
    if not text:
        return None

    text_clean = text.strip()

    # 1. Try to extract from ```json ... ``` blocks
    import re
    matches = re.findall(r"```json\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if matches:
        for m in reversed(matches):
            m_clean = m.strip()
            if m_clean.startswith('{') and m_clean.endswith('}'):
                return m_clean
            first = m_clean.find('{')
            last = m_clean.rfind('}')
            if first != -1 and last != -1 and last > first:
                return m_clean[first:last+1].strip()

    # 2. Try generic ``` blocks
    matches = re.findall(r"```\s*(.*?)\s*```", text, re.DOTALL)
    if matches:
        for m in reversed(matches):
            m_clean = m.strip()
            if m_clean.startswith('{') and m_clean.endswith('}'):
                return m_clean
            first = m_clean.find('{')
            last = m_clean.rfind('}')
            if first != -1 and last != -1 and last > first:
                return m_clean[first:last+1].strip()

    # 3. Try finding the first { and last } in the entire text
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return text[first_brace:last_brace+1].strip()

    return text_clean


