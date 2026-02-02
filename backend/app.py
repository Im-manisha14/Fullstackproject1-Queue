"""
Queue-Free Healthcare Management System - Enhanced Flask Backend
SQLite + Real-time Queue Management + Digital Prescriptions
Complete system with 15 files limit
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, time, date
from functools import wraps
import os
import json
import random

app = Flask(__name__, static_folder='static')

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///queue_healthcare.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'healthcare-queue-secret-key-2026'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app)

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    role = db.Column(db.String(20), nullable=False)  # patient, doctor, pharmacy, admin
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    patient_appointments = db.relationship('Appointment', foreign_keys='Appointment.patient_id', backref='patient', lazy='dynamic')
    doctor_appointments = db.relationship('Appointment', foreign_keys='Appointment.doctor_id', backref='doctor', lazy='dynamic')

class Department(db.Model):
    __tablename__ = 'departments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    doctors = db.relationship('DoctorProfile', backref='department', lazy='dynamic')
    appointments = db.relationship('Appointment', backref='department', lazy='dynamic')

class DoctorProfile(db.Model):
    __tablename__ = 'doctor_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    specialization = db.Column(db.String(100))
    experience_years = db.Column(db.Integer)
    consultation_fee = db.Column(db.Float, default=0.0)
    available_from = db.Column(db.Time, default=datetime.strptime('09:00', '%H:%M').time())
    available_to = db.Column(db.Time, default=datetime.strptime('17:00', '%H:%M').time())
    max_patients_per_day = db.Column(db.Integer, default=50)
    
    # Relationships
    user = db.relationship('User', backref='doctor_profile')

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time, nullable=False)
    token_number = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='booked')  # booked, in_queue, consulting, completed, cancelled
    priority = db.Column(db.String(10), default='normal')  # normal, emergency
    estimated_duration = db.Column(db.Integer, default=15)  # in minutes
    actual_start_time = db.Column(db.DateTime)
    actual_end_time = db.Column(db.DateTime)
    symptoms = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    prescriptions = db.relationship('Prescription', backref='appointment', lazy='dynamic', cascade='all, delete-orphan')
    queue_entries = db.relationship('QueueEntry', backref='appointment', lazy='dynamic', cascade='all, delete-orphan')

class QueueEntry(db.Model):
    __tablename__ = 'queue_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    queue_position = db.Column(db.Integer, nullable=False)
    estimated_wait_time = db.Column(db.Integer)  # in minutes
    checked_in_at = db.Column(db.DateTime, default=datetime.utcnow)
    called_at = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='waiting')  # waiting, called, consulting, completed

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    prescription_number = db.Column(db.String(20), unique=True, nullable=False)
    diagnosis = db.Column(db.Text)
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')  # pending, dispensed, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    dispensed_at = db.Column(db.DateTime)
    
    # Relationships
    medications = db.relationship('PrescriptionMedication', backref='prescription', lazy='dynamic', cascade='all, delete-orphan')

class Medicine(db.Model):
    __tablename__ = 'medicines'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    generic_name = db.Column(db.String(100))
    manufacturer = db.Column(db.String(100))
    dosage_form = db.Column(db.String(50))  # tablet, syrup, injection
    strength = db.Column(db.String(50))
    price_per_unit = db.Column(db.Float, nullable=False)
    stock_quantity = db.Column(db.Integer, default=0)
    reorder_level = db.Column(db.Integer, default=10)
    expiry_date = db.Column(db.Date)
    batch_number = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PrescriptionMedication(db.Model):
    __tablename__ = 'prescription_medications'
    
    id = db.Column(db.Integer, primary_key=True)
    prescription_id = db.Column(db.Integer, db.ForeignKey('prescriptions.id'), nullable=False)
    medicine_id = db.Column(db.Integer, db.ForeignKey('medicines.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    dosage_instructions = db.Column(db.String(200))
    duration_days = db.Column(db.Integer)
    dispensed_quantity = db.Column(db.Integer, default=0)
    
    # Relationships
    medicine = db.relationship('Medicine', backref='prescription_medications')

# JWT Claims Configuration
@jwt.additional_claims_loader
def add_claims_to_jwt(identity):
    user = User.query.get(identity)
    return {
        'role': user.role,
        'email': user.email,
        'full_name': user.full_name
    }

# Role-based authorization decorators
def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get('role')
            
            if user_role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': f'Access denied. Required roles: {allowed_roles}',
                    'user_role': user_role
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Convenience decorators for specific roles
admin_required = role_required(['admin'])
doctor_required = role_required(['doctor', 'admin'])
patient_required = role_required(['patient', 'admin'])
pharmacy_required = role_required(['pharmacy', 'admin'])

# All API routes continue... (keeping same logic, just formatted properly)
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password required'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        if not user.is_verified and user.role != 'patient':
            return jsonify({
                'success': False, 
                'message': 'Account pending admin verification'
            }), 403
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'full_name': user.full_name,
                'email': user.email,
                'role': user.role,
                'phone': user.phone
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/')
def index():
    return '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Queue-Free Healthcare System</title>
        <link rel="stylesheet" href="/static/style.css">
        <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    </head>
    <body>
        <div id="root"></div>
        <script type="text/babel" src="/static/app.js"></script>
    </body>
    </html>
    '''

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

def patient_required(f):
    """Decorator for patient-only routes"""
    return role_required(['patient'])(f)

def doctor_required(f):
    """Decorator for doctor-only routes"""
    return role_required(['doctor'])(f)

def pharmacy_required(f):
    """Decorator for pharmacy-only routes"""
    return role_required(['pharmacy'])(f)

def healthcare_staff_required(f):
    """Decorator for doctor, pharmacy, and admin roles"""
    return role_required(['doctor', 'pharmacy', 'admin'])(f)

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)  # Admin verification for doctors/pharmacy
    verification_token = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    def set_verification_status(self):
        """Auto-verify patients, require admin verification for doctors/pharmacy"""
        if self.role == 'patient':
            self.is_verified = True
        else:
            self.is_verified = False

class Department(db.Model):
    __tablename__ = 'departments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)

class Doctor(db.Model):
    __tablename__ = 'doctors'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'))
    specialization = db.Column(db.String(255))
    license_number = db.Column(db.String(50), unique=True)
    consultation_fee = db.Column(db.Numeric(10,2))
    availability_start = db.Column(db.Time)
    availability_end = db.Column(db.Time)
    max_patients_per_day = db.Column(db.Integer, default=20)
    
    user = db.relationship('User', backref='doctor_profile')
    department = db.relationship('Department', backref='doctors')

class Patient(db.Model):
    __tablename__ = 'patients'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(10))
    address = db.Column(db.Text)
    emergency_contact = db.Column(db.String(20))
    medical_history = db.Column(db.Text)
    
    user = db.relationship('User', backref='patient_profile')

class Appointment(db.Model):
    __tablename__ = 'appointments'
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'))
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'))
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time, nullable=False)
    token_number = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='scheduled')
    estimated_duration = db.Column(db.Integer, default=15)
    symptoms = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    patient = db.relationship('Patient', backref='appointments')
    doctor = db.relationship('Doctor', backref='appointments')

class QueueStatus(db.Model):
    __tablename__ = 'queue_status'
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'))
    current_token = db.Column(db.Integer, nullable=False)
    estimated_wait_time = db.Column(db.Integer)
    queue_position = db.Column(db.Integer)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    appointment = db.relationship('Appointment', backref='queue_status')

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'))
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'))
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'))
    prescription_data = db.Column(db.JSON, nullable=False)
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    appointment = db.relationship('Appointment', backref='prescription')
    doctor = db.relationship('Doctor', backref='prescriptions')
    patient = db.relationship('Patient', backref='prescriptions')

class PharmacyInventory(db.Model):
    __tablename__ = 'pharmacy_inventory'
    id = db.Column(db.Integer, primary_key=True)
    medicine_name = db.Column(db.String(255), nullable=False)
    generic_name = db.Column(db.String(255))
    manufacturer = db.Column(db.String(255))
    batch_number = db.Column(db.String(100))
    expiry_date = db.Column(db.Date)
    quantity_in_stock = db.Column(db.Integer, default=0)
    unit_price = db.Column(db.Numeric(10,2))
    minimum_stock_alert = db.Column(db.Integer, default=10)

# Authentication Routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    """Unified secure login with role-based JWT tokens"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user and verify credentials
        user = User.query.filter_by(email=email, is_active=True).first()
        
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check if user is verified (doctors and pharmacy need admin approval)
        if not user.is_verified:
            if user.role in ['doctor', 'pharmacy']:
                return jsonify({
                    'error': 'Account pending verification',
                    'message': 'Your account is awaiting admin approval. Please contact administration.'
                }), 403
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create JWT token with role information
        access_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(hours=8)  # Reduced for security
        )
        
        # Prepare secure user data
        user_data = {
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'full_name': user.full_name,
            'is_verified': user.is_verified,
            'last_login': user.last_login.isoformat() if user.last_login else None
        }
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': user_data,
            'expires_in': 28800  # 8 hours in seconds
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Authentication failed', 'details': str(e)}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Secure registration with role-based verification requirements"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'role', 'full_name']
        for field in required_fields:
            if not data.get(field, '').strip():
                return jsonify({'error': f'{field} is required'}), 400
        
        email = data['email'].strip().lower()
        role = data['role'].lower()
        
        # Validate role
        allowed_roles = ['patient', 'doctor', 'pharmacy']
        if role not in allowed_roles:
            return jsonify({'error': 'Invalid role specified'}), 400
        
        # Check if email already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        # Password strength validation
        password = data['password']
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters long'}), 400
        
        # Create user account
        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            role=role,
            full_name=data['full_name'].strip(),
            phone=data.get('phone', '').strip()
        )
        
        # Set verification status based on role
        user.set_verification_status()
        
        db.session.add(user)
        db.session.flush()  # Get user ID
        
        # Create role-specific profile
        if role == 'patient':
            patient = Patient(
                user_id=user.id,
                date_of_birth=datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date() if data.get('date_of_birth') else None,
                gender=data.get('gender', '').strip(),
                address=data.get('address', '').strip(),
                emergency_contact=data.get('emergency_contact', '').strip()
            )
            db.session.add(patient)
            
        elif role == 'doctor':
            # Doctors need admin verification
            doctor = Doctor(
                user_id=user.id,
                department_id=data.get('department_id'),
                specialization=data.get('specialization', '').strip(),
                license_number=data.get('license_number', '').strip(),
                consultation_fee=data.get('consultation_fee', 0),
                availability_start=datetime.strptime(data.get('availability_start', '09:00'), '%H:%M').time(),
                availability_end=datetime.strptime(data.get('availability_end', '17:00'), '%H:%M').time(),
                max_patients_per_day=data.get('max_patients_per_day', 20)
            )
            db.session.add(doctor)
        
        db.session.commit()
        
        # Return appropriate message based on role
        if role == 'patient':
            message = 'Registration successful. You can now login.'
        else:
            message = 'Registration submitted. Your account will be activated after admin verification.'
        
        return jsonify({
            'message': message,
            'user_id': user.id,
            'requires_verification': not user.is_verified
        }), 201
        
    except ValueError as e:
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed', 'details': str(e)}), 500

