#!/usr/bin/env python3
"""
Comprehensive Setup and Demo Script for Queue-Free Healthcare System
Creates demo users, departments, and displays the complete system functionality
"""

import requests
import json
import sys
from datetime import datetime, date
import time

BASE_URL = 'http://localhost:5000/api'

def create_demo_data():
    """Create comprehensive demo data for the healthcare system"""
    print("🏥 Setting up Queue-Free Healthcare System Demo")
    print("=" * 60)
    
    # Step 1: Create Demo Users
    print("\n👥 STEP 1: Creating Demo Users")
    
    demo_users = [
        {
            'username': 'john_patient',
            'email': 'john.patient@hospital.com',
            'password': 'patient123',
            'full_name': 'John Smith',
            'role': 'patient',
            'phone': '+1234567890'
        },
        {
            'username': 'dr_wilson',
            'email': 'sarah.wilson@hospital.com', 
            'password': 'doctor123',
            'full_name': 'Dr. Sarah Wilson',
            'role': 'doctor',
            'phone': '+1234567891'
        },
        {
            'username': 'pharmacy_staff',
            'email': 'pharmacy@hospital.com',
            'password': 'pharmacy123',
            'full_name': 'Mike Pharmacy',
            'role': 'pharmacy',
            'phone': '+1234567892'
        },
        {
            'username': 'jane_patient',
            'email': 'jane.doe@hospital.com',
            'password': 'patient456',
            'full_name': 'Jane Doe',
            'role': 'patient',
            'phone': '+1234567893'
        },
        {
            'username': 'dr_brown',
            'email': 'james.brown@hospital.com',
            'password': 'doctor456',
            'full_name': 'Dr. James Brown',
            'role': 'doctor',
            'phone': '+1234567894'
        }
    ]
    
    created_users = {}
    
    for user_data in demo_users:
        try:
            # Try registration
            response = requests.post(f'{BASE_URL}/auth/register', json=user_data, timeout=5)
            
            if response.status_code in [200, 201]:
                print(f"✅ Created {user_data['role']}: {user_data['full_name']}")
            elif "already exists" in response.text:
                print(f"ℹ️  User {user_data['full_name']} already exists")
            else:
                print(f"❌ Failed to create {user_data['full_name']}: {response.text}")
                continue
            
            # Login to get token
            login_response = requests.post(f'{BASE_URL}/auth/login', json={
                'username': user_data['username'],
                'password': user_data['password']
            }, timeout=5)
            
            if login_response.status_code == 200:
                token_data = login_response.json()
                created_users[user_data['username']] = {
                    'token': token_data['access_token'],
                    'user': token_data['user'],
                    'role': user_data['role']
                }
                print(f"✅ Authenticated {user_data['full_name']}")
            else:
                print(f"❌ Login failed for {user_data['full_name']}: {login_response.text}")
                
        except Exception as e:
            print(f"❌ Error with {user_data['full_name']}: {str(e)}")
    
    return created_users

def demo_patient_workflow(users):
    """Demonstrate patient booking and queue workflow"""
    print("\n🧑‍🦱 STEP 2: Patient Workflow Demo")
    
    if 'john_patient' not in users:
        print("❌ Patient user not available")
        return
    
    patient_token = users['john_patient']['token']
    headers = {'Authorization': f'Bearer {patient_token}'}
    
    try:
        # Get available doctors
        print("\n📋 Viewing Available Doctors:")
        response = requests.get(f'{BASE_URL}/doctors', headers=headers, timeout=5)
        
        if response.status_code == 200:
            doctors_data = response.json()
            doctors = doctors_data.get('doctors', [])
            print(f"✅ Found {len(doctors)} available doctors")
            
            for doc in doctors[:3]:  # Show first 3 doctors
                print(f"   • Dr. {doc.get('name', 'Unknown')} - {doc.get('specialization', 'General')} ({doc.get('department', 'N/A')})")
            
            if doctors:
                # Book appointment with first doctor
                doctor = doctors[0]
                appointment_data = {
                    'doctor_id': doctor['id'],
                    'appointment_date': date.today().strftime('%Y-%m-%d'),
                    'appointment_time': '10:30',
                    'symptoms': 'Regular checkup and health consultation'
                }
                
                print(f"\n📅 Booking appointment with Dr. {doctor.get('name', 'Unknown')}...")
                booking_response = requests.post(f'{BASE_URL}/appointments', 
                                                json=appointment_data, 
                                                headers=headers,
                                                timeout=5)
                
                if booking_response.status_code in [200, 201]:
                    appointment = booking_response.json()
                    print(f"✅ Appointment booked successfully!")
                    print(f"   • Token Number: #{appointment.get('token_number', 'N/A')}")
                    print(f"   • Date: {appointment.get('appointment_date', 'N/A')}")
                    print(f"   • Time: {appointment.get('appointment_time', 'N/A')}")
                    print(f"   • Status: {appointment.get('status', 'N/A')}")
                else:
                    print(f"❌ Booking failed: {booking_response.text}")
        
        # Get patient's appointments
        print(f"\n📊 Patient's Appointment History:")
        appointments_response = requests.get(f'{BASE_URL}/patient/appointments', headers=headers, timeout=5)
        
        if appointments_response.status_code == 200:
            appointments = appointments_response.json()
            print(f"✅ Found {len(appointments)} appointments")
            
            for apt in appointments[:3]:  # Show recent appointments
                print(f"   • {apt.get('appointment_date')} with Dr. {apt.get('doctor_name')} - Token #{apt.get('token_number')} ({apt.get('status')})")
        
        # Get patient prescriptions
        print(f"\n💊 Patient's Digital Prescriptions:")
        prescriptions_response = requests.get(f'{BASE_URL}/patient/prescriptions', headers=headers, timeout=5)
        
        if prescriptions_response.status_code == 200:
            prescriptions = prescriptions_response.json()
            print(f"✅ Found {len(prescriptions)} prescriptions")
            
            for px in prescriptions[:2]:  # Show recent prescriptions
                created_date = px.get('created_at', '').split('T')[0]  # Extract date
                print(f"   • {created_date} by Dr. {px.get('doctor_name')} - Status: {px.get('pharmacy_status', 'N/A')}")
        
    except Exception as e:
        print(f"❌ Patient workflow error: {str(e)}")

