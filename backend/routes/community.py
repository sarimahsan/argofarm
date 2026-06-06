from flask import Blueprint, request, jsonify
from models import (
    create_community_post, get_community_posts, get_community_post_by_id,
    like_community_post, create_community_comment, get_post_comments,
    create_marketplace_item, get_marketplace_items, delete_marketplace_item
)
from utils.auth_utils import token_required
from datetime import datetime

community_bp = Blueprint('community', __name__, url_prefix='/api/v1/community')

# ======================== FORUM POSTS ========================

@community_bp.route('/posts', methods=['GET'])
def list_posts():
    """Retrieve all forum posts"""
    try:
        posts = get_community_posts() or []
        # Format timestamps
        for post in posts:
            if 'created_at' in post and hasattr(post['created_at'], 'isoformat'):
                post['created_at'] = post['created_at'].isoformat()
            else:
                post['created_at'] = str(post.get('created_at', ''))
        return jsonify({
            'status': 'success',
            'data': posts
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@community_bp.route('/posts', methods=['POST'])
@token_required
def add_post(payload):
    """Create a new forum post"""
    try:
        user_id = payload['user_id']
        data = request.get_json() or {}
        
        title = data.get('title')
        content = data.get('content')
        category = data.get('category', 'General')
        
        if not title or not content:
            return jsonify({
                'status': 'error',
                'message': 'Title and content are required'
            }), 400
            
        post_id = create_community_post(user_id, title, content, category)
        if not post_id:
            return jsonify({
                'status': 'error',
                'message': 'Failed to create post'
            }), 500
            
        return jsonify({
            'status': 'success',
            'message': 'Post created successfully',
            'data': {'post_id': post_id}
        }), 201
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@community_bp.route('/posts/<int:post_id>/like', methods=['POST'])
@token_required
def like_post(payload, post_id):
    """Like a forum post"""
    try:
        post = get_community_post_by_id(post_id)
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
            
        like_community_post(post_id)
        return jsonify({
            'status': 'success',
            'message': 'Post liked'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# ======================== FORUM COMMENTS ========================

@community_bp.route('/posts/<int:post_id>/comments', methods=['GET'])
def list_comments(post_id):
    """Retrieve comments for a post"""
    try:
        post = get_community_post_by_id(post_id)
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
            
        comments = get_post_comments(post_id) or []
        for c in comments:
            if 'created_at' in c and hasattr(c['created_at'], 'isoformat'):
                c['created_at'] = c['created_at'].isoformat()
            else:
                c['created_at'] = str(c.get('created_at', ''))
                
        return jsonify({
            'status': 'success',
            'data': comments
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@community_bp.route('/posts/<int:post_id>/comments', methods=['POST'])
@token_required
def add_comment(payload, post_id):
    """Add comment to a post"""
    try:
        user_id = payload['user_id']
        post = get_community_post_by_id(post_id)
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
            
        data = request.get_json() or {}
        content = data.get('content')
        if not content:
            return jsonify({
                'status': 'error',
                'message': 'Comment content is required'
            }), 400
            
        comment_id = create_community_comment(post_id, user_id, content)
        if not comment_id:
            return jsonify({
                'status': 'error',
                'message': 'Failed to add comment'
            }), 500
            
        return jsonify({
            'status': 'success',
            'message': 'Comment added successfully',
            'data': {'comment_id': comment_id}
        }), 201
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# ======================== MARKETPLACE ========================

@community_bp.route('/marketplace', methods=['GET'])
def list_marketplace():
    """Retrieve marketplace items"""
    try:
        category = request.args.get('category', 'All')
        items = get_marketplace_items(category) or []
        
        for item in items:
            if 'created_at' in item and hasattr(item['created_at'], 'isoformat'):
                item['created_at'] = item['created_at'].isoformat()
            else:
                item['created_at'] = str(item.get('created_at', ''))
                
        return jsonify({
            'status': 'success',
            'data': items
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@community_bp.route('/marketplace', methods=['POST'])
@token_required
def add_marketplace_item(payload):
    """Create a new marketplace listing"""
    try:
        user_id = payload['user_id']
        data = request.get_json() or {}
        
        title = data.get('title')
        description = data.get('description', '')
        price = data.get('price')
        category = data.get('category', 'Seeds')
        location = data.get('location')
        phone = data.get('phone')
        image_url = data.get('image_url', '')
        
        if not title or not price or not location or not phone:
            return jsonify({
                'status': 'error',
                'message': 'Title, price, location and phone contact are required'
            }), 400
            
        item_id = create_marketplace_item(user_id, title, description, price, category, location, phone, image_url)
        if not item_id:
            return jsonify({
                'status': 'error',
                'message': 'Failed to create marketplace listing'
            }), 500
            
        return jsonify({
            'status': 'success',
            'message': 'Listing created successfully',
            'data': {'item_id': item_id}
        }), 201
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@community_bp.route('/marketplace/<int:item_id>', methods=['DELETE'])
@token_required
def remove_marketplace_item(payload, item_id):
    """Delete a marketplace listing"""
    try:
        user_id = payload['user_id']
        rows = delete_marketplace_item(item_id, user_id)
        if not rows:
            return jsonify({
                'status': 'error',
                'message': 'Listing not found or you are not authorized to delete it'
            }), 404
            
        return jsonify({
            'status': 'success',
            'message': 'Listing deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# ======================== AI FARMER INTEGRATIONS ========================

import time
from utils.groq_client import call_groq_completions

AI_RATE_LIMITS = {}

@community_bp.route('/ai-calendar', methods=['POST'])
@token_required
def get_ai_calendar(payload):
    """Retrieve summarized AI seasonal calendar crop advice from Groq"""
    try:
        user_id = payload['user_id']
        now = time.time()
        
        # Cooldown rate limit check
        if user_id in AI_RATE_LIMITS:
            last_req = AI_RATE_LIMITS[user_id]
            if now - last_req < 12:  # 12 second request cool-down
                return jsonify({
                    'status': 'error',
                    'message': 'AI Rate Limit: Please wait 12 seconds between AI consultations.'
                }), 429
                
        AI_RATE_LIMITS[user_id] = now
        
        data = request.get_json() or {}
        crop = data.get('crop')
        month = data.get('month')
        language = data.get('language', 'en')
        is_ur = language == 'ur'
        
        if not crop or not month:
            return jsonify({
                'status': 'error',
                'message': 'Crop and Month are required parameters'
            }), 400
            
        system_prompt = (
            "You are an elite, senior Pakistani Agronomist and Crop Scientist. "
            "Provide highly legitimate, scientifically accurate, and seasonal farming advice for the crop in the requested month. "
            "Keep the output extremely short, structured, and under 120 words / 4-5 sentences max."
        )
        
        user_prompt = f"Provide detailed agronomy calendar guidelines for cultivating '{crop}' during '{month}' in Pakistan."
        if is_ur:
            user_prompt += " Please write the advice in elegant, simple, farmer-friendly Urdu (اردو)."
            
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Call Groq completion engine
        ai_response = call_groq_completions(messages, max_tokens=250, temperature=0.6)
        if not ai_response:
            return jsonify({
                'status': 'error',
                'message': 'AI service is temporarily occupied. Please try again shortly.'
            }), 503
            
        return jsonify({
            'status': 'success',
            'data': {
                'crop': crop,
                'month': month,
                'advisory': ai_response
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@community_bp.route('/posts/<int:post_id>/ai-diagnose', methods=['POST'])
@token_required
def post_ai_diagnose(payload, post_id):
    """Diagnose community post crop issue using Groq and post comment response"""
    try:
        user_id = payload['user_id']
        now = time.time()
        
        # Rate limit cooldown check
        if user_id in AI_RATE_LIMITS:
            last_req = AI_RATE_LIMITS[user_id]
            if now - last_req < 15:  # 15 second request cool-down for complex LLM tasks
                return jsonify({
                    'status': 'error',
                    'message': 'AI Rate Limit: Please wait 15 seconds between diagnostic tasks.'
                }), 429
                
        AI_RATE_LIMITS[user_id] = now
        
        post = get_community_post_by_id(post_id)
        if not post:
            return jsonify({
                'status': 'error',
                'message': 'Post not found'
            }), 404
            
        # Verify if Dr. Crop AI has already diagnosed this specific post to avoid duplicate comments
        comments = get_post_comments(post_id) or []
        for c in comments:
            if "Dr. Crop AI" in c.get('content', ''):
                return jsonify({
                    'status': 'error',
                    'message': 'Dr. Crop AI has already provided a diagnosis on this inquiry.'
                }), 400
                
        # Call Groq to synthesize diagnosis
        system_prompt = (
            "You are 'Dr. Crop AI', an eminent crop pathologist and plant surgeon. "
            "Diagnose the following farmer's field inquiry. Provide legitimate, highly practical scientific advice, "
            "preventative spray options (both organic and pesticide), and next steps. "
            "Write the response in an engaging, empathetic, structured layout. Highlight the diagnosis and remedy clearly. "
            "Keep the response concise and structured, under 150 words total (4-5 sentences max). "
            "Add a warm signature: '⚡ Dr. Crop AI Diagnostic Clinic'."
        )
        
        user_prompt = f"Farmer Inquiry Title: {post['title']}\nInquiry Details: {post['content']}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        ai_response = call_groq_completions(messages, max_tokens=300, temperature=0.7)
        if not ai_response:
            return jsonify({
                'status': 'error',
                'message': 'Dr. Crop AI is currently consulting. Please try again shortly.'
            }), 503
            
        # Create the AI comment with Dr. Crop identifier prefix
        styled_content = f"🤖 **[Dr. Crop AI — Expert Pathology Report]**\n\n{ai_response}"
        comment_id = create_community_comment(post_id, user_id, styled_content)
        
        if not comment_id:
            return jsonify({
                'status': 'error',
                'message': 'Failed to save diagnostic comment'
            }), 500
            
        return jsonify({
            'status': 'success',
            'message': 'Dr. Crop AI has diagnosed the issue and posted a reply!',
            'data': {'comment_id': comment_id}
        }), 201
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
