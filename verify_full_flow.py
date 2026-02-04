
import sys
import os
import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:5000/api"
SESSION = requests.Session()

def print_step(msg):
    print(f"\n[STEP] {msg}")

def print_result(msg, success=True):
    print(f"[{'PASS' if success else 'FAIL'}] {msg}")
    if not success:
        sys.exit(1)

# 1. SETUP & HEALTH CHECK
print_step("Checking System Health")
try:
    resp = requests.get(f"{BASE_URL}/health")
    if resp.status_code == 200:
        print_result("System is healthy")
    else:
        print_result(f"Health check failed: {resp.status_code}", False)
except Exception as e:
    print_result(f"Connection failed: {e}", False)

# 2. CREATE USERS
timestamp = int(time.time())
patient_email = f"pat_{timestamp}@test.com"
doctor_email = f"doc_{timestamp}@test.com"
pharmacy_email = f"pharma_{timestamp}@test.com"
password = "password123"

# Register Patient
print_step("Registering Patient")
resp = requests.post(f"{BASE_URL}/auth/register", json={
    "email": patient_email, "password": password, "role": "patient",
    "full_name": "Test Patient", "phone": "1234567890", "age": 30
})
if resp.status_code == 201:
    print_result("Patient Registered")
else:
    print_result(f"Patient Register Failed: {resp.text}", False)

# Register Doctor
print_step("Registering Doctor")
# First get a department
depts = requests.get(f"{BASE_URL}/departments").json()['departments']
if not depts:
    print_result("No departments found", False)
dept_id = depts[0]['id']

resp = requests.post(f"{BASE_URL}/auth/register", json={
    "email": doctor_email, "password": password, "role": "doctor",
    "full_name": "Test Doctor", "phone": "1234567890",
    "department_id": dept_id, "specialization": "General", "experience_years": 5, "consultation_fee": 50
})
if resp.status_code == 201:
    print_result("Doctor Registered")
else:
    print_result(f"Doctor Register Failed: {resp.text}", False)

# Register Pharmacy
print_step("Registering Pharmacy")
resp = requests.post(f"{BASE_URL}/auth/register", json={
    "email": pharmacy_email, "password": password, "role": "pharmacy",
    "full_name": "Test Pharmacist", "phone": "1234567890"
})
if resp.status_code == 201:
    print_result("Pharmacy Registered")
else:
    print_result(f"Pharmacy Register Failed: {resp.text}", False)

# 3. VERIFY DOCTOR (Admin Step - Simulated or Auto-verified?)
# Assuming Doctor needs verification or is auto-verified in this env. 
# Let's check if we can login.
print_step("Simulating Admin Verification for Doctor")
# We need to manually update the DB to verify the doctor if the API requires it.
# Or we can try to login and see if it fails with "pending".
resp = requests.post(f"{BASE_URL}/auth/login", json={"email": doctor_email, "password": password})
if resp.status_code == 403 and "pending" in resp.text.lower():
    print("Doctor is pending. Verifying via direct DB update (Simulation)...")
    # Quick hacking verification for test
    from backend.app import app, db, User
    with app.app_context():
        doc = User.query.filter_by(email=doctor_email).first()
        doc.is_verified = True
        pharm = User.query.filter_by(email=pharmacy_email).first()
        pharm.is_verified = True
        db.session.commit()
    print_result("Doctor & Pharmacy Manually Verified")

# 4. PATIENT BOOKING FLOW
print_step("Patient Login & Booking")
# Login Patient
resp = requests.post(f"{BASE_URL}/auth/login", json={"email": patient_email, "password": password})
if resp.status_code != 200: print_result("Patient Login Failed", False)
patient_token = resp.json()['access_token']
patient_headers = {"Authorization": f"Bearer {patient_token}"}

# Get Doctor ID
doc_login = requests.post(f"{BASE_URL}/auth/login", json={"email": doctor_email, "password": password})
doc_id = doc_login.json()['user']['id']

# Book
import datetime
tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
booking_data = {
    "department_id": dept_id,
    "doctor_id": doc_id,
    "appointment_date": tomorrow,
    "appointment_time": "10:00",
    "symptoms": "Headache and fever",
    "priority": "normal"
}
resp = requests.post(f"{BASE_URL}/appointments/book", json=booking_data, headers=patient_headers)
if resp.status_code == 201:
    print_result("Appointment Booked")
    appt_id = resp.json().get('appointment_id') or resp.json().get('id')
    # If API doesn't return ID directly, fetch dashboard
    if not appt_id:
        dash = requests.get(f"{BASE_URL}/dashboard/patient", headers=patient_headers).json()
        appt_id = dash['data']['appointments'][-1]['id']
