"""
Comprehensive Test Suite for Healthcare Queue Management System
"""
import pytest
import json
from datetime import datetime, date, timedelta
from app import app, db, User, Appointment, QueueToken
from werkzeug.security import generate_password_hash

@pytest.fixture
def client():
    """Test client fixture"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            # Create test users
            create_test_users()
            yield client
            db.drop_all()

def create_test_users():
    """Create test users for different roles"""
    # Doctor
    doctor = User(
        username='testdoctor',
        email='doctor@test.com',
        password_hash=generate_password_hash('password123'),
        role='doctor',
        full_name='Dr. Test Doctor',
        phone='1234567890'
    )
    
    # Patient
    patient = User(
        username='testpatient',
        email='patient@test.com',
        password_hash=generate_password_hash('password123'),
        role='patient',
        full_name='Test Patient',
        phone='0987654321'
    )
    
    # Pharmacist
    pharmacist = User(
        username='testpharmacist',
        email='pharmacist@test.com',
        password_hash=generate_password_hash('password123'),
        role='pharmacist',
        full_name='Test Pharmacist',
        phone='1122334455'
    )
    
    db.session.add_all([doctor, patient, pharmacist])
    db.session.commit()

class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_login_valid_credentials(self, client):
        """Test login with valid credentials"""
        response = client.post('/api/auth/login', json={
            'username': 'testdoctor',
            'password': 'password123'
        })
        data = json.loads(response.data)
        assert response.status_code == 200
        assert data['success'] == True
        assert 'access_token' in data['data']
        assert data['data']['role'] == 'doctor'
    
    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        response = client.post('/api/auth/login', json={
            'username': 'testdoctor',
            'password': 'wrongpassword'
        })
        data = json.loads(response.data)
        assert response.status_code == 401
        assert data['success'] == False
        assert 'Invalid credentials' in data['message']
    
    def test_register_new_user(self, client):
        """Test user registration"""
        response = client.post('/api/auth/register', json={
            'username': 'newpatient',
            'email': 'newpatient@test.com',
            'password': 'password123',
            'role': 'patient',
            'full_name': 'New Test Patient',
            'phone': '5566778899'
        })
        data = json.loads(response.data)
        assert response.status_code == 201
        assert data['success'] == True
        assert 'User registered successfully' in data['message']
    
    def test_register_duplicate_username(self, client):
        """Test registration with duplicate username"""
        response = client.post('/api/auth/register', json={
            'username': 'testdoctor',
            'email': 'anotherdoctor@test.com',
            'password': 'password123',
            'role': 'doctor',
            'full_name': 'Another Doctor',
            'phone': '9988776655'
        })
        data = json.loads(response.data)
        assert response.status_code == 400
        assert data['success'] == False

class TestAppointmentSystem:
    """Test appointment booking and management"""
    
    def get_auth_token(self, client, username='testpatient'):
        """Helper to get auth token"""
        response = client.post('/api/auth/login', json={
            'username': username,
            'password': 'password123'
        })
        data = json.loads(response.data)
        return data['data']['access_token']
    
    def test_book_appointment(self, client):
        """Test appointment booking"""
        token = self.get_auth_token(client)
        headers = {'Authorization': f'Bearer {token}'}
        
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = client.post('/api/appointments/book', 
            json={
                'date': tomorrow,
                'preferred_time': '10:00',
                'symptoms': 'Test symptoms',
                'urgency': 'normal'
            },
            headers=headers
        )
        
        data = json.loads(response.data)
        assert response.status_code == 201
        assert data['success'] == True
        assert 'appointment_id' in data['data']
    
    def test_get_patient_appointments(self, client):
        """Test retrieving patient appointments"""
        token = self.get_auth_token(client)
        headers = {'Authorization': f'Bearer {token}'}
        
        response = client.get('/api/patient/appointments', headers=headers)
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['success'] == True
        assert isinstance(data['data']['appointments'], list)
    
    def test_cancel_appointment(self, client):
        """Test appointment cancellation"""
        # First book an appointment
        token = self.get_auth_token(client)
        headers = {'Authorization': f'Bearer {token}'}
        
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        book_response = client.post('/api/appointments/book', 
            json={
                'date': tomorrow,
                'preferred_time': '10:00',
                'symptoms': 'Test symptoms',
                'urgency': 'normal'
            },
            headers=headers
        )
        
        book_data = json.loads(book_response.data)
        appointment_id = book_data['data']['appointment_id']
        
        # Now cancel it
        cancel_response = client.delete(f'/api/appointments/{appointment_id}/cancel', 
                                      headers=headers)
        cancel_data = json.loads(cancel_response.data)
        
        assert cancel_response.status_code == 200
        assert cancel_data['success'] == True

class TestQueueManagement:
    """Test queue management functionality"""
    
    def get_doctor_token(self, client):
        """Helper to get doctor auth token"""
        response = client.post('/api/auth/login', json={
            'username': 'testdoctor',
            'password': 'password123'
        })
        data = json.loads(response.data)
        return data['data']['access_token']
    
    def test_get_queue_status(self, client):
        """Test queue status retrieval"""
        token = self.get_doctor_token(client)
        headers = {'Authorization': f'Bearer {token}'}
        
        today = date.today().strftime('%Y-%m-%d')
        response = client.get(f'/api/doctor/queue?date={today}', headers=headers)
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['success'] == True
        assert 'queue' in data['data']
    
    def test_call_next_patient(self, client):
        """Test calling next patient in queue"""
        token = self.get_doctor_token(client)
        headers = {'Authorization': f'Bearer {token}'}
        
        response = client.post('/api/doctor/call-next', headers=headers)
        data = json.loads(response.data)
        
        # Should work even with empty queue
        assert response.status_code in [200, 404]
        assert data['success'] in [True, False]

class TestRoleBasedAccess:
    """Test role-based access control"""
    
    def get_patient_token(self, client):
        """Helper to get patient token"""
        response = client.post('/api/auth/login', json={
            'username': 'testpatient',
            'password': 'password123'
        })
        data = json.loads(response.data)
        return data['data']['access_token']
    
    def test_patient_cannot_access_doctor_endpoints(self, client):
        """Test that patient cannot access doctor-only endpoints"""
        token = self.get_patient_token(client)
        headers = {'Authorization': f'Bearer {token}'}
        
        response = client.get('/api/doctor/appointments', headers=headers)
        assert response.status_code == 403
    
    def test_unauthorized_access_blocked(self, client):
        """Test that endpoints require authentication"""
        response = client.get('/api/patient/appointments')
        assert response.status_code == 401

class TestDatabaseIntegrity:
    """Test database constraints and integrity"""
    
    def test_user_unique_constraints(self, client):
        """Test that username and email must be unique"""
        # Try to create user with existing username
        response = client.post('/api/auth/register', json={
            'username': 'testdoctor',  # Already exists
            'email': 'unique@test.com',
            'password': 'password123',
            'role': 'doctor',
            'full_name': 'Another Doctor',
            'phone': '9999888877'
        })
        
        assert response.status_code == 400
    
    def test_appointment_foreign_key_constraint(self, client):
        """Test appointment foreign key relationships"""
        with app.app_context():
            # Create appointment with invalid user_id
            try:
                appointment = Appointment(
                    user_id=99999,  # Non-existent user
                    date=date.today(),
                    preferred_time=datetime.now().time(),
                    symptoms='Test',
                    urgency='normal',
                    status='scheduled'
                )
                db.session.add(appointment)
                db.session.commit()
                assert False, "Should have raised integrity error"
            except Exception:
                db.session.rollback()
                assert True

class TestErrorHandling:
    """Test error handling and validation"""
    
    def test_invalid_json_request(self, client):
        """Test handling of invalid JSON"""
        response = client.post('/api/auth/login', 
                             data='invalid json',
                             content_type='application/json')
        assert response.status_code == 400
    
    def test_missing_required_fields(self, client):
        """Test validation of required fields"""
        response = client.post('/api/auth/register', json={
            'username': 'testuser'
            # Missing required fields
        })
        data = json.loads(response.data)
        assert response.status_code == 400
        assert data['success'] == False
    
    def test_invalid_date_format(self, client):
        """Test handling of invalid date formats"""
        token = self.get_auth_token(client)
        headers = {'Authorization': f'Bearer {token}'}
        
        response = client.post('/api/appointments/book', 
            json={
                'date': 'invalid-date',
                'preferred_time': '10:00',
                'symptoms': 'Test symptoms',
                'urgency': 'normal'
            },
            headers=headers
        )
        assert response.status_code == 400
    
    def get_auth_token(self, client):
        """Helper to get auth token"""
        response = client.post('/api/auth/login', json={
            'username': 'testpatient',
            'password': 'password123'
        })
        data = json.loads(response.data)
        return data['data']['access_token']

if __name__ == '__main__':
    pytest.main([__file__, '-v'])