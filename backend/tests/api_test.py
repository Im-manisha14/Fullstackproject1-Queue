"""
Backend API Test Script
Tests all core endpoints to verify backend stability
Run this to get a clear status map of what works and what's broken
"""

import requests
import json
from datetime import date

# Configuration
BASE_URL = "http://localhost:5000"
TIMEOUT = 5

# Test credentials
CREDENTIALS = {
    'patient': {'email': 'patient@example.com', 'password': 'password'},
    'doctor': {'email': 'doctor@example.com', 'password': 'password'},
    'pharmacy': {'email': 'pharmacy@example.com', 'password': 'password'}
}

# Store tokens for authenticated requests
tokens = {}

def print_header(title):
    """Print section header"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def print_result(endpoint, status, message="", data=None):
    """Print test result"""
    status_icon = "✓ PASS" if status == "PASS" else "✗ FAIL" if status == "FAIL" else "⚠ WARN"
    print(f"[{status_icon}] {endpoint}")
    if message:
        print(f"      {message}")
    if data and status == "FAIL":
        print(f"      Response: {data}")

def test_health_check():
    """Test basic health endpoint"""
    print_header("HEALTH CHECK")
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=TIMEOUT)
        if response.status_code == 200:
            print_result("GET /api/health", "PASS", "Backend is running")
            return True
        else:
            print_result("GET /api/health", "FAIL", f"Status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_result("GET /api/health", "FAIL", "Cannot connect - is backend running?")
        return False
    except Exception as e:
        print_result("GET /api/health", "FAIL", str(e))
        return False

def test_login(role):
    """Test login endpoint for specific role"""
    creds = CREDENTIALS[role]
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=creds,
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for token
            if 'access_token' not in data:
                print_result(f"POST /api/auth/login ({role})", "FAIL", "No access_token in response")
                return False
            
            # Check for user data
            if 'user' not in data or 'role' not in data['user']:
                print_result(f"POST /api/auth/login ({role})", "FAIL", "Missing user/role in response")
                return False
            
            # Verify role matches
            if data['user']['role'] != role:
                print_result(f"POST /api/auth/login ({role})", "FAIL", f"Role mismatch: expected {role}, got {data['user']['role']}")
                return False
            
            # Store token for later use
            tokens[role] = data['access_token']
            
            print_result(f"POST /api/auth/login ({role})", "PASS", f"Token received, role verified")
            return True
        else:
            print_result(f"POST /api/auth/login ({role})", "FAIL", f"Status: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_result(f"POST /api/auth/login ({role})", "FAIL", str(e))
        return False

def test_doctors_list():
    """Test doctors listing endpoint"""
    try:
        # Try without auth first
        response = requests.get(f"{BASE_URL}/api/doctors", timeout=TIMEOUT)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if it's a list
            if not isinstance(data, list):
                print_result("GET /api/doctors", "FAIL", "Response is not a list")
                return False
            
            # Check if we have doctors
            if len(data) == 0:
                print_result("GET /api/doctors", "WARN", "No doctors in database")
                return True
            
            # Check structure of first doctor
            doctor = data[0]
            required_fields = ['id', 'name', 'specialization']
            missing = [f for f in required_fields if f not in doctor]
            
            if missing:
                print_result("GET /api/doctors", "FAIL", f"Missing fields: {missing}")
                return False
            
            print_result("GET /api/doctors", "PASS", f"Found {len(data)} doctor(s)")
            return True
        else:
            print_result("GET /api/doctors", "FAIL", f"Status: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_result("GET /api/doctors", "FAIL", str(e))
        return False

def test_appointments_create():
    """Test appointment creation"""
    if 'patient' not in tokens:
        print_result("POST /api/appointments", "FAIL", "No patient token available")
        return False
    
    try:
        # Get a doctor ID first
        doctors_response = requests.get(f"{BASE_URL}/api/doctors", timeout=TIMEOUT)
        if doctors_response.status_code != 200 or not doctors_response.json():
            print_result("POST /api/appointments", "FAIL", "No doctors available to book with")
            return False
        
        doctor_id = doctors_response.json()[0]['id']
        
        # Try to create appointment
        appointment_data = {
            'doctor_id': doctor_id,
            'appointment_date': str(date.today()),
            'reason': 'Test appointment'
        }
        
        headers = {'Authorization': f'Bearer {tokens["patient"]}'}
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            json=appointment_data,
            headers=headers,
            timeout=TIMEOUT
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            
            # Check for appointment data
            if 'queue_token' in data or 'token' in data:
                print_result("POST /api/appointments", "PASS", "Appointment created with token")
                return True
            else:
                print_result("POST /api/appointments", "WARN", "Created but no token in response")
                return True
        else:
            print_result("POST /api/appointments", "FAIL", f"Status: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_result("POST /api/appointments", "FAIL", str(e))
        return False

def test_queue_view():
    """Test queue viewing"""
    if 'doctor' not in tokens:
        print_result("GET /api/queue/<doctor_id>", "FAIL", "No doctor token available")
        return False
    
    try:
        # Get doctor's own ID from token data
        # For now, just test the endpoint exists
        headers = {'Authorization': f'Bearer {tokens["doctor"]}'}
        response = requests.get(
            f"{BASE_URL}/api/queue/1",  # Assuming doctor ID 1
            headers=headers,
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result("GET /api/queue/<doctor_id>", "PASS", "Queue endpoint working")
            return True
        elif response.status_code == 404:
            print_result("GET /api/queue/<doctor_id>", "WARN", "Endpoint not found - needs implementation")
            return False
        else:
            print_result("GET /api/queue/<doctor_id>", "FAIL", f"Status: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_result("GET /api/queue/<doctor_id>", "FAIL", str(e))
        return False

def test_prescriptions():
    """Test prescription endpoints"""
    if 'pharmacy' not in tokens:
        print_result("GET /api/pharmacy/prescriptions", "FAIL", "No pharmacy token available")
        return False
    
    try:
        headers = {'Authorization': f'Bearer {tokens["pharmacy"]}'}
        response = requests.get(
            f"{BASE_URL}/api/pharmacy/prescriptions",
            headers=headers,
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            print_result("GET /api/pharmacy/prescriptions", "PASS", "Prescriptions endpoint working")
            return True
        elif response.status_code == 404:
            print_result("GET /api/pharmacy/prescriptions", "WARN", "Endpoint not found - needs implementation")
            return False
        else:
            print_result("GET /api/pharmacy/prescriptions", "FAIL", f"Status: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_result("GET /api/pharmacy/prescriptions", "FAIL", str(e))
        return False

def run_all_tests():
    """Run all API tests in order"""
    print("\n" + "█" * 70)
    print("  BACKEND API STABILITY TEST")
    print("█" * 70)
    
    results = {}
    
    # Test 1: Health Check
    results['health'] = test_health_check()
    if not results['health']:
        print("\n⚠️  Backend is not running. Start it with: python backend/app.py")
        return results
    
    # Test 2: Authentication
    print_header("AUTHENTICATION")
    results['login_patient'] = test_login('patient')
    results['login_doctor'] = test_login('doctor')
    results['login_pharmacy'] = test_login('pharmacy')
    
    # Test 3: Doctors API
    print_header("DOCTORS API")
    results['doctors'] = test_doctors_list()
    
    # Test 4: Appointments
    print_header("APPOINTMENTS")
    results['appointments'] = test_appointments_create()
    
    # Test 5: Queue
    print_header("QUEUE MANAGEMENT")
    results['queue'] = test_queue_view()
    
    # Test 6: Prescriptions
    print_header("PRESCRIPTIONS")
    results['prescriptions'] = test_prescriptions()
    
    # Summary
    print_header("SUMMARY")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    percentage = int((passed / total) * 100)
    
    print(f"\nBackend Health: {percentage}% ({passed}/{total} tests passed)")
    print("\nStatus Breakdown:")
    print(f"  ✓ Passed: {passed}")
    print(f"  ✗ Failed: {total - passed}")
    
    if percentage == 100:
        print("\n🎉 All tests passed! Backend is stable.")
    elif percentage >= 70:
        print("\n✓ Backend is mostly working. Fix remaining issues.")
    else:
        print("\n⚠️  Backend needs significant work. Focus on failed tests.")
    
    print("\n" + "█" * 70)
    
    return results

if __name__ == "__main__":
    run_all_tests()
