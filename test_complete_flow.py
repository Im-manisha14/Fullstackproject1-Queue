import requests
import json

# Login
login_response = requests.post("http://localhost:5000/api/auth/login", json={
    "username": "patient@123",
    "password": "patient123"
})

print("=== LOGIN ===")
print(f"Status: {login_response.status_code}")
login_data = login_response.json()

if login_data.get('success') and login_data.get('data'):
    token = login_data['data']['access_token']
    print(f"Token received (first 100 chars): {token[:100]}...")
    
    # Test JWT decode
    print("\n=== TEST JWT DECODE ===")
    test_response = requests.post("http://localhost:5000/api/test-jwt", json={"token": token})
    print(f"Status: {test_response.status_code}")
    print(f"Response: {json.dumps(test_response.json(), indent=2)}")
    
    # Test profile
    print("\n=== TEST PROFILE ===")
    profile_response = requests.get("http://localhost:5000/api/auth/profile", 
                                   headers={"Authorization": f"Bearer {token}"})
    print(f"Status: {profile_response.status_code}")
    print(f"Response: {json.dumps(profile_response.json(), indent=2)}")
else:
    print(f"Login failed: {login_data}")
