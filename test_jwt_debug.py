import requests
import json

# Step 1: Login
login_url = "http://localhost:5000/api/auth/login"
credentials = {
    "username": "patient@123",
    "password": "patient123"
}

print("=== STEP 1: LOGIN ===")
login_response = requests.post(login_url, json=credentials)
print(f"Status: {login_response.status_code}")

if login_response.status_code == 200:
    login_data = login_response.json()
    
    if login_data.get('success'):
        token = login_data['data']['access_token']
        user = login_data['data']['user']
        print(f"✓ Login successful")
        print(f"  User: {user['full_name']} ({user['role']})")
        print(f"  Token (first 80 chars): {token[:80]}...")
        
        # Step 2: Test JWT validation
        print("\n=== STEP 2: TEST JWT VALIDATION ===")
        test_url = "http://localhost:5000/api/test-jwt"
        test_response = requests.post(test_url, json={"token": token})
        print(f"Status: {test_response.status_code}")
        print(f"Response: {json.dumps(test_response.json(), indent=2)}")
        
        # Step 3: Test profile endpoint
        print("\n=== STEP 3: FETCH PROFILE ===")
        profile_url = "http://localhost:5000/api/auth/profile"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        profile_response = requests.get(profile_url, headers=headers)
        print(f"Status: {profile_response.status_code}")
        
        try:
            profile_data = profile_response.json()
            print(f"Response: {json.dumps(profile_data, indent=2)}")
        except:
            print(f"Response text: {profile_response.text}")
    else:
        print(f"✗ Login failed: {login_data.get('message')}")
else:
    print(f"✗ Login request failed with status {login_response.status_code}")
    print(f"Response: {login_response.text}")
