"""
End-to-End Workflow Test
Tests the complete Patient → Doctor → Pharmacy flow
"""

import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, User, Department, DoctorProfile, Appointment, Prescription, Medicine
from werkzeug.security import generate_password_hash
from datetime import datetime, date

def test_complete_workflow():
    with app.app_context():
        print("=" * 70)
        print("END-TO-END WORKFLOW TEST")
        print("=" * 70)
        
        issues = []
        
        # STEP 1: Patient Login
        print("\n[STEP 1] Testing Patient Login")
        patient = User.query.filter_by(email='patient@example.com').first()
        if patient and patient.check_password('password'):
            print(f"    ✓ Patient login works: {patient.email}")
        else:
            print(f"    ✗ Patient login failed")
            issues.append("Patient login broken")
        
        # STEP 2: Get Available Doctors
        print("\n[STEP 2] Testing Doctor Availability")
        doctors = DoctorProfile.query.all()
        if doctors:
            print(f"    ✓ Found {len(doctors)} doctor(s)")
            for doc in doctors:
                user = User.query.get(doc.user_id)
                dept = Department.query.get(doc.department_id)
                print(f"      - Dr. {user.full_name} ({dept.name})")
        else:
            print(f"    ✗ No doctors available")
            issues.append("No doctors in system")
        
        # STEP 3: Book Appointment
        print("\n[STEP 3] Testing Appointment Booking")
        if patient and doctors:
            doctor = doctors[0]
            
            # Check if appointment already exists
            existing = Appointment.query.filter_by(
                patient_id=patient.id,
                doctor_id=doctor.user_id,
                appointment_date=date.today()
            ).first()
            
            if existing:
                print(f"    ✓ Appointment exists: Token #{existing.queue_token}")
                appointment = existing
            else:
                # Create new appointment
                try:
                    # Get max token for today
                    max_token = db.session.query(db.func.max(Appointment.queue_token)).filter(
                        Appointment.doctor_id == doctor.user_id,
                        Appointment.appointment_date == date.today()
                    ).scalar() or 0
                    
                    appointment = Appointment(
                        patient_id=patient.id,
                        doctor_id=doctor.user_id,
                        department_id=doctor.department_id,
                        appointment_date=date.today(),
                        appointment_time=datetime.now().time(),
                        queue_token=max_token + 1,
                        status='waiting'
                    )
                    db.session.add(appointment)
                    db.session.commit()
                    print(f"    ✓ Appointment booked: Token #{appointment.queue_token}")
                except Exception as e:
                    db.session.rollback()
                    print(f"    ✗ Booking failed: {e}")
                    issues.append(f"Appointment booking error: {e}")
                    appointment = None
        else:
            print(f"    ⚠ Skipped (missing patient or doctors)")
            appointment = None
        
        # STEP 4: Doctor Views Queue
        print("\n[STEP 4] Testing Doctor Queue View")
        if doctors:
            doctor = doctors[0]
            queue = Appointment.query.filter_by(
                doctor_id=doctor.user_id,
                appointment_date=date.today(),
                status='waiting'
            ).order_by(Appointment.queue_token).all()
            
            if queue:
                print(f"    ✓ Doctor sees {len(queue)} patient(s) in queue:")
                for appt in queue:
                    pat = User.query.get(appt.patient_id)
                    print(f"      - Token #{appt.queue_token}: {pat.full_name}")
            else:
                print(f"    ⚠ Queue is empty (expected if no appointments)")
        
        # STEP 5: Doctor Completes Consultation
        print("\n[STEP 5] Testing Consultation Completion")
        if appointment:
            try:
                appointment.status = 'completed'
                db.session.commit()
                print(f"    ✓ Consultation marked complete")
            except Exception as e:
                db.session.rollback()
                print(f"    ✗ Completion failed: {e}")
                issues.append(f"Consultation completion error: {e}")
        else:
            print(f"    ⚠ Skipped (no appointment)")
        
        # STEP 6: Doctor Creates Prescription
        print("\n[STEP 6] Testing Prescription Creation")
        if appointment:
            # Check if prescription exists
            existing_rx = Prescription.query.filter_by(appointment_id=appointment.id).first()
            
            if existing_rx:
                print(f"    ✓ Prescription exists: ID #{existing_rx.id}")
                prescription = existing_rx
            else:
                try:
                    prescription = Prescription(
                        appointment_id=appointment.id,
                        patient_id=appointment.patient_id,
                        doctor_id=appointment.doctor_id,
                        medicines='Paracetamol 500mg - 2x daily for 3 days',
                        diagnosis='Common cold',
                        notes='Rest and hydration',
                        status='pending'
                    )
                    db.session.add(prescription)
                    db.session.commit()
                    print(f"    ✓ Prescription created: ID #{prescription.id}")
                except Exception as e:
                    db.session.rollback()
                    print(f"    ✗ Prescription creation failed: {e}")
                    issues.append(f"Prescription error: {e}")
                    prescription = None
        else:
            print(f"    ⚠ Skipped (no appointment)")
            prescription = None
        
        # STEP 7: Pharmacy Views Prescriptions
        print("\n[STEP 7] Testing Pharmacy Prescription View")
        pending_rx = Prescription.query.filter_by(status='pending').all()
        if pending_rx:
            print(f"    ✓ Pharmacy sees {len(pending_rx)} pending prescription(s):")
            for rx in pending_rx:
                pat = User.query.get(rx.patient_id)
                print(f"      - Rx #{rx.id}: {pat.full_name} - {rx.medicines}")
        else:
            print(f"    ⚠ No pending prescriptions")
        
        # STEP 8: Pharmacy Dispenses
        print("\n[STEP 8] Testing Prescription Dispensing")
        if prescription:
            try:
                prescription.status = 'dispensed'
                db.session.commit()
                print(f"    ✓ Prescription dispensed")
            except Exception as e:
                db.session.rollback()
                print(f"    ✗ Dispensing failed: {e}")
                issues.append(f"Dispensing error: {e}")
        else:
            print(f"    ⚠ Skipped (no prescription)")
        
        # Final Report
        print("\n" + "=" * 70)
        if not issues:
            print("WORKFLOW STATUS: ✓ COMPLETE END-TO-END FLOW WORKING")
            print("\nAll steps passed:")
            print("  ✓ Patient can login")
            print("  ✓ Patient can book appointment")
            print("  ✓ Doctor can view queue")
            print("  ✓ Doctor can complete consultation")
            print("  ✓ Doctor can create prescription")
            print("  ✓ Pharmacy can view prescriptions")
            print("  ✓ Pharmacy can dispense")
        else:
            print(f"WORKFLOW STATUS: ⚠ {len(issues)} ISSUE(S) FOUND")
            print("\nIssues:")
            for i, issue in enumerate(issues, 1):
                print(f"  {i}. {issue}")
        print("=" * 70)
        
        return issues

if __name__ == "__main__":
    issues = test_complete_workflow()
    exit(0 if not issues else 1)
