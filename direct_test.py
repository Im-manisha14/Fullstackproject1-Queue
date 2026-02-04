#!/usr/bin/env python3
"""
Simple test to verify login endpoint is working
"""

import requests
import json

# Test the login endpoint directly
data = {
    "email": "patient@test.com",
    "password": "password123"
}

try:
    response = requests.post('http://localhost:5000/api/auth/login', 
                           json=data,
                           headers={'Content-Type': 'application/json'},
                           timeout=5)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Login successful!")
        print(f"User: {result.get('user', {}).get('full_name')}")
        print(f"Role: {result.get('user', {}).get('role')}")
        print(f"Token received: {bool(result.get('access_token'))}")
    
except Exception as e:
    print(f"Error: {e}")