"""Test Pharmacy Workflow"""
import requests
import json
from datetime import date

BASE_URL = "http://localhost:5000"

def get_token(role, username, password):
    print(f"Logging in as {role}...")
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password})
    if resp.status_code != 200:
        # Try email
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": f"{role}@example.com", "password": password})
    
    if resp.status_code == 200:
        return resp.json()['access_token'], resp.json()['user']['id']
    else:
        print(f"Login failed for {role}: {resp.text}")
        return None, None

# 1. Login
patient_token, patient_id = get_token('patient', 'patient_test', 'password')
doctor_token, doctor_id = get_token('doctor', 'doctor_test', 'password')
pharmacy_token, pharmacy_id = get_token('pharmacy', 'pharmacy_test', 'password')

if not all([patient_token, doctor_token, pharmacy_token]):
    print("Failed to login all users. Run seed_db.py first or check users.")
    exit(1)

# 2. Book Appointment (Patient)
print("\nBooking appointment...")
appt_data = {
    "doctor_id": doctor_id,
    "appointment_date": str(date.today()),
    "symptoms": "Headache and fever"
}
resp = requests.post(
    f"{BASE_URL}/api/appointments",
    json=appt_data,
    headers={"Authorization": f"Bearer {patient_token}"}
)
if resp.status_code == 201:
    appointment_id = resp.json()['data']['appointment_id']
    print(f"✓ Appointment booked (ID: {appointment_id})")
else:
    print(f"✗ Booking failed: {resp.text}")
    print("Trying to use existing appointment ID 1 if available...")
    appointment_id = 1

# 3. Create Prescription (Doctor)
print("\nCreating prescription...")
presc_data = {
    "appointment_id": appointment_id,
    "medicines": [
        {"name": "Paracetamol", "dosage": "500mg", "frequency": "BID", "days": 3},
        {"name": "Amoxicillin", "dosage": "500mg", "frequency": "TID", "days": 5}
    ],
    "notes": "Take with food"
}
resp = requests.post(
    f"{BASE_URL}/api/prescriptions",
    json=presc_data,
    headers={"Authorization": f"Bearer {doctor_token}"}
)

if resp.status_code == 201:
    prescription_id = resp.json()['prescription_id']
    print(f"✓ Prescription created (ID: {prescription_id})")
    
    # 4. List Prescriptions (Pharmacy)
    print("\nListing pharmacy prescriptions...")
    resp = requests.get(
        f"{BASE_URL}/api/pharmacy/prescriptions?status=pending",
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    
    if resp.status_code == 200:
        prescriptions = resp.json()
        print(f"Found {len(prescriptions)} pending prescriptions")
        
        # Verify our prescription is there
        found = False
        for p in prescriptions:
            if p['id'] == prescription_id:
                found = True
                print(f"✓ Found our prescription: {p['id']}")
                break
        
        if found:
            # 5. Dispense (Pharmacy)
            print(f"\nDispensing prescription {prescription_id}...")
            resp = requests.put(
                f"{BASE_URL}/api/pharmacy/prescriptions/{prescription_id}/status",
                json={"status": "dispensed"},
                headers={"Authorization": f"Bearer {pharmacy_token}"}
            )
            
            if resp.status_code == 200:
                print("✓ Prescription marked as DISPENSED")
            else:
                print(f"✗ Failed to dispense: {resp.text}")
        else:
            print("✗ Prescription not found in pending list")
    else:
        print(f"✗ Failed to list prescriptions: {resp.text}")

else:
    print(f"✗ Failed to create prescription: {resp.text}")
    print("Maybe appointment ID is invalid or not assigned to this doctor.")
