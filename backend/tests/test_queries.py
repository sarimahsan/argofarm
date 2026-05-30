import pytest
import json
from unittest.mock import patch, MagicMock
from models.queries import (
    create_user, get_user_by_email, get_user_by_id, update_user,
    create_scan, get_scan_by_id, get_user_scans, count_user_scans,
    get_user_crop_types, get_scan_statistics,
    create_chat_message, get_chat_history, get_chat_sessions,
    create_disease, get_disease_by_name, get_diseases_by_crop, get_all_diseases
)

@patch('models.queries.execute_insert')
def test_create_user(mock_insert):
    """Verify that create_user compiles query, serializes crop types JSON, and executes insert"""
    mock_insert.return_value = 10
    
    user_id = create_user(
        name="Muhammad Ali",
        email="ali@example.pk",
        password="hashedpassword123",
        phone="03215551234",
        region="Sindh",
        crop_types=["Cotton", "Sugarcane"]
    )
    
    assert user_id == 10
    mock_insert.assert_called_once()
    sql, params = mock_insert.call_args[0]
    assert "INSERT INTO users" in sql
    assert params[0] == "Muhammad Ali"
    assert params[1] == "ali@example.pk"
    assert params[5] == json.dumps(["Cotton", "Sugarcane"])

@patch('models.queries.execute_query')
def test_get_user_by_email_success(mock_query):
    """Verify get_user_by_email executes select query and returns single dictionary"""
    mock_query.return_value = [{'id': 2, 'name': 'Muhammad Ali', 'email': 'ali@example.pk'}]
    
    user = get_user_by_email('ali@example.pk')
    
    assert user is not None
    assert user['id'] == 2
    assert user['name'] == 'Muhammad Ali'
    mock_query.assert_called_once()
    sql, params = mock_query.call_args[0]
    assert "SELECT * FROM users WHERE email = %s" in sql
    assert params == ('ali@example.pk',)

@patch('models.queries.execute_query')
def test_get_user_by_email_none(mock_query):
    """Verify get_user_by_email returns None gracefully when no match exists"""
    mock_query.return_value = []
    user = get_user_by_email('missing@example.pk')
    assert user is None

@patch('models.queries.execute_update')
def test_update_user(mock_update):
    """Verify update_user builds SQL update assignments, handles field mapping, and executes update"""
    mock_update.return_value = 1
    
    rows = update_user(2, name="Ali Khan", region="Punjab")
    
    assert rows == 1
    mock_update.assert_called_once()
    sql, params = mock_update.call_args[0]
    assert "UPDATE users SET" in sql
    assert "name = %s" in sql
    assert "region = %s" in sql
    assert params == ("Ali Khan", "Punjab", 2)

@patch('models.queries.execute_insert')
def test_create_scan(mock_insert):
    """Verify create_scan formats scan logs and performs database insert"""
    mock_insert.return_value = 100
    
    scan_id = create_scan(
        user_id=2, crop_type="Rice", disease="Rice Blast", confidence=89,
        region="Punjab", image_url="/static/uploads/rice.jpg",
        advisory_english="Apply Tricyclazole", advisory_urdu="ٹرائی سائیکلازول چھڑکیں"
    )
    
    assert scan_id == 100
    mock_insert.assert_called_once()
    sql, params = mock_insert.call_args[0]
    assert "INSERT INTO scans" in sql
    assert params[0] == 2
    assert params[1] == "Rice"
    assert params[2] == "Rice Blast"

@patch('models.queries.execute_query')
def test_get_scan_statistics(mock_query):
    """Verify get_scan_statistics fires sequential queries and compiles them into a structured dict"""
    # Configure mock responses for successive query calls
    mock_query.side_effect = [
        [{'count': 15}], # Total scans
        [{'status': 'Diseased', 'count': 10}, {'status': 'Healthy', 'count': 5}], # Status distribution
        [{'crop_type': 'Wheat', 'count': 15}], # Crop distribution
        [{'avg_confidence': 90.5}] # Average confidence
    ]
    
    stats = get_scan_statistics(2)
    
    assert stats['total_scans'] == 15
    assert len(stats['status_distribution']) == 2
    assert stats['crop_distribution'][0]['crop_type'] == 'Wheat'
    assert stats['average_confidence'] == 90.5
    assert mock_query.call_count == 4

@patch('models.queries.execute_insert')
def test_create_chat_message(mock_insert):
    """Verify create_chat_message inserts textual log with JSON serialized metadata"""
    mock_insert.return_value = 25
    
    msg_id = create_chat_message(
        user_id=2, chat_session_id="sess-999", message="Yellowing of leaves",
        sender="user", message_type="text", language="en", metadata={"disease_detected": "Yellow Rust"}
    )
    
    assert msg_id == 25
    mock_insert.assert_called_once()
    sql, params = mock_insert.call_args[0]
    assert "INSERT INTO chat_history" in sql
    assert params[0] == 2
    assert params[1] == "sess-999"
    assert params[3] == "Yellowing of leaves"
    assert params[7] == json.dumps({"disease_detected": "Yellow Rust"})
