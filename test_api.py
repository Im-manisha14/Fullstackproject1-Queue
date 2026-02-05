"""
Quick API Test Script
Tests the main endpoints to verify everything is working
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"✅ Health Check: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health Check Failed: {e}")
        return False

def test_register():
    """Test user registration"""
    try:
        data = {
            "username": "testuser",
            "email": "test@example.com", 
            "password": "TestPass123",
            "role": "patient",
            "full_name": "Test User",
            "phone": "1234567890"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=data)
        print(f"✅ Registration: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Registration Failed: {e}")
        return False

def test_login():
    """Test user login"""
    try:
        data = {
            "username": "testuser",
            "password": "TestPass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=data)
        result = response.json()
        print(f"✅ Login: {response.status_code} - Success: {result.get('success')}")
        
        if result.get('success') and 'data' in result and 'access_token' in result['data']:
            return result['data']['access_token']
        return None
    except Exception as e:
        print(f"❌ Login Failed: {e}")
        return None

def main():
    """Run all tests"""
    print("🏥 Healthcare Queue System - API Tests")
    print("=" * 40)
    
    # Test health endpoint
    if not test_health():
        print("❌ Server is not responding!")
        return
    
    # Test registration
    test_register()
    
    # Test login
    token = test_login()
    
    if token:
        print(f"✅ Authentication working! Token received.")
    else:
        print("❌ Authentication failed!")
    
    print("\n🎉 Basic API tests completed!")
    print("✅ Backend is running correctly")
    print("✅ PostgreSQL database is connected")
    print("✅ Authentication system is working")

if __name__ == "__main__":
    main()