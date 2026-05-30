from flask import Blueprint, request, jsonify
from models import get_user_scans, get_scan_by_id, get_user_crop_types, get_scan_statistics, count_user_scans
from utils.auth_utils import token_required
import math

history_bp = Blueprint('history', __name__, url_prefix='/api/v1/history')

@history_bp.route('/scans', methods=['GET'])
@token_required
def get_scan_history(payload):
    """Get scan history with optional filters"""
    try:
        user_id = payload['user_id']
        
        # Get query parameters
        crop_type = request.args.get('crop_type')
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Calculate offset
        offset = (page - 1) * per_page
        
        # Get scans
        scans = get_user_scans(user_id, crop_type=crop_type, status=status, limit=per_page, offset=offset)
        
        # Get total count
        total = count_user_scans(user_id, crop_type=crop_type, status=status)
        
        # Calculate pages
        pages = math.ceil(total / per_page) if total > 0 else 1
        
        return jsonify({
            'status': 'success',
            'message': 'Scan history retrieved',
            'data': {
                'scans': scans or [],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': pages,
                    'has_next': page < pages,
                    'has_prev': page > 1,
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@history_bp.route('/scans/<int:scan_id>', methods=['GET'])
@token_required
def get_scan_detail(payload, scan_id):
    """Get detailed information about a specific scan"""
    try:
        user_id = payload['user_id']
        
        # Get scan
        scan = get_scan_by_id(scan_id, user_id)
        
        if not scan:
            return jsonify({
                'status': 'error',
                'message': 'Scan not found'
            }), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Scan details retrieved',
            'data': scan
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@history_bp.route('/crop-types', methods=['GET'])
@token_required
def get_crop_types_endpoint(payload):
    """Get list of unique crop types in user's history"""
    try:
        user_id = payload['user_id']
        
        crop_types = get_user_crop_types(user_id)
        
        return jsonify({
            'status': 'success',
            'message': 'Crop types retrieved',
            'data': {
                'crop_types': crop_types
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@history_bp.route('/statistics', methods=['GET'])
@token_required
def get_history_statistics(payload):
    """Get statistics about scan history"""
    try:
        user_id = payload['user_id']
        
        # Get statistics
        stats = get_scan_statistics(user_id)
        
        return jsonify({
            'status': 'success',
            'message': 'History statistics retrieved',
            'data': {
                'total_scans': stats['total_scans'],
                'status_distribution': stats.get('status_distribution', []),
                'crop_distribution': stats.get('crop_distribution', []),
                'average_confidence': stats.get('average_confidence', 0)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
