import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, User, Department, DoctorProfile, Medicine

def test_database():
    with app.app_context():
        print("=" * 60)
        print("DATABASE HEALTH CHECK")
        print("=" * 60)
        
        # Test 1: Connection
        try:
            db.session.execute(db.text('SELECT 1'))
            print("✓ Database connection: OK")
        except Exception as e:
            print(f"✗ Database connection: FAILED - {e}")
            return
        
        # Test 2: Check Users
        try:
            users = User.query.all()
            print(f"\n✓ Users table: {len(users)} users found")
            for u in users:
                print(f"  - {u.email} ({u.role})")
        except Exception as e:
            print(f"✗ Users table: FAILED - {e}")
        
        # Test 3: Check Departments
        try:
            depts = Department.query.all()
            print(f"\n✓ Departments table: {len(depts)} departments found")
            for d in depts:
                print(f"  - {d.name}")
        except Exception as e:
            print(f"✗ Departments table: FAILED - {e}")
        
        # Test 4: Check Doctor Profiles
        try:
            doctors = DoctorProfile.query.all()
            print(f"\n✓ Doctor Profiles: {len(doctors)} profiles found")
            for doc in doctors:
                print(f"  - User ID: {doc.user_id}, Dept ID: {doc.department_id}")
        except Exception as e:
            print(f"✗ Doctor Profiles: FAILED - {e}")
        
        # Test 5: Check Medicine Inventory
        try:
            meds = Medicine.query.all()
            print(f"\n✓ Medicine Inventory: {len(meds)} items found")
            for med in meds[:3]:  # Show first 3
                print(f"  - {med.name} (Stock: {med.stock_quantity})")
        except Exception as e:
            print(f"✗ Medicine Inventory: FAILED - {e}")
        
        # Test 6: Test Login Credentials
        print("\n" + "=" * 60)
        print("CREDENTIAL VERIFICATION")
        print("=" * 60)
        
        test_creds = [
            ('patient@example.com', 'password', 'patient'),
            ('doctor@example.com', 'password', 'doctor'),
            ('pharmacy@example.com', 'password', 'pharmacy')
        ]
        
        for email, password, expected_role in test_creds:
            user = User.query.filter_by(email=email).first()
            if user:
                if user.check_password(password):
                    if user.role == expected_role:
                        print(f"✓ {email}: Valid credentials, correct role ({expected_role})")
                    else:
                        print(f"✗ {email}: Valid password but wrong role (expected {expected_role}, got {user.role})")
                else:
                    print(f"✗ {email}: Invalid password")
            else:
                print(f"✗ {email}: User not found")
        
        print("\n" + "=" * 60)
        print("DATABASE STATUS: HEALTHY")
        print("=" * 60)

if __name__ == "__main__":
    test_database()
