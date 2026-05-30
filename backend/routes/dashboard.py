from flask import Blueprint, request, jsonify
from models import get_user_by_id, get_user_scans, get_scan_statistics
from utils.auth_utils import token_required
from datetime import datetime

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/v1/dashboard')

@dashboard_bp.route('/analytics', methods=['GET'])
@token_required
def get_analytics(payload):
    """Get dashboard analytics for authenticated user"""
    try:
        user_id = payload['user_id']
        
        # Get user
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404
        
        # Get statistics
        stats = get_scan_statistics(user_id)
        
        # Get recent scans
        recent_scans = get_user_scans(user_id, limit=5)
        
        return jsonify({
            'status': 'success',
            'message': 'Dashboard analytics retrieved',
            'data': {
                'user': {
                    'name': user['name'],
                    'region': user.get('region'),
                    'email': user['email'],
                },
                'summary': {
                    'total_scans': stats['total_scans'],
                    'healthy_rate': 0,  # Calculate from status_distribution if needed
                    'crop_types_count': len(stats['crop_distribution']),
                },
                'recent_scans': recent_scans or [],
                'disease_stats': stats.get('status_distribution', []),
                'crop_stats': stats.get('crop_distribution', []),
                'status_stats': stats.get('status_distribution', []),
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@dashboard_bp.route('/summary', methods=['GET'])
@token_required
def get_summary(payload):
    """Get quick dashboard summary"""
    try:
        user_id = payload['user_id']
        
        # Get user
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404
        
        # Get recent scans
        recent_scans = get_user_scans(user_id, limit=1)
        recent_scan = recent_scans[0] if recent_scans else None
        
        # Get statistics
        stats = get_scan_statistics(user_id)
        
        return jsonify({
            'status': 'success',
            'message': 'Dashboard summary retrieved',
            'data': {
                'user_name': user['name'],
                'total_scans': stats['total_scans'],
                'recent_scan': recent_scan,
                'timestamp': datetime.utcnow().isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

from utils.database import execute_query
import random

@dashboard_bp.route('/outbreaks', methods=['GET'])
@token_required
def get_outbreaks(payload):
    """Get anonymized crowdsourced scan outbreaks plotted dynamically"""
    try:
        scans = execute_query("SELECT * FROM scans ORDER BY created_at DESC LIMIT 100")
        
        REGION_COORDS = {
            'Lahore': [31.5204, 74.3587],
            'Karachi': [24.8607, 67.0011],
            'Islamabad': [33.6844, 73.0479],
            'Peshawar': [34.0151, 71.5249],
            'Quetta': [30.1798, 66.9750],
            'Multan': [30.1575, 71.5249],
            'Faisalabad': [31.4504, 73.1350],
            'Hyderabad': [25.3960, 68.3772],
            'Gujranwala': [32.1877, 74.1945],
            'Sialkot': [32.4972, 74.5361],
            'Rawalpindi': [33.5651, 73.0169],
            'Gilgit': [35.8819, 74.4643],
            'Muzaffarabad': [34.3700, 73.4708],
            'Gwadar': [25.1216, 62.3254],
            'Bahawalpur': [29.3544, 71.6911],
            'Kasur': [31.1179, 74.4509]
        }
        
        # Region normalization: map provinces/divisions to major cities
        def resolve_region(region_name):
            reg_lower = region_name.strip().lower()
            
            # Try exact match first (case-insensitive)
            for city in REGION_COORDS:
                if reg_lower == city.lower():
                    return city
            
            # Province to major city mapping
            province_map = {
                'punjab': 'Lahore',
                'sindh': 'Karachi',
                'kpk': 'Peshawar',
                'khyber pakhtunkhwa': 'Peshawar',
                'balochistan': 'Quetta',
                'gb': 'Gilgit',
                'gilgit-baltistan': 'Gilgit',
                'azad kashmir': 'Muzaffarabad'
            }
            
            # Check province mapping
            if reg_lower in province_map:
                return province_map[reg_lower]
            
            # Check substring matching (e.g., "Multan District" → "Multan")
            for city in REGION_COORDS:
                if city.lower() in reg_lower or reg_lower in city.lower():
                    return city
            
            # Default to nearest (Islamabad is central)
            return 'Islamabad'
        
        outbreaks = []
        for s in scans:
            reg = s.get('region') or 'Punjab'
            resolved_city = resolve_region(reg)
            coords = REGION_COORDS.get(resolved_city, REGION_COORDS['Islamabad'])
                
            # Random jitter for dynamic visual clustering
            jitter_lat = coords[0] + random.uniform(-0.04, 0.04)
            jitter_lng = coords[1] + random.uniform(-0.04, 0.04)
            
            outbreaks.append({
                'id': s['id'],
                'crop': s['crop_type'],
                'disease': s['disease'],
                'status': s['status'],
                'confidence': s['confidence'],
                'region': reg,
                'coordinates': [jitter_lat, jitter_lng],
                'created_at': s['created_at'].isoformat() if hasattr(s['created_at'], 'isoformat') else str(s['created_at'])
            })
            
        return jsonify({
            'status': 'success',
            'data': outbreaks
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

