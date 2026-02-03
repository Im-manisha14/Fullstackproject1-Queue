"""
Simple user creation via API calls
"""
import requests
import json

API_BASE = "http://127.0.0.1:5000/api"

def create_test_users():
    # Test users to create
    users = [
        {
            "email": "admin@hospital.com",
            "password": "admin123",
            "full_name": "System Administrator",
            "phone": "+1234567890",
            "role": "doctor"  # Using doctor since admin might not be allowed
        },
        {
            "email": "doctor@hospital.com", 
            "password": "doctor123",
            "full_name": "Dr. John Smith",
            "phone": "+1234567891",
            "role": "doctor"
        },
        {
            "email": "patient@hospital.com",
            "password": "patient123", 
            "full_name": "John Doe",
            "phone": "+1234567892",
            "role": "patient"
        },
        {
            "email": "pharmacy@hospital.com",
            "password": "pharmacy123",
            "full_name": "Central Pharmacy", 
            "phone": "+1234567893",
            "role": "pharmacy"
        }
    ]
    
    print("Creating test users via API...")
    
    for user in users:
        try:
            response = requests.post(f"{API_BASE}/auth/register", 
                                   json=user,
                                   headers={"Content-Type": "application/json"})
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print(f"✅ Created user: {user['full_name']} ({user['role']})")
                else:
                    print(f"❌ Failed to create {user['full_name']}: {result.get('message', 'Unknown error')}")
            else:
                print(f"❌ HTTP Error {response.status_code} for {user['full_name']}: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("❌ Cannot connect to backend server. Make sure it's running on http://127.0.0.1:5000")
            return
        except Exception as e:
            print(f"❌ Error creating {user['full_name']}: {e}")
    
    print("\n🔐 Test Login Credentials:")
    print("Email: admin@hospital.com, Password: admin123")
    print("Email: doctor@hospital.com, Password: doctor123")
    print("Email: patient@hospital.com, Password: patient123")
    print("Email: pharmacy@hospital.com, Password: pharmacy123")

if __name__ == '__main__':
    create_test_users()