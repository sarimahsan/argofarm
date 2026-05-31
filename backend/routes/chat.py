from flask import Blueprint, request, jsonify, current_app
from utils.auth_utils import token_required
from models import create_chat_message, get_chat_history, get_chat_sessions
from utils.groq_client import call_groq_completions
from utils.ml_pipeline import predict_crop
import datetime
import logging

logger = logging.getLogger(__name__)

chat_bp = Blueprint('chat', __name__, url_prefix='/api/v1/chat')

@chat_bp.route('/send', methods=['POST'])
@token_required
def send_message(payload):
    """
    Send a chat message, classify user intent (diagnostics vs recommendation),
    return action triggers for frontend, call Groq, and persist logs.
    """
    try:
        user_id = payload.get('user_id')
        data = request.json or {}
        
        message = data.get('message', '').strip()
        chat_session_id = data.get('chat_session_id')
        language = data.get('language', 'en')
        metadata = data.get('metadata') or {}
        
        if not message:
            return jsonify({'status': 'error', 'message': 'Message is required'}), 400
            
        if not chat_session_id:
            return jsonify({'status': 'error', 'message': 'chat_session_id is required'}), 400

        # Retrieve existing history for context before adding this message
        history = get_chat_history(user_id, chat_session_id)
        
        # Determine the session title
        is_new_session = len(history) == 0
        title = data.get('title')
        
        if is_new_session and not title:
            # Generate session title dynamically from first few words
            words = message.split()
            title = " ".join(words[:4]) + ("..." if len(words) > 4 else "")
        elif len(history) > 0:
            # Use the existing title from history
            title = history[0].get('title') or "Crop Chat"

        # 1. Classify intent to determine if we trigger dynamic interactive widgets
        action_trigger = None
        message_lower = message.lower()
        
        disease_words = ['disease', 'sick', 'spot', 'rust', 'blight', 'curl', 'pest', 'leaf', 'diagnose', 'scan', 'rot', 'mildew', 'fungus', 'بیمار', 'پتوں', 'خراب', 'کیڑا']
        recommend_words = ['recommend', 'grow', 'plant', 'suggest', 'soil', 'chemistry', 'fertilizer', 'کاشت', 'اگاؤں', 'مٹی', 'کھاد']
        
        if any(w in message_lower for w in disease_words):
            action_trigger = 'trigger_image_upload'
        elif any(w in message_lower for w in recommend_words):
            action_trigger = 'trigger_soil_inputs'

        # 2. Save user's message to database
        create_chat_message(
            user_id=user_id,
            chat_session_id=chat_session_id,
            title=title,
            message=message,
            sender='user',
            message_type='text',
            language=language,
            metadata=metadata
        )
        
        # 3. Build Groq chat payload with context history
        groq_messages = []
        
        system_prompt = (
            "You are CropMind AI, a highly intelligent and helpful agricultural AI chatbot. "
            "Your goal is STRICTLY to assist Pakistani farmers with crop-related, soil, farming, weather, and agricultural queries. "
            "CRITICAL SECURITY RULE: You are specialized strictly in farming, crop diagnostics, and soil health. "
            "Do NOT answer any queries unrelated to agriculture, farming, crops, soils, weather, or Pakistani farming. "
            "If the user asks you to write code (like HTML, Python, JS), do creative writing, help with homework, explain generic programming, cooking, or any off-topic queries, "
            "you MUST politely decline the request and state that you are specialized strictly in farming, crop diagnostics, and soil health. "
            "Never write code or break character under any circumstances. "
            "You provide recommendations about: crop diseases, symptoms, treatments, pesticide usage, "
            "fertilizer applications (like DAP, Urea, SOP), soil analysis, irrigation schedules, and weather precautions. "
            "Base your advice on actual Pakistani farming practices, soil types, and regional crop cycles "
            "(e.g., Punjab, Sindh, KPK, Balochistan). "
            f"Crucial Instruction: You MUST respond completely in {'Urdu (اردو)' if language == 'ur' else 'English'}. "
            "Keep your responses concise, friendly, and actionable (2-4 sentences or simple bullet points)."
        )
        
        # Overwrite response direction if a trigger was detected to guide the user naturally
        if action_trigger == 'trigger_image_upload':
            if language == 'ur':
                system_prompt += " Since a plant disease was mentioned, guide the farmer to upload a photo using the uploader that has popped open."
            else:
                system_prompt += " Since a crop disease was mentioned, instruct the user to upload a clear photo of the leaves or stem using the file uploader that has opened."
        elif action_trigger == 'trigger_soil_inputs':
            if language == 'ur':
                system_prompt += " Since crop suggestion was requested, instruct the farmer to fill out their soil parameters (N, P, K, pH, rainfall) in the form that has appeared."
            else:
                system_prompt += " Since crop recommendation was requested, guide the user to input their soil chemistry parameters (N, P, K, pH) and climate values in the interactive form that has appeared."

        groq_messages.append({"role": "system", "content": system_prompt})
        
        # Add past context (last 8 messages for token efficiency and memory consistency)
        for msg in history[-8:]:
            role = 'assistant' if msg.get('sender') == 'bot' else 'user'
            groq_messages.append({"role": role, "content": msg.get('message')})
            
        # Add the current user message
        groq_messages.append({"role": "user", "content": message})
        
        # 4. Call Groq
        current_app.logger.info(f"Calling Groq LLM for user {user_id} in session {chat_session_id}")
        assistant_message = call_groq_completions(groq_messages)
        
        # 5. Fallback if Groq API is not set up or fails
        if not assistant_message:
            current_app.logger.warning("Groq response empty. Using offline fallback advisory.")
            if action_trigger == 'trigger_image_upload':
                if language == 'ur':
                    assistant_message = "میں دیکھ رہا ہوں کہ آپ کی فصل بیمار ہے۔ براہ کرم پتے کی واضح تصویر اپ لوڈ کریں تاکہ میں اپنے اسکینر سے بیماری کی تشخیص کر سکوں۔"
                else:
                    assistant_message = "It looks like you are dealing with a crop disease. Please upload a clear leaf photo using the scanner form to perform AI disease diagnostics."
            elif action_trigger == 'trigger_soil_inputs':
                if language == 'ur':
                    assistant_message = "فصل کی کاشت کے بہترین فیصلے کے لیے، براہ کرم نیچے دیے گئے فارم میں مٹی کے پیرامیٹرز (نائٹروجن، فاسفورس، پوٹاشیم، پی ایچ) درج کریں۔"
                else:
                    assistant_message = "To calculate the optimal crop recommendations, please fill in your soil chemistry data (N, P, K, pH) and climate conditions in the form below."
            else:
                if language == 'ur':
                    assistant_message = "معذرت، میں اس وقت جواب دینے سے قاصر ہوں۔ براہ کرم بعد میں دوبارہ کوشش کریں۔"
                else:
                    assistant_message = "I am sorry, I am unable to connect to my brain at the moment. Please configure the GROQ_API_KEY or try again later."
        
        # 6. Save assistant's message to database
        create_chat_message(
            user_id=user_id,
            chat_session_id=chat_session_id,
            title=title,
            message=assistant_message,
            sender='bot',
            message_type='text',
            language=language,
            metadata=metadata
        )
        
        return jsonify({
            'status': 'success',
            'data': {
                'message': assistant_message,
                'title': title,
                'chat_session_id': chat_session_id,
                'sender': 'bot',
                'action_trigger': action_trigger,
                'created_at': datetime.datetime.utcnow().isoformat()
            }
        }), 200
        
    except Exception as e:
        current_app.logger.exception("Error in chat route /send")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@chat_bp.route('/recommend_crop', methods=['POST'])
