
import sys
import os
from werkzeug.security import generate_password_hash
from datetime import time, datetime

# Add current directory to path so imports work
sys.path.append(os.getcwd())

from app import app, db, Department, Medicine, User, DoctorProfile

def seed():
    with app.app_context():
        print("Resetting database...")
        db.drop_all()
        db.create_all()
        
        print("Creating departments...")
        # 1. Departments List (Realistic)
        departments_data = [
            'General Medicine', 'General Surgery', 'Cardiology', 'Neurology', 'Orthopedics',
            'Pediatrics', 'Dermatology', 'ENT', 'Ophthalmology', 'Gynecology',
            'Psychiatry', 'Pulmonology', 'Gastroenterology', 'Nephrology', 'Urology',
            'Endocrinology', 'Oncology', 'Radiology', 'Anesthesiology', 'Emergency Medicine',
            'Physiotherapy', 'Dental'
        ]
        
        dept_map = {}
        for dept_name in departments_data:
            dept = Department(name=dept_name, description=f"{dept_name} Department")
            db.session.add(dept)
            dept_map[dept_name] = dept
        
        db.session.commit()
        
        print("Creating users and doctors...")
        # 2. Sample Doctor Data (Coimbatore)
        doctors_data = [
            # Cardiology
            {'name': 'Dr. Arun Kumar', 'hospital': 'KMCH', 'dept': 'Cardiology', 'fee': 800},
            {'name': 'Dr. Suresh Prasad', 'hospital': 'PSG Hospitals', 'dept': 'Cardiology', 'fee': 750},
            
            # Neurology
            {'name': 'Dr. Priya Menon', 'hospital': 'KMCH', 'dept': 'Neurology', 'fee': 900},
            {'name': 'Dr. Karthik Balaji', 'hospital': 'Royal Care Super Speciality Hospital', 'dept': 'Neurology', 'fee': 850},
            
            # Orthopedics
            {'name': 'Dr. Ravi Shankar', 'hospital': 'Ganga Hospital', 'dept': 'Orthopedics', 'fee': 700},
            {'name': 'Dr. Mahesh Kumar', 'hospital': 'Ortho One Orthopaedic Hospital', 'dept': 'Orthopedics', 'fee': 750},
            
            # Pediatrics
            {'name': 'Dr. Anitha Rao', 'hospital': 'Sri Ramakrishna Hospital', 'dept': 'Pediatrics', 'fee': 500},
            {'name': 'Dr. Deepak Nair', 'hospital': 'PSG Hospitals', 'dept': 'Pediatrics', 'fee': 600},
            
            # Ophthalmology
            {'name': 'Dr. Ramesh Iyer', 'hospital': 'Aravind Eye Hospital', 'dept': 'Ophthalmology', 'fee': 400},
            {'name': 'Dr. Sangeetha Raj', 'hospital': 'Lotus Eye Hospital', 'dept': 'Ophthalmology', 'fee': 450},
            
            # ENT
            {'name': 'Dr. Vinod Kumar', 'hospital': 'Vikram ENT Hospital', 'dept': 'ENT', 'fee': 500},
            {'name': 'Dr. Nithya Suresh', 'hospital': 'K.G. Hospital', 'dept': 'ENT', 'fee': 550},
            
            # Gynecology
            {'name': 'Dr. Lakshmi Devi', 'hospital': 'KMCH', 'dept': 'Gynecology', 'fee': 600},
            {'name': 'Dr. Meena Krishnan', 'hospital': 'Sri Ramakrishna Hospital', 'dept': 'Gynecology', 'fee': 550},
            
            # Psychiatry
            {'name': 'Dr. Ashok Raman', 'hospital': 'Royal Care Super Speciality Hospital', 'dept': 'Psychiatry', 'fee': 700},
            {'name': 'Dr. Kavitha Selvam', 'hospital': 'Sugam Multispeciality Hospital', 'dept': 'Psychiatry', 'fee': 650},
            
            # General Medicine
            {'name': 'Dr. Senthil Nathan', 'hospital': 'Coimbatore Medical College Hospital', 'dept': 'General Medicine', 'fee': 300},
            {'name': 'Dr. Prakash Iyer', 'hospital': 'Hindusthan Hospital', 'dept': 'General Medicine', 'fee': 400}
        ]
        
        # Create Doctors
        for i, doc in enumerate(doctors_data):
            username = f"doctor{i+1}"
            email = f"{username}@hospital.com"
            
            # Create User
            user = User(
                username=username,
                email=email,
                password_hash=generate_password_hash('doctor123'),
                full_name=doc['name'],
                phone=f'98765{i:05d}',
                role='doctor'
            )
            db.session.add(user)
            db.session.flush() # Get ID
            
            # Create Doctor Profile
            specialization = doc['dept'] # Simplified
            dept = Department.query.filter_by(name=doc['dept']).first()
            
            profile = DoctorProfile(
                user_id=user.id,
                department_id=dept.id,
                specialization=specialization,
                hospital=doc['hospital'],
                experience_years=10,
                consultation_fee=doc['fee'],
                available_from=time(9, 0),
                available_to=time(17, 0),
                max_patients_per_day=30
            )
            db.session.add(profile)
            
        # Create Standard Users
        patient = User(
            username='patient@123',
            email='patient@123',
            password_hash=generate_password_hash('patient123'),
            full_name='Manisha',
            phone='1234567890',
            role='patient'
        )
        db.session.add(patient)
        
        doctor_login = User(
            username='doctor@123',
            email='doctor@123',
            password_hash=generate_password_hash('doctor123'),
            full_name='Dr. Demo Doctor',
            phone='1234567899',
            role='doctor'
        )
        db.session.add(doctor_login)
        db.session.flush()
        
        # Add profile for login doctor (Generic)
        dept_cardio = Department.query.filter_by(name='Cardiology').first()
        doc_profile = DoctorProfile(
            user_id=doctor_login.id,
            department_id=dept_cardio.id,
            specialization='Cardiology',
            hospital='KMCH',
            experience_years=15,
            consultation_fee=1000,
            current_token=0
        )
        db.session.add(doc_profile)
        
        pharmacy = User(
            username='pharmacy@123',
            email='pharmacy@123',
            password_hash=generate_password_hash('pharmacy123'),
            full_name='Apollo Pharmacy',
            phone='1234567892',
            role='pharmacy'
        )
        db.session.add(pharmacy)
        
        # Seed Inventory
        meds = [
            ('Paracetamol', '500mg', 100),
            ('Amoxicillin', '250mg', 50),
            ('Ibuprofen', '400mg', 100),
            ('Metformin', '500mg', 50),
            ('Cough Syrup', '100ml', 30),
            ('Aspirin', '75mg', 80),
            ('Omeprazole', '20mg', 60),
            ('Ciprofloxacin', '500mg', 40),
            ('Azithromycin', '500mg', 35),
            ('Cetirizine', '10mg', 90)
        ]
        for name, generic, stock in meds:
            db.session.add(Medicine(
                name=name,
                generic_name=generic,
                stock_quantity=stock,
                expiry_date='2025-12-31',
                price_per_unit=10.0
            ))
            
        db.session.commit()
        print("Seeding Complete: Database reset and populated with realistic Coimbatore medical data.")

if __name__ == '__main__':
    seed()