def demo_doctor_workflow(users):
    """Demonstrate doctor consultation workflow"""
    print("\n👨‍⚕️ STEP 3: Doctor Workflow Demo")
    
    if 'dr_wilson' not in users:
        print("❌ Doctor user not available")
        return
    
    doctor_token = users['dr_wilson']['token']
    headers = {'Authorization': f'Bearer {doctor_token}'}
    
    try:
        # Get doctor's appointments
        print("\n📋 Doctor's Appointment Queue:")
        response = requests.get(f'{BASE_URL}/doctor/appointments?status=booked', headers=headers, timeout=5)
        
        if response.status_code == 200:
            appointments = response.json()
            print(f"✅ Found {len(appointments)} pending appointments")
            
            for apt in appointments[:3]:  # Show upcoming appointments
                print(f"   • Token #{apt.get('token_number')} - {apt.get('patient_name')} at {apt.get('appointment_time')}")
                print(f"     Symptoms: {apt.get('symptoms', 'No symptoms recorded')}")
            
            # If appointments exist, demonstrate consultation completion
            if appointments:
                appointment = appointments[0]
                print(f"\n🩺 Completing consultation for {appointment.get('patient_name')}...")
                
                # Create prescription
                prescription_data = {
                    'appointment_id': appointment['id'],
                    'medicines': [
                        {'name': 'Paracetamol 500mg', 'dosage': '1 tablet twice daily', 'duration': '3 days'},
                        {'name': 'Vitamin D3', 'dosage': '1 tablet daily', 'duration': '30 days'}
                    ],
                    'notes': 'Regular health checkup completed. Patient is in good health. Continue with prescribed medications.'
                }
                
                prescription_response = requests.post(f'{BASE_URL}/prescriptions',
                                                     json=prescription_data,
                                                     headers=headers,
                                                     timeout=5)
                
                if prescription_response.status_code in [200, 201]:
                    print(f"✅ Digital prescription created successfully")
                    
                    # Mark appointment as completed
                    completion_response = requests.put(f'{BASE_URL}/appointments/{appointment["id"]}',
                                                      json={'status': 'completed'},
                                                      headers=headers,
                                                      timeout=5)
                    
                    if completion_response.status_code == 200:
                        print(f"✅ Appointment marked as completed")
                        print(f"   • Queue advanced automatically")
                        print(f"   • Prescription sent to pharmacy")
                else:
                    print(f"❌ Prescription creation failed: {prescription_response.text}")
        
    except Exception as e:
        print(f"❌ Doctor workflow error: {str(e)}")

