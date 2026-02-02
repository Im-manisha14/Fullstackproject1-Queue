"""
Database initialization script for Secure Healthcare Management System
Creates initial admin user and sample departments for testing
"""

from app import app, db, User, Department, generate_password_hash
from datetime import datetime

def init_database():
    """Initialize the database with required data"""
    with app.app_context():
        # Create all tables
        print("Creating database tables...")
        db.create_all()
        
        # Check if admin user already exists
        admin_user = User.query.filter_by(role='admin').first()
        if not admin_user:
            print("Creating default admin user...")
            admin = User(
                email='admin@hospital.com',
                password_hash=generate_password_hash('SecureAdmin123!'),
                role='admin',
                full_name='System Administrator',
                phone='+1234567890',
                is_active=True,
                is_verified=True
            )
            db.session.add(admin)
        else:
            print("Admin user already exists.")
        
        # Create sample departments
        departments_data = [
            {'name': 'Cardiology', 'description': 'Heart and cardiovascular diseases'},
            {'name': 'Neurology', 'description': 'Brain and nervous system disorders'},
            {'name': 'Orthopedics', 'description': 'Bone and joint conditions'},
            {'name': 'Pediatrics', 'description': 'Children healthcare'},
            {'name': 'Gynecology', 'description': 'Women\'s health and reproductive medicine'},
            {'name': 'Dermatology', 'description': 'Skin, hair, and nail conditions'},
            {'name': 'Internal Medicine', 'description': 'General internal medicine'},
            {'name': 'Surgery', 'description': 'Surgical procedures and operations'},
            {'name': 'Emergency Medicine', 'description': 'Emergency and urgent care'},
            {'name': 'Psychiatry', 'description': 'Mental health and psychiatric care'}
        ]
        
        for dept_data in departments_data:
            existing_dept = Department.query.filter_by(name=dept_data['name']).first()
            if not existing_dept:
                print(f"Creating department: {dept_data['name']}")
                department = Department(
                    name=dept_data['name'],
                    description=dept_data['description'],
                    is_active=True
                )
                db.session.add(department)
            else:
                print(f"Department {dept_data['name']} already exists.")
        
        # Create sample patient user for testing (auto-verified)
        patient_user = User.query.filter_by(email='patient@test.com').first()
        if not patient_user:
            print("Creating test patient user...")
            from app import Patient
            patient_user = User(
                email='patient@test.com',
                password_hash=generate_password_hash('TestPatient123!'),
                role='patient',
                full_name='Test Patient',
                phone='+1234567891',
                is_active=True,
                is_verified=True
            )
            db.session.add(patient_user)
            db.session.flush()  # Get user ID
            
            # Create patient profile
            patient_profile = Patient(
                user_id=patient_user.id,
                date_of_birth=datetime(1990, 5, 15).date(),
                gender='male',
                address='123 Test Street, Test City, TC 12345',
                emergency_contact='+1234567892'
            )
            db.session.add(patient_profile)
        else:
            print("Test patient user already exists.")
        
        # Create sample doctor user for testing (requires admin verification)
        doctor_user = User.query.filter_by(email='doctor@test.com').first()
        if not doctor_user:
            print("Creating test doctor user (pending verification)...")
            from app import Doctor
            doctor_user = User(
                email='doctor@test.com',
                password_hash=generate_password_hash('TestDoctor123!'),
                role='doctor',
                full_name='Dr. Test Doctor',
                phone='+1234567893',
                is_active=True,
                is_verified=False  # Requires admin verification
            )
            db.session.add(doctor_user)
            db.session.flush()  # Get user ID
            
            # Create doctor profile
            cardiology_dept = Department.query.filter_by(name='Cardiology').first()
            doctor_profile = Doctor(
                user_id=doctor_user.id,
                department_id=cardiology_dept.id if cardiology_dept else 1,
                specialization='Interventional Cardiology',
                license_number='DOC123456',
                consultation_fee=150.00,
                availability_start=datetime.strptime('09:00', '%H:%M').time(),
                availability_end=datetime.strptime('17:00', '%H:%M').time(),
                max_patients_per_day=20
            )
            db.session.add(doctor_profile)
        else:
            print("Test doctor user already exists.")
        
        # Create sample pharmacy user for testing (requires admin verification)
        pharmacy_user = User.query.filter_by(email='pharmacy@test.com').first()
        if not pharmacy_user:
            print("Creating test pharmacy user (pending verification)...")
            pharmacy_user = User(
                email='pharmacy@test.com',
                password_hash=generate_password_hash('TestPharmacy123!'),
                role='pharmacy',
                full_name='Test Pharmacy Staff',
                phone='+1234567894',
                is_active=True,
                is_verified=False  # Requires admin verification
            )
            db.session.add(pharmacy_user)
        else:
            print("Test pharmacy user already exists.")
        
        # Create sample pharmacy inventory
        from app import PharmacyInventory
        sample_medicines = [
            {
                'medicine_name': 'Paracetamol 500mg',
                'generic_name': 'Acetaminophen',
                'manufacturer': 'Generic Pharma',
                'quantity_in_stock': 100,
                'unit_price': 0.50,
                'minimum_stock_alert': 20
            },
            {
                'medicine_name': 'Amoxicillin 250mg',
                'generic_name': 'Amoxicillin',
                'manufacturer': 'Antibiotic Co.',
                'quantity_in_stock': 50,
                'unit_price': 2.00,
                'minimum_stock_alert': 15
            },
            {
                'medicine_name': 'Lisinopril 10mg',
                'generic_name': 'Lisinopril',
                'manufacturer': 'Heart Care Ltd.',
                'quantity_in_stock': 5,  # Low stock
                'unit_price': 1.50,
                'minimum_stock_alert': 10
            },
            {
                'medicine_name': 'Metformin 500mg',
                'generic_name': 'Metformin HCl',
                'manufacturer': 'Diabetes Care Inc.',
                'quantity_in_stock': 75,
                'unit_price': 1.25,
                'minimum_stock_alert': 25
            }
        ]
        
        for med_data in sample_medicines:
            existing_med = PharmacyInventory.query.filter_by(medicine_name=med_data['medicine_name']).first()
            if not existing_med:
                print(f"Adding medicine: {med_data['medicine_name']}")
                medicine = PharmacyInventory(**med_data)
                db.session.add(medicine)
            else:
                print(f"Medicine {med_data['medicine_name']} already exists.")
        
        # Commit all changes
        try:
            db.session.commit()
            print("\n✅ Database initialization completed successfully!")
            print("\n🔐 Default Login Credentials:")
            print("👤 Admin: admin@hospital.com / SecureAdmin123!")
            print("👤 Patient: patient@test.com / TestPatient123!")
            print("👤 Doctor: doctor@test.com / TestDoctor123! (⚠️ Requires admin verification)")
            print("👤 Pharmacy: pharmacy@test.com / TestPharmacy123! (⚠️ Requires admin verification)")
            print("\n⚠️ Remember to change these default passwords in production!")
            print("⚠️ Doctor and Pharmacy accounts need admin approval before they can access the system.")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error during database initialization: {str(e)}")
            raise e

if __name__ == '__main__':
    print("🏥 Initializing Secure Healthcare Management System Database...")
    init_database()