import requests

try:
    print("Testing doctors API endpoint...")
    
    # First login to get token
    login_data = {'email': 'patient@123', 'password': 'patient123'}
    print("Logging in...")
    login_response = requests.post('http://localhost:5000/api/auth/login', json=login_data)
    print(f"Login status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        login_result = login_response.json()
        token = login_result['data']['access_token']
        print("Login successful, got token")
        
        # Test doctors endpoint
        headers = {'Authorization': f'Bearer {token}'}
        doctors_response = requests.get('http://localhost:5000/api/patient/doctors', headers=headers)
        print(f"Doctors API status: {doctors_response.status_code}")
        
        if doctors_response.status_code == 200:
            doctors_data = doctors_response.json()
            print(f"Number of doctors: {len(doctors_data)}")
            if len(doctors_data) > 0:
                print(f"First doctor: {doctors_data[0]['name']}")
            else:
                print("No doctors returned!")
        else:
            print(f"Doctors API failed: {doctors_response.text}")
    else:
        print(f"Login failed: {login_response.text}")
        
except Exception as e:
    print(f"Error: {e}")