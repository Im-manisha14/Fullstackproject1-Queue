"""
Initialize the database with demo users and sample data
"""
import sys
import os
from werkzeug.security import generate_password_hash
from datetime import datetime, date, time, timedelta

# Import from the main app
from app import app, db, User, DoctorProfile, Department, Appointment, Prescription, Medicine

def setup_database():
    """Setup database with sample data"""
    with app.app_context():
        # Drop and recreate tables
        db.drop_all()
        db.create_all()
        print("✅ Database tables created")

        # Create demo users
        users = [
            # Patient
            User(
                username='patient1',
                email='patient1@example.com',
                password_hash=generate_password_hash('password'),
                full_name='John Patient',
                role='patient',
                phone='123-456-7890',
                is_active=True
            ),
            # Doctor
            User(
                username='doctor1',
                email='doctor1@example.com',
                password_hash=generate_password_hash('password'),
                full_name='Dr. Sarah Doctor',
                role='doctor',
                phone='123-456-7891',
                is_active=True
            ),
            # Pharmacy
            User(
                username='pharmacy1',
                email='pharmacy1@example.com',
                password_hash=generate_password_hash('password'),
                full_name='Pharmacy Staff',
                role='pharmacy',
                phone='123-456-7892',
                is_active=True
            ),
        ]

        for user in users:
            db.session.add(user)
        
        db.session.commit()
        print("✅ Demo users created")

        # Create departments
        departments = [
            Department(name='General Medicine', description='General healthcare'),
            Department(name='Cardiology', description='Heart care'),
            Department(name='Neurology', description='Brain and nervous system'),
        ]

        for dept in departments:
            db.session.add(dept)
        
        db.session.commit()
        print("✅ Departments created")

        # Create doctor profiles  
        doctor_user = User.query.filter_by(username='doctor1').first()
        general_dept = Department.query.filter_by(name='General Medicine').first()
        
        if doctor_user and general_dept:
            doctor = DoctorProfile(
                user_id=doctor_user.id,
                department_id=general_dept.id,
                specialization='General Practice',
                experience_years=5,
                consultation_fee=100.0
            )
            db.session.add(doctor)

        db.session.commit()
        print("✅ Doctor profiles created")

        # Create some medicines
        medicines = [
            Medicine(name='Paracetamol', generic_name='Acetaminophen', category='Pain Relief', stock_quantity=100, price_per_unit=5.00),
            Medicine(name='Amoxicillin', generic_name='Amoxicillin', category='Antibiotic', stock_quantity=50, price_per_unit=15.00),
            Medicine(name='Ibuprofen', generic_name='Ibuprofen', category='Anti-inflammatory', stock_quantity=75, price_per_unit=8.00),
        ]

        for medicine in medicines:
            db.session.add(medicine)

        db.session.commit()
        print("✅ Medicines added")

        print("\n🎉 Database setup complete!")
        print("\n👤 Demo Login Credentials:")
        print("   Patient:  username=patient1, password=password")
        print("   Doctor:   username=doctor1, password=password") 
        print("   Pharmacy: username=pharmacy1, password=password")

if __name__ == '__main__':
    setup_database()