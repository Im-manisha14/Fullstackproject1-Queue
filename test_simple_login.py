import requests

login_url = "http://localhost:5000/api/auth/login"
credentials = {
    "username": "patient@123",
    "password": "patient123"
}

response = requests.post(login_url, json=credentials)
print(f"Status Code: {response.status_code}")
print(f"Response Text: {response.text}")
