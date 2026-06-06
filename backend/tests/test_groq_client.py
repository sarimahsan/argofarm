import pytest
import os
from unittest.mock import patch, MagicMock
from utils.groq_client import call_groq_completions, call_groq_transcription

@patch('utils.groq_client.requests.post')
def test_call_groq_completions_success(mock_post):
    """Test that a standard Groq call successfully parses and returns completions text"""
    # Mock valid API response
    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.json.return_value = {
        'choices': [{
            'message': {
                'content': 'Mocked professional AI advisor yield report.'
            }
        }]
    }
    mock_post.return_value = mock_resp
    
    messages = [{'role': 'user', 'content': 'Suggest fertilizers for wheat'}]
    
    # Run helper
    response = call_groq_completions(messages, model_name='llama3-8b-8192', temperature=0.5, max_tokens=100)
    
    assert response == 'Mocked professional AI advisor yield report.'
    mock_post.assert_called_once()
    
    # Assert correct parameters were compiled into request payload
    url, kwargs = mock_post.call_args
    assert url[0] == "https://api.groq.com/openai/v1/chat/completions"
    assert kwargs['headers']['Authorization'] == "Bearer mock-groq-api-key"
    assert kwargs['json']['model'] == 'llama3-8b-8192'
    assert kwargs['json']['temperature'] == 0.5
    assert kwargs['json']['max_tokens'] == 100
    assert kwargs['json']['messages'] == messages

@patch('utils.groq_client.requests.post')
@patch.dict(os.environ, {}, clear=True)
def test_call_groq_completions_missing_key(mock_post):
    """Test that call_groq_completions returns None instantly when GROQ_API_KEY environment variable is absent"""
    messages = [{'role': 'user', 'content': 'Hello'}]
    response = call_groq_completions(messages)
    
    assert response is None
    mock_post.assert_not_called()

@patch('utils.groq_client.requests.post')
def test_call_groq_completions_non_200_failure(mock_post):
    """Test that non-200 responses from Groq server return None and log details gracefully"""
    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 429
    mock_resp.text = "Rate limit exceeded"
    mock_post.return_value = mock_resp
    
    messages = [{'role': 'user', 'content': 'Hello'}]
    response = call_groq_completions(messages)
    
    assert response is None
    mock_post.assert_called_once()

@patch('utils.groq_client.requests.post')
def test_call_groq_completions_exception_handling(mock_post):
    """Test that any library-level connection exceptions are caught, return None, and do not crash the service"""
    mock_post.side_effect = ConnectionError("Failed to resolve api.groq.com hostname")
    
    messages = [{'role': 'user', 'content': 'Hello'}]
    response = call_groq_completions(messages)
    
    assert response is None


@patch('utils.groq_client.requests.post')
def test_call_groq_transcription_success(mock_post):
    """Test that call_groq_transcription successfully sends file bytes and parses the text response"""
    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.json.return_value = {'text': 'یہ ایک آزمائشی ریکارڈنگ ہے۔'}
    mock_post.return_value = mock_resp

    response = call_groq_transcription(b'dummy_audio_bytes', 'audio.webm', 'audio/webm')

    assert response == 'یہ ایک آزمائشی ریکارڈنگ ہے۔'
    mock_post.assert_called_once()
    url, kwargs = mock_post.call_args
    assert url[0] == "https://api.groq.com/openai/v1/audio/transcriptions"
    assert kwargs['files']['file'][0] == 'audio.webm'
    assert kwargs['files']['file'][2] == 'audio/webm'
    assert kwargs['data']['model'] == 'whisper-large-v3'


@patch('utils.groq_client.requests.post')
def test_call_groq_transcription_failure(mock_post):
    """Test call_groq_transcription returns None gracefully on failure status code"""
    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 400
    mock_post.return_value = mock_resp

    response = call_groq_transcription(b'dummy_audio_bytes', 'audio.webm')

    assert response is None
    mock_post.assert_called_once()

