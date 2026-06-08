import time
import logging
from flask import request, jsonify
from functools import wraps

logger = logging.getLogger(__name__)

# In-memory storage for rate limiting
# Key: (identifier, endpoint, period_seconds) -> list of timestamps
_rate_limit_store = {}

def rate_limit(limit, period, by_ip=False):
    """
    Decorator to apply rate limiting to a Flask endpoint.
    
    Args:
        limit (int): Maximum number of requests allowed in the given period.
        period (int): Time window in seconds (e.g. 60 for 1 minute, 86400 for 1 day).
        by_ip (bool): If True, rate limit by IP address instead of JWT user_id.
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            key_identifier = None
            user_id = None
            
            # Try to identify user by JWT payload
            if not by_ip and args and isinstance(args[0], dict) and 'user_id' in args[0]:
                user_id = args[0]['user_id']
                key_identifier = f"user_{user_id}"
            
            # Fall back to client IP address
            if not key_identifier:
                # Handle reverse proxy headers if behind Nginx
                ip = request.headers.get('X-Forwarded-For', request.remote_addr)
                if ip and ',' in ip:
                    ip = ip.split(',')[0].strip()
                key_identifier = f"ip_{ip or 'unknown'}"
            
            # Check for custom user-specific AI rate limits or blocks
            actual_limit = limit
            if user_id:
                try:
                    from models.queries import get_user_by_id
                    user_record = get_user_by_id(user_id)
                    if user_record:
                        db_ai_limit = user_record.get('ai_limit')
                        if db_ai_limit is not None:
                            # 0 or negative means blocked completely from AI
                            if db_ai_limit <= 0:
                                return jsonify({
                                    'status': 'error',
                                    'message': 'AI usage has been disabled for your account by administrator.'
                                }), 403
                            
                            # Override daily/long period rate limit with custom user daily limit
                            if period >= 3600:
                                actual_limit = db_ai_limit
                except Exception as ex:
                    logger.error(f"Error checking custom rate limit for user {user_id}: {ex}")

            endpoint = request.endpoint or f.__name__
            key = (key_identifier, endpoint, period)
            
            now = time.time()
            
            # Initialize storage for this key if not present
            if key not in _rate_limit_store:
                _rate_limit_store[key] = []
                
            timestamps = _rate_limit_store[key]
            
            # Filter out timestamps older than the period window
            timestamps = [t for t in timestamps if now - t < period]
            _rate_limit_store[key] = timestamps
            
            if len(timestamps) >= actual_limit:
                time_left = int(period - (now - timestamps[0]))
                period_str = f"{period // 60}m" if period < 86400 else "1d"
                if period == 60:
                    period_str = "1m"
                
                logger.warning(
                    f"Rate limit exceeded for {key_identifier} on {endpoint}. "
                    f"Limit: {actual_limit}/{period_str}. Blocked for {time_left}s."
                )
                
                return jsonify({
                    'status': 'error',
                    'message': f'Rate limit exceeded ({actual_limit} req / {period_str}). Please wait {time_left} seconds.'
                }), 429
                
            # Log timestamp and proceed
            _rate_limit_store[key].append(now)
            return f(*args, **kwargs)
            
        return decorated
    return decorator
