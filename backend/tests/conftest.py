import os
import sys
import pytest
from unittest.mock import MagicMock, patch

# Ensure backend directory is in the path
backend_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set test environment variables BEFORE importing app or other modules
os.environ['FLASK_ENV'] = 'testing'
os.environ['GROQ_API_KEY'] = 'mock-groq-api-key'
os.environ['SECRET_KEY'] = 'test-secret-key-2026'
os.environ['JWT_SECRET_KEY'] = 'test-jwt-secret-key-2026'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_NAME'] = 'agrosense_test'
os.environ['DB_USER'] = 'root'
os.environ['DB_PASSWORD'] = 'password'

# Mock mysql.connector and mysql.connector.pooling before importing anything else
sys.modules['mysql.connector'] = MagicMock()
sys.modules['mysql.connector.pooling'] = MagicMock()

# Import create_app from backend/app.py
from app import create_app

@pytest.fixture(scope='session', autouse=True)
def mock_global_db():
    """Globally mock the database execution layer to avoid real DB execution"""
    with patch('utils.database.execute_query') as mock_query, \
         patch('utils.database.execute_insert') as mock_insert, \
         patch('utils.database.execute_update') as mock_update, \
         patch('utils.database.init_database') as mock_init_db:
        
        mock_init_db.return_value = True
        mock_query.return_value = []
        mock_insert.return_value = 1
        mock_update.return_value = 1
        
        yield {
            'query': mock_query,
            'insert': mock_insert,
            'update': mock_update,
            'init_db': mock_init_db
        }

@pytest.fixture
def app():
    """Create and configure a Flask app for testing"""
    app = create_app('testing')
    yield app

@pytest.fixture
def client(app):
    """A test client for the app"""
    return app.test_client()

@pytest.fixture
def mock_db():
    """Mock database helpers to allow overriding query returns on per-test basis"""
    with patch('utils.database.execute_query') as mock_q, \
         patch('utils.database.execute_insert') as mock_i, \
         patch('utils.database.execute_update') as mock_u:
        yield {
            'query': mock_q,
            'insert': mock_i,
            'update': mock_u
        }
