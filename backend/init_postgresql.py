"""
Queue-Free Healthcare System Database Setup
SQLite with enhanced queue management features
"""

import sys
import os

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import (User, Department, DoctorProfile, Appointment, QueueEntry, 
                   Prescription, Medicine, PrescriptionMedication, AuditLog)
from werkzeug.security import generate_password_hash
from datetime import datetime, date, time, timedelta

def init_database():
    """Initialize database with tables and sample data"""
    
    with app.app_context():
        try:
            # Drop existing tables and create new ones
            db.drop_all()
            db.create_all()
            print("✅ Database tables created successfully")
            
            # Create Departments
            departments = [
                Department(name="General Medicine", description="General healthcare and routine checkups"),
                Department(name="Cardiology", description="Heart and cardiovascular system"),
                Department(name="Neurology", description="Nervous system and brain disorders"),
                Department(name="Orthopedics", description="Bones, joints and muscles"),
                Department(name="Pediatrics", description="Child healthcare"),
                Department(name="Gynecology", description="Women's reproductive health"),
                Department(name="Dermatology", description="Skin, hair and nail conditions"),
                Department(name="Ophthalmology", description="Eye care and vision"),
            ]
            
            for dept in departments:
                db.session.add(dept)
            db.session.commit()
            print("✅ Departments created")
            
            # Create Users
            users = [
                # Admin
                User(username="admin", email="admin@hospital.com", 
                     password_hash=generate_password_hash("admin123"),
                     full_name="System Administrator", role="admin", 
                     phone="+1-555-0001", is_verified=True),
                
                # Doctors
                User(username="dr_smith", email="dr.smith@hospital.com",
                     password_hash=generate_password_hash("password123"),
                     full_name="Dr. John Smith", role="doctor",
                     phone="+1-555-1001", is_verified=True),
                     
                User(username="dr_johnson", email="dr.johnson@hospital.com",
                     password_hash=generate_password_hash("password123"),
                     full_name="Dr. Sarah Johnson", role="doctor",
                     phone="+1-555-1002", is_verified=True),
                     
                User(username="dr_williams", email="dr.williams@hospital.com",
                     password_hash=generate_password_hash("password123"),
                     full_name="Dr. Michael Williams", role="doctor",
                     phone="+1-555-1003", is_verified=True),
                
                # Patients  
                User(username="patient1", email="patient1@email.com",
                     password_hash=generate_password_hash("password123"),
                     full_name="Alice Cooper", role="patient",
                     phone="+1-555-2001", is_verified=True),
                     
                User(username="patient2", email="patient2@email.com",
                     password_hash=generate_password_hash("password123"),
                     full_name="Bob Wilson", role="patient",
                     phone="+1-555-2002", is_verified=True),
                     
                User(username="patient3", email="patient3@email.com",
                     password_hash=generate_password_hash("password123"),
                     full_name="Carol Martinez", role="patient",
                     phone="+1-555-2003", is_verified=True),
                
                # Pharmacy Staff
                User(username="pharmacy1", email="pharmacy1@hospital.com",
                     password_hash=generate_password_hash("password123"),
                     full_name="David Pharmacy", role="pharmacy",
                     phone="+1-555-3001", is_verified=True),
                     
                User(username="pharmacy2", email="pharmacy2@hospital.com",
                     password_hash=generate_password_hash("password123"),
                     full_name="Emma Medicines", role="pharmacy",
                     phone="+1-555-3002", is_verified=True),
            ]
            
            for user in users:
                db.session.add(user)
            db.session.commit()
            print("✅ Users created")
            
            # Create Doctor Profiles
            doctor_profiles = [
                DoctorProfile(user_id=2, department_id=1, specialization="Internal Medicine",
                            experience_years=15, consultation_fee=100.0,
                            available_from=time(9, 0), available_to=time(17, 0),
                            max_patients_per_day=40),
                            
                DoctorProfile(user_id=3, department_id=2, specialization="Interventional Cardiology",
                            experience_years=12, consultation_fee=150.0,
                            available_from=time(10, 0), available_to=time(16, 0),
                            max_patients_per_day=30),
                            
                DoctorProfile(user_id=4, department_id=3, specialization="Neurological Surgery",
                            experience_years=18, consultation_fee=200.0,
                            available_from=time(8, 30), available_to=time(15, 30),
                            max_patients_per_day=25),
            ]
            
            for profile in doctor_profiles:
                db.session.add(profile)
            db.session.commit()
            print("✅ Doctor profiles created")
            
            # Create Medicines
            medicines = [
                Medicine(name="Paracetamol", generic_name="Acetaminophen", 
                        manufacturer="PharmaCorp", dosage_form="Tablet",
                        strength="500mg", price_per_unit=0.50, stock_quantity=500,
                        reorder_level=50, expiry_date=date(2026, 12, 31),
                        batch_number="PC2024001"),
                        
                Medicine(name="Amoxicillin", generic_name="Amoxicillin",
                        manufacturer="AntiBio Ltd", dosage_form="Capsule", 
                        strength="250mg", price_per_unit=1.20, stock_quantity=200,
                        reorder_level=30, expiry_date=date(2026, 10, 15),
                        batch_number="AB2024002"),
                        
                Medicine(name="Lisinopril", generic_name="Lisinopril",
                        manufacturer="CardioMed", dosage_form="Tablet",
                        strength="10mg", price_per_unit=0.80, stock_quantity=300,
                        reorder_level=40, expiry_date=date(2027, 3, 20),
                        batch_number="CM2024003"),
                        
                Medicine(name="Omeprazole", generic_name="Omeprazole",
                        manufacturer="GastroHealth", dosage_form="Capsule",
                        strength="20mg", price_per_unit=0.90, stock_quantity=250,
                        reorder_level=35, expiry_date=date(2026, 8, 10),
                        batch_number="GH2024004"),
                        
                Medicine(name="Metformin", generic_name="Metformin HCl",
                        manufacturer="DiabCare", dosage_form="Tablet",
                        strength="500mg", price_per_unit=0.60, stock_quantity=400,
                        reorder_level=50, expiry_date=date(2026, 11, 25),
                        batch_number="DC2024005"),
            ]
            
            for medicine in medicines:
                db.session.add(medicine)
            db.session.commit()
            print("✅ Medicine inventory created")
            
            # Create sample appointments for today
            today = date.today()
            appointments = [
                Appointment(patient_id=5, doctor_id=2, department_id=1,
                           appointment_date=today, appointment_time=time(10, 0),
                           token_number=1, status="completed", priority="normal",
                           symptoms="Fever and headache", 
                           actual_start_time=datetime.combine(today, time(10, 0)),
                           actual_end_time=datetime.combine(today, time(10, 15))),
                           
                Appointment(patient_id=6, doctor_id=2, department_id=1,
                           appointment_date=today, appointment_time=time(10, 30),
                           token_number=2, status="in_queue", priority="normal",
                           symptoms="Regular checkup"),
                           
                Appointment(patient_id=7, doctor_id=3, department_id=2,
                           appointment_date=today, appointment_time=time(11, 0),
                           token_number=1, status="booked", priority="normal",
                           symptoms="Chest pain evaluation"),
            ]
            
            for appointment in appointments:
                db.session.add(appointment)
            db.session.commit()
            print("✅ Sample appointments created")
            
            # Create queue entries
            queue_entries = [
                QueueEntry(appointment_id=2, queue_position=1, estimated_wait_time=15,
                          status="waiting"),
                QueueEntry(appointment_id=3, queue_position=1, estimated_wait_time=30,
                          status="waiting"),
            ]
            
            for entry in queue_entries:
                db.session.add(entry)
            db.session.commit()
            print("✅ Queue entries created")
            
            # Create sample prescription for completed appointment
            prescription = Prescription(
                appointment_id=1,
                prescription_number="RX202602020001",
                diagnosis="Viral fever with headache",
                notes="Take medications as prescribed. Rest and plenty of fluids.",
                status="pending"
            )
            db.session.add(prescription)
            db.session.commit()
            
            # Add medications to prescription
            prescription_medications = [
                PrescriptionMedication(prescription_id=1, medicine_id=1,
                                     quantity=10, dosage_instructions="1 tablet twice daily",
                                     duration_days=5),
                PrescriptionMedication(prescription_id=1, medicine_id=2, 
                                     quantity=14, dosage_instructions="1 capsule twice daily",
                                     duration_days=7),
            ]
            
            for med in prescription_medications:
                db.session.add(med)
            db.session.commit()
            print("✅ Sample prescription created")
            
            print("\n🎉 Database initialization completed successfully!")
            print("\n📋 Test Accounts Created:")
            print("👨‍⚕️ Admin: admin / admin123")
            print("🩺 Doctors: dr_smith, dr_johnson, dr_williams / password123")
            print("🧑‍🤝‍🧑 Patients: patient1, patient2, patient3 / password123") 
            print("💊 Pharmacy: pharmacy1, pharmacy2 / password123")
            print(f"\n🌐 Access your system at: http://localhost:5000")
            
        except Exception as e:
            print(f"❌ Error during database initialization: {e}")
            db.session.rollback()

if __name__ == '__main__':
    init_database()