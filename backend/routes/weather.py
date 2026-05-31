import os
import logging
import requests
from flask import Blueprint, request, jsonify
from utils.auth_utils import token_required
from utils.gemini_client import call_gemini
from models import get_user_by_id

logger = logging.getLogger(__name__)

weather_bp = Blueprint('weather', __name__, url_prefix='/api/v1/weather')

# Pakistan city coordinates for Open-Meteo lookup
CITY_COORDS = {
    'Lahore':        {'lat': 31.5204, 'lon': 74.3587},
    'Karachi':       {'lat': 24.8607, 'lon': 67.0011},
    'Islamabad':     {'lat': 33.6844, 'lon': 73.0479},
    'Peshawar':      {'lat': 34.0151, 'lon': 71.5249},
    'Quetta':        {'lat': 30.1798, 'lon': 66.9750},
    'Multan':        {'lat': 30.1575, 'lon': 71.5249},
    'Faisalabad':    {'lat': 31.4504, 'lon': 73.1350},
    'Hyderabad':     {'lat': 25.3960, 'lon': 68.3772},
    'Gujranwala':    {'lat': 32.1877, 'lon': 74.1945},
    'Sialkot':       {'lat': 32.4972, 'lon': 74.5361},
    'Rawalpindi':    {'lat': 33.5651, 'lon': 73.0169},
    'Gilgit':        {'lat': 35.8819, 'lon': 74.4643},
    'Muzaffarabad':  {'lat': 34.3700, 'lon': 73.4708},
    'Gwadar':        {'lat': 25.1216, 'lon': 62.3254},
    'Bahawalpur':    {'lat': 29.3544, 'lon': 71.6911},
    'Kasur':         {'lat': 31.1179, 'lon': 74.4509},
}

# Province → default city mapping
PROVINCE_MAP = {
    'punjab': 'Lahore',
    'sindh': 'Karachi',
    'kpk': 'Peshawar',
    'khyber pakhtunkhwa': 'Peshawar',
    'balochistan': 'Quetta',
    'gb': 'Gilgit',
    'gilgit-baltistan': 'Gilgit',
    'azad kashmir': 'Muzaffarabad',
}

# WMO weather code → human-readable descriptions
WMO_CODES = {
    0: ('Clear Sky', 'صاف آسمان', 'fa-sun', '#fbbf24'),
    1: ('Mainly Clear', 'زیادہ تر صاف', 'fa-sun', '#fbbf24'),
    2: ('Partly Cloudy', 'جزوی ابر آلود', 'fa-cloud-sun', '#a1a1aa'),
    3: ('Overcast', 'مکمل ابر آلود', 'fa-cloud', '#94a3b8'),
    45: ('Foggy', 'دھند', 'fa-smog', '#cbd5e1'),
    48: ('Rime Fog', 'شدید دھند', 'fa-smog', '#cbd5e1'),
    51: ('Light Drizzle', 'ہلکی بوندا باندی', 'fa-cloud-rain', '#60a5fa'),
    53: ('Moderate Drizzle', 'درمیانی بوندا باندی', 'fa-cloud-rain', '#3b82f6'),
    55: ('Dense Drizzle', 'شدید بوندا باندی', 'fa-cloud-rain', '#2563eb'),
    61: ('Slight Rain', 'ہلکی بارش', 'fa-cloud-showers-heavy', '#60a5fa'),
    63: ('Moderate Rain', 'درمیانی بارش', 'fa-cloud-showers-heavy', '#3b82f6'),
    65: ('Heavy Rain', 'شدید بارش', 'fa-cloud-showers-heavy', '#1d4ed8'),
    71: ('Slight Snow', 'ہلکی برف باری', 'fa-snowflake', '#bae6fd'),
    73: ('Moderate Snow', 'درمیانی برف باری', 'fa-snowflake', '#7dd3fc'),
    75: ('Heavy Snow', 'شدید برف باری', 'fa-snowflake', '#38bdf8'),
    77: ('Snow Grains', 'برف کے ذرات', 'fa-snowflake', '#7dd3fc'),
    80: ('Slight Showers', 'ہلکی بوچھاڑیں', 'fa-cloud-showers-water', '#60a5fa'),
    81: ('Moderate Showers', 'درمیانی بوچھاڑیں', 'fa-cloud-showers-water', '#3b82f6'),
    82: ('Violent Showers', 'شدید بوچھاڑیں', 'fa-cloud-showers-water', '#1e40af'),
    95: ('Thunderstorm', 'آندھی اور طوفان', 'fa-cloud-bolt', '#f59e0b'),
    96: ('Thunderstorm + Hail', 'اولوں والا طوفان', 'fa-cloud-bolt', '#ef4444'),
    99: ('Severe Thunderstorm', 'شدید طوفان', 'fa-cloud-bolt', '#dc2626'),
}


