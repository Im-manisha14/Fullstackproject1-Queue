"""
Quick test to check if appointments endpoint works
"""
import requests
import json

BASE_URL = "http://localhost:5000"

# Step 1: Login as patient
print("Testing Appointments Endpoint...")
print("=" * 50)

login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={"email": "patient@example.com", "password": "password"}
)

if login_response.status_code == 200:
    token = login_response.json()['access_token']
    print("✓ Login successful")
    
    # Step 2: Try to book appointment
    appointment_data = {
        "doctor_id": 2,  # Assuming doctor user_id is 2
        "appointment_date": "2026-02-16",
        "reason": "Test appointment"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    appt_response = requests.post(
        f"{BASE_URL}/api/appointments/",
        json=appointment_data,
        headers=headers
    )
    
    print(f"\nAppointment Response Status: {appt_response.status_code}")
    print(f"Response: {json.dumps(appt_response.json(), indent=2)}")
    
    if appt_response.status_code in [200, 201]:
        if appt_response.json().get('success'):
            print("\n✓ APPOINTMENTS: PASS")
        else:
            print("\n✗ APPOINTMENTS: FAIL - No success flag")
    else:
        print(f"\n✗ APPOINTMENTS: FAIL - Status {appt_response.status_code}")
else:
    print("✗ Login failed")