@app.route('/api/auth/verify-token', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify JWT token and return user info"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        user = User.query.get(current_user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'Invalid user'}), 401
        
        return jsonify({
            'valid': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'full_name': user.full_name,
                'is_verified': user.is_verified
            },
            'claims': claims
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Token verification failed'}), 401

@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout endpoint (client handles token removal)"""
    return jsonify({'message': 'Logged out successfully'}), 200

# Admin Routes for User Management
@app.route('/api/admin/pending-users', methods=['GET'])
@admin_required
def get_pending_users():
    """Get all users pending verification"""
    try:
        pending_users = User.query.filter_by(is_verified=False, is_active=True).all()
        
        result = []
        for user in pending_users:
            user_data = {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'phone': user.phone,
                'created_at': user.created_at.isoformat()
            }
            
            # Add role-specific data
            if user.role == 'doctor':
                doctor = Doctor.query.filter_by(user_id=user.id).first()
                if doctor:
                    user_data.update({
                        'specialization': doctor.specialization,
                        'license_number': doctor.license_number,
                        'department_id': doctor.department_id
                    })
                    
            result.append(user_data)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/verify-user/<int:user_id>', methods=['POST'])
@admin_required
def verify_user(user_id):
    """Verify a pending user account"""
    try:
        data = request.get_json()
        approve = data.get('approve', False)
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if approve:
            user.is_verified = True
            user.is_active = True
            message = f'User {user.full_name} has been verified and activated'
        else:
            user.is_active = False
            message = f'User {user.full_name} has been rejected'
        
        db.session.commit()
        
        return jsonify({
            'message': message,
            'user_id': user.id,
            'verified': user.is_verified,
            'active': user.is_active
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    """Get all users with filtering"""
    try:
        role = request.args.get('role')
        status = request.args.get('status')  # active, inactive, verified, unverified
        
        query = User.query
        
        if role:
            query = query.filter(User.role == role)
        
        if status == 'active':
            query = query.filter(User.is_active == True)
        elif status == 'inactive':
            query = query.filter(User.is_active == False)
        elif status == 'verified':
            query = query.filter(User.is_verified == True)
        elif status == 'unverified':
            query = query.filter(User.is_verified == False)
        
        users = query.order_by(User.created_at.desc()).all()
        
        result = []
        for user in users:
            result.append({
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'is_active': user.is_active,
                'is_verified': user.is_verified,
                'created_at': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Department Routes
@app.route('/api/departments', methods=['GET'])
@jwt_required()
def get_departments():
    try:
        departments = Department.query.filter_by(is_active=True).all()
        return jsonify([{
            'id': dept.id,
            'name': dept.name,
            'description': dept.description
        } for dept in departments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Doctor Routes - Secured with Role-Based Access Control
@app.route('/api/doctors', methods=['GET'])
@role_required(['patient', 'admin'])  # Only patients can see doctors for appointments, admins can see all
def get_doctors():
    try:
        department_id = request.args.get('department_id')
        
        # Only return verified and active doctors
        query = db.session.query(Doctor, User, Department)\
            .join(User).join(Department)\
            .filter(User.is_verified == True, User.is_active == True)
        
        if department_id:
            query = query.filter(Doctor.department_id == department_id)
        
        doctors = query.all()
        
        return jsonify([{
            'id': doctor.id,
            'name': user.full_name,
            'specialization': doctor.specialization,
            'department': department.name,
            'consultation_fee': float(doctor.consultation_fee) if doctor.consultation_fee else 0,
            'availability_start': doctor.availability_start.strftime('%H:%M') if doctor.availability_start else '09:00',
            'availability_end': doctor.availability_end.strftime('%H:%M') if doctor.availability_end else '17:00'
        } for doctor, user, department in doctors]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/doctor/profile', methods=['GET'])
@doctor_required
def get_doctor_profile():
    """Get current doctor's profile information"""
    try:
        current_user_id = get_jwt_identity()
        
        doctor_query = db.session.query(Doctor, User, Department)\
            .join(User).outerjoin(Department)\
            .filter(Doctor.user_id == current_user_id).first()
        
        if not doctor_query:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        doctor, user, department = doctor_query
        
        profile = {
            'id': doctor.id,
            'user_id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'phone': user.phone,
            'specialization': doctor.specialization,
            'license_number': doctor.license_number,
            'department': department.name if department else None,
            'consultation_fee': float(doctor.consultation_fee) if doctor.consultation_fee else 0,
            'availability_start': doctor.availability_start.strftime('%H:%M') if doctor.availability_start else '09:00',
            'availability_end': doctor.availability_end.strftime('%H:%M') if doctor.availability_end else '17:00',
            'max_patients_per_day': doctor.max_patients_per_day
        }
        
        return jsonify(profile), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/doctor/appointments', methods=['GET'])
@doctor_required
def get_doctor_appointments():
    """Get appointments for current doctor only"""
    try:
        current_user_id = get_jwt_identity()
        doctor = Doctor.query.filter_by(user_id=current_user_id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        date = request.args.get('date')
        status = request.args.get('status')
        
        query = db.session.query(Appointment, Patient, User)\
            .join(Patient).join(User)\
            .filter(Appointment.doctor_id == doctor.id)
        
        if date:
            query = query.filter(Appointment.appointment_date == date)
        if status:
            query = query.filter(Appointment.status == status)
        
        appointments = query.order_by(Appointment.appointment_date, Appointment.appointment_time).all()
        
        result = []
        for appointment, patient, user in appointments:
            result.append({
                'id': appointment.id,
                'patient_name': user.full_name,
                'patient_phone': user.phone,
                'appointment_date': appointment.appointment_date.isoformat(),
                'appointment_time': appointment.appointment_time.strftime('%H:%M'),
                'token_number': appointment.token_number,
                'status': appointment.status,
                'symptoms': appointment.symptoms,
                'estimated_duration': appointment.estimated_duration
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Patient Routes - Secured Access Control
@app.route('/api/patient/profile', methods=['GET'])
@patient_required
def get_patient_profile():
    """Get current patient's profile information"""
    try:
        current_user_id = get_jwt_identity()
        
        patient_query = db.session.query(Patient, User)\
            .join(User)\
            .filter(Patient.user_id == current_user_id).first()
        
        if not patient_query:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        patient, user = patient_query
        
        profile = {
            'id': patient.id,
            'user_id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'phone': user.phone,
            'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            'gender': patient.gender,
            'address': patient.address,
            'emergency_contact': patient.emergency_contact,
            'medical_history': patient.medical_history
        }
        
        return jsonify(profile), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/patient/appointments', methods=['GET'])
@patient_required
def get_patient_appointments():
    """Get appointments for current patient only"""
    try:
        current_user_id = get_jwt_identity()
        patient = Patient.query.filter_by(user_id=current_user_id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        appointments = db.session.query(Appointment, Doctor, User, Department)\
            .join(Doctor).join(User, User.id == Doctor.user_id)\
            .outerjoin(Department, Department.id == Doctor.department_id)\
            .filter(Appointment.patient_id == patient.id)\
            .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())\
            .all()
        
        result = []
        for appointment, doctor, doctor_user, department in appointments:
            result.append({
                'id': appointment.id,
                'doctor_name': doctor_user.full_name,
                'department': department.name if department else 'General',
                'specialization': doctor.specialization,
                'appointment_date': appointment.appointment_date.isoformat(),
                'appointment_time': appointment.appointment_time.strftime('%H:%M'),
                'token_number': appointment.token_number,
                'status': appointment.status,
                'symptoms': appointment.symptoms,
                'estimated_duration': appointment.estimated_duration
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Appointment Routes - Role-Based Access Control
@app.route('/api/appointments', methods=['POST'])
@patient_required
def book_appointment():
    """Book appointment - patients only"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Get patient profile
        patient = Patient.query.filter_by(user_id=current_user_id).first()
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        required_fields = ['doctor_id', 'appointment_date', 'appointment_time']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Verify doctor exists and is active
        doctor = Doctor.query.get(data['doctor_id'])
        if not doctor or not doctor.user.is_active or not doctor.user.is_verified:
            return jsonify({'error': 'Doctor not available'}), 400
        
        # Parse appointment date and time
        appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        appointment_time = datetime.strptime(data['appointment_time'], '%H:%M').time()
        
        # Check if appointment date is in the future
        if appointment_date < datetime.now().date():
            return jsonify({'error': 'Cannot book appointments for past dates'}), 400
        
        # Generate token number for the day
        daily_appointments = Appointment.query.filter_by(
            doctor_id=doctor.id,
            appointment_date=appointment_date
        ).count()
        
        if daily_appointments >= doctor.max_patients_per_day:
            return jsonify({'error': 'Doctor fully booked for this date'}), 400
        
        token_number = daily_appointments + 1
        
        # Create appointment
        appointment = Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            token_number=token_number,
            symptoms=data.get('symptoms', ''),
            estimated_duration=data.get('estimated_duration', 15)
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment booked successfully',
            'appointment_id': appointment.id,
            'token_number': token_number,
            'appointment_date': appointment_date.isoformat(),
            'appointment_time': appointment_time.strftime('%H:%M')
        }), 201
        
    except ValueError as e:
        return jsonify({'error': f'Invalid date/time format: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/appointments/<int:appointment_id>', methods=['PUT'])
@role_required(['patient', 'doctor'])
def update_appointment(appointment_id):
    """Update appointment - patients can cancel, doctors can update status"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        data = request.get_json()
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Role-based access control
        if user_role == 'patient':
            # Patients can only update their own appointments
            patient = Patient.query.filter_by(user_id=current_user_id).first()
            if not patient or appointment.patient_id != patient.id:
                return jsonify({'error': 'Access denied'}), 403
            
            # Patients can only cancel appointments
            allowed_updates = ['status']
            if 'status' in data and data['status'] not in ['cancelled']:
                return jsonify({'error': 'Patients can only cancel appointments'}), 403
                
        elif user_role == 'doctor':
            # Doctors can only update appointments assigned to them
            doctor = Doctor.query.filter_by(user_id=current_user_id).first()
            if not doctor or appointment.doctor_id != doctor.id:
                return jsonify({'error': 'Access denied'}), 403
            
            # Doctors can update status and add notes
            allowed_updates = ['status', 'notes']
        
        # Apply allowed updates
        for field in data:
            if field in allowed_updates:
                if field == 'status':
                    valid_statuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']
                    if data[field] in valid_statuses:
                        appointment.status = data[field]
                        appointment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment updated successfully',
            'appointment_id': appointment.id,
            'status': appointment.status
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
        patient = Patient.query.filter_by(user_id=current_user_id).first()
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        # Check for existing appointment on same date
        existing = Appointment.query.filter_by(
            patient_id=patient.id,
            doctor_id=data['doctor_id'],
            appointment_date=datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        ).first()
        
        if existing:
            return jsonify({'error': 'Appointment already exists for this date'}), 400
        
        # Generate token number
        date_appointments = Appointment.query.filter_by(
            doctor_id=data['doctor_id'],
            appointment_date=datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        ).count()
        
        token_number = date_appointments + 1
        
        appointment = Appointment(
            patient_id=patient.id,
            doctor_id=data['doctor_id'],
            appointment_date=datetime.strptime(data['appointment_date'], '%Y-%m-%d').date(),
            appointment_time=datetime.strptime(data['appointment_time'], '%H:%M').time(),
            token_number=token_number,
            symptoms=data.get('symptoms', '')
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        # Create queue status
        queue = QueueStatus(
            appointment_id=appointment.id,
            current_token=1,
            estimated_wait_time=(token_number - 1) * 15,
            queue_position=token_number
        )
        db.session.add(queue)
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment booked successfully',
            'appointment_id': appointment.id,
            'token_number': token_number
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/appointments/my', methods=['GET'])
@jwt_required()
def get_my_appointments():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role == 'patient':
            patient = Patient.query.filter_by(user_id=current_user_id).first()
            appointments = db.session.query(Appointment, Doctor, User, Department, QueueStatus)\
                .join(Doctor)\
                .join(User, User.id == Doctor.user_id)\
                .join(Department)\
                .outerjoin(QueueStatus)\
                .filter(Appointment.patient_id == patient.id)\
                .order_by(Appointment.appointment_date.desc())\
                .all()
                
        elif user.role == 'doctor':
            doctor = Doctor.query.filter_by(user_id=current_user_id).first()
            appointments = db.session.query(Appointment, Patient, User, QueueStatus)\
                .join(Patient)\
                .join(User, User.id == Patient.user_id)\
                .outerjoin(QueueStatus)\
                .filter(Appointment.doctor_id == doctor.id)\
                .filter(Appointment.appointment_date == datetime.now().date())\
                .order_by(Appointment.token_number)\
                .all()
        
        result = []
        for row in appointments:
            appointment = row[0]
            queue = row[-1] if len(row) > 3 else None
            
            appointment_data = {
                'id': appointment.id,
                'appointment_date': appointment.appointment_date.strftime('%Y-%m-%d'),
                'appointment_time': appointment.appointment_time.strftime('%H:%M'),
                'token_number': appointment.token_number,
                'status': appointment.status,
                'symptoms': appointment.symptoms
            }
            
            if user.role == 'patient':
                appointment_data.update({
                    'doctor_name': row[2].full_name,
                    'department': row[3].name,
                    'estimated_wait_time': queue.estimated_wait_time if queue else None,
                    'queue_position': queue.queue_position if queue else None
                })
            else:
                appointment_data.update({
                    'patient_name': row[2].full_name,
                    'patient_phone': row[2].phone
                })
            
            result.append(appointment_data)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Queue Management Routes
@app.route('/api/queue/update', methods=['POST'])
@jwt_required()
def update_queue():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        user = User.query.get(current_user_id)
        if user.role != 'doctor':
            return jsonify({'error': 'Unauthorized'}), 403
        
        appointment = Appointment.query.get(data['appointment_id'])
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        appointment.status = data['status']
        appointment.updated_at = datetime.utcnow()
        
        if data['status'] == 'completed':
            # Update current token for the doctor's queue
            doctor = Doctor.query.filter_by(user_id=current_user_id).first()
            next_appointment = Appointment.query.filter_by(
                doctor_id=doctor.id,
                appointment_date=datetime.now().date(),
                status='waiting'
            ).order_by(Appointment.token_number).first()
            
            if next_appointment:
                queue = QueueStatus.query.filter_by(appointment_id=next_appointment.id).first()
                if queue:
                    queue.current_token = next_appointment.token_number
                    queue.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify({'message': 'Queue updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Prescription Routes - Role-Based Access Control
@app.route('/api/prescriptions', methods=['POST'])
@doctor_required
def create_prescription():
    """Create prescription - doctors only"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        doctor = Doctor.query.filter_by(user_id=current_user_id).first()
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        required_fields = ['appointment_id', 'medicines']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        appointment = Appointment.query.get(data['appointment_id'])
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Verify doctor owns this appointment
        if appointment.doctor_id != doctor.id:
            return jsonify({'error': 'Access denied - not your appointment'}), 403
        
        # Check if prescription already exists
        existing_prescription = Prescription.query.filter_by(appointment_id=appointment.id).first()
        if existing_prescription:
            return jsonify({'error': 'Prescription already exists for this appointment'}), 400
        
        prescription = Prescription(
            appointment_id=appointment.id,
            doctor_id=doctor.id,
            patient_id=appointment.patient_id,
            prescription_data=data['medicines'],
            notes=data.get('notes', ''),
            status='sent_to_pharmacy'
        )
        
        db.session.add(prescription)
        db.session.commit()
        
        return jsonify({
            'message': 'Prescription created successfully',
            'prescription_id': prescription.id
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/doctor/prescriptions', methods=['GET'])
@doctor_required
def get_doctor_prescriptions():
    """Get prescriptions created by current doctor"""
    try:
        current_user_id = get_jwt_identity()
        doctor = Doctor.query.filter_by(user_id=current_user_id).first()
        
        if not doctor:
            return jsonify({'error': 'Doctor profile not found'}), 404
        
        prescriptions = db.session.query(Prescription, Patient, User)\
            .join(Patient)\
            .join(User, User.id == Patient.user_id)\
            .filter(Prescription.doctor_id == doctor.id)\
            .order_by(Prescription.created_at.desc())\
            .all()
        
        result = []
        for prescription, patient, patient_user in prescriptions:
            result.append({
                'id': prescription.id,
                'patient_name': patient_user.full_name,
                'medicines': prescription.prescription_data,
                'notes': prescription.notes,
                'status': prescription.status,
                'created_at': prescription.created_at.strftime('%Y-%m-%d %H:%M')
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/patient/prescriptions', methods=['GET'])
@patient_required
def get_patient_prescriptions():
    """Get prescriptions for current patient"""
    try:
        current_user_id = get_jwt_identity()
        patient = Patient.query.filter_by(user_id=current_user_id).first()
        
        if not patient:
            return jsonify({'error': 'Patient profile not found'}), 404
        
        prescriptions = db.session.query(Prescription, Doctor, User)\
            .join(Doctor)\
            .join(User, User.id == Doctor.user_id)\
            .filter(Prescription.patient_id == patient.id)\
            .order_by(Prescription.created_at.desc())\
            .all()
        
        result = []
        for prescription, doctor, doctor_user in prescriptions:
            result.append({
                'id': prescription.id,
                'doctor_name': doctor_user.full_name,
                'medicines': prescription.prescription_data,
                'notes': prescription.notes,
                'status': prescription.status,
                'created_at': prescription.created_at.strftime('%Y-%m-%d %H:%M')
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Pharmacy Routes - Role-Based Access Control
@app.route('/api/pharmacy/prescriptions', methods=['GET'])
@pharmacy_required
def get_pharmacy_prescriptions():
    """Get prescriptions for pharmacy fulfillment - pharmacy users only"""
    try:
        status = request.args.get('status', 'sent_to_pharmacy')
        
        prescriptions = db.session.query(Prescription, Patient, User, Doctor, User.alias('doctor_user'))\
            .join(Patient)\
            .join(User, User.id == Patient.user_id)\
            .join(Doctor)\
            .join(User.alias('doctor_user'), User.alias('doctor_user').id == Doctor.user_id)\
            .filter(Prescription.status.in_(['sent_to_pharmacy', 'processing', 'ready_for_pickup']))\
            .order_by(Prescription.created_at.desc())\
            .all()
        
        result = []
        for prescription, patient, patient_user, doctor, doctor_user in prescriptions:
            result.append({
                'id': prescription.id,
                'patient_name': patient_user.full_name,
                'patient_phone': patient_user.phone,
                'doctor_name': doctor_user.full_name,
                'medicines': prescription.prescription_data,
                'notes': prescription.notes,
                'status': prescription.status,
                'created_at': prescription.created_at.strftime('%Y-%m-%d %H:%M')
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pharmacy/prescriptions/<int:prescription_id>/status', methods=['PUT'])
@pharmacy_required
def update_prescription_status(prescription_id):
    """Update prescription status - pharmacy users only"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        valid_statuses = ['processing', 'ready_for_pickup', 'dispensed', 'cancelled']
        if new_status not in valid_statuses:
            return jsonify({'error': 'Invalid status'}), 400
        
        prescription = Prescription.query.get(prescription_id)
        if not prescription:
            return jsonify({'error': 'Prescription not found'}), 404
        
        prescription.status = new_status
        db.session.commit()
        
        return jsonify({
            'message': 'Prescription status updated successfully',
            'prescription_id': prescription.id,
            'status': prescription.status
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pharmacy/inventory', methods=['GET'])
@pharmacy_required
def get_inventory():
    """Get pharmacy inventory - pharmacy users only"""
    try:
        inventory = PharmacyInventory.query.all()
        return jsonify([{
            'id': item.id,
            'medicine_name': item.medicine_name,
            'generic_name': item.generic_name,
            'manufacturer': item.manufacturer,
            'quantity_in_stock': item.quantity_in_stock,
            'unit_price': float(item.unit_price) if item.unit_price else 0,
            'minimum_stock_alert': item.minimum_stock_alert,
            'low_stock': item.quantity_in_stock <= item.minimum_stock_alert
        } for item in inventory]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pharmacy/inventory', methods=['POST'])
@pharmacy_required
def add_inventory_item():
    """Add inventory item - pharmacy users only"""
    try:
        data = request.get_json()
        
        required_fields = ['medicine_name', 'quantity_in_stock', 'unit_price']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        item = PharmacyInventory(
            medicine_name=data['medicine_name'],
            generic_name=data.get('generic_name', ''),
            manufacturer=data.get('manufacturer', ''),
            batch_number=data.get('batch_number', ''),
            expiry_date=datetime.strptime(data['expiry_date'], '%Y-%m-%d').date() if data.get('expiry_date') else None,
            quantity_in_stock=data['quantity_in_stock'],
            unit_price=data['unit_price'],
            minimum_stock_alert=data.get('minimum_stock_alert', 10)
        )
        
        db.session.add(item)
        db.session.commit()
        
        return jsonify({
            'message': 'Inventory item added successfully',
            'item_id': item.id
        }), 201
        
    except ValueError as e:
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)