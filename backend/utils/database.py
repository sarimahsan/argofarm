import mysql.connector
from mysql.connector import pooling
import os
import sqlite3
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'password'),
    'database': os.getenv('DB_NAME', 'agrosense'),
}

# Create connection pool
db_pool = None
try:
    db_pool = pooling.MySQLConnectionPool(
        pool_name='agrosense_pool',
        pool_size=10,
        pool_reset_session=True,
        **DB_CONFIG
    )
    print("[SUCCESS] MySQL Connection Pool created successfully")
except Exception as e:
    print(f"[WARNING] MySQL Connection Pool could not be created ({e}).")
    print("[INFO] Falling back to SQLite for local development database: local_db.sqlite")

def get_connection():
    """Get a connection (MySQL connection from pool or SQLite local connection)"""
    if db_pool:
        try:
            return db_pool.get_connection()
        except Exception as e:
            print(f"[WARNING] Failed to fetch MySQL connection from pool: {e}. Falling back to SQLite.")
    
    # SQLite fallback
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'local_db.sqlite')
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def execute_query(query, params=None):
    """Execute a query and return results"""
    conn = None
    try:
        conn = get_connection()
        if isinstance(conn, sqlite3.Connection):
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            query_adapted = query.replace('%s', '?')
            cursor.execute(query_adapted, params or ())
            results = [dict(row) for row in cursor.fetchall()]
            cursor.close()
            return results
        else:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params or ())
            results = cursor.fetchall()
            cursor.close()
            return results
    except Exception as e:
        print(f"Query error: {e}")
        return None
    finally:
        if conn:
            conn.close()

def execute_insert(query, params=None):
    """Execute an INSERT query and return last inserted ID"""
    conn = None
    try:
        conn = get_connection()
        if isinstance(conn, sqlite3.Connection):
            cursor = conn.cursor()
            query_adapted = query.replace('%s', '?')
            cursor.execute(query_adapted, params or ())
            conn.commit()
            last_id = cursor.lastrowid
            cursor.close()
            return last_id
        else:
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            conn.commit()
            last_id = cursor.lastrowid
            cursor.close()
            return last_id
    except Exception as e:
        if conn and not isinstance(conn, sqlite3.Connection):
            conn.rollback()
        elif conn:
            try: conn.rollback()
            except: pass
        print(f"Insert error: {e}")
        return None
    finally:
        if conn:
            conn.close()

def execute_update(query, params=None):
    """Execute an UPDATE/DELETE query"""
    conn = None
    try:
        conn = get_connection()
        if isinstance(conn, sqlite3.Connection):
            cursor = conn.cursor()
            query_adapted = query.replace('%s', '?')
            cursor.execute(query_adapted, params or ())
            conn.commit()
            rows_affected = cursor.rowcount
            cursor.close()
            return rows_affected
        else:
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            conn.commit()
            rows_affected = cursor.rowcount
            cursor.close()
            return rows_affected
    except Exception as e:
        if conn and not isinstance(conn, sqlite3.Connection):
            conn.rollback()
        elif conn:
            try: conn.rollback()
            except: pass
        print(f"Update error: {e}")
        return None
    finally:
        if conn:
            conn.close()

def adapt_table_creation_for_sqlite(query):
    """Adapt MySQL table DDL syntax to be fully SQLite compliant"""
    # Replace AUTO_INCREMENT
    query = query.replace("id INT PRIMARY KEY AUTO_INCREMENT", "id INTEGER PRIMARY KEY AUTOINCREMENT")
    query = query.replace("id INT NOT NULL AUTO_INCREMENT", "id INTEGER PRIMARY KEY AUTOINCREMENT")
    query = query.replace("INT PRIMARY KEY AUTO_INCREMENT", "INTEGER PRIMARY KEY AUTOINCREMENT")
    
    # Remove MySQL specific ON UPDATE clauses
    query = query.replace("ON UPDATE CURRENT_TIMESTAMP", "")
    
    # Remove MySQL inline INDEX statements inside CREATE TABLE which are invalid in SQLite
    query = query.replace(",\n                INDEX idx_user_id (user_id)", "")
    query = query.replace(",\n                INDEX idx_user_session (user_id, chat_session_id)", "")
    query = query.replace(", INDEX idx_user_id (user_id)", "")
    query = query.replace(", INDEX idx_user_session (user_id, chat_session_id)", "")
    
    return query

