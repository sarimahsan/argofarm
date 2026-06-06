from flask import Blueprint, request, jsonify
from utils.auth_utils import token_required
from utils.groq_client import call_groq_completions
import logging

logger = logging.getLogger(__name__)

planner_bp = Blueprint('planner', __name__, url_prefix='/api/v1/planner')

@planner_bp.route('/generate', methods=['POST'])
@token_required
def generate_crop_plan(payload):
    """Generate a structured 4-month crop plan timeline using Groq AI"""
    try:
        user_id = payload['user_id']
        data = request.get_json() or {}
        
        crop_type = data.get('crop_type', 'Wheat')
        land_size = data.get('land_size', '1')
        budget = data.get('budget', '50000')
        water_availability = data.get('water_availability', 'Medium')
        lang = data.get('lang', 'en')
        
        logger.info(f"Generating crop plan for user {user_id}: {crop_type}, {land_size} acres, Rs. {budget}, Water: {water_availability}, Lang: {lang}")
        
        system_prompt = (
            "You are a professional senior agronomist and agricultural planner in Pakistan.\n"
            "The user is a local farmer requesting a highly customized, 4-month crop planning timeline.\n"
            "They will provide:\n"
            "- Crop Type\n"
            "- Land Size (in acres)\n"
            "- Budget (in PKR)\n"
            "- Water Availability (High, Medium, or Low)\n"
            "- Language (en or ur)\n\n"
            "Generate a highly structured 4-month timeline tailored exactly to their inputs:\n"
            "1. Budget Efficiency: Give tips on cost savings for seed and fertilizer based on their land size and PKR budget.\n"
            "2. Water Optimization: Provide specific irrigation frequencies and conservation schedules matched to their water availability tier.\n"
            "3. Actionable schedule:\n"
            "   - Month 1: Soil preparation and seed procurement\n"
            "   - Month 2: Sowing and early stage weeding/watering\n"
            "   - Month 3: Fertilizer application (DAP/Urea ratios) and pest monitoring\n"
            "   - Month 4: Irrigation scheduling and harvesting/yield planning\n\n"
            "Write the response directly in the requested language (either English or Urdu).\n"
            "Use clean Markdown formatting with headers (e.g. ### Month 1: Soil Preparation), bullet points, and bold tags. "
            "Keep the entire plan extremely structured, concise, and under 250 words total. "
            "Keep it highly encouraging, practical, and optimized for farmers in Pakistan."
        )
        
        user_prompt = (
            f"Generate a customized 4-month crop plan with these inputs:\n"
            f"- Crop Type: {crop_type}\n"
            f"- Land Size: {land_size} acres\n"
            f"- Total Budget: Rs. {budget}\n"
            f"- Water Availability: {water_availability}\n"
            f"- Preferred Language: {lang} (Provide output in Urdu Nastaliq-aligned script if 'ur', otherwise English)"
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Call Groq AI completions engine
        logger.debug("Dispatching request to Groq client completions...")
        ai_response = call_groq_completions(messages, max_tokens=400, temperature=0.5)
        
        # Fallback offline generator if Groq completions returns empty or fails
        if not ai_response:
            logger.warning("Groq AI plan generation returned empty or failed. Triggering offline fallback planner...")
            ai_response = get_offline_fallback_plan(crop_type, land_size, budget, water_availability, lang)
            
        return jsonify({
            'status': 'success',
            'message': 'Crop plan generated successfully',
            'data': {
                'plan': ai_response,
                'inputs': {
                    'crop_type': crop_type,
                    'land_size': land_size,
                    'budget': budget,
                    'water_availability': water_availability
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating crop plan: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

def get_offline_fallback_plan(crop, land, budget, water, lang):
    """Provides a high-fidelity localized agronomist plan fallback when Groq LLM is unavailable"""
    is_ur = lang == 'ur'
    
    if is_ur:
        return (
            f"### 🌾 {crop} کے لیے اے آئی ماہرِ زراعت کا 4 ماہ کا منصوبہ\n"
            f"یہ منصوبہ خاص طور پر **{land} ایکڑ** زمین، **{budget} روپے** بجٹ، اور **{water} پانی کی دستیابی** کے مطابق مرتب کیا گیا ہے۔\n\n"
            f"--- \n\n"
            f"### 📅 پہلا مہینہ: زمین کی تیاری اور بیج کی خریداری\n"
            f"* **زمین کی تیاری:** مٹی کو نرم کرنے کے لیے 2 سے 3 بار گہرا ہل چلائیں۔ مٹی کی جانچ کروائیں تاکہ کھاد کی درست مقدار کا اندازہ ہو سکے۔\n"
            f"* **بیج کا انتخاب:** تصدیق شدہ اور زیادہ پیداوار دینے والی اقسام کے بیج زراعتی مرکز سے خریدیں۔ {land} ایکڑ کے لیے مناسب مقدار کا حساب رکھیں۔\n"
            f"* **مالیاتی بچت کا مشورہ:** کم بجٹ کے پیشِ نظر کیمیکل کھاد کے ساتھ نامیاتی گوبر کا استعمال کریں تاکہ خرچ کم ہو۔\n\n"
            f"### 📅 دوسرا مہینہ: بوائی اور ابتدائی نگہداشت\n"
            f"* **طریقہ بوائی:** قطاروں میں بوائی کریں تاکہ پانی اور ہوا کی آمد و رفت بہتر رہے۔\n"
            f"* **پہلا پانی (کور کا پانی):** بوائی کے 20 سے 25 دن بعد ہلکا پانی لگائیں۔ پانی کی دستیابی **{water}** ہونے کی صورت میں مائیکرو آبپاشی یا رات کے وقت پانی دیں تاکہ پانی ضائع نہ ہو۔\n"
            f"* **جڑی بوٹیوں کا تدارک:** ابتدائی 30 دنوں میں جڑی بوٹیاں تلف کریں تاکہ وہ مٹی کی غذائیت ضائع نہ کریں۔\n\n"
            f"### 📅 تیسرا مہینہ: کھادوں کا استعمال اور بیماریوں کی نگرانی\n"
            f"* **کھاد کی فراہمی:** ایک یا آدھی بوری یوریا کھاد پہلے پانی کے ساتھ دیں۔ {budget} روپے کے بجٹ میں رہتے ہوئے نائٹروجن اور فاسفورس کا متوازن ملاپ یقینی بنائیں۔\n"
            f"* **بیماریوں کی نگرانی:** پتوں کے رنگ اور کیڑوں (خصوصاً سفید مکھی اور سست تیلہ) پر گہری نظر رکھیں اور ضرورت پڑنے پر نیم کا تیل سپرے کریں۔\n\n"
            f"### 📅 چوتھا مہینہ: آخری آبپاشی اور کٹائی کی تیاری\n"
            f"* **آبپاشی کا شیڈول:** دانہ بنتے وقت آخری پانی لگائیں۔ اگر پانی کی کمی (**{water}**) ہے تو صرف شام کے وقت پانی دیں تاکہ بخارات کم بنیں۔\n"
            f"* **کٹائی کی تیاری:** فصل پکنے پر (جب دانے سنہری ہو جائیں) کٹائی شروع کریں اور خشک گودام میں محفوظ کریں۔\n"
        )
    else:
        return (
            f"### 🌾 Customized 4-Month AI Crop Plan for {crop}\n"
            f"Optimized for **{land} Acres**, a budget of **Rs. {budget}**, and **{water} Water Availability**.\n\n"
            f"--- \n\n"
            f"### 📅 Month 1: Soil Preparation & Seed Selection\n"
            f"* **Land Preparation:** Deep plough the soil 2-3 times to improve aeration. Level the field perfectly to optimize water conservation.\n"
            f"* **Seed Procurement:** Procure certified high-yield seed varieties from registered agricultural outlets. Scale seed rate strictly to {land} acres.\n"
            f"* **Budget Optimization Tip:** Supplement chemical fertilizers with locally sourced organic manure to save fertilizer expenses and improve soil moisture retention.\n\n"
            f"### 📅 Month 2: Sowing & Sowing Irrigation\n"
            f"* **Sowing Method:** Employ line sowing or drilling instead of broadcasting to allow uniform moisture distribution and facilitate weeding.\n"
            f"* **First Irrigation:** Apply the critical first irrigation (Kor watering) 20-25 days after sowing. Since your water tier is **{water}**, utilize evening irrigation to avoid heat-driven evaporation.\n"
            f"* **Weed Management:** Carry out manual weeding or targeted spraying within the first 30 days to prevent weeds from stealing soil nutrients.\n\n"
            f"### 📅 Month 3: Fertilizer Application & Pest Monitoring\n"
            f"* **Fertilizer Dose:** Apply a balanced split dose of Urea and DAP. Scale the quantity to fit within your Rs. {budget} budget limit safely.\n"
            f"* **Pest Surveying:** Inspect leaves twice a week for signs of rust or sucking pests. Prepare neem-extract spray as a low-cost organic remedy.\n\n"
            f"### 📅 Month 4: Final Watering & Harvest Planning\n"
            f"* **Irrigation Schedule:** Apply a final irrigation during the grain development phase. Under **{water}** water levels, prioritize irrigation based on local weather forecasts to utilize rainfall.\n"
            f"* **Harvest Setup:** Cut the crop when grains turn golden-brown and reach 12-14% moisture level. Store in dry, well-ventilated grain storage bags.\n"
        )
