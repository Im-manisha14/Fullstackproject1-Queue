"""
Full System API Verification Script
Simulates the complete user flow via API calls:
1. Patient Login & Booking
2. Doctor Login & Queue Management
3. Pharmacy Login & Dispensing
"""
import requests
import json
import time
from datetime import date

BASE_URL = "http://localhost:5000"

def print_header(text):
    print(f"\n{'='*60}\n{text}\n{'='*60}")

def get_token(role, username, password):
    print(f"Logging in as {role} ({username})...")
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password})
    if resp.status_code != 200:
        # Try email
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": f"{role}@example.com", "password": password})
    
    if resp.status_code == 200:
        return resp.json()['access_token'], resp.json()['user']['id']
    else:
        print(f"✗ Login failed: {resp.text}")
        return None, None

def run_test():
    print_header("STARTING FULL SYSTEM VERIFICATION")
    
    # 1. Login Everyone
    patient_token, patient_id = get_token('Patient', 'patient_test', 'password')
    doctor_token, doctor_id = get_token('Doctor', 'doctor_test', 'password')
    pharmacy_token, pharmacy_id = get_token('Pharmacy', 'pharmacy_test', 'password')
    
    if not all([patient_token, doctor_token, pharmacy_token]):
        print("✗ Failed to login all users. checks seeds.")
        return False

    # 2. PATIENT FLOW
    print_header("STEP 1: PATIENT FLOW")
    
    # 2a. Get Doctors
    print("Fetching doctors list...")
    resp = requests.get(f"{BASE_URL}/api/doctors", headers={"Authorization": f"Bearer {patient_token}"})
    if resp.status_code == 200:
        data = resp.json()
        doctors = data.get('doctors', []) if isinstance(data, dict) else data
        print(f"✓ Found {len(doctors)} doctor(s)")
        target_doctor_id = doctors[0]['id'] if doctors else doctor_id
    else:
        print(f"✗ Failed to get doctors: {resp.text}")
        target_doctor_id = doctor_id

    # 2b. Book Appointment
    print(f"Booking appointment with Doctor ID {target_doctor_id}...")
    appt_data = {
        "doctor_id": target_doctor_id,
        "appointment_date": str(date.today()),
        "symptoms": "System Integration Test Symptom",
        "priority": "normal"
    }
    resp = requests.post(
        f"{BASE_URL}/api/appointments",
        json=appt_data,
        headers={"Authorization": f"Bearer {patient_token}"}
    )
    
    if resp.status_code == 201:
        appt = resp.json()['data']
        appointment_id = appt['appointment_id']
        token_num = appt['queue_token']
        print(f"✓ Appointment booked! ID: {appointment_id}, Token: {token_num}")
    else:
        print(f"✗ Booking failed: {resp.text}")
        return False

    # 3. DOCTOR FLOW
    print_header("STEP 2: DOCTOR FLOW")
    
    # 3a. Check Queue
    print(f"Checking queue for Doctor ID {target_doctor_id}...")
    resp = requests.get(
        f"{BASE_URL}/api/queue/{target_doctor_id}",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    
    if resp.status_code == 200:
        queue = resp.json()
        patient_in_queue = next((p for p in queue if p['token_number'] == token_num), None)
        if patient_in_queue:
             print(f"✓ Patient found in queue: {patient_in_queue['patient_name']} (Status: {patient_in_queue['status']})")
        else:
             print(f"⚠ Patient token {token_num} not found in queue (might be already processed?)")
             # Proceed anyway to try next patient
    else:
        print(f"✗ Failed to get queue: {resp.text}")

    # 3b. Call Next Patient
    print("Calling next patient...")
    # Doctor calls next. This should pick up our patient if they are next.
    # We might need to call it multiple times if there are others ahead, but usually test env is empty-ish.
    called_patient = None
    for _ in range(5): # Try a few times just in case
        resp = requests.post(
            f"{BASE_URL}/api/queue/next",
            json={"doctor_id": target_doctor_id},
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        if resp.status_code == 200:
            data = resp.json()
            if data['current_patient']:
                print(f"✓ Called patient: {data['current_patient']['name']} (Token: {data['current_patient']['token']})")
                if data['current_patient']['token'] == token_num:
                    called_patient = data['current_patient']
                    break
            else:
                print("No more patients in queue.")
                break
        else:
            print(f"✗ Call next failed: {resp.text}")
            break
            
    if not called_patient:
        print("✗ Creating prescription skipped: Target patient was not called.")
        # Proceed to Pharmacy check anyway? No, dependency broken.
        return False
        
    # 3c. Create Prescription
    print(f"Creating prescription for Appointment ID {appointment_id}...")
    presc_data = {
        "appointment_id": appointment_id,
        "medicines": [
            {"name": "SystemTestPill", "dosage": "500mg", "frequency": "Daily", "days": 5}
        ],
        "notes": "Take with water"
    }
    resp = requests.post(
        f"{BASE_URL}/api/prescriptions",
        json=presc_data,
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    
    prescription_id = None
    if resp.status_code == 201:
        prescription_id = resp.json()['prescription_id']
        print(f"✓ Prescription created! ID: {prescription_id}")
    else:
        print(f"✗ Prescription creation failed: {resp.text}")
        return False

    # 4. PHARMACY FLOW
    print_header("STEP 3: PHARMACY FLOW")
    
    # 4a. List Prescriptions
    print("Checking pharmacy pending list...")
    resp = requests.get(
        f"{BASE_URL}/api/pharmacy/prescriptions?status=pending",
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    
    if resp.status_code == 200:
        prescriptions = resp.json()
        target_rx = next((p for p in prescriptions if p['id'] == prescription_id), None)
        if target_rx:
            print(f"✓ Found prescription #{prescription_id} for {target_rx['patient_name']}")
        else:
            print(f"✗ Prescription #{prescription_id} not found in pending list")
            return False
    else:
        print(f"✗ Failed to list prescriptions: {resp.text}")
        return False

    # 4b. Dispense
    print(f"Dispensing prescription #{prescription_id}...")
    resp = requests.put(
        f"{BASE_URL}/api/pharmacy/prescriptions/{prescription_id}/status",
        json={"status": "dispensed", "pharmacy_notes": "Dispensed via System Test"},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    
    if resp.status_code == 200:
        print("✓ Prescription marked as DISPENSED")
    else:
        print(f"✗ Failed to dispense: {resp.text}")
        return False

    print_header("VERIFICATION COMPLETE: ALL SYSTEMS GO 🚀")
    return True

if __name__ == "__main__":
    success = run_test()
    exit(0 if success else 1)
