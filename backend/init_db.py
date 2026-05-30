import os
import sys

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.database import init_database

print("Initializing database tables...")
success = init_database()
if success:
    print("Database tables initialized successfully!")
else:
    print("Failed to initialize database tables.")
