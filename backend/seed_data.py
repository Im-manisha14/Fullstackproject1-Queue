
import sys
import os
from werkzeug.security import generate_password_hash

# Add current directory to path so imports work
sys.path.append(os.getcwd())

from app import app, db, Department, Medicine, User

def seed():
    with app.app_context():
        # Seed Test Users
        test_users = [
            {
                'username': 'patient@123',
                'email': 'patient@123',
                'password': 'patient123',
                'full_name': 'Test Patient',
                'phone': '1234567890',
                'role': 'patient'
            },
            {
                'username': 'doctor@123',
                'email': 'doctor@123', 
                'password': 'doctor123',
                'full_name': 'Test Doctor',
                'phone': '1234567891',
                'role': 'doctor'
            },
            {
                'username': 'pharmacy@123',
                'email': 'pharmacy@123',
                'password': 'pharmacy123', 
                'full_name': 'Test Pharmacy',
                'phone': '1234567892',
                'role': 'pharmacy'
            }
        ]
        
        for user_data in test_users:
            if not User.query.filter_by(email=user_data['email']).first():
                user = User(
                    username=user_data['username'],
                    email=user_data['email'],
                    password_hash=generate_password_hash(user_data['password']),
                    full_name=user_data['full_name'],
                    phone=user_data['phone'],
                    role=user_data['role']
                )
                db.session.add(user)
        
        # Seed Departments
        depts = ['General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics']
        for d_name in depts:
            if not Department.query.filter_by(name=d_name).first():
                db.session.add(Department(name=d_name, description=f"{d_name} Department"))
        
        # Seed Inventory
        meds = [
            ('Paracetamol', '500mg', 100),
            ('Amoxicillin', '250mg', 50),
            ('Ibuprofen', '400mg', 100),
            ('Metformin', '500mg', 50),
            ('Cough Syrup', '100ml', 30)
        ]
        for name, generic, stock in meds:
            if not Medicine.query.filter_by(name=name).first():
                db.session.add(Medicine(
                    name=name,
                    generic_name=generic,
                    stock_quantity=stock,
                    expiry_date='2025-12-31',
                    price_per_unit=10.0
                ))
        
        db.session.commit()
        print("Seeding Complete: Test Users, Departments and Medicine inventory added.")

if __name__ == '__main__':
    seed()