def init_database():
    """Create database tables if they don't exist"""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        is_sqlite = isinstance(conn, sqlite3.Connection)
        
        def run_ddl(sql):
            if is_sqlite:
                sql = adapt_table_creation_for_sqlite(sql)
            cursor.execute(sql)

        # Create users table
        run_ddl("""
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                region VARCHAR(100),
                crop_types JSON,
                is_admin INT DEFAULT 0,
                ai_limit INT DEFAULT 50,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)

        # Migration helper for existing databases (SQLite and MySQL)
        try:
            cursor.execute("SELECT is_admin FROM users LIMIT 1")
            cursor.fetchall() # Consuming results if column exists
        except Exception:
            try:
                try: cursor.fetchall()
                except: pass
                cursor.execute("ALTER TABLE users ADD COLUMN is_admin INT DEFAULT 0")
                conn.commit()
                print("[INFO] Added is_admin column to users table successfully")
            except Exception as e:
                print(f"[WARNING] Could not add is_admin column: {e}")

        try:
            cursor.execute("SELECT ai_limit FROM users LIMIT 1")
            cursor.fetchall() # Consuming results if column exists
        except Exception:
            try:
                try: cursor.fetchall()
                except: pass
                cursor.execute("ALTER TABLE users ADD COLUMN ai_limit INT DEFAULT 50")
                conn.commit()
                print("[INFO] Added ai_limit column to users table successfully")
            except Exception as e:
                print(f"[WARNING] Could not add ai_limit column: {e}")
        
        # Create scans table
        run_ddl("""
            CREATE TABLE IF NOT EXISTS scans (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                crop_type VARCHAR(100) NOT NULL,
                disease VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'Diseased',
                confidence INT NOT NULL,
                region VARCHAR(100),
                image_url VARCHAR(500),
                advisory_english TEXT,
                advisory_urdu TEXT,
                severity VARCHAR(50) DEFAULT 'Medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id)
            )
        """)
        
        # Create chat_history table
        run_ddl("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                chat_session_id VARCHAR(100) NOT NULL,
                title VARCHAR(255),
                message TEXT NOT NULL,
                sender VARCHAR(50) DEFAULT 'user',
                message_type VARCHAR(50) DEFAULT 'text',
                language VARCHAR(10) DEFAULT 'en',
                metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_session (user_id, chat_session_id)
            )
        """)
        
        # Create diseases table
        run_ddl("""
            CREATE TABLE IF NOT EXISTS diseases (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) UNIQUE NOT NULL,
                name_urdu VARCHAR(255),
                crop_type VARCHAR(100) NOT NULL,
                symptoms TEXT,
                symptoms_urdu TEXT,
                treatment TEXT,
                treatment_urdu TEXT,
                pesticides JSON,
                severity VARCHAR(50) DEFAULT 'Medium',
                season VARCHAR(50),
                preventive_measures TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        
        # Create community_posts table
        run_ddl("""
            CREATE TABLE IF NOT EXISTS community_posts (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(100) DEFAULT 'General',
                likes_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # Create community_comments table
        run_ddl("""
            CREATE TABLE IF NOT EXISTS community_comments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # Create post_likes table to track likes and enforce unique like limit
        run_ddl("""
            CREATE TABLE IF NOT EXISTS post_likes (
                user_id INT NOT NULL,
                post_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, post_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
            )
        """)
        
        # Create marketplace_items table
        run_ddl("""
            CREATE TABLE IF NOT EXISTS marketplace_items (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                price VARCHAR(100) NOT NULL,
                category VARCHAR(100) DEFAULT 'General',
                location VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                image_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # In SQLite, create index separately since inline syntax is not supported
        if is_sqlite:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_id ON scans (user_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_session ON chat_history (user_id, chat_session_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_post_user ON community_posts (user_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_comment_post ON community_comments (post_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_market_user ON marketplace_items (user_id);")
        
        conn.commit()
        cursor.close()
        print("[SUCCESS] Database tables initialized successfully")
        return True
    except Exception as e:
        print(f"[ERROR] Error initializing database: {e}")
        return False
    finally:
        if conn:
            conn.close()
