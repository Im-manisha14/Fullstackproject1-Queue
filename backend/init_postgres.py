"""
PostgreSQL Database initialization for Q-Free Health
Creates tables and sample users
"""
import os
os.environ['PYTHONPATH'] = os.path.dirname(os.path.abspath(__file__))

from app import app, db, User, Department
from werkzeug.security import generate_password_hash

def init_database():
    with app.app_context():
        try:
            # Create all tables
            print("Creating database tables...")
            db.create_all()
            
            # Check if users already exist
            if User.query.first():
                print("Users already exist. Skipping user creation.")
                return
            
            print("Creating sample users...")
            
            # Create sample users
            users = [
                User(
                    username='admin',
                    email='admin@hospital.com',
                    password_hash=generate_password_hash('admin123'),
                    full_name='System Administrator',
                    phone='+1234567890',
                    role='admin',
                    is_active=True,
                    is_verified=True
                ),
                User(
                    username='doctor1',
                    email='doctor@hospital.com',
                    password_hash=generate_password_hash('doctor123'),
                    full_name='Dr. John Smith',
                    phone='+1234567891',
                    role='doctor',
                    is_active=True,
                    is_verified=True
                ),
                User(
                    username='patient1',
                    email='patient@hospital.com',
                    password_hash=generate_password_hash('patient123'),
                    full_name='John Doe',
                    phone='+1234567892',
                    role='patient',
                    is_active=True,
                    is_verified=True
                ),
                User(
                    username='pharmacy1',
                    email='pharmacy@hospital.com',
                    password_hash=generate_password_hash('pharmacy123'),
                    full_name='Central Pharmacy',
                    phone='+1234567893',
                    role='pharmacy',
                    is_active=True,
                    is_verified=True
                )
            ]
            
            for user in users:
                db.session.add(user)
            
            # Create sample departments
            departments = [
                Department(name='General Medicine', description='General health checkups'),
                Department(name='Cardiology', description='Heart and cardiovascular care'),
                Department(name='Pediatrics', description='Child healthcare'),
            ]
            
            for dept in departments:
                db.session.add(dept)
            
            db.session.commit()
            
            print("✅ Database initialized successfully!")
            print("\n🔐 Test Credentials:")
            print("Admin - Username: admin, Password: admin123")
            print("Doctor - Username: doctor1, Password: doctor123")  
            print("Patient - Username: patient1, Password: patient123")
            print("Pharmacy - Username: pharmacy1, Password: pharmacy123")
            
        except Exception as e:
            print(f"❌ Error initializing database: {e}")
            db.session.rollback()

if __name__ == '__main__':
    init_database()