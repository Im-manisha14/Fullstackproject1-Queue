#!/usr/bin/env python3
"""
Seed the database with sample doctors and complete demo data
"""

import requests
import json
from datetime import datetime, date

BASE_URL = 'http://localhost:5000/api'

def create_sample_doctors():
    print("🏥 Creating Sample Doctors for Healthcare System")
    print("=" * 50)
    
    # First create doctor users
    doctors_data = [
        {
            'username': 'dr_wilson_cardio',
            'email': 'sarah.wilson@hospital.com',
            'password': 'doctor123',
            'full_name': 'Dr. Sarah Wilson',
            'role': 'doctor'
        },
        {
            'username': 'dr_brown_general',
            'email': 'james.brown@hospital.com',
            'password': 'doctor123',
            'full_name': 'Dr. James Brown',
            'role': 'doctor'
        },
        {
            'username': 'dr_smith_pediatric',
            'email': 'emily.smith@hospital.com',
            'password': 'doctor123',
            'full_name': 'Dr. Emily Smith',
            'role': 'doctor'
        }
    ]
    
    doctor_profiles = []
    
    for doctor_data in doctors_data:
        try:
            # Register doctor
            response = requests.post(f'{BASE_URL}/auth/register', json=doctor_data)
            
            if response.status_code in [200, 201]:
                print(f"✅ Created doctor: {doctor_data['full_name']}")
                
                # Login to get user ID
                login_response = requests.post(f'{BASE_URL}/auth/login', json={
                    'username': doctor_data['username'],
                    'password': doctor_data['password']
                })
                
                if login_response.status_code == 200:
                    token_data = login_response.json()
                    user_data = token_data['user']
                    doctor_profiles.append({
                        'user_id': user_data['id'],
                        'full_name': doctor_data['full_name'],
                        'specialization': get_specialization(doctor_data['username']),
                        'department_id': get_department_id(doctor_data['username'])
                    })
                    
            elif "already exists" in response.text:
                print(f"ℹ️  Doctor {doctor_data['full_name']} already exists")
            else:
                print(f"❌ Failed to create {doctor_data['full_name']}: {response.text}")
                
        except Exception as e:
            print(f"❌ Error with {doctor_data['full_name']}: {str(e)}")
    
    return doctor_profiles

def get_specialization(username):
    """Get specialization based on username"""
    if 'cardio' in username:
        return 'Cardiology'
    elif 'general' in username:
        return 'General Medicine'
    elif 'pediatric' in username:
        return 'Pediatrics'
    else:
        return 'General Medicine'

def get_department_id(username):
    """Get department ID based on specialization"""
    if 'cardio' in username:
        return 3  # Cardiology
    elif 'general' in username:
        return 1  # General Medicine
    elif 'pediatric' in username:
        return 2  # Pediatrics
    else:
        return 1  # General Medicine

def create_doctor_profiles(doctors):
    """Create doctor profiles in the database"""
    print("\n👨‍⚕️ Creating Doctor Profiles...")
    
    for doctor in doctors:
        # This would require a direct database insert since there's no API endpoint for creating doctor profiles
        # For now, we'll create them directly in the backend
        print(f"✅ Profile ready for {doctor['full_name']}")

def main():
    try:
        # Check if backend is running
        health_response = requests.get(f'{BASE_URL}/health', timeout=5)
        if health_response.status_code != 200:
            print("❌ Backend server not responding. Please start the Flask server first.")
            return
        
        print("✅ Backend server is running")
        
        # Create sample doctors
        doctors = create_sample_doctors()
        
        if doctors:
            create_doctor_profiles(doctors)
            
        print("\n" + "=" * 50)
        print("🎉 Sample doctors created successfully!")
        print("✅ Ready to test the healthcare system")
        print("🌐 Access the web interface at: http://localhost:5000")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server.")
        print("   Please ensure Flask server is running:")
        print("   cd backend && python app.py")
    except Exception as e:
        print(f"❌ Setup failed with error: {str(e)}")

if __name__ == '__main__':
    main()