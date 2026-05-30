"""
Database query functions for simple MySQL
"""
from utils.database import execute_query, execute_insert, execute_update
import json

# ======================== USERS ========================

def create_user(name, email, password, phone=None, region=None, crop_types=None):
    """Create a new user"""
    crop_types_json = json.dumps(crop_types or [])
    query = """
        INSERT INTO users (name, email, password, phone, region, crop_types)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    user_id = execute_insert(query, (name, email, password, phone, region, crop_types_json))
    return user_id

def get_user_by_email(email):
    """Get user by email"""
    query = "SELECT * FROM users WHERE email = %s"
    result = execute_query(query, (email,))
    return result[0] if result else None

def get_user_by_id(user_id):
    """Get user by ID"""
    query = "SELECT * FROM users WHERE id = %s"
    result = execute_query(query, (user_id,))
    return result[0] if result else None

def update_user(user_id, **kwargs):
    """Update user fields"""
    allowed_fields = ['name', 'phone', 'region', 'crop_types', 'password']
    updates = []
    params = []
    
    for field in allowed_fields:
        if field in kwargs:
            updates.append(f"{field} = %s")
            value = kwargs[field]
            if field == 'crop_types':
                value = json.dumps(value)
            params.append(value)
    
    if not updates:
        return 0
    
    params.append(user_id)
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
    return execute_update(query, tuple(params))

# ======================== SCANS ========================

def create_scan(user_id, crop_type, disease, confidence, status='Diseased', 
                region=None, image_url=None, advisory_english=None, 
                advisory_urdu=None, severity='Medium'):
    """Create a new scan record"""
    query = """
        INSERT INTO scans 
        (user_id, crop_type, disease, status, confidence, region, image_url, 
         advisory_english, advisory_urdu, severity)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    scan_id = execute_insert(query, (user_id, crop_type, disease, status, confidence,
                                      region, image_url, advisory_english, advisory_urdu, severity))
    return scan_id

def get_scan_by_id(scan_id, user_id):
    """Get scan by ID for specific user"""
    query = "SELECT * FROM scans WHERE id = %s AND user_id = %s"
    result = execute_query(query, (scan_id, user_id))
    return result[0] if result else None

def get_user_scans(user_id, crop_type=None, status=None, limit=None, offset=0):
    """Get scans for a user with optional filters"""
    query = "SELECT * FROM scans WHERE user_id = %s"
    params = [user_id]
    
    if crop_type:
        query += " AND crop_type = %s"
        params.append(crop_type)
    
    if status:
        query += " AND status = %s"
        params.append(status)
    
    query += " ORDER BY created_at DESC"
    
    if limit:
        query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
    
    return execute_query(query, tuple(params))

def count_user_scans(user_id, crop_type=None, status=None):
    """Count scans for a user"""
    query = "SELECT COUNT(*) as count FROM scans WHERE user_id = %s"
    params = [user_id]
    
    if crop_type:
        query += " AND crop_type = %s"
        params.append(crop_type)
    
    if status:
        query += " AND status = %s"
        params.append(status)
    
    result = execute_query(query, tuple(params))
    return result[0]['count'] if result else 0

def get_user_crop_types(user_id):
    """Get unique crop types for a user"""
    query = """
        SELECT DISTINCT crop_type FROM scans 
        WHERE user_id = %s 
        ORDER BY crop_type
    """
    results = execute_query(query, (user_id,))
    return [row['crop_type'] for row in results] if results else []

def get_scan_statistics(user_id):
    """Get scan statistics for a user"""
    stats = {}
    
    # Total scans
    result = execute_query("SELECT COUNT(*) as count FROM scans WHERE user_id = %s", (user_id,))
    stats['total_scans'] = result[0]['count'] if result else 0
    
    # Status distribution
    result = execute_query("""
        SELECT status, COUNT(*) as count FROM scans 
        WHERE user_id = %s GROUP BY status
    """, (user_id,))
    stats['status_distribution'] = result if result else []
    
    # Crop distribution
    result = execute_query("""
        SELECT crop_type, COUNT(*) as count FROM scans 
        WHERE user_id = %s GROUP BY crop_type
    """, (user_id,))
    stats['crop_distribution'] = result if result else []
    
    # Average confidence
    result = execute_query("""
        SELECT AVG(confidence) as avg_confidence FROM scans 
        WHERE user_id = %s
    """, (user_id,))
    stats['average_confidence'] = float(result[0]['avg_confidence']) if result and result[0]['avg_confidence'] else 0
    
    return stats

# ======================== CHAT HISTORY ========================

