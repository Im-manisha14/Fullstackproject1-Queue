"""
Database initialization script for Q-Free Health
Creates tables and inserts sample data with proper password hashing
"""

from app import app, db, User, Department, Doctor, Patient, PharmacyInventory
from werkzeug.security import generate_password_hash
from datetime import time

def init_database():
    with app.app_context():
        # Drop all tables and recreate
        db.drop_all()
        db.create_all()
        
        print("Creating departments...")
        departments = [
            Department(name='General Medicine', description='General health checkups and primary care'),
            Department(name='Cardiology', description='Heart and cardiovascular system'),
            Department(name='Pediatrics', description='Medical care for infants, children and adolescents'),
            Department(name='Orthopedics', description='Musculoskeletal system disorders'),
            Department(name='Dermatology', description='Skin, hair and nail conditions')
        ]
        
        for dept in departments:
            db.session.add(dept)
        
        db.session.commit()
        
        print("Creating users...")
        # Hash password properly
        password_hash = generate_password_hash('password123')
        
        users = [
            User(email='admin@qfree.com', password_hash=password_hash, role='admin', full_name='System Administrator', phone='+1234567890'),
            User(email='dr.smith@qfree.com', password_hash=password_hash, role='doctor', full_name='Dr. John Smith', phone='+1234567891'),
            User(email='dr.wilson@qfree.com', password_hash=password_hash, role='doctor', full_name='Dr. Sarah Wilson', phone='+1234567892'),
            User(email='pharmacy@qfree.com', password_hash=password_hash, role='pharmacy', full_name='Central Pharmacy', phone='+1234567893'),
            User(email='patient@qfree.com', password_hash=password_hash, role='patient', full_name='John Doe', phone='+1234567894')
        ]
        
        for user in users:
            db.session.add(user)
        
        db.session.commit()
        
        print("Creating doctor profiles...")
        doctors = [
            Doctor(user_id=2, department_id=1, specialization='General Practitioner', license_number='MD001', 
                  consultation_fee=50.00, availability_start=time(9, 0), availability_end=time(17, 0)),
            Doctor(user_id=3, department_id=2, specialization='Cardiologist', license_number='MD002', 
                  consultation_fee=100.00, availability_start=time(10, 0), availability_end=time(16, 0))
        ]
        
        for doctor in doctors:
            db.session.add(doctor)
        
        db.session.commit()
        
        print("Creating patient profile...")
        from datetime import date
        patient = Patient(user_id=5, date_of_birth=date(1990, 5, 15), gender='Male', 
                         address='123 Main St, City', emergency_contact='+1234567895')
        db.session.add(patient)
        
        print("Creating pharmacy inventory...")
        medicines = [
            PharmacyInventory(medicine_name='Paracetamol 500mg', generic_name='Acetaminophen', 
                            manufacturer='PharmaCorp', quantity_in_stock=100, unit_price=2.50, minimum_stock_alert=20),
            PharmacyInventory(medicine_name='Amoxicillin 250mg', generic_name='Amoxicillin', 
                            manufacturer='MediLab', quantity_in_stock=50, unit_price=5.00, minimum_stock_alert=10),
            PharmacyInventory(medicine_name='Lisinopril 10mg', generic_name='Lisinopril', 
                            manufacturer='CardioMeds', quantity_in_stock=75, unit_price=8.00, minimum_stock_alert=15),
            PharmacyInventory(medicine_name='Metformin 500mg', generic_name='Metformin HCl', 
                            manufacturer='DiabetCare', quantity_in_stock=200, unit_price=3.50, minimum_stock_alert=25)
        ]
        
        for medicine in medicines:
            db.session.add(medicine)
        
        db.session.commit()
        
        print("Database initialized successfully!")
        print("\nTest login credentials:")
        print("Patient: patient@qfree.com / password123")
        print("Doctor: dr.smith@qfree.com / password123")  
        print("Pharmacy: pharmacy@qfree.com / password123")

if __name__ == '__main__':
    init_database()