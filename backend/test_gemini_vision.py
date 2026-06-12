import os
import sys
import base64
import mimetypes
import requests
from dotenv import load_dotenv

def main():
    # Load environment variables from .env
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    load_dotenv(dotenv_path=env_path)
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("Error: GEMINI_API_KEY is not set in your .env file.")
        sys.exit(1)
        
    if len(sys.argv) < 2:
        print("Usage: python test_gemini_vision.py <path_to_image> [prompt]")
        sys.exit(1)
        
    image_path = sys.argv[1]
    prompt = sys.argv[2] if len(sys.argv) > 2 else "Identify the crop, disease, status, confidence, and advisory as a JSON object."
    
    if not os.path.exists(image_path):
        print(f"Error: File '{image_path}' does not exist.")
        sys.exit(1)
        
    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type:
        mime_type = "image/jpeg"
        
    print(f"Reading image: {image_path} (MIME: {mime_type})...")
    with open(image_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode("utf-8")
        
    # Model to call
    model = 'gemini-3.5-flash'
    print(f"Calling Gemini Vision API directly (model={model})...")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    system_instruction = (
        "You are an expert crop pathologist. Analyze the crop image and identify the crop and disease. "
        "Return ONLY a valid JSON object with the fields: crop_type, disease, confidence (50-100), status (Healthy/Diseased/Invalid), advisory."
    )
    
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
    
    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.15,
            "maxOutputTokens": 1024,
            "responseMimeType": "application/json"
        },
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        print(f"HTTP Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    text = parts[0].get("text", "")
                    print("\n--- Successful Response ---")
                    print(text)
                    return
            print("\n--- No candidates returned ---")
            print(data)
        else:
            print("\n--- Error Response ---")
            print(response.text)
            
    except Exception as e:
        print(f"Exception during request: {e}")

if __name__ == "__main__":
    main()
