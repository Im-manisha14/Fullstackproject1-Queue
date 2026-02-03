"""
Simple script to add a test user directly to the database
"""
import sqlite3
from werkzeug.security import generate_password_hash

def create_test_user():
    # Connect to SQLite database
    conn = sqlite3.connect('queue_healthcare.db')
    cursor = conn.cursor()
    
    try:
        # Create users table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                phone TEXT,
                role TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                is_verified BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        
        # Check if test user already exists
        cursor.execute("SELECT * FROM users WHERE email = ?", ("admin@hospital.com",))
        if cursor.fetchone():
            print("✅ Test user already exists!")
        else:
            # Hash password
            password_hash = generate_password_hash('admin123')
            
            # Insert test user
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active, is_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', ('admin', 'admin@hospital.com', password_hash, 'Admin User', '+1234567890', 'admin', 1, 1))
            
            conn.commit()
            print("✅ Test user created successfully!")
        
        print("\n🔐 Test Credentials:")
        print("Email: admin@hospital.com")
        print("Password: admin123")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    create_test_user()