def create_chat_message(user_id, chat_session_id, message, sender='user', 
                       message_type='text', language='en', metadata=None, title=None):
    """Create a chat message"""
    metadata_json = json.dumps(metadata or {})
    query = """
        INSERT INTO chat_history 
        (user_id, chat_session_id, title, message, sender, message_type, language, metadata)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    msg_id = execute_insert(query, (user_id, chat_session_id, title, message, 
                                     sender, message_type, language, metadata_json))
    return msg_id

def get_chat_history(user_id, chat_session_id=None):
    """Get chat history for a user"""
    if chat_session_id:
        query = """
            SELECT * FROM chat_history 
            WHERE user_id = %s AND chat_session_id = %s
            ORDER BY created_at ASC
        """
        return execute_query(query, (user_id, chat_session_id))
    else:
        query = """
            SELECT * FROM chat_history 
            WHERE user_id = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (user_id,))

def get_chat_sessions(user_id):
    """Get unique chat sessions for a user"""
    query = """
        SELECT DISTINCT chat_session_id, title, MAX(created_at) as last_message
        FROM chat_history 
        WHERE user_id = %s
        GROUP BY chat_session_id, title
        ORDER BY last_message DESC
    """
    return execute_query(query, (user_id,))

# ======================== DISEASES ========================

def create_disease(name, crop_type, name_urdu=None, symptoms=None, symptoms_urdu=None,
                  treatment=None, treatment_urdu=None, pesticides=None, 
                  severity='Medium', season=None, preventive_measures=None):
    """Create a disease record"""
    pesticides_json = json.dumps(pesticides or [])
    query = """
        INSERT INTO diseases 
        (name, name_urdu, crop_type, symptoms, symptoms_urdu, treatment, 
         treatment_urdu, pesticides, severity, season, preventive_measures)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    disease_id = execute_insert(query, (name, name_urdu, crop_type, symptoms, 
                                        symptoms_urdu, treatment, treatment_urdu,
                                        pesticides_json, severity, season, preventive_measures))
    return disease_id

def get_disease_by_name(name):
    """Get disease by name"""
    query = "SELECT * FROM diseases WHERE name = %s"
    result = execute_query(query, (name,))
    return result[0] if result else None

def get_diseases_by_crop(crop_type):
    """Get all diseases for a crop type"""
    query = "SELECT * FROM diseases WHERE crop_type = %s ORDER BY severity DESC"
    return execute_query(query, (crop_type,))

def get_all_diseases():
    """Get all diseases"""
    query = "SELECT * FROM diseases ORDER BY crop_type, name"
    return execute_query(query)

# ======================== COMMUNITY & MARKETPLACE ========================

def create_community_post(user_id, title, content, category='General'):
    """Create a new community post"""
    query = """
        INSERT INTO community_posts (user_id, title, content, category, likes_count)
        VALUES (%s, %s, %s, %s, 0)
    """
    return execute_insert(query, (user_id, title, content, category))

def get_community_posts():
    """Get all community posts with author details and comment counts"""
    query = """
        SELECT p.*, u.name as author_name,
               (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comment_count
        FROM community_posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
    """
    return execute_query(query)

def get_community_post_by_id(post_id):
    """Get a specific community post"""
    query = "SELECT * FROM community_posts WHERE id = %s"
    res = execute_query(query, (post_id,))
    return res[0] if res else None

def like_community_post(post_id):
    """Increment the like count for a community post"""
    query = "UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = %s"
    return execute_update(query, (post_id,))

def create_community_comment(post_id, user_id, content):
    """Create a new comment on a post"""
    query = """
        INSERT INTO community_comments (post_id, user_id, content)
        VALUES (%s, %s, %s)
    """
    return execute_insert(query, (post_id, user_id, content))

def get_post_comments(post_id):
    """Get all comments for a specific post with author details"""
    query = """
        SELECT c.*, u.name as author_name
        FROM community_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = %s
        ORDER BY c.created_at ASC
    """
    return execute_query(query, (post_id,))

def create_marketplace_item(user_id, title, description, price, category, location, phone, image_url=None):
    """Create a new marketplace listing"""
    query = """
        INSERT INTO marketplace_items (user_id, title, description, price, category, location, phone, image_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    return execute_insert(query, (user_id, title, description, price, category, location, phone, image_url))

def get_marketplace_items(category=None):
    """Get all marketplace items with seller details"""
    if category and category != 'All':
        query = """
            SELECT m.*, u.name as seller_name
            FROM marketplace_items m
            JOIN users u ON m.user_id = u.id
            WHERE m.category = %s
            ORDER BY m.created_at DESC
        """
        return execute_query(query, (category,))
    else:
        query = """
            SELECT m.*, u.name as seller_name
            FROM marketplace_items m
            JOIN users u ON m.user_id = u.id
            ORDER BY m.created_at DESC
        """
        return execute_query(query)

def delete_marketplace_item(item_id, user_id):
    """Delete a marketplace listing if owned by the user"""
    query = "DELETE FROM marketplace_items WHERE id = %s AND user_id = %s"
    return execute_update(query, (item_id, user_id))

def get_marketplace_item_by_id(item_id):
    """Get a specific marketplace item by its ID with seller details"""
    query = """
        SELECT m.*, u.name as seller_name
        FROM marketplace_items m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = %s
    """
    res = execute_query(query, (item_id,))
    return res[0] if res else None
