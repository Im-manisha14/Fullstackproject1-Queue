import requests
import json

# Test login API
url = "http://localhost:5000/api/auth/login"
credentials = {
    "username": "patient@123",
    "password": "patient123"
}

response = requests.post(url, json=credentials)
print(f"Status Code: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
