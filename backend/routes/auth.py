from flask import Blueprint, request, jsonify
from models import (create_user, get_user_by_email, get_user_by_id, update_user)
from utils.auth_utils import (hash_password, verify_password, generate_token, token_required, verify_token)
from utils.email_utils import send_password_reset_email, send_welcome_email

auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register new user"""
    try:
        data = request.get_json() or {}
        
        # Default password if not provided
        if 'password' not in data:
            data['password'] = 'abc123'
            
        # Validate input
        if not all(k in data for k in ['name', 'email', 'password']):
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields: name, email'
            }), 400
        
        # Normalize email
        email_normalized = data['email'].strip().lower()
        data['email'] = email_normalized
        
        # Check if user exists
        if get_user_by_email(email_normalized):
            return jsonify({
                'status': 'error',
                'message': 'Email already registered'
            }), 400
        
        # Create new user
        user_id = create_user(
            name=data['name'],
            email=email_normalized,
            password=hash_password(data['password']),
            phone=data.get('phone'),
            region=data.get('region'),
            crop_types=data.get('crop_types', [])
        )
        
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'Failed to create user'
            }), 500
        
        # Generate token
        token = generate_token(user_id)
        
        # Send welcome email (non-blocking)
        send_welcome_email(
            recipient_email=email_normalized,
            user_name=data['name'].split()[0],  # First name only
            password=data['password']
        )
        
        # Retrieve newly created user to return accurate database status (e.g. bootstrapped is_admin)
        user_record = get_user_by_id(user_id)
        
        return jsonify({
            'status': 'success',
            'message': 'User registered successfully',
            'data': {
                'user': {
                    'id': user_id,
                    'name': data['name'],
                    'email': email_normalized,
                    'phone': data.get('phone'),
                    'region': data.get('region'),
                    'crop_types': data.get('crop_types', []),
                    'is_admin': user_record.get('is_admin', 0) if user_record else 0,
                    'ai_limit': user_record.get('ai_limit', 50) if user_record else 50
                },
                'token': token
            }
        }), 201
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Connection error'
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not all(k in data for k in ['email', 'password']):
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields: email, password'
            }), 400
        
        # Normalize email
        email_normalized = data['email'].strip().lower()
        
        # Find user
        user = get_user_by_email(email_normalized)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'Email incorrect'
            }), 401
            
        if not verify_password(data['password'], user['password']):
            return jsonify({
                'status': 'error',
                'message': 'Password incorrect'
            }), 401
        
        # Generate token
        token = generate_token(user['id'])
        
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'data': {
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                    'phone': user['phone'],
                    'region': user['region'],
                    'crop_types': user.get('crop_types', []),
                    'is_admin': user.get('is_admin', 0),
                    'ai_limit': user.get('ai_limit', 50)
                },
                'token': token
            }
        }), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Connection error'
        }), 500

@auth_bp.route('/logout', methods=['POST', 'OPTIONS'])
def logout():
    """Logout user"""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    return jsonify({
        'status': 'success',
        'message': 'Logged out successfully',
        'data': None
    }), 200

@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(payload):
    """Get authenticated user profile details"""
    try:
        user_id = payload.get('user_id')
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404
            
        import json
        crop_types = user.get('crop_types', [])
        if isinstance(crop_types, str):
            try:
                crop_types = json.loads(crop_types)
            except Exception:
                crop_types = []
                
        return jsonify({
            'status': 'success',
            'data': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'phone': user.get('phone'),
                'region': user.get('region'),
                'crop_types': crop_types,
                'is_admin': user.get('is_admin', 0),
                'ai_limit': user.get('ai_limit', 50)
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(payload):
    """Update authenticated user profile details"""
    try:
        user_id = payload.get('user_id')
        data = request.get_json() or {}
        
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404
            
        update_fields = {}
        if 'name' in data:
            update_fields['name'] = data['name'].strip()
        if 'phone' in data:
            update_fields['phone'] = data['phone'].strip()
        if 'region' in data:
            update_fields['region'] = data['region'].strip()
        if 'crop_types' in data:
            update_fields['crop_types'] = data['crop_types']
            
        if update_fields:
            update_user(user_id, **update_fields)
            
        updated_user = get_user_by_id(user_id)
        
        import json
        crop_types = updated_user.get('crop_types', [])
        if isinstance(crop_types, str):
            try:
                crop_types = json.loads(crop_types)
            except Exception:
                crop_types = []
                
        return jsonify({
            'status': 'success',
            'message': 'Profile updated successfully',
            'data': {
                'user': {
                    'id': updated_user['id'],
                    'name': updated_user['name'],
                    'email': updated_user['email'],
                    'phone': updated_user.get('phone'),
                    'region': updated_user.get('region'),
                    'crop_types': crop_types,
                    'is_admin': updated_user.get('is_admin', 0),
                    'ai_limit': updated_user.get('ai_limit', 50)
                }
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Reset password - sets to 1234 and sends via email"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or 'email' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Email is required'
            }), 400
        
        # Normalize email
        email_normalized = data['email'].strip().lower()
        
        # Find user
        user = get_user_by_email(email_normalized)
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'Email is not registered'
            }), 404
        
        # Set password to 1234
        temp_password = '1234'
        hashed_password = hash_password(temp_password)
        update_user(user['id'], password=hashed_password)
        
        # Send email with password
        email_sent = send_password_reset_email(
            recipient_email=user['email'],
            user_name=user['name'].split()[0],
            temp_password=temp_password
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Password reset successfully. Check your email.',
            'data': {
                'email_sent': email_sent
            }
        }), 200
        
    except Exception as e:
        print(f"Forgot password error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Connection error'
        }), 500

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password(payload):
    """Change password for authenticated user"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not all(k in data for k in ['old_password', 'new_password']):
            return jsonify({
                'status': 'error',
                'message': 'old_password and new_password are required'
            }), 400
        
        user_id = payload.get('user_id')
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404
        
        # Verify old password
        old_password = data['old_password']
        new_password = data['new_password'].strip()
        
        if not verify_password(old_password, user['password']):
            return jsonify({'status': 'error', 'message': 'Old password is incorrect'}), 400
        
        if len(new_password) < 6:
            return jsonify({'status': 'error', 'message': 'Password must be at least 6 characters'}), 400
        
        # Update password
        hashed_password = hash_password(new_password)
        update_user(user_id, password=hashed_password)
        
        return jsonify({
            'status': 'success',
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
