import requests
import json

BASE_URL = "http://localhost:5000"

print("Fetching doctors...")
resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "patient_test", "password": "password"})
token = resp.json()['access_token']

resp = requests.get(f"{BASE_URL}/api/doctors", headers={"Authorization": f"Bearer {token}"})
print(json.dumps(resp.json(), indent=2))
