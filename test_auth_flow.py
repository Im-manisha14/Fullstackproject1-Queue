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
login_data = login_response.json()

if login_data.get('success'):
    token = login_data['data']['access_token']
    user = login_data['data']['user']
    print(f"✓ Login successful")
    print(f"  User: {user['full_name']} ({user['role']})")
    print(f"  Token (first 50 chars): {token[:50]}...")
    
    # Step 2: Test profile endpoint
    print("\n=== STEP 2: FETCH PROFILE ===")
    profile_url = "http://localhost:5000/api/auth/profile"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"Request headers: {headers}")
    profile_response = requests.get(profile_url, headers=headers)
    print(f"Status: {profile_response.status_code}")
    
    try:
        profile_data = profile_response.json()
        print(f"Response: {json.dumps(profile_data, indent=2)}")
        
        if profile_data.get('success'):
            print(f"✓ Profile fetch successful")
        else:
            print(f"✗ Profile fetch failed: {profile_data.get('message')}")
    except:
        print(f"Response text: {profile_response.text}")
else:
    print(f"✗ Login failed: {login_data.get('message')}")
