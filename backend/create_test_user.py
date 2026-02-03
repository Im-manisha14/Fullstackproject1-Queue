"""
Quick script to add a test user
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from werkzeug.security import generate_password_hash
from datetime import datetime

# Import the first User model (the one that has username)
class TempUser(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    role = db.Column(db.String(20), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

if __name__ == '__main__':
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
        # Check if test user already exists
        existing_user = db.session.execute(db.text("SELECT * FROM users WHERE username = 'testuser'")).fetchone()
        if existing_user:
            print("Test user already exists!")
        else:
            # Add a test user
            password_hash = generate_password_hash('password123')
            
            # Use raw SQL to insert
            db.session.execute(db.text("""
                INSERT INTO users (username, email, password_hash, full_name, phone, role, is_verified, created_at)
                VALUES (:username, :email, :password_hash, :full_name, :phone, :role, :is_verified, :created_at)
            """), {
                'username': 'testuser',
                'email': 'test@hospital.com', 
                'password_hash': password_hash,
                'full_name': 'Test User',
                'phone': '+1234567890',
                'role': 'admin',
                'is_verified': True,
                'created_at': datetime.utcnow()
            })
            
            db.session.commit()
            print("Test user created successfully!")
            print("Username: testuser")
            print("Password: password123")