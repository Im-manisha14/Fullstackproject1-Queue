"""Seed database with test users"""
# Add parent dir to path for imports
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Since we reverted app.py changes, we import app directly
from app import app, db, User, DoctorProfile, Department, Appointment
from werkzeug.security import generate_password_hash
from datetime import date, time

def seed_data():
    with app.app_context():
        # Create tables
        db.create_all()
        
        # 1. Create Departments
        departments = ['General', 'Cardiology', 'Pediatrics', 'Orthopedics']
        dept_objs = {}
        for d in departments:
            dept = Department.query.filter_by(name=d).first()
            if not dept:
                dept = Department(name=d, description=f"{d} Department", is_active=True)
                db.session.add(dept)
                print(f"Created department: {d}")
            dept_objs[d] = dept
        
        db.session.commit()
        
        # 2. Create Users
        users = [
            {'username': 'patient_test', 'email': 'patient@example.com', 'role': 'patient', 'name': 'Test Patient'},
            {'username': 'doctor_test', 'email': 'doctor@example.com', 'role': 'doctor', 'name': 'Dr. Test'},
            {'username': 'pharmacy_test', 'email': 'pharmacy@example.com', 'role': 'pharmacy', 'name': 'Pharmacy Staff'}
        ]
        
        for u_data in users:
            user = User.query.filter_by(username=u_data['username']).first()
            if not user:
                user = User(
                    username=u_data['username'],
                    email=u_data['email'],
                    full_name=u_data['name'],
                    role=u_data['role'],
                    password_hash=generate_password_hash('password'),
                    phone_number='1234567890',
                    is_active=True
                )
                db.session.add(user)
                print(f"Created user: {u_data['username']}")
            else:
                 # Ensure password is 'password'
                 user.password_hash = generate_password_hash('password')
                 db.session.add(user)
                 print(f"Updated user: {u_data['username']}")
        
        db.session.commit()
        
        # 3. Create Doctor Profile
        doctor_user = User.query.filter_by(username='doctor_test').first()
        dept = Department.query.filter_by(name='General').first()
        
        if doctor_user and dept:
            profile = DoctorProfile.query.filter_by(user_id=doctor_user.id).first()
            if not profile:
                profile = DoctorProfile(
                    user_id=doctor_user.id,
                    department_id=dept.id,
                    specialization='General Medicine',
                    experience_years=10,
                    consultation_fee=500.0,
                    max_patients_per_day=20,
                    current_token=0,
                    is_available=True
                )
                db.session.add(profile)
                print("Created doctor profile")
        
        db.session.commit()
        print("Seeding completed successfully!")

if __name__ == '__main__':
    seed_data()