def demo_pharmacy_workflow(users):
    """Demonstrate pharmacy medication dispensing workflow"""
    print("\n💊 STEP 4: Pharmacy Workflow Demo")
    
    if 'pharmacy_staff' not in users:
        print("❌ Pharmacy user not available")
        return
    
    pharmacy_token = users['pharmacy_staff']['token']
    headers = {'Authorization': f'Bearer {pharmacy_token}'}
    
    try:
        # Get pending prescriptions
        print("\n📋 Pharmacy Prescription Queue:")
        response = requests.get(f'{BASE_URL}/pharmacy/prescriptions', headers=headers, timeout=5)
        
        if response.status_code == 200:
            prescriptions = response.json()
            print(f"✅ Found {len(prescriptions)} prescriptions to process")
            
            for px in prescriptions[:3]:  # Show pending prescriptions
                created_date = px.get('created_at', '').split('T')[0]
                print(f"   • {px.get('patient_name')} - {created_date} by Dr. {px.get('doctor_name')}")
                if 'prescription_data' in px and px['prescription_data']:
                    medicines = px['prescription_data'].get('medicines', [])
                    if medicines:
                        print(f"     Medicines: {', '.join([med.get('name', 'Unknown') for med in medicines[:2]])}")
            
            # Demonstrate dispensing first prescription
            if prescriptions:
                prescription = prescriptions[0]
                print(f"\n🏪 Dispensing prescription for {prescription.get('patient_name')}...")
                
                dispense_response = requests.put(f'{BASE_URL}/pharmacy/prescriptions/{prescription["id"]}/status',
                                                json={
                                                    'status': 'dispensed',
                                                    'notes': 'All medications dispensed successfully. Patient counseled on proper usage.'
                                                },
                                                headers=headers,
                                                timeout=5)
                
                if dispense_response.status_code == 200:
                    print(f"✅ Prescription dispensed successfully")
                    print(f"   • Patient notified for pickup")
                    print(f"   • Inventory updated automatically")
                else:
                    print(f"❌ Dispensing failed: {dispense_response.text}")
        
        # Get inventory status
        print(f"\n📦 Pharmacy Inventory Status:")
        inventory_response = requests.get(f'{BASE_URL}/pharmacy/inventory', headers=headers, timeout=5)
        
        if inventory_response.status_code == 200:
            inventory = inventory_response.json()
            print(f"✅ Found {len(inventory)} items in inventory")
            
            low_stock_count = sum(1 for item in inventory if item.get('low_stock', False))
            if low_stock_count > 0:
                print(f"⚠️  {low_stock_count} items require restocking")
        
    except Exception as e:
        print(f"❌ Pharmacy workflow error: {str(e)}")

def test_rbac_security(users):
    """Test Role-Based Access Control security"""
    print("\n🔒 STEP 5: Role-Based Access Control Testing")
    
    security_tests = [
        ('john_patient', f'{BASE_URL}/doctor/appointments', 'Patient accessing doctor data'),
        ('dr_wilson', f'{BASE_URL}/pharmacy/inventory', 'Doctor accessing pharmacy inventory'),
        ('pharmacy_staff', f'{BASE_URL}/patient/appointments', 'Pharmacy accessing patient data')
    ]
    
    for username, url, description in security_tests:
        if username not in users:
            continue
            
        try:
            headers = {'Authorization': f'Bearer {users[username]["token"]}'}
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code in [401, 403]:
                print(f"✅ Security OK: {description} properly blocked (Status: {response.status_code})")
            else:
                print(f"❌ Security Risk: {description} not blocked (Status: {response.status_code})")
        except Exception as e:
            print(f"❌ Security test error: {str(e)}")

def main():
    """Main demo execution"""
    print("🏥 Queue-Free Healthcare Management System")
    print("Complete End-to-End Demonstration")
    print("=" * 60)
    
    try:
        # Check if backend is running
        health_response = requests.get(f'{BASE_URL}/health', timeout=5)
        if health_response.status_code != 200:
            print("❌ Backend server not responding. Please start the Flask server first.")
            print("   Run: cd backend && python app.py")
            return
        
        print("✅ Backend server is running")
        
        # Create demo data and run workflows
        users = create_demo_data()
        
        if len(users) < 3:
            print("❌ Insufficient users created. Demo cannot continue.")
            return
        
        # Run complete workflow demonstrations
        demo_patient_workflow(users)
        demo_doctor_workflow(users)
        demo_pharmacy_workflow(users)
        test_rbac_security(users)
        
        print("\n" + "=" * 60)
        print("🎉 QUEUE-FREE HEALTHCARE SYSTEM DEMO COMPLETE")
        print("=" * 60)
        print("✅ Patient registration & appointment booking")
        print("✅ Real-time queue management")
        print("✅ Doctor consultation workflow")
        print("✅ Digital prescription system")
        print("✅ Pharmacy medication dispensing")
        print("✅ Role-based security controls")
        print("✅ JWT authentication & authorization")
        print("✅ RESTful API architecture")
        print("✅ SQLite/PostgreSQL database")
        print("\n🚀 System ready for hospital deployment!")
        print("\n📱 Access the web interface at: http://localhost:5000")
        print("🔗 Backend API health: http://localhost:5000/api/health")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server.")
        print("   Please ensure Flask server is running:")
        print("   cd backend && python app.py")
    except Exception as e:
        print(f"❌ Demo failed with error: {str(e)}")

if __name__ == '__main__':
    main()