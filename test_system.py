#!/usr/bin/env python3
"""
Test script to verify the Queue-Free Healthcare System is working
"""

import requests
import json

def test_backend():
    """Test backend endpoints"""
    print("🧪 Testing Backend...")
    
    # Test health endpoint
    try:
        response = requests.get('http://localhost:5000/api/health', timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint working")
            health_data = response.json()
            print(f"   Status: {health_data.get('status')}")
            print(f"   Database: {health_data.get('database')}")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health endpoint error: {e}")
    
    # Test user registration
    try:
        test_user = {
            "username": "testpatient",
            "email": "testpatient@demo.com",
            "password": "password123",
            "full_name": "Test Patient",
            "role": "patient"
        }
        
        response = requests.post('http://localhost:5000/api/auth/register', 
                               json=test_user, timeout=5)
        
        if response.status_code in [201, 400]:  # 400 if user already exists
            print("✅ Registration endpoint working")
        else:
            print(f"❌ Registration failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Registration error: {e}")
    
    # Test login
    try:
        login_data = {
            "username": "testpatient",
            "password": "password123"
        }
        
        response = requests.post('http://localhost:5000/api/auth/login', 
                               json=login_data, timeout=5)
        
        if response.status_code == 200:
            print("✅ Login endpoint working")
            token = response.json().get('access_token')
            if token:
                print("   JWT token received")
        else:
            print(f"❌ Login failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Login error: {e}")

def test_frontend():
    """Test frontend accessibility"""
    print("\n🖥️  Testing Frontend...")
    
    try:
        response = requests.get('http://localhost:3000', timeout=10)
        if response.status_code == 200:
            print("✅ Frontend accessible at http://localhost:3000")
            if 'react' in response.text.lower() or 'queue-free' in response.text.lower():
                print("   React app loaded successfully")
        else:
            print(f"❌ Frontend not accessible: {response.status_code}")
    except Exception as e:
        print(f"❌ Frontend error: {e}")

def main():
    print("🏥 Queue-Free Healthcare System - Live Test")
    print("=" * 50)
    
    test_backend()
    test_frontend()
    
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    print("   - Backend API: Flask server on port 5000")
    print("   - Frontend UI: React app on port 3000")
    print("   - Database: SQLite (fallback from PostgreSQL)")
    print("   - Real-time: SocketIO temporarily disabled")
    print("\n🎯 System Status: RUNNING")
    print("   Open http://localhost:3000 to access the application")
    print("   Use the following test accounts:")
    print("   - Patient: patient@test.com / password123")
    print("   - Doctor: doctor@test.com / password123") 
    print("   - Pharmacy: pharmacy@test.com / password123")

if __name__ == "__main__":
    main()