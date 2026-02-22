"""Test with better error output"""
import requests
import json

BASE_URL = "http://localhost:5000"

# Login
login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={"email": "patient@example.com", "password": "password"}
)

if login_response.status_code == 200:
    token = login_response.json()['access_token']
    print("✓ Login successful\n")
    
    # Try to book appointment
    appointment_data = {
        "doctor_id": 2,
        "appointment_date": "2026-02-16",
        "reason": "Test appointment"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    appt_response = requests.post(
        f"{BASE_URL}/api/appointments/",
        json=appointment_data,
        headers=headers
    )
    
    print(f"Status Code: {appt_response.status_code}")
    print(f"Response:\n{json.dumps(appt_response.json(), indent=2)}")
    
    if appt_response.status_code in [200, 201] and appt_response.json().get('success'):
        print("\n✓✓✓ APPOINTMENTS: PASS ✓✓✓")
    else:
        print(f"\n✗ APPOINTMENTS: FAIL")
        print(f"Error: {appt_response.json().get('error', 'Unknown error')}")
else:
    print("✗ Login failed")
