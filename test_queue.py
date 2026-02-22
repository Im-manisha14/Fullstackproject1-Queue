"""Test Queue Endpoints"""
import requests
import json

BASE_URL = "http://localhost:5000"

# 1. Login as Doctor
print("Logging in as doctor...")
login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={"username": "doctor_test", "password": "password"}
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.text}")
    # Try email login if username fails
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "doctor@example.com", "password": "password"}
    )
    if login_response.status_code != 200:
        print("Login failed with email too. Exiting.")
        exit(1)

token = login_response.json()['access_token']
doctor_id = login_response.json()['user']['id']
print(f"✓ Doctor logged in (ID: {doctor_id})")
headers = {"Authorization": f"Bearer {token}"}

# 2. Get Queue
print(f"\nGetting queue for doctor {doctor_id}...")
queue_response = requests.get(
    f"{BASE_URL}/api/queue/{doctor_id}",
    headers=headers
)

print(f"Status: {queue_response.status_code}")
if queue_response.status_code == 200:
    print(f"Queue: {json.dumps(queue_response.json(), indent=2)}")
    print("✓ GET /api/queue/<id> PASS")
else:
    print(f"Response: {queue_response.text}")
    print("✗ GET /api/queue/<id> FAIL")

# 3. Next Patient
print("\nCalling Next Patient...")
next_response = requests.post(
    f"{BASE_URL}/api/queue/next",
    json={"doctor_id": doctor_id},
    headers=headers
)

print(f"Status: {next_response.status_code}")
print(f"Response: {next_response.text}")
if next_response.status_code in [200, 201]:
    print("✓ POST /api/queue/next PASS")
else:
    print("✗ POST /api/queue/next FAIL")
