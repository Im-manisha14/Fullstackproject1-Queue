"""Quick database connection test"""
import os
from sqlalchemy import create_engine

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:Manisha@14@localhost:5432/healthcare_queue_db'
)

print(f"Testing connection to: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute("SELECT 1")
        print("✓ Database connection successful!")
except Exception as e:
    print(f"✗ Database connection failed: {e}")
