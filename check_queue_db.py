"""Check if queue database exists"""
from sqlalchemy import create_engine, text

# Try the queue database
DATABASE_URL = 'postgresql://postgres:Manisha14@localhost:5432/queue'

print(f"Testing: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✓ Connection successful to 'queue' database")
except Exception as e:
    print(f"✗ Failed to connect to 'queue': {e}")
