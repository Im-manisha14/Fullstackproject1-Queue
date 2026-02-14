
import sys
import os

# Add current directory to path so imports work
sys.path.append(os.path.join(os.getcwd(), 'backend'))



from app import app, db, User, DoctorProfile, Department, Medicine  # Changed PharmacyInventory to Medicine
from werkzeug.security import generate_password_hash

def seed():
    with app.app_context():
        db.create_all()  # Ensure tables exist
        
        # Seed Users
        users = [
            {'username': 'patient_test', 'email': 'patient@example.com', 'password': 'password', 'role': 'patient', 'full_name': 'Test Patient'},
            {'username': 'doctor_test', 'email': 'doctor@example.com', 'password': 'password', 'role': 'doctor', 'full_name': 'Test Doctor'},
            {'username': 'pharmacy_test', 'email': 'pharmacy@example.com', 'password': 'password', 'role': 'pharmacy', 'full_name': 'Test Pharmacy'}
        ]
        
        for u in users:
            if not User.query.filter_by(email=u['email']).first():
                user = User(
                    username=u['username'],
                    email=u['email'],
                    password_hash=generate_password_hash(u['password']),
                    full_name=u['full_name'],
                    role=u['role']
                )
                db.session.add(user)
                db.session.commit()
                print(f"Created user: {u['username']}")

        # Seed Departments
        depts = ['General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics']
        dept_objs = {}
        for d_name in depts:
            dept = Department.query.filter_by(name=d_name).first()
            if not dept:
                dept = Department(name=d_name, description=f"{d_name} Department")
                db.session.add(dept)
                db.session.commit()
                dept = Department.query.filter_by(name=d_name).first() # Fetch again to be sure
            dept_objs[d_name] = dept

        # Create Doctor Profile
        doc_user = User.query.filter_by(email='doctor@example.com').first()
        if doc_user and not DoctorProfile.query.filter_by(user_id=doc_user.id).first():
            profile = DoctorProfile(
                user_id=doc_user.id,
                department_id=dept_objs['Cardiology'].id,
                specialization='Cardiologist',
                experience_years=5,
                consultation_fee=50.0
            )
            db.session.add(profile)
            db.session.commit()
            print("Created Doctor Profile")

        # Seed Inventory (Medicines)
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
                    price_per_unit=10.0,
                    manufacturer='Generic Pharma',
                    is_available=True
                ))
        
        db.session.commit()
        print("Seeding Complete: Users, Departments, Doctor Profile, and Medicines added.")

if __name__ == '__main__':
    seed()
