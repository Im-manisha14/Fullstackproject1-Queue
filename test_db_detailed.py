"""Test database connection with correct password"""
from sqlalchemy import create_engine, text

# Try the password from app_backup.py
DATABASE_URL = 'postgresql://postgres:Manisha14@localhost:5432/healthcare_queue_db'

print(f"Testing: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✓ Connection successful with Manisha14")
except Exception as e:
    print(f"✗ Failed with Manisha14: {e}")
    
    # Try without the database name
    DATABASE_URL2 = 'postgresql://postgres:Manisha14@localhost:5432/postgres'
    print(f"\nTrying default postgres database...")
    try:
        engine2 = create_engine(DATABASE_URL2)
        with engine2.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✓ Connection successful to default postgres database")
            print("Issue: healthcare_queue_db database might not exist")
    except Exception as e2:
        print(f"✗ Also failed: {e2}")
        print("\nPassword or PostgreSQL configuration issue")
