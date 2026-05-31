import pytest
import json
from io import BytesIO
from unittest.mock import patch, MagicMock
from utils.auth_utils import generate_token

def get_auth_headers(app, user_id=1):
    """Helper to generate standard JWT authorization headers for testing secure routes"""
    with app.app_context():
        token = generate_token(user_id)
        return {'Authorization': f'Bearer {token}'}

# ======================== BASE ROUTES ========================

def test_home_route(client):
    """Test standard welcome route"""
    response = client.get('/')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert 'AgroSense Backend API' in data['message']

def test_health_route(client):
    """Test backend service health status checks"""
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'

# ======================== AUTH ROUTES ========================

@patch('routes.auth.get_user_by_email')
@patch('routes.auth.create_user')
def test_register_success(mock_create, mock_get_user, client, app):
    """Test successful user registration"""
    mock_get_user.return_value = None
    mock_create.return_value = 5 # Mock user ID
    
    payload = {
        'name': 'Fayyaz Shah',
        'email': 'fayyaz@example.pk',
        'password': 'safe_pass_2026',
        'phone': '03009998887',
        'region': 'Sindh',
        'crop_types': ['Cotton']
    }
    
    response = client.post('/api/v1/auth/register', json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data['status'] == 'success'
    assert data['data']['user']['id'] == 5
    assert 'token' in data['data']

@patch('routes.auth.get_user_by_email')
def test_register_duplicate_email(mock_get_user, client):
    """Test that register rejects duplicate emails with 400"""
    mock_get_user.return_value = {'id': 1, 'email': 'dup@example.pk'}
    
    payload = {
        'name': 'Dup User',
        'email': 'dup@example.pk',
        'password': 'password123'
    }
    
    response = client.post('/api/v1/auth/register', json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert 'Email already registered' in data['message']

@patch('routes.auth.get_user_by_email')
@patch('routes.auth.verify_password')
def test_login_success(mock_verify, mock_get_user, client, app):
    """Test successful login with password verification"""
    mock_get_user.return_value = {
        'id': 10,
        'name': 'Fayyaz Shah',
        'email': 'fayyaz@example.pk',
        'password': 'hashed_bcrypt_string',
        'phone': '03009998887',
        'region': 'Sindh',
        'crop_types': ['Cotton']
    }
    mock_verify.return_value = True
    
    payload = {
        'email': 'fayyaz@example.pk',
        'password': 'safe_pass_2026'
    }
    
    response = client.post('/api/v1/auth/login', json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert data['data']['user']['id'] == 10
    assert 'token' in data['data']

@patch('routes.auth.get_user_by_email')
def test_login_wrong_credentials(mock_get_user, client):
    """Test that login handles wrong password with 401"""
    mock_get_user.return_value = None # Email doesn't exist
    
    payload = {
        'email': 'missing@example.pk',
        'password': 'password'
    }
    
    response = client.post('/api/v1/auth/login', json=payload)
    assert response.status_code == 401

# ======================== DASHBOARD ROUTES ========================

@patch('routes.dashboard.execute_query')
def test_dashboard_outbreaks_success(mock_execute_query, client, app):
    """Test fetching crowdsourced disease hotzones for mapping with active JWT"""
    # Mock some recent scan logs with all required properties for regional mapping
    mock_execute_query.return_value = [
        {
            'id': 1,
            'crop_type': 'Wheat',
            'disease': 'Yellow Rust',
            'region': 'Multan',
            'confidence': 90,
            'status': 'Diseased',
            'created_at': '2026-05-24'
        }
    ]
    
    headers = get_auth_headers(app)
    response = client.get('/api/v1/dashboard/outbreaks', headers=headers)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert len(data['data']) > 0
    assert 'coordinates' in data['data'][0]
    assert data['data'][0]['disease'] == 'Yellow Rust'

# ======================== HISTORY ROUTES ========================

@patch('routes.chat.get_chat_sessions')
def test_history_sessions_success(mock_get_sessions, client, app):
    """Test loading previous chat session logs for dashboard via chat bp"""
    mock_get_sessions.return_value = [
        {'chat_session_id': 'sess-1', 'title': 'Crop Blight consultation', 'last_message': '2026-05-24'}
    ]
    
    headers = get_auth_headers(app)
    response = client.get('/api/v1/chat/sessions', headers=headers)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert data['data'][0]['chat_session_id'] == 'sess-1'

@patch('routes.history.get_scan_by_id')
def test_history_single_scan_lookup(mock_get_scan, client, app):
    """Test pulling a single scan record with real database fetch"""
    mock_get_scan.return_value = {
        'id': 123,
        'crop_type': 'Sugarcane',
        'disease': 'Healthy',
        'confidence': 99,
        'image_url': '/static/uploads/scan_123.jpg',
        'advisory_english': 'No treatments needed.'
    }
    
    headers = get_auth_headers(app)
    response = client.get('/api/v1/history/scans/123', headers=headers)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert data['data']['crop_type'] == 'Sugarcane'

# ======================== CHAT ROUTES ========================

@patch('routes.chat.call_groq_completions')
@patch('routes.chat.create_chat_message')
def test_chat_send_disease_intent(mock_create_msg, mock_groq, client, app):
    """Test that chat classifies disease keyword and triggers disease image uploader overlay"""
    mock_groq.return_value = "Mocked Groq analysis"
    
    payload = {
        'chat_session_id': 'sess-chat',
        'message': 'My crops have a disease',
        'language': 'en'
    }
    
    headers = get_auth_headers(app)
    response = client.post('/api/v1/chat/send', json=payload, headers=headers)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert data['data']['action_trigger'] == 'trigger_image_upload'

@patch('routes.chat.predict_crop')
@patch('routes.chat.call_groq_completions')
@patch('routes.chat.create_chat_message')
def test_chat_recommend_crop_success(mock_create_msg, mock_groq, mock_predict, client, app):
    """Test ML tabular soil recommendation endpoint"""
    mock_predict.return_value = 'maize'
    mock_groq.return_value = 'Balanced DAP and Urea recommendation.'
    
    payload = {
        'chat_session_id': 'sess-recommend',
        'language': 'en',
        'n': 80, 'p': 40, 'k': 40,
        'temperature': 25.0, 'humidity': 65.0, 'ph': 6.0, 'rainfall': 150.0
    }
    
    headers = get_auth_headers(app)
    response = client.post('/api/v1/chat/recommend_crop', json=payload, headers=headers)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert data['data']['recommended_crop'] == 'maize'
    assert 'DAP and Urea' in data['data']['advisory']



# ======================== SCAN ROUTES ========================

@patch('routes.scan.call_gemini_vision')
@patch('routes.scan.create_scan')
def test_scan_disease_detect(mock_create_scan, mock_gemini_vision, client, app):
    """Test crop leaf disease detection prediction uploader"""
    import json
    mock_gemini_vision.return_value = json.dumps({
        "crop_type": "Wheat",
        "disease": "Yellow Rust",
        "confidence": 95,
        "status": "Diseased",
        "advisory_english": "Mock English advisory",
        "advisory_urdu": "Mock Urdu advisory"
    })
    mock_create_scan.return_value = 777
    
    headers = get_auth_headers(app)
    
    data = {
        'image': (BytesIO(b'dummy_image_data_payload'), 'crop_leaf.jpg'),
        'crop_type': 'Wheat',
        'region': 'Faisalabad'
    }
    
    with patch('builtins.open', MagicMock()):
        response = client.post(
            '/api/v1/scan/predict',
            data=data,
            content_type='multipart/form-data',
            headers=headers
        )
        
    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data['status'] == 'success'
    assert res_data['data']['scan_id'] == 777
    assert res_data['data']['disease'] == 'Yellow Rust'
    assert res_data['data']['confidence'] > 90

# ======================== PROFILE ROUTES ========================

@patch('routes.auth.get_user_by_id')
def test_get_profile_success(mock_get_user, client, app):
    """Test fetching profile for authenticated user"""
    mock_get_user.return_value = {
        'id': 1,
        'name': 'احمد خان',
        'email': 'ahmed@example.pk',
        'phone': '03001234567',
        'region': 'Lahore',
        'crop_types': '["Wheat", "Cotton"]'
    }
    
    headers = get_auth_headers(app)
    response = client.get('/api/v1/auth/profile', headers=headers)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert data['data']['name'] == 'احمد خان'
    assert data['data']['crop_types'] == ["Wheat", "Cotton"]

@patch('routes.auth.get_user_by_id')
@patch('routes.auth.update_user')
def test_update_profile_success(mock_update, mock_get_user, client, app):
    """Test updating profile parameters successfully"""
    # First get user before update, then get user after update
    mock_get_user.side_effect = [
        {
            'id': 1,
            'name': 'Ahmed Khan',
            'email': 'ahmed@example.pk',
            'phone': '03001234567',
            'region': 'Lahore',
            'crop_types': '["Wheat"]'
        },
        {
            'id': 1,
            'name': 'Ahmed Khan Updated',
            'email': 'ahmed@example.pk',
            'phone': '03217654321',
            'region': 'Multan',
            'crop_types': '["Wheat", "Sugarcane"]'
        }
    ]
    mock_update.return_value = 1
    
    payload = {
        'name': 'Ahmed Khan Updated',
        'phone': '03217654321',
        'region': 'Multan',
        'crop_types': ['Wheat', 'Sugarcane']
    }
    
    headers = get_auth_headers(app)
    response = client.put('/api/v1/auth/profile', json=payload, headers=headers)
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert data['data']['user']['name'] == 'Ahmed Khan Updated'
    assert data['data']['user']['region'] == 'Multan'
    assert data['data']['user']['crop_types'] == ['Wheat', 'Sugarcane']
