#!/usr/bin/env python3
"""
Initialize test users for the healthcare system
"""

import requests
import json

def create_test_users():
    """Create test users for each role"""
    
    users = [
        {
            "username": "patient_test",
            "email": "patient@test.com",
            "password": "password123",
            "full_name": "Test Patient",
            "phone": "123-456-7890",
            "role": "patient"
        },
        {
            "username": "doctor_test", 
            "email": "doctor@test.com",
            "password": "password123",
            "full_name": "Dr. Test Doctor",
            "phone": "123-456-7891",
            "role": "doctor"
        },
        {
            "username": "pharmacy_test",
            "email": "pharmacy@test.com", 
            "password": "password123",
            "full_name": "Test Pharmacy",
            "phone": "123-456-7892",
            "role": "pharmacy"
        }
    ]
    
    print("👥 Creating test users...")
    
    for user in users:
        try:
            response = requests.post('http://localhost:5000/api/auth/register',
                                   json=user,
                                   timeout=5)
            
            if response.status_code == 201:
                print(f"   ✅ Created {user['role']}: {user['email']}")
            elif response.status_code == 400 and "already exists" in response.text:
                print(f"   ⚠️  {user['role']} user already exists: {user['email']}")
            else:
                print(f"   ❌ Failed to create {user['role']}: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Error creating {user['role']}: {e}")
    
    print("\n🎯 Test users ready!")
    print("   Patient: patient@test.com / password123")
    print("   Doctor: doctor@test.com / password123")
    print("   Pharmacy: pharmacy@test.com / password123")

if __name__ == "__main__":
    create_test_users()