def resolve_city(region_name):
    """Resolve a region name to a known city for coordinate lookup."""
    reg_lower = (region_name or 'Punjab').strip().lower()

    # Exact match
    for city in CITY_COORDS:
        if reg_lower == city.lower():
            return city

    # Province mapping
    if reg_lower in PROVINCE_MAP:
        return PROVINCE_MAP[reg_lower]

    # Substring match
    for city in CITY_COORDS:
        if city.lower() in reg_lower or reg_lower in city.lower():
            return city

    return 'Islamabad'  # Default fallback


def fetch_open_meteo(lat, lon):
    """Fetch 7-day weather forecast from Open-Meteo (free, no key required)."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
        f"&daily=weather_code,temperature_2m_max,temperature_2m_min,"
        f"precipitation_probability_max,wind_speed_10m_max,relative_humidity_2m_mean"
        f"&timezone=Asia/Karachi"
        f"&forecast_days=7"
    )
    try:
        resp = requests.get(url, timeout=10)
        if resp.ok:
            return resp.json()
        logger.error(f"Open-Meteo API Error: {resp.status_code} - {resp.text[:300]}")
    except Exception as e:
        logger.error(f"Open-Meteo request failed: {e}")
    return None


def generate_gemini_advisory(weather_data, region, lang='en'):
    """Send weather data to Gemini 2.5 Flash and generate crop protection advisory."""
    current = weather_data.get('current', {})
    daily = weather_data.get('daily', {})

    temp = current.get('temperature_2m', 'N/A')
    humidity = current.get('relative_humidity_2m', 'N/A')
    wind = current.get('wind_speed_10m', 'N/A')
    wmo_code = current.get('weather_code', 0)

    # Build 7-day summary for context
    forecast_summary = ""
    dates = daily.get('time', [])
    max_temps = daily.get('temperature_2m_max', [])
    min_temps = daily.get('temperature_2m_min', [])
    precip_probs = daily.get('precipitation_probability_max', [])
    daily_codes = daily.get('weather_code', [])

    for i in range(min(7, len(dates))):
        code_info = WMO_CODES.get(daily_codes[i] if i < len(daily_codes) else 0, ('Unknown', 'نامعلوم', 'fa-question', '#888'))
        forecast_summary += (
            f"  - {dates[i]}: {code_info[0]}, "
            f"High {max_temps[i] if i < len(max_temps) else 'N/A'}°C, "
            f"Low {min_temps[i] if i < len(min_temps) else 'N/A'}°C, "
            f"Rain probability {precip_probs[i] if i < len(precip_probs) else 'N/A'}%\n"
        )

    system_instruction = (
        "You are 'AgroWeather AI', an elite agricultural meteorologist and crop protection specialist in Pakistan. "
        "Analyze the provided real-time weather data and 7-day forecast, then generate a highly practical, "
        "actionable crop advisory for the farmer. Focus on:\n"
        "1. Immediate weather impact on standing crops (irrigation, pest/disease risk, heat/cold stress)\n"
        "2. What protective measures the farmer should take in the next 48 hours\n"
        "3. 7-day outlook — when to spray, irrigate, or harvest based on the forecast\n"
        "Keep it concise (3-5 bullet points), warm, and highly professional. "
        "If the weather is dangerous (storm, extreme heat >42°C, flooding), emphasize urgency.\n"
        f"Respond ENTIRELY in {'Urdu (اردو نستعلیق)' if lang == 'ur' else 'English'}."
    )

    prompt = (
        f"Real-time weather for {region}, Pakistan:\n"
        f"- Current Temperature: {temp}°C\n"
        f"- Humidity: {humidity}%\n"
        f"- Wind Speed: {wind} km/h\n"
        f"- Condition: {WMO_CODES.get(wmo_code, ('Unknown',))[0]}\n\n"
        f"7-Day Forecast:\n{forecast_summary}\n"
        f"Generate a targeted crop protection advisory for farmers in {region}."
    )

    advisory = call_gemini(prompt, system_instruction=system_instruction, temperature=0.6, max_tokens=600)
    return advisory


@weather_bp.route('/advisory', methods=['GET'])
@token_required
def get_weather_advisory(payload):
    """
    Get real-time weather data from Open-Meteo and AI-generated crop advisory from Gemini 2.5 Flash.
    """
    try:
        user_id = payload.get('user_id')
        lang = request.args.get('lang', 'en')

        # Get user's region
        user = get_user_by_id(user_id)
        region = (user.get('region') if user else None) or 'Punjab'

        # Resolve city and coordinates
        city = resolve_city(region)
        coords = CITY_COORDS.get(city, CITY_COORDS['Islamabad'])
        lat, lon = coords['lat'], coords['lon']

        logger.info(f"Fetching weather for user {user_id}, region={region}, city={city} ({lat}, {lon})")

        # 1. Fetch real weather from Open-Meteo
        weather_data = fetch_open_meteo(lat, lon)

        if not weather_data:
            logger.warning("Open-Meteo failed — returning offline fallback")
            return jsonify({
                'status': 'success',
                'data': _get_offline_fallback(city, region, lang)
            }), 200

        current = weather_data.get('current', {})
        daily = weather_data.get('daily', {})
        wmo_code = current.get('weather_code', 0)
        code_info = WMO_CODES.get(wmo_code, ('Partly Cloudy', 'جزوی ابر آلود', 'fa-cloud-sun', '#a1a1aa'))

        # 2. Generate AI advisory via Gemini
        ai_advisory_en = None
        ai_advisory_ur = None

        ai_advisory = generate_gemini_advisory(weather_data, city, lang)
        if ai_advisory:
            if lang == 'ur':
                ai_advisory_ur = ai_advisory
            else:
                ai_advisory_en = ai_advisory

        # Fallback advisory if Gemini fails
        if not ai_advisory_en and lang == 'en':
            ai_advisory_en = _fallback_advisory_en(current, city)
        if not ai_advisory_ur and lang == 'ur':
            ai_advisory_ur = _fallback_advisory_ur(current, city)

        # 3. Build 7-day forecast array
        forecast_days = []
        dates = daily.get('time', [])
        max_temps = daily.get('temperature_2m_max', [])
        min_temps = daily.get('temperature_2m_min', [])
        precip_probs = daily.get('precipitation_probability_max', [])
        daily_codes = daily.get('weather_code', [])
        daily_wind = daily.get('wind_speed_10m_max', [])
        daily_humidity = daily.get('relative_humidity_2m_mean', [])

        for i in range(min(7, len(dates))):
            d_code = daily_codes[i] if i < len(daily_codes) else 0
            d_info = WMO_CODES.get(d_code, ('Partly Cloudy', 'جزوی ابر آلود', 'fa-cloud-sun', '#a1a1aa'))
            forecast_days.append({
                'date': dates[i],
                'temp_max': max_temps[i] if i < len(max_temps) else None,
                'temp_min': min_temps[i] if i < len(min_temps) else None,
                'precip_prob': precip_probs[i] if i < len(precip_probs) else 0,
                'wind_max': daily_wind[i] if i < len(daily_wind) else None,
                'humidity_avg': daily_humidity[i] if i < len(daily_humidity) else None,
                'condition_en': d_info[0],
                'condition_ur': d_info[1],
                'icon': d_info[2],
                'icon_color': d_info[3],
            })

        return jsonify({
            'status': 'success',
            'data': {
                'source': 'live',
                'city': city,
                'region': region,
                'current': {
                    'temp': current.get('temperature_2m'),
                    'humidity': current.get('relative_humidity_2m'),
                    'wind': current.get('wind_speed_10m'),
                    'condition_en': code_info[0],
                    'condition_ur': code_info[1],
                    'icon': code_info[2],
                    'icon_color': code_info[3],
                },
                'advisory_en': ai_advisory_en,
                'advisory_ur': ai_advisory_ur,
                'forecast': forecast_days,
            }
        }), 200

    except Exception as e:
        logger.error(f"Weather advisory error: {e}", exc_info=True)
        return jsonify({'status': 'error', 'message': str(e)}), 500


def _fallback_advisory_en(current, city):
    temp = current.get('temperature_2m', 30)
    humidity = current.get('relative_humidity_2m', 50)
    if temp > 40:
        return f"⚠️ Extreme heat alert in {city}! Irrigate crops during early morning or late evening only. Apply mulch to retain soil moisture and protect seedlings from sunburn."
    elif temp > 35:
        return f"Hot conditions in {city}. Ensure regular irrigation and avoid mid-day pesticide spraying. Monitor crops for heat stress signs like leaf curling."
    elif humidity > 80:
        return f"High humidity in {city} increases fungal disease risk. Inspect leaves for blight or mildew. Ensure proper crop spacing for air circulation."
    else:
        return f"Favorable conditions in {city}. Great time for field operations — fertilizer application, weeding, and routine crop inspection."


def _fallback_advisory_ur(current, city):
    temp = current.get('temperature_2m', 30)
    humidity = current.get('relative_humidity_2m', 50)
    if temp > 40:
        return f"⚠️ {city} میں شدید گرمی کا الرٹ! صرف صبح سویرے یا شام کو فصلوں کو پانی دیں۔ مٹی کی نمی برقرار رکھنے کے لیے ملچ لگائیں۔"
    elif temp > 35:
        return f"{city} میں گرم موسم ہے۔ باقاعدگی سے آبپاشی کریں اور دوپہر کے وقت کیڑے مار ادویات سپرے نہ کریں۔ پتوں کے مڑنے جیسی گرمی کی علامات پر نظر رکھیں۔"
    elif humidity > 80:
        return f"{city} میں زیادہ نمی فنگس کے پھیلاؤ کا خطرہ بڑھاتی ہے۔ پتوں کا معائنہ کریں اور فصلوں کے درمیان ہوا کی آمد و رفت یقینی بنائیں۔"
    else:
        return f"{city} میں موسم سازگار ہے۔ کھاد ڈالنے، جڑی بوٹیاں تلف کرنے اور فصل کے معمول کے معائنے کا اچھا وقت ہے۔"


def _get_offline_fallback(city, region, lang):
    """Complete offline fallback when Open-Meteo is down."""
    return {
        'source': 'offline',
        'city': city,
        'region': region,
        'current': {
            'temp': 34,
            'humidity': 50,
            'wind': 12,
            'condition_en': 'Data Unavailable',
            'condition_ur': 'ڈیٹا دستیاب نہیں',
            'icon': 'fa-cloud-sun',
            'icon_color': '#a1a1aa',
        },
        'advisory_en': f"Weather data is temporarily unavailable for {city}. Please check back shortly. In the meantime, follow standard seasonal crop care practices.",
        'advisory_ur': f"{city} کے لیے موسمی ڈیٹا عارضی طور پر دستیاب نہیں ہے۔ براہ کرم تھوڑی دیر بعد دوبارہ چیک کریں۔",
        'forecast': [],
    }
