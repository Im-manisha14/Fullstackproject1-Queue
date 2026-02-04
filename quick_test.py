import requests

# Create test patient
data = {
    'username': 'test_patient',
    'email': 'patient@test.com',
    'password': 'patient123',
    'full_name': 'Test Patient',
    'role': 'patient'
}

response = requests.post('http://localhost:5000/api/auth/register', json=data)
print('Patient created:', response.status_code)

# Login
login_data = {'username': 'test_patient', 'password': 'patient123'}
login_resp = requests.post('http://localhost:5000/api/auth/login', json=login_data)
print('Login:', login_resp.status_code)

if login_resp.status_code == 200:
    token = login_resp.json()['access_token']
    
    # Test doctors endpoint
    docs_resp = requests.get('http://localhost:5000/api/doctors', 
                           headers={'Authorization': f'Bearer {token}'})
    print('Doctors endpoint status:', docs_resp.status_code)
    print('Response content type:', docs_resp.headers.get('content-type'))
    print('Response text (first 200 chars):', docs_resp.text[:200])