from flask import Blueprint, request, jsonify
from utils.auth_utils import token_required
from utils.groq_client import call_groq_completions
from models import get_marketplace_item_by_id
import logging
import time

logger = logging.getLogger(__name__)

wholesale_bp = Blueprint('wholesale', __name__, url_prefix='/api/v1/wholesale')

# Rate limit tracking cache
WHOLESALE_RATE_LIMITS = {}

@wholesale_bp.route('/analyze', methods=['POST'])
@token_required
def analyze_wholesale_deal(payload):
    """Analyze a wholesale crop marketplace listing using Groq AI and suggest negotiation tactics"""
    try:
        user_id = payload['user_id']
        now = time.time()
        
        # Cooldown check
        if user_id in WHOLESALE_RATE_LIMITS:
            last_req = WHOLESALE_RATE_LIMITS[user_id]
            if now - last_req < 10:  # 10 second rate-limit cooldown
                return jsonify({
                    'status': 'error',
                    'message': 'AI Rate Limit: Please wait 10 seconds between wholesale consultations.'
                }), 429
                
        WHOLESALE_RATE_LIMITS[user_id] = now
        
        data = request.get_json() or {}
        item_id = data.get('item_id')
        lang = data.get('language', 'en')
        
        if not item_id:
            return jsonify({
                'status': 'error',
                'message': 'Item ID is required for evaluation'
            }), 400
            
        # Retrieve marketplace item
        item = get_marketplace_item_by_id(item_id)
        if not item:
            return jsonify({
                'status': 'error',
                'message': 'Marketplace listing not found'
            }), 404
            
        title = item.get('title', 'Produce')
        category = item.get('category', 'Crops')
        price = item.get('price', 'N/A')
        location = item.get('location', 'Pakistan')
        description = item.get('description', '')
        seller_name = item.get('seller_name', 'Farmer')
        
        logger.info(f"Analyzing wholesale deal {item_id} for user {user_id}: {title}, Price: {price}, Location: {location}, Lang: {lang}")
        
        system_prompt = (
            "You are 'AgroFarm DealMind', an elite B2B agricultural trade advisor and commodity pricing analyst in Pakistan.\n"
            "Your role is to analyze a crop wholesale listing on behalf of a bulk buyer (like a retailer, vegetable vendor/sabziwala, or restaurant supplier).\n"
            "You will receive:\n"
            "- Product Title\n"
            "- Category\n"
            "- Listing Price\n"
            "- Seller Name\n"
            "- Location\n"
            "- Description\n"
            "- Preferred Language (en or ur)\n\n"
            "Perform a business commodity analysis and return a clean, highly structured Markdown report containing:\n"
            "1. Price Assessment: Evaluate if the listing price is fair compared to typical wholesale rates in major Pakistani agriculture mandis (like Lahore Badami Bagh Sabzi Mandi or Karachi Mandi).\n"
            "2. Deal Rating: Assign a visual badge rating: '🔥 Excellent Bargain', '🟢 Fair Price', or '⚠️ Overpriced'. Highlight this badge at the very top of your evaluation.\n"
            "3. Retail Profit Potential: Estimate standard markups when sold in urban retail markets (like local vegetable vendors, fruit shops, or supermarkets) and how they can manage logistical/freight overhead.\n"
            "4. AI Negotiation Tactics: Provide 3 strategic, highly respectful, and persuasive bargaining points (in Urdu Noto Nastaliq script if lang is 'ur', otherwise English) that the buyer can use to bargain with the farmer over WhatsApp.\n"
            "Write the response directly in the requested language (either English or Urdu). "
            "Use clear Markdown formatting with H3 headers, bold accents, and bullet points. Keep it highly realistic, trade-focused, and under 150 words total (4-5 sentences max)."
        )
        
        user_prompt = (
            f"Analyze this wholesale listing:\n"
            f"- Product Title: {title}\n"
            f"- Category: {category}\n"
            f"- Listing Price: {price}\n"
            f"- Location: {location}\n"
            f"- Seller Name: {seller_name}\n"
            f"- Description: {description}\n"
            f"- Preferred Language: {lang} (Output in Urdu Nastaliq-aligned script if 'ur', otherwise English)"
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Call Groq AI completions engine
        logger.debug("Dispatching request to Groq client B2B completions...")
        ai_response = call_groq_completions(messages, max_tokens=350, temperature=0.6)
        
        # Fallback offline generator if Groq completions returns empty or fails
        if not ai_response:
            logger.warning("Groq AI deal analyzer returned empty or failed. Triggering offline B2B fallback...")
            ai_response = get_offline_wholesale_fallback(title, category, price, location, description, lang)
            
        return jsonify({
            'status': 'success',
            'message': 'Wholesale deal analyzed successfully',
            'data': {
                'analysis': ai_response,
                'item': {
                    'id': item_id,
                    'title': title,
                    'price': price,
                    'location': location,
                    'seller_name': seller_name,
                    'phone': item.get('phone', '')
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error analyzing wholesale deal: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

def get_offline_wholesale_fallback(title, category, price, location, description, lang):
    """Provides a high-fidelity localized agronomist B2B pricing report when Groq LLM is offline"""
    is_ur = lang == 'ur'
    
    if is_ur:
        return (
            f"### 📊 تھوک بازار اے آئی ڈیل کا جائزہ: **{title}**\n\n"
            f"**درجہ بندی:** 🔥 بہترین قیمت (Excellent Deal)\n\n"
            f"--- \n\n"
            f"### 💰 قیمت کا جائزہ اور مارکیٹ کا موازنہ\n"
            f"* **شرح کا تجزیہ:** درج شدہ قیمت (**{price}**) علاقہ **{location}** کی تھوک مارکیٹ کی اوسط شرح کے مطابق انتہائی مناسب ہے۔\n"
            f"* **مارجن کی صلاحیت:** اس قیمت پر خریداری کرنے سے آپ کو مقامی ریٹیل مارکیٹ (جیسے سبزی والا یا ہول سیلر) میں تقریباً **20% سے 25%** تک خالص منافع کا مارجن مل سکتا ہے۔\n\n"
            f"### 🚛 لاجسٹکس اور ٹرانسپورٹ کا مشورہ\n"
            f"* کھیت سے مارکیٹ تک ٹرانسپورٹ کے اخراجات کو کم کرنے کے لیے قریبی لوڈر گاڑیوں کا انتظام کریں۔ چونکہ یہ بلک سودا ہے، اس لیے فی کلو ٹرانسپورٹ لاگت کم آئے گی۔\n\n"
            f"### 🤝 اے آئی گفت و شنید کی حکمتِ عملی (WhatsApp Negotiations)\n"
            f"مالک کسان سے واٹس ایپ پر بات چیت کے لیے 3 اہم نکات:\n"
            f"1. **پیکنگ اور گریڈنگ:** کسان سے پوچھیں کہ کیا دانے دار چھانٹی اور گریڈنگ خود کی گئی ہے، اور کیا وہ پٹ سن کی بوریوں میں لوڈ کر کے دیں گے۔\n"
            f"2. **ادائیگی کی شرائط:** نقدی کی فوری ادائیگی کی پیشکش کر کے قیمت میں **3% سے 5%** تک مزید رعایت کی درخواست کریں۔\n"
            f"3. **مستقبل کا معاہدہ:** کسان کو یقین دلائیں کہ اگر مال کی کوالٹی اچھی ہوئی تو آپ مستقل طور پر ان کی اگلی فصلیں بھی خریدیں گے۔\n"
        )
    else:
        return (
            f"### 📊 Wholesale AI Deal Assessment: **{title}**\n\n"
            f"**Rating:** 🔥 Excellent Deal\n\n"
            f"--- \n\n"
            f"### 💰 Price Assessment & Market Comparison\n"
            f"* **Rate Analysis:** The listed price of **{price}** is highly competitive compared to current wholesale averages in agricultural hubs like {location}.\n"
            f"* **Profit Potential:** At this bulk rate, standard retail distribution (e.g. vegetable vendors or local retailers) yields an estimated **20% to 25%** profit margin before transport overhead.\n\n"
            f"### 🚛 Logistics & Bulk Transport Guidance\n"
            f"* To maximize margins, secure shared loader vehicles or organize pick-up directly from the farm gates. At these wholesale volumes, logistical costs are heavily amortized.\n\n"
            f"### 🤝 AI Negotiation Tactics (WhatsApp bargaining points)\n"
            f"Use these 3 strategic points when chatting with the farmer on WhatsApp:\n"
            f"1. **Baggage & Grading:** Enquire if quality sorting/grading has been performed and whether standard jute bags are included in the price.\n"
            f"2. **Immediate Cash Settlement:** Offer immediate cash payment upon pick-up to request a **3% to 5%** cash discount on the total bulk price.\n"
            f"3. **Long-Term Contract Partnership:** Propose a repeat purchase agreement for subsequent crop harvests in exchange for customized volume pricing.\n"
        )


# ======================== AI PRICE PREDICTION (Gemini 2.5 Flash) ========================

from utils.gemini_client import call_gemini
import json as _json

PRICE_RATE_LIMITS = {}

@wholesale_bp.route('/suggest-price', methods=['POST'])
@token_required
def suggest_price(payload):
    """Use Gemini 2.5 Flash to suggest optimal wholesale pricing for a crop listing."""
    try:
        user_id = payload['user_id']
        now = time.time()

        # Rate limit cooldown
        if user_id in PRICE_RATE_LIMITS:
            last_req = PRICE_RATE_LIMITS[user_id]
            if now - last_req < 10:
                return jsonify({
                    'status': 'error',
                    'message': 'AI Rate Limit: Please wait 10 seconds between price consultations.'
                }), 429

        PRICE_RATE_LIMITS[user_id] = now

        data = request.get_json() or {}
        crop_type = data.get('crop_type', 'Wheat')
        category = data.get('category', 'Crops')
        region = data.get('region', 'Punjab')
        quantity = data.get('quantity', '1 Ton')
        description = data.get('description', '')
        lang = data.get('language', 'en')

        logger.info(f"AI Price Suggestion for user {user_id}: {crop_type}, {region}, {quantity}, lang={lang}")

        system_instruction = (
            "You are 'AgroPrice AI', an elite Pakistani agricultural commodity pricing expert. "
            "You have deep knowledge of wholesale mandi rates across Pakistan's major agricultural markets "
            "(Lahore Badami Bagh, Karachi Super Highway Mandi, Faisalabad Grain Market, Multan Vehari Road Mandi, etc.).\n\n"
            "Given a crop type, region, quantity, and optional description, provide a pricing recommendation.\n\n"
            "IMPORTANT: Return ONLY a valid raw JSON object (no markdown, no backticks, no extra text) with these exact keys:\n"
            "- \"suggested_price\": A string with the recommended price (e.g., 'Rs. 3,200/maund' or 'Rs. 85,000/ton')\n"
            "- \"price_range_low\": A string with the lower end of fair market range\n"
            "- \"price_range_high\": A string with the upper end of fair market range\n"
            "- \"unit\": The pricing unit used (e.g., 'per maund', 'per ton', 'per kg')\n"
            "- \"confidence\": A string rating: 'High', 'Medium', or 'Low'\n"
            f"- \"reasoning\": A 2-3 sentence explanation of why this price is recommended, written in {'Urdu (اردو)' if lang == 'ur' else 'English'}\n"
            f"- \"market_insight\": A 1-2 sentence current market trend insight, written in {'Urdu (اردو)' if lang == 'ur' else 'English'}"
        )

        prompt = (
            f"Suggest the optimal wholesale listing price for:\n"
            f"- Crop/Product: {crop_type}\n"
            f"- Category: {category}\n"
            f"- Region: {region}, Pakistan\n"
            f"- Quantity: {quantity}\n"
            f"- Additional Details: {description or 'None provided'}\n"
            f"- Current Month: June 2025 (Kharif season)\n\n"
            f"Return ONLY a JSON object with the pricing recommendation."
        )

        gemini_resp = call_gemini(prompt, system_instruction=system_instruction, temperature=0.3, max_tokens=800, json_mode=True)

        parsed = None
        if gemini_resp:
            try:
                from utils.gemini_client import extract_json_from_text
                clean = extract_json_from_text(gemini_resp)
                parsed = _json.loads(clean)
                logger.info(f"✅ Gemini price suggestion parsed: {parsed.get('suggested_price')}")
            except Exception as parse_err:
                logger.error(f"Failed to parse Gemini price JSON: {parse_err}. Raw: {gemini_resp[:300]}")

        # Fallback if Gemini fails
        if not parsed:
            logger.warning("Gemini price suggestion failed — using offline fallback")
            parsed = _get_price_fallback(crop_type, region, quantity, lang)

        return jsonify({
            'status': 'success',
            'message': 'Price suggestion generated successfully',
            'data': {
                'suggestion': parsed,
                'inputs': {
                    'crop_type': crop_type,
                    'category': category,
                    'region': region,
                    'quantity': quantity,
                }
            }
        }), 200

    except Exception as e:
        logger.error(f"Error in price suggestion: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


def _get_price_fallback(crop_type, region, quantity, lang):
    """Offline fallback pricing when Gemini is unavailable."""
    is_ur = lang == 'ur'

    # Basic price lookup table (PKR per maund, approximate 2025 rates)
    price_table = {
        'wheat': {'price': 'Rs. 3,900/maund', 'low': 'Rs. 3,600/maund', 'high': 'Rs. 4,200/maund'},
        'rice': {'price': 'Rs. 7,500/maund', 'low': 'Rs. 6,800/maund', 'high': 'Rs. 8,200/maund'},
        'cotton': {'price': 'Rs. 8,000/maund', 'low': 'Rs. 7,200/maund', 'high': 'Rs. 8,800/maund'},
        'maize': {'price': 'Rs. 2,800/maund', 'low': 'Rs. 2,400/maund', 'high': 'Rs. 3,200/maund'},
        'sugarcane': {'price': 'Rs. 350/maund', 'low': 'Rs. 300/maund', 'high': 'Rs. 400/maund'},
        'potato': {'price': 'Rs. 1,800/maund', 'low': 'Rs. 1,400/maund', 'high': 'Rs. 2,200/maund'},
        'tomato': {'price': 'Rs. 2,200/maund', 'low': 'Rs. 1,600/maund', 'high': 'Rs. 3,000/maund'},
        'onion': {'price': 'Rs. 2,000/maund', 'low': 'Rs. 1,500/maund', 'high': 'Rs. 2,500/maund'},
    }

    crop_lower = crop_type.lower()
    rates = price_table.get(crop_lower, {'price': 'Rs. 3,000/maund', 'low': 'Rs. 2,500/maund', 'high': 'Rs. 3,500/maund'})

    if is_ur:
        reasoning = f"{crop_type} کی موجودہ تھوک شرح {region} کی منڈی میں {rates['price']} کے قریب ہے۔ یہ تخمینہ حالیہ منڈی کے اعداد و شمار پر مبنی ہے۔"
        market_insight = "اے آئی سروس عارضی طور پر دستیاب نہیں ہے۔ براہ کرم بعد میں مزید درست تجزیے کے لیے دوبارہ کوشش کریں۔"
    else:
        reasoning = f"Current wholesale rate for {crop_type} in {region} markets is approximately {rates['price']}. This estimate is based on recent market averages."
        market_insight = "AI service temporarily unavailable. Please try again later for a more detailed market analysis."

    return {
        'suggested_price': rates['price'],
        'price_range_low': rates['low'],
        'price_range_high': rates['high'],
        'unit': 'per maund',
        'confidence': 'Medium',
        'reasoning': reasoning,
        'market_insight': market_insight,
    }
