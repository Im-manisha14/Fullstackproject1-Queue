#!/usr/bin/env python3

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, User
from werkzeug.security import generate_password_hash

def init_database():
    """Initialize the database and create test users"""
    with app.app_context():
        # Create all tables
        db.create_all()
        print("✅ Database tables created")
        
        # Check if user already exists
        if User.query.filter_by(email='devimanisha1411@gmail.com').first():
            print("✅ User already exists")
            return
            
        # Create test user
        try:
            user = User(
                username='devimanisha1411',
                email='devimanisha1411@gmail.com',
                full_name='Devi Manisha',
                password_hash=generate_password_hash('test123'),
                role='patient',
                is_verified=True,
                is_active=True
            )
            db.session.add(user)
            db.session.commit()
            print("✅ Test user created: devimanisha1411@gmail.com / test123")
            
        except Exception as e:
            print(f"❌ Error creating user: {e}")
            db.session.rollback()

if __name__ == '__main__':
    init_database()