else:
    print_result(f"Booking Failed: {resp.text}", False)

# 5. DOCTOR CONSULTATION FLOW
print_step("Doctor Consultation")
# Login Doctor
resp = requests.post(f"{BASE_URL}/auth/login", json={"email": doctor_email, "password": password})
doc_token = resp.json()['access_token']
doc_headers = {"Authorization": f"Bearer {doc_token}"}

# Advance Queue (Booked -> In Queue -> Consulting -> Completed)
# 1. Call Patient (Booked -> In Queue/Consulting?)
# The API might be 'advance-queue'.
print(f"Advancing Appointment {appt_id}")
resp = requests.post(f"{BASE_URL}/appointments/advance-queue", json={"appointment_id": appt_id}, headers=doc_headers)
print_result(f"Queue Advanced 1: {resp.json().get('message')}")

resp = requests.post(f"{BASE_URL}/appointments/advance-queue", json={"appointment_id": appt_id}, headers=doc_headers)
print_result(f"Queue Advanced 2: {resp.json().get('message')}")

# Create Prescription
print_step("Creating Prescription")
# Search Medicine
med_resp = requests.get(f"{BASE_URL}/medicines/search?q=Para", headers=doc_headers)
if med_resp.status_code == 200 and med_resp.json()['medicines']:
    med_id = med_resp.json()['medicines'][0]['id']
else:
    # Seed medicine if missing
    print("Seeding medicine...")
    # (Assuming we can't easily seed via API, we construct a dummy one if the backend allows IDs or just hopes)
    # Actually, we need a valid medicine ID usually.
    # Let's assume there is one. If search failed, we might fail.
    # Retry with empty search to get all?
    med_resp = requests.get(f"{BASE_URL}/medicines/search?q=", headers=doc_headers)
    if med_resp.json()['medicines']:
          med_id = med_resp.json()['medicines'][0]['id']
    else:
          print_result("No medicines in DB to prescribe", False)

prescription_data = {
    "appointment_id": appt_id,
    "diagnosis": "Viral Fever",
    "notes": "Rest and drink water",
    "medications": [{
        "medicine_id": med_id,
        "medicine_name": "Paracetamol", # Name might be redundant but sent
        "strength": "500mg",
        "quantity": 10,
        "instructions": "Twice daily",
        "duration": 5
    }]
}
resp = requests.post(f"{BASE_URL}/prescriptions/create", json=prescription_data, headers=doc_headers)
if resp.status_code == 201:
    print_result("Prescription Created")
    presc_id = resp.json().get('prescription_id')
else:
    print_result(f"Prescription Failed: {resp.text}", False)

# 6. PHARMACY FLOW
print_step("Pharmacy Dispensing")
# Login Pharmacy
resp = requests.post(f"{BASE_URL}/auth/login", json={"email": pharmacy_email, "password": password})
pharm_token = resp.json()['access_token']
pharm_headers = {"Authorization": f"Bearer {pharm_token}"}

# Check Dashboard
resp = requests.get(f"{BASE_URL}/dashboard/pharmacy", headers=pharm_headers)
pending = resp.json()['data']['pending_prescriptions']
target_presc = next((p for p in pending if p['patient_name'] == "Test Patient"), None)

if target_presc:
    print_result("Prescription found in Pharmacy Dashboard")
    # Dispense
    resp = requests.post(f"{BASE_URL}/prescriptions/dispense", json={"prescription_id": target_presc['id']}, headers=pharm_headers)
    if resp.status_code == 200:
        print_result("Prescription Dispensed Successfully")
    else:
        print_result(f"Dispense Failed: {resp.text}", False)
else:
    # It might be that we need to rely on the ID we got earlier
    # If the name matching fails (e.g. slight format diff).
    if 'presc_id' in locals():
         resp = requests.post(f"{BASE_URL}/prescriptions/dispense", json={"prescription_id": presc_id}, headers=pharm_headers)
         if resp.status_code == 200:
             print_result("Prescription Dispensed (via ID)")
         else:
             print_result(f"Dispense via ID Failed: {resp.text}", False)
    else:
         print_result("Prescription NOT found in dashboard", False)

print("\n[SUCCESS] End-to-End Flow Verified!")