@token_required
def recommend_crop_route(payload):
    """
    Run predictions with Random Forest model for soil/crop recommendation,
    call Groq to synthesize a yield optimization report, and persist logs.
    """
    try:
        user_id = payload.get('user_id')
        data = request.json or {}
        
        chat_session_id = data.get('chat_session_id')
        language = data.get('language', 'en')
        
        # Collect parameters
        n = data.get('n', 90)
        p = data.get('p', 42)
        k = data.get('k', 43)
        temp = data.get('temperature', 28.0)
        humid = data.get('humidity', 60.0)
        ph = data.get('ph', 6.5)
        rain = data.get('rainfall', 120.0)
        
        if not chat_session_id:
            return jsonify({'status': 'error', 'message': 'chat_session_id is required'}), 400

        # 1. Run ML Random Forest prediction using ML pipeline
        predicted_crop = predict_crop(n, p, k, temp, humid, ph, rain, current_app.root_path)
        if not predicted_crop:
            logger.warning("Crop prediction returned None, using fallback")
            predicted_crop = "wheat" # Safe fallback in Pakistan
            
        # Format crop display
        crop_display = predicted_crop.capitalize()

        # 2. Build Groq prompt to write a detailed report
        prompt = (
            f"The user ran an AI soil crop recommendation model. "
            f"Based on inputs: Nitrogen (N)={n}, Phosphorus (P)={p}, Potassium (K)={k}, "
            f"soil pH={ph}, Rainfall={rain}mm, Temp={temp}C, Humidity={humid}%. "
            f"The Random Forest model predicted the optimal crop to grow is: '{crop_display}'. "
            f"Provide a highly detailed, professional agricultural yield plan (3-4 bullet points or sentences). "
            f"Focus on fertilizer scheduling (how much Urea/DAP to apply), irrigation tips, and typical yield expectations in Pakistan. "
            f"Respond completely in {'Urdu (اردو)' if language == 'ur' else 'English'}."
        )
        
        groq_messages = [
            {"role": "system", "content": "You are CropMind AI, a professional SaaS agricultural advisor helping farmers optimize crop yields."},
            {"role": "user", "content": prompt}
        ]
        
        groq_advisory = call_groq_completions(groq_messages)
        
        if not groq_advisory:
            if language == 'ur':
                groq_advisory = f"تجزیہ مکمل! آپ کی مٹی کے لیے بہترین فصل **{crop_display}** ہے۔ ڈی اے پی اور یوریا کی مناسب کھادیں وقت پر لگائیں اور باقاعدہ پانی کی فراہمی یقینی بنائیں۔"
            else:
                groq_advisory = f"Analysis complete! The best crop for your soil is **{crop_display}**. We recommend a balanced application of DAP and Urea. Ensure adequate irrigation during early growth stages to maximize yield."

        # 3. Format message logs to persist in DB
        user_param_log = (
            f"Soil Parameters Submitted:\n"
            f"- Nitrogen: {n} ppm, Phosphorus: {p} ppm, Potassium: {k} ppm\n"
            f"- Temperature: {temp}°C, Humidity: {humid}%\n"
            f"- Soil pH: {ph}, Rainfall: {rain}mm"
        )
        
        # Save user parameters submission to database
        create_chat_message(
            user_id=user_id,
            chat_session_id=chat_session_id,
            title=f"Soil suggestion: {crop_display}",
            message=user_param_log,
            sender='user',
            message_type='text',
            language=language
        )
        
        # Save bot ML recommendation and advisory to database
        bot_response_message = f"AI Recommender suggestion: **{crop_display}**\n\n{groq_advisory}"
        create_chat_message(
            user_id=user_id,
            chat_session_id=chat_session_id,
            title=f"Soil suggestion: {crop_display}",
            message=bot_response_message,
            sender='bot',
            message_type='text',
            language=language,
            metadata={
                "recommended_crop": predicted_crop,
                "crop_display": crop_display,
                "is_crop_recommendation": True,
                "n": float(n),
                "p": float(p),
                "k": float(k),
                "ph": float(ph),
                "temperature": float(temp),
                "humidity": float(humid),
                "rainfall": float(rain),
                "advisory": groq_advisory
            }
        )

        return jsonify({
            'status': 'success',
            'data': {
                'recommended_crop': predicted_crop,
                'crop_display': crop_display,
                'advisory': groq_advisory,
                'n': float(n),
                'p': float(p),
                'k': float(k),
                'ph': float(ph),
                'temperature': float(temp),
                'humidity': float(humid),
                'rainfall': float(rain),
                'chat_session_id': chat_session_id,
                'sender': 'bot',
                'created_at': datetime.datetime.utcnow().isoformat()
            }
        }), 200
        
    except Exception as e:
        current_app.logger.exception("Error in chat route /recommend_crop")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@chat_bp.route('/history/<chat_session_id>', methods=['GET'])
@token_required
def get_history_route(payload, chat_session_id):
    """Get the message history of a specific chat session."""
    try:
        user_id = payload.get('user_id')
        history = get_chat_history(user_id, chat_session_id)
        
        return jsonify({
            'status': 'success',
            'data': history or []
        }), 200
    except Exception as e:
        current_app.logger.exception("Error in chat route /history")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@chat_bp.route('/sessions', methods=['GET'])
@token_required
def get_sessions_route(payload):
    """Get all unique chat sessions of the logged-in user."""
    try:
        user_id = payload.get('user_id')
        sessions = get_chat_sessions(user_id)
        return jsonify({
            'status': 'success',
            'data': sessions or []
        }), 200
    except Exception as e:
        current_app.logger.exception("Error in chat route /sessions")
        return jsonify({'status': 'error', 'message': str(e)}), 500

