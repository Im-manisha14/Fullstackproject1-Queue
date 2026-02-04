#!/usr/bin/env python3
"""
Debug JWT token validation
"""

import requests
import jwt
import json

def debug_jwt_tokens():
    print("🔍 Debugging JWT Token Issues")
    print("=" * 40)
    
    # Test login
    login_data = {
        'username': 'john_patient',
        'password': 'patient123'
    }
    
    try:
        response = requests.post('http://localhost:5000/api/auth/login', json=login_data)
        
        if response.status_code == 200:
            result = response.json()
            token = result['access_token']
            user = result['user']
            
            print(f"✅ Login successful")
            print(f"User: {user.get('full_name')} ({user.get('role')})")
            
            # Decode token to see its contents
            try:
                # Don't verify signature for debugging
                decoded = jwt.decode(token, options={"verify_signature": False})
                print(f"\n📋 Token Contents:")
                print(json.dumps(decoded, indent=2))
                
                # Test authenticated endpoint
                print(f"\n🔍 Testing /api/doctors endpoint:")
                headers = {'Authorization': f'Bearer {token}'}
                doctors_response = requests.get('http://localhost:5000/api/doctors', headers=headers)
                
                print(f"Status: {doctors_response.status_code}")
                print(f"Response: {doctors_response.text}")
                
            except Exception as e:
                print(f"❌ Token decode error: {e}")
            
        else:
            print(f"❌ Login failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    debug_jwt_tokens()