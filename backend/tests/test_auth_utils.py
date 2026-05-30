import pytest
import jwt
from datetime import datetime, timedelta
from utils.auth_utils import hash_password, verify_password, generate_token, verify_token

def test_password_hashing():
    """Verify that password hashing correctly generates non-plaintext bcrypt strings and verifies matches"""
    password = "saas_secure_pass_2026"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("incorrect_pass", hashed) is False

def test_jwt_token_generation_and_verification(app):
    """Verify that generate_token creates a decodable HS256 JWT, and verify_token extracts the payload"""
    with app.app_context():
        user_id = 1337
        token = generate_token(user_id)
        
        assert isinstance(token, str)
        assert len(token) > 20
        
        # Decode and verify the payload
        payload = verify_token(token)
        assert payload is not None
        assert payload['user_id'] == user_id
        
        # Verify an invalid token format
        invalid_payload = verify_token("this.is.a.bad.jwt.token")
        assert invalid_payload is None

def test_expired_jwt_token(app):
    """Verify that verify_token gracefully handles expired JWT signatures and returns None"""
    with app.app_context():
        # Construct a manually expired payload
        expired_payload = {
            'user_id': 500,
            'exp': datetime.utcnow() - timedelta(seconds=10),
            'iat': datetime.utcnow() - timedelta(seconds=100)
        }
        expired_token = jwt.encode(
            expired_payload,
            app.config['JWT_SECRET_KEY'],
            algorithm='HS256'
        )
        
        payload = verify_token(expired_token)
        assert payload is None
