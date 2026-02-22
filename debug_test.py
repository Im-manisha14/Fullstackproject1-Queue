"""Test with full error capture"""
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
    
    # Try to book appointment
    appointment_data = {
        "doctor_id": 2,
        "appointment_date": "2026-02-16"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    appt_response = requests.post(
        f"{BASE_URL}/api/appointments",
        json=appointment_data,
        headers=headers
    )
    
    print(f"Status: {appt_response.status_code}")
    try:
        resp_json = appt_response.json()
        print(f"Full Response:\n{json.dumps(resp_json, indent=2)}")
        
        if appt_response.status_code in [200, 201] and resp_json.get('success'):
            print("\n✓✓✓ APPOINTMENTS: PASS ✓✓✓")
        else:
            print(f"\n✗ APPOINTMENTS: FAIL")
            # Print full error message
            error_msg = resp_json.get('message', resp_json.get('error', 'Unknown'))
            print(f"Full Error Message:\n{error_msg}")
    except Exception as e:
        print(f"Error parsing response: {e}")
        print(f"Raw text: {appt_response.text}")
