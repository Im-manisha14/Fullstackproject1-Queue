import requests
import json

# Get token first
login_url = "http://localhost:5000/api/auth/login"
credentials = {
    "username": "patient@123",
    "password": "patient123"
}

login_response = requests.post(login_url, json=credentials)
print(f"Login Status: {login_response.status_code}")
login_data = login_response.json()
print(f"Login Response: {json.dumps(login_data, indent=2)}")

if login_data.get('success'):
    token = login_data['data']['access_token']
    print(f"\nToken: {token[:50]}...")
    
    # Test profile endpoint
    profile_url = "http://localhost:5000/api/auth/profile"
    headers = {"Authorization": f"Bearer {token}"}
    
    profile_response = requests.get(profile_url, headers=headers)
    print(f"\nProfile Status: {profile_response.status_code}")
    print(f"Profile Response: {json.dumps(profile_response.json(), indent=2)}")
