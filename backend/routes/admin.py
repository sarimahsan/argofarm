from flask import Blueprint, request, jsonify
from utils.auth_utils import token_required
from utils.database import execute_query, execute_update
from models import get_user_by_id
import logging

logger = logging.getLogger(__name__)
admin_bp = Blueprint('admin', __name__, url_prefix='/api/v1/admin')

def is_admin_user(user_id):
    """Check if the user is an admin"""
    user = get_user_by_id(user_id)
    return user and user.get('is_admin') == 1

@admin_bp.route('/users', methods=['GET'])
@token_required
def list_users(payload):
    """List all users in the system (Admin only)"""
    try:
        current_user_id = payload.get('user_id')
        if not is_admin_user(current_user_id):
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized: Admin privileges required'
            }), 403

        # Retrieve all users
        query = """
            SELECT id, name, email, phone, region, is_admin, ai_limit, created_at 
            FROM users 
            ORDER BY is_admin DESC, created_at DESC
        """
        users = execute_query(query) or []
        
        return jsonify({
            'status': 'success',
            'data': {
                'users': users
            }
        }), 200

    except Exception as e:
        logger.error(f"Admin list_users error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Connection error'
        }), 500

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@token_required
def update_user_status(payload, user_id):
    """Update user's admin role and AI limit (Admin only)"""
    try:
        current_user_id = payload.get('user_id')
        if not is_admin_user(current_user_id):
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized: Admin privileges required'
            }), 403

        data = request.get_json() or {}
        
        # We need is_admin and ai_limit to update
        is_admin_val = data.get('is_admin')
        ai_limit_val = data.get('ai_limit')
        
        if is_admin_val is None or ai_limit_val is None:
            return jsonify({
                'status': 'error',
                'message': 'Missing fields: is_admin and ai_limit are required'
            }), 400

        # Enforce that admin cannot remove their own admin privileges to prevent lockout
        if int(user_id) == int(current_user_id) and int(is_admin_val) != 1:
            return jsonify({
                'status': 'error',
                'message': 'You cannot remove your own admin privileges'
            }), 400

        query = "UPDATE users SET is_admin = %s, ai_limit = %s WHERE id = %s"
        rows_affected = execute_update(query, (int(is_admin_val), int(ai_limit_val), user_id))
        
        if rows_affected == 0:
            return jsonify({
                'status': 'error',
                'message': 'User not found or no changes made'
            }), 404

        return jsonify({
            'status': 'success',
            'message': 'User credentials and privileges updated successfully'
        }), 200

    except Exception as e:
        logger.error(f"Admin update_user_status error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Connection error'
        }), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_user(payload, user_id):
    """Delete a user account from database (Admin only)"""
    try:
        current_user_id = payload.get('user_id')
        if not is_admin_user(current_user_id):
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized: Admin privileges required'
            }), 403

        # Enforce that admin cannot delete themselves
        if int(user_id) == int(current_user_id):
            return jsonify({
                'status': 'error',
                'message': 'You cannot delete your own admin account'
            }), 400

        # Perform deletion
        query = "DELETE FROM users WHERE id = %s"
        rows_affected = execute_update(query, (user_id,))
        
        if rows_affected == 0:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        return jsonify({
            'status': 'success',
            'message': f'User ID {user_id} deleted successfully from database'
        }), 200

    except Exception as e:
        logger.error(f"Admin delete_user error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Connection error'
        }), 500
