import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, User, Department, DoctorProfile, Medicine, Appointment, Prescription, QueueLog
from sqlalchemy import inspect, text

def check_database_perfection():
    with app.app_context():
        print("=" * 70)
        print("COMPREHENSIVE DATABASE PERFECTION CHECK")
        print("=" * 70)
        
        issues = []
        
        # 1. Connection Test
        print("\n[1] DATABASE CONNECTION")
        try:
            db.session.execute(text('SELECT version()'))
            result = db.session.execute(text('SELECT current_database()')).scalar()
            print(f"    ✓ Connected to database: {result}")
        except Exception as e:
            print(f"    ✗ Connection failed: {e}")
            issues.append("Database connection failed")
            return issues
        
        # 2. Schema Integrity
        print("\n[2] SCHEMA INTEGRITY")
        inspector = inspect(db.engine)
        expected_tables = ['users', 'departments', 'doctor_profiles', 'medicines', 
                          'appointments', 'prescriptions', 'queue_logs']
        actual_tables = inspector.get_table_names()
        
        for table in expected_tables:
            if table in actual_tables:
                print(f"    ✓ Table '{table}' exists")
            else:
                print(f"    ✗ Table '{table}' missing")
                issues.append(f"Missing table: {table}")
        
        # 3. Data Integrity
        print("\n[3] DATA INTEGRITY")
        
        # Users check
        users = User.query.all()
        print(f"    Users: {len(users)} total")
        roles = {}
        for u in users:
            roles[u.role] = roles.get(u.role, 0) + 1
        
        for role in ['patient', 'doctor', 'pharmacy']:
            count = roles.get(role, 0)
            if count == 1:
                print(f"    ✓ {role.capitalize()}: 1 user (perfect)")
            elif count == 0:
                print(f"    ✗ {role.capitalize()}: 0 users (missing)")
                issues.append(f"Missing {role} user")
            else:
                print(f"    ⚠ {role.capitalize()}: {count} users (duplicate)")
                issues.append(f"Duplicate {role} users: {count}")
        
        # Departments check
        depts = Department.query.all()
        print(f"\n    Departments: {len(depts)} total")
        if len(depts) >= 4:
            print(f"    ✓ Sufficient departments")
        else:
            print(f"    ⚠ Only {len(depts)} departments")
            issues.append(f"Only {len(depts)} departments (expected 4+)")
        
        # Doctor profiles check
        doc_profiles = DoctorProfile.query.all()
        doctor_users = User.query.filter_by(role='doctor').count()
        print(f"\n    Doctor Profiles: {len(doc_profiles)}")
        print(f"    Doctor Users: {doctor_users}")
        if len(doc_profiles) == doctor_users:
            print(f"    ✓ All doctors have profiles")
        else:
            print(f"    ✗ Mismatch: {doctor_users} doctors but {len(doc_profiles)} profiles")
            issues.append("Doctor profile mismatch")
        
        # Medicine inventory check
        meds = Medicine.query.all()
        print(f"\n    Medicines: {len(meds)} items")
        if len(meds) >= 5:
            print(f"    ✓ Adequate inventory")
        else:
            print(f"    ⚠ Limited inventory ({len(meds)} items)")
        
        # 4. Credential Verification
        print("\n[4] CREDENTIAL VERIFICATION")
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
                        print(f"    ✓ {email}: Valid")
                    else:
                        print(f"    ✗ {email}: Wrong role")
                        issues.append(f"{email} has wrong role")
                else:
                    print(f"    ✗ {email}: Invalid password")
                    issues.append(f"{email} password incorrect")
            else:
                print(f"    ✗ {email}: Not found")
                issues.append(f"{email} user missing")
        
        # 5. Relationships Check
        print("\n[5] RELATIONSHIP INTEGRITY")
        try:
            # Test doctor profile relationships
            for doc_profile in DoctorProfile.query.all():
                user = User.query.get(doc_profile.user_id)
                dept = Department.query.get(doc_profile.department_id)
                if user and dept:
                    print(f"    ✓ Doctor profile {doc_profile.id}: Valid relationships")
                else:
                    print(f"    ✗ Doctor profile {doc_profile.id}: Broken relationships")
                    issues.append(f"Broken doctor profile relationship: {doc_profile.id}")
        except Exception as e:
            print(f"    ✗ Relationship check failed: {e}")
            issues.append(f"Relationship integrity error: {e}")
        
        # 6. Constraints Check
        print("\n[6] DATABASE CONSTRAINTS")
        try:
            # Check unique constraints
            email_counts = db.session.execute(
                text("SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING COUNT(*) > 1")
            ).fetchall()
            
            if email_counts:
                print(f"    ✗ Duplicate emails found: {len(email_counts)}")
                for email, count in email_counts:
                    print(f"      - {email}: {count} occurrences")
                    issues.append(f"Duplicate email: {email}")
            else:
                print(f"    ✓ No duplicate emails")
            
            username_counts = db.session.execute(
                text("SELECT username, COUNT(*) as cnt FROM users GROUP BY username HAVING COUNT(*) > 1")
            ).fetchall()
            
            if username_counts:
                print(f"    ✗ Duplicate usernames found: {len(username_counts)}")
                issues.append("Duplicate usernames exist")
            else:
                print(f"    ✓ No duplicate usernames")
                
        except Exception as e:
            print(f"    ⚠ Constraint check error: {e}")
        
        # Final Report
        print("\n" + "=" * 70)
        if not issues:
            print("DATABASE STATUS: ✓ PERFECT")
            print("All checks passed. Your database is in excellent condition.")
        else:
            print(f"DATABASE STATUS: ⚠ {len(issues)} ISSUE(S) FOUND")
            print("\nIssues to address:")
            for i, issue in enumerate(issues, 1):
                print(f"  {i}. {issue}")
        print("=" * 70)
        
        return issues

if __name__ == "__main__":
    issues = check_database_perfection()
    exit(0 if not issues else 1)
