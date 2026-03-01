"""
Queue-Free Healthcare Management System - Complete Flask Backend
PostgreSQL + Real-time Queue Management + Role-based Authentication
"""

from flask import Flask, request, jsonify
from sqlalchemy import text, func
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_cors import CORS

from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, time, date, timezone
from functools import wraps
from dotenv import load_dotenv
import os
import re
import json
import random
import uuid
import re
import html
import logging
import threading
from logging.handlers import RotatingFileHandler

# Try to import psutil, provide fallback if not available
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("Warning: psutil not available, system metrics disabled")

# Try to import email_validator, provide fallback if not available
try:
    from email_validator import validate_email, EmailNotValidError
    EMAIL_VALIDATOR_AVAILABLE = True
except ImportError:
    EMAIL_VALIDATOR_AVAILABLE = False
    print("Warning: email_validator not available, using basic email validation")

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Database Configuration - Using environment variables
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required!")

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': int(os.getenv('DB_POOL_RECYCLE', 3600)),
    'pool_size': int(os.getenv('DB_POOL_SIZE', 10)),
    'pool_timeout': int(os.getenv('DB_POOL_TIMEOUT', 20)),
}

# JWT Configuration - Using environment variables
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
if not JWT_SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is required!")

app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

# Flask Secret Key
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required!")
app.config['SECRET_KEY'] = SECRET_KEY

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)

# CORS Configuration - allow any localhost port for local development
# Generates a list covering ports 3000-3099 so Vite can rotate freely
_env_origins = [o.strip() for o in os.getenv('ALLOWED_ORIGINS', '').split(',') if o.strip()]
_localhost_ports = [f'http://localhost:{p}' for p in range(3000, 3100)] + \
                   [f'http://127.0.0.1:{p}' for p in range(3000, 3100)]
_all_origins = list(set(_env_origins + _localhost_ports))
CORS(app, resources={r"/*": {"origins": _all_origins}}, supports_credentials=False)

# No SocketIO or rate limiter - pure REST API

# Global tracking for failed login attempts (use Redis in production)
failed_login_attempts = {}
LOCKOUT_THRESHOLD = 10
LOCKOUT_DURATION = 15 * 60  # 15 minutes in seconds
RATE_LIMIT_WINDOW = 60  # 1 minute window
MAX_ATTEMPTS_PER_WINDOW = 10

# Rate limiting tracker (use Redis in production)
rate_limit_tracker = {}

# Pharmacy queue for real-time updates (use Redis in production)
prescription_queue = []

def is_rate_limited(client_ip):
    """Check if client IP is rate limited"""
    current_time = datetime.now(timezone.utc).timestamp()
    
    if client_ip not in rate_limit_tracker:
        rate_limit_tracker[client_ip] = []
    
    # Remove old attempts outside the window
    rate_limit_tracker[client_ip] = [
        attempt_time for attempt_time in rate_limit_tracker[client_ip]
        if current_time - attempt_time < RATE_LIMIT_WINDOW
    ]
    
    # Check if too many attempts
    if len(rate_limit_tracker[client_ip]) >= MAX_ATTEMPTS_PER_WINDOW:
        return True
        
    # Record this attempt
    rate_limit_tracker[client_ip].append(current_time)
    return False

def is_account_locked(identifier):
    """Check if account is temporarily locked due to failed attempts"""
    if identifier not in failed_login_attempts:
        return False
        
    attempts_data = failed_login_attempts[identifier]
    current_time = datetime.now(timezone.utc).timestamp()
    
    # Check if lockout period has expired
    if current_time - attempts_data['last_attempt'] > LOCKOUT_DURATION:
        del failed_login_attempts[identifier]
        return False
    
    return attempts_data['count'] >= LOCKOUT_THRESHOLD

def record_failed_attempt(identifier):
    """Record a failed login attempt"""
    current_time = datetime.now(timezone.utc).timestamp()
    
    if identifier not in failed_login_attempts:
        failed_login_attempts[identifier] = {'count': 0, 'last_attempt': 0}
    
    # Reset counter if last attempt was more than lockout duration ago
    if current_time - failed_login_attempts[identifier]['last_attempt'] > LOCKOUT_DURATION:
        failed_login_attempts[identifier]['count'] = 0
    
    failed_login_attempts[identifier]['count'] += 1
    failed_login_attempts[identifier]['last_attempt'] = current_time

def clear_failed_attempts(identifier):
    """Clear failed attempts for successful login"""
    if identifier in failed_login_attempts:
        del failed_login_attempts[identifier]

# =======================
# SECURITY CONFIGURATION
# =======================

# Security headers middleware
@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    
    # Remove server information
    response.headers.pop('Server', None)
    
    return response

# Input validation helpers
def validate_password(password):
    """
    Validate password strength with comprehensive security checks
    Requirements: 12+ chars, uppercase, lowercase, number, special char, no common patterns
    """
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    
    if len(password) > 128:
        return False, "Password must be less than 128 characters"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    
    # Enhanced special character check
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\[\]\-_+=~`]", password):
        return False, "Password must contain at least one special character"
    
    # Check for common weak patterns
    weak_patterns = [
        r'(.)\1{3,}',  # 4 or more repeated characters
        r'123456|654321|abcdef|qwerty|password|admin',  # Common sequences
        r'^(\w)\1+$',  # All same character
    ]
    
    for pattern in weak_patterns:
        if re.search(pattern, password.lower()):
            return False, "Password contains common weak patterns"
    
    # Check for keyboard patterns
    keyboard_patterns = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890']
    for pattern in keyboard_patterns:
        if pattern in password.lower() or pattern[::-1] in password.lower():
            return False, "Password contains keyboard patterns"
    
    return True, "Password is strong"

def validate_phone(phone):
    """Validate phone number format"""
    if not phone:
        return True, "Phone is optional"
    
    # Basic phone validation (can be enhanced)
    phone_pattern = re.compile(r'^\+?1?\d{9,15}$')
    if not phone_pattern.match(phone.replace(' ', '').replace('-', '')):
        return False, "Invalid phone number format"
    
    return True, "Phone is valid"

def validate_user_input(data, required_fields=None):
    """
    Validate user input data
    """
    errors = {}
    
    if required_fields:
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                errors[field] = f"{field} is required"
    
    # Validate email
    if 'email' in data:
        email = data['email'].strip()
        if EMAIL_VALIDATOR_AVAILABLE:
            try:
                validate_email(email)
            except EmailNotValidError:
                errors['email'] = "Invalid email format"
        else:
            # Fallback email validation using regex
            email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
            if not email_pattern.match(email):
                errors['email'] = "Invalid email format"
    
    # Validate password
    if 'password' in data:
        is_valid, message = validate_password(data['password'])
        if not is_valid:
            errors['password'] = message
    
    # Validate phone
    if 'phone' in data:
        is_valid, message = validate_phone(data['phone'])
        if not is_valid:
            errors['phone'] = message
    
    # Validate username
    if 'username' in data:
        username = str(data['username']).strip()
        if len(username) < 3:
            errors['username'] = "Username must be at least 3 characters long"
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            errors['username'] = "Username can only contain letters, numbers, and underscores"
    
    # Validate full_name
    if 'full_name' in data:
        full_name = str(data['full_name']).strip()
        if len(full_name) < 2:
            errors['full_name'] = "Full name must be at least 2 characters long"
        if not re.match(r'^[a-zA-Z\s\.\-]+$', full_name):
            errors['full_name'] = "Full name can only contain letters, spaces, dots, and hyphens"
    
    # Validate role
    if 'role' in data:
        if data['role'] not in ['patient', 'doctor', 'pharmacy']:
            errors['role'] = "Invalid role. Must be patient, doctor, or pharmacy"
    
    return len(errors) == 0, errors

# Sanitization helpers
def sanitize_string(text):
    """Sanitize string input to prevent XSS"""
    if not text:
        return ""
    
    # Remove HTML tags and suspicious characters
    sanitized = html.escape(str(text).strip())
    
    # Limit length
    if len(sanitized) > 1000:
        sanitized = sanitized[:1000]
    
    return sanitized

# JWT Error handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'success': False,
        'message': 'Token has expired',
        'error_code': 'TOKEN_EXPIRED'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({
        'success': False,
        'message': 'Invalid token',
        'error_code': 'INVALID_TOKEN'
    }), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({
        'success': False,
        'message': 'Access token required',
        'error_code': 'TOKEN_REQUIRED'
    }), 401

# Enhanced logging
def setup_logging():
    """Setup application logging"""
    if not app.debug:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        file_handler = RotatingFileHandler('logs/queuefree.log', maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('QueueFree Healthcare System startup')

# API Request logging decorator
def log_api_request(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        app.logger.info(f'API Request: {request.method} {request.path} from {request.remote_addr}')
        try:
            return f(*args, **kwargs)
        except Exception as e:
            app.logger.error(f'API Error in {f.__name__}: {str(e)}')
            return jsonify({
                'success': False,
                'message': 'Internal server error',
                'error_code': 'INTERNAL_ERROR'
            }), 500
    return decorated_function

# Call setup_logging
setup_logging()

# =======================
# DATABASE MODELS
# =======================

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    role = db.Column(db.String(20), nullable=False)  # patient, doctor, pharmacy
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'phone': self.phone,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

class Hospital(db.Model):
    __tablename__ = 'hospitals'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    location = db.Column(db.String(200), nullable=False, default='Coimbatore')
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'active': self.active
        }

class Department(db.Model):
    __tablename__ = 'departments'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    hospital_id = db.Column(db.String(36), db.ForeignKey('hospitals.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    hospital = db.relationship('Hospital', backref=db.backref('departments', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'hospital_id': self.hospital_id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active
        }

class DoctorProfile(db.Model):
    __tablename__ = 'doctor_profiles'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    hospital_id = db.Column(db.String(36), db.ForeignKey('hospitals.id'), nullable=False)
    department_id = db.Column(db.String(36), db.ForeignKey('departments.id'), nullable=False)
    specialization = db.Column(db.String(100))
    experience_years = db.Column(db.Integer)
    consultation_fee = db.Column(db.Float, default=0.0)
    available_from = db.Column(db.Time, default=time(9, 0))
    available_to = db.Column(db.Time, default=time(17, 0))
    available_days = db.Column(db.JSON, default=['MON','TUE','WED','THU','FRI','SAT'])
    max_patients_per_day = db.Column(db.Integer, default=50)
    current_token = db.Column(db.Integer, default=0)
    active = db.Column(db.Boolean, default=True)
    
    user = db.relationship('User', backref=db.backref('doctor_profile', uselist=False))
    hospital = db.relationship('Hospital', backref=db.backref('doctors', lazy=True))
    department = db.relationship('Department', backref=db.backref('doctors', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'doctor_name': self.user.full_name,
            'full_name': self.user.full_name,
            'hospital_id': self.hospital_id,
            'hospital_name': self.hospital.name if self.hospital else None,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'specialization': self.specialization,
            'experience_years': self.experience_years,
            'consultation_fee': self.consultation_fee,
            'available_from': self.available_from.strftime('%H:%M') if self.available_from else None,
            'available_to': self.available_to.strftime('%H:%M') if self.available_to else None,
            'available_days': self.available_days,
            'current_token': self.current_token,
            'active': self.active
        }

class Appointment(db.Model):
    __tablename__ = 'appointments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    hospital_id = db.Column(db.String(36), db.ForeignKey('hospitals.id'))
    department_id = db.Column(db.String(36), db.ForeignKey('departments.id'))
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time)
    token_number = db.Column(db.Integer, nullable=False)
    symptoms = db.Column(db.Text, default='')
    # booked, in_queue, in_consultation, completed, cancelled
    status = db.Column(db.String(20), default='booked')
    priority = db.Column(db.String(10), default='normal')
    doctor_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    patient = db.relationship('User', foreign_keys=[patient_id])
    doctor = db.relationship('User', foreign_keys=[doctor_id])
    hospital = db.relationship('Hospital', backref=db.backref('appointments', lazy=True))
    department = db.relationship('Department', backref=db.backref('appointments', lazy=True))

    def to_dict(self):
        doctor_profile = DoctorProfile.query.filter_by(user_id=self.doctor_id).first()
        return {
            'id': self.id,
            'patient_name': self.patient.full_name if self.patient else None,
            'doctor_name': self.doctor.full_name if self.doctor else None,
            'hospital_name': self.hospital.name if self.hospital else None,
            'department_name': self.department.name if self.department else None,
            'specialization': doctor_profile.specialization if doctor_profile else None,
            'consultation_fee': doctor_profile.consultation_fee if doctor_profile else None,
            'appointment_date': self.appointment_date.isoformat(),
            'appointment_time': self.appointment_time.strftime('%H:%M') if self.appointment_time else None,
            'token_number': self.token_number,
            'symptoms': self.symptoms,
            'status': self.status,
            'priority': self.priority,
            'doctor_notes': self.doctor_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    prescription_data = db.Column(db.JSON, nullable=False)  # List of medicines
    pharmacy_status = db.Column(db.String(20), default='pending')  # pending, preparing, ready, dispensed, cancelled
    pharmacy_notes = db.Column(db.Text)
    pickup_token = db.Column(db.String(10))
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    dispensed_at = db.Column(db.DateTime)
    
    appointment = db.relationship('Appointment', backref=db.backref('prescriptions', lazy=True))
    patient = db.relationship('User', foreign_keys=[patient_id])
    doctor = db.relationship('User', foreign_keys=[doctor_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'appointment_id': self.appointment_id,
            'token_number': self.appointment.token_number if self.appointment else None,
            'patient_id': self.patient_id,
            'patient_name': self.patient.full_name,
            'doctor_id': self.doctor_id,
            'doctor_name': self.doctor.full_name,
            'prescription_data': self.prescription_data,
            'pharmacy_status': self.pharmacy_status,
            'pharmacy_notes': self.pharmacy_notes,
            'pickup_token': self.pickup_token,
            'is_deleted': self.is_deleted,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'dispensed_at': self.dispensed_at.isoformat() if self.dispensed_at else None
        }

class Medicine(db.Model):
    __tablename__ = 'medicines'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    generic_name = db.Column(db.String(100))
    category = db.Column(db.String(50))
    strength = db.Column(db.String(20))
    form = db.Column(db.String(20))  # tablet, capsule, syrup, etc.
    batch_number = db.Column(db.String(50))
    price_per_unit = db.Column(db.Float, default=0.0)
    stock_quantity = db.Column(db.Integer, default=0)
    reorder_level = db.Column(db.Integer, default=10)
    expiry_date = db.Column(db.Date)
    manufacturer = db.Column(db.String(100))
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Add database constraints for business rules
    __table_args__ = (
        # Prevent negative stock quantities
        db.CheckConstraint('stock_quantity >= 0', name='ck_stock_non_negative'),
        # Prevent negative prices
        db.CheckConstraint('price_per_unit >= 0', name='ck_price_non_negative'),
        # Prevent negative reorder levels
        db.CheckConstraint('reorder_level >= 0', name='ck_reorder_non_negative'),
        # Ensure medicine names are unique (case-insensitive)
        db.Index('ix_medicine_name_unique', func.lower('name'), unique=True),
        # Ensure batch numbers are unique when provided
        db.Index('ix_batch_number_unique', 'batch_number', unique=True, 
                postgresql_where=db.text('batch_number IS NOT NULL')),
        # Index for faster stock lookups
        db.Index('ix_medicine_stock_status', 'is_available', 'stock_quantity'),
    )
    
    def to_dict(self):
        stock_status = 'available'
        if self.stock_quantity < 10:
            stock_status = 'critical'
        elif self.stock_quantity < 50:
            stock_status = 'low'
        
        return {
            'id': self.id,
            'name': self.name,
            'generic_name': self.generic_name,
            'category': self.category,
            'strength': self.strength,
            'form': self.form,
            'batch_number': self.batch_number,
            'price_per_unit': self.price_per_unit,
            'stock_quantity': self.stock_quantity,
            'stock_status': stock_status,
            'reorder_level': self.reorder_level,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'manufacturer': self.manufacturer,
            'is_available': self.is_available,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class QueueLog(db.Model):
    __tablename__ = 'queue_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    status_change = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    
    appointment = db.relationship('Appointment', backref=db.backref('queue_logs', lazy=True))

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Nullable for system actions
    action_type = db.Column(db.String(50), nullable=False)  # LOGIN, LOGOUT, CREATE, UPDATE, DELETE, ACCESS
    resource_type = db.Column(db.String(50), nullable=False)  # USER, APPOINTMENT, PRESCRIPTION, MEDICINE
    resource_id = db.Column(db.Integer, nullable=True)  # ID of affected resource
    action_details = db.Column(db.JSON, nullable=True)  # Detailed action information
    ip_address = db.Column(db.String(45), nullable=True)  # IPv4/IPv6 address
    user_agent = db.Column(db.String(500), nullable=True)
    session_id = db.Column(db.String(100), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    success = db.Column(db.Boolean, default=True)
    error_message = db.Column(db.Text, nullable=True)
    
    # Add constraints and indexes for performance
    __table_args__ = (
        db.Index('ix_audit_user_time', 'user_id', 'timestamp'),
        db.Index('ix_audit_action_time', 'action_type', 'timestamp'),
        db.Index('ix_audit_resource', 'resource_type', 'resource_id'),
        db.Index('ix_audit_session', 'session_id'),
    )
    
    user = db.relationship('User', backref=db.backref('audit_logs', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.username if self.user else 'System',
            'action_type': self.action_type,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'action_details': self.action_details,
            'ip_address': self.ip_address,
            'session_id': self.session_id,
            'timestamp': self.timestamp.isoformat(),
            'success': self.success,
            'error_message': self.error_message
        }

# Audit logging functions
def log_audit_event(action_type, resource_type, resource_id=None, details=None, 
                   user_id=None, success=True, error_message=None, request_obj=None):
    """
    Log an audit event with comprehensive tracking
    """
    try:
        # Get request context if available
        ip_address = None
        user_agent = None
        session_id = None
        
        if request_obj:
            ip_address = request_obj.environ.get('HTTP_X_FORWARDED_FOR', 
                                               request_obj.environ.get('REMOTE_ADDR'))
            user_agent = request_obj.headers.get('User-Agent', '')[:500]  # Limit length
            
            # Try to get session ID from JWT
            try:
                if hasattr(request_obj, 'headers') and 'Authorization' in request_obj.headers:
                    from flask_jwt_extended import decode_token
                    token = request_obj.headers['Authorization'].replace('Bearer ', '')
                    decoded = decode_token(token)
                    session_id = decoded.get('session_id')
            except:
                pass  # Ignore JWT decode errors for audit logging
        
        # Create audit log entry
        audit_entry = AuditLog(
            user_id=user_id,
            action_type=action_type,
            resource_type=resource_type,
            resource_id=resource_id,
            action_details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            success=success,
            error_message=error_message
        )
        
        db.session.add(audit_entry)
        db.session.flush()  # Don't commit yet, let calling function handle it
        
        return audit_entry.id
        
    except Exception as e:
        # Audit logging should never break the main application
        app.logger.error(f'Audit logging failed: {str(e)}')
        return None

def log_security_event(event_type, details, severity='INFO', user_id=None, request_obj=None):
    """
    Log security-related events with special handling
    """
    security_details = {
        'event_type': event_type,
        'severity': severity,
        'details': details,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # Also log to application logger for immediate alerting
    log_message = f'SECURITY EVENT [{severity}]: {event_type} - {details}'
    if user_id:
        log_message += f' (User: {user_id})'
    
    if severity == 'CRITICAL':
        app.logger.critical(log_message)
    elif severity == 'WARNING':
        app.logger.warning(log_message)
    else:
        app.logger.info(log_message)
    
    return log_audit_event(
        action_type='SECURITY_EVENT',
        resource_type='SYSTEM',
        details=security_details,
        user_id=user_id,
        request_obj=request_obj
    )

# =======================
# ROLE-BASED ACCESS CONTROL
# =======================

def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            current_user = db.session.get(User, current_user_id)
            
            if not current_user or current_user.role not in allowed_roles:
                return jsonify({'error': 'Access denied. Insufficient permissions.'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# =======================
# HEALTH CHECK & SYSTEM ROUTES
# =======================

@app.route('/', methods=['GET'])
def index():
    """Root route that redirects to the frontend application"""
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Queue-Free Healthcare System</title>
        <meta http-equiv="refresh" content="0; url=http://localhost:3002">
    </head>
    <body>
        <h2>Healthcare Queue-Free System</h2>
        <p>This is the API backend server.</p>
        <p>Redirecting to the main application...</p>
        <p><a href="http://localhost:3002">Click here if not redirected automatically</a></p>
        <script>window.location.href = "http://localhost:3002";</script>
    </body>
    </html>
    '''

@app.route('/api/health', methods=['GET'])
def health_check():
    """Comprehensive health check endpoint for system monitoring"""
    try:
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'version': '2.0.0-production',
            'environment': os.getenv('FLASK_ENV', 'production')
        }
        
        # Test database connection with timeout
        try:
            start_time = datetime.now(timezone.utc)
            result = db.session.execute(text('SELECT 1 as health_check'))
            db_response_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            
            health_status['database'] = {
                'status': 'healthy',
                'response_time_ms': round(db_response_time, 2),
                'url': app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1]  # Hide credentials
            }
        except Exception as db_error:
            health_status['database'] = {
                'status': 'unhealthy',
                'error': str(db_error)[:200],
                'response_time_ms': None
            }
            health_status['status'] = 'degraded'
        
        # Check critical table health
        try:
            table_counts = {
                'users': User.query.count(),
                'appointments': Appointment.query.count(),
                'prescriptions': Prescription.query.count(),
                'medicines': Medicine.query.count(),
                'audit_logs': AuditLog.query.count()
            }
            health_status['database']['table_counts'] = table_counts
        except Exception as count_error:
            health_status['database']['table_health'] = f'Error: {str(count_error)[:100]}'
        
        # Security metrics
        try:
            recent_failed_logins = len([k for k, v in failed_login_attempts.items() 
                                      if datetime.utcnow().timestamp() - v['last_attempt'] < 3600])
            health_status['security'] = {
                'status': 'healthy',
                'failed_logins_last_hour': recent_failed_logins,
                'rate_limited_ips': len(rate_limit_tracker),
                'locked_accounts': len([k for k, v in failed_login_attempts.items() 
                                      if v['count'] >= LOCKOUT_THRESHOLD])
            }
        except Exception as sec_error:
            health_status['security'] = {'status': 'unknown', 'error': str(sec_error)[:100]}
        
        # Service status
        health_status['services'] = {
            'authentication': 'active',
            'appointments': 'active', 
            'prescriptions': 'active',
            'pharmacy': 'active',
            'audit_logging': 'active'
        }
        
        # Performance metrics
        if PSUTIL_AVAILABLE:
            try:
                health_status['system'] = {
                    'cpu_percent': psutil.cpu_percent(interval=0.1),
                    'memory_percent': psutil.virtual_memory().percent,
                    'disk_percent': psutil.disk_usage('/').percent
                }
            except Exception as psutil_error:
                health_status['system'] = {'status': f'psutil error: {str(psutil_error)[:50]}'}
        else:
            health_status['system'] = {'status': 'psutil not available'}
        
        status_code = 200 if health_status['status'] == 'healthy' else 503
        return jsonify(health_status), status_code
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)[:200],
            'version': '2.0.0-production'
        }), 503

# =======================
# AUTHENTICATION ROUTES
# =======================

@app.route('/api/auth/register', methods=['POST'])
@log_api_request
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False, 
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        # Validate required fields and input
        required_fields = ['username', 'email', 'password', 'full_name', 'role']
        is_valid, errors = validate_user_input(data, required_fields)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'message': 'Validation failed',
                'error_code': 'VALIDATION_ERROR',
                'errors': errors
            }), 400
        
        # Sanitize input data
        sanitized_data = {
            'username': sanitize_string(data['username']).lower(),
            'email': data['email'].lower().strip(),
            'full_name': sanitize_string(data['full_name']),
            'phone': sanitize_string(data.get('phone', '')),
            'role': data['role']
        }
        
        # Check if user already exists
        existing_user = User.query.filter(
            (User.username == sanitized_data['username']) | 
            (User.email == sanitized_data['email'])
        ).first()
        
        if existing_user:
            if existing_user.username == sanitized_data['username']:
                return jsonify({
                    'success': False,
                    'message': 'Username already exists',
                    'error_code': 'DUPLICATE_USERNAME'
                }), 409
            else:
                return jsonify({
                    'success': False,
                    'message': 'Email already exists', 
                    'error_code': 'DUPLICATE_EMAIL'
                }), 409
        
        # Create new user with strong password hashing
        password_hash = generate_password_hash(data['password'], method='pbkdf2:sha256', salt_length=16)
        new_user = User(
            username=sanitized_data['username'],
            email=sanitized_data['email'],
            password_hash=password_hash,
            full_name=sanitized_data['full_name'],
            phone=sanitized_data['phone'],
            role=sanitized_data['role']
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        app.logger.info(f'New user registered: {sanitized_data["username"]} ({sanitized_data["role"]})')
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': {
                'id': new_user.id,
                'username': new_user.username,
                'email': new_user.email,
                'full_name': new_user.full_name,
                'role': new_user.role
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Registration error: {str(e)}')
        return jsonify({
            'success': False,
            'message': 'Registration failed',
            'error_code': 'REGISTRATION_ERROR'
        }), 500

@app.route('/api/auth/login', methods=['POST'])
@log_api_request
def login():
    try:
        # Get client IP for rate limiting
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', 'unknown'))
        
        # Check rate limiting
        if is_rate_limited(client_ip):
            app.logger.warning(f'Rate limit exceeded for IP: {client_ip}')
            return jsonify({
                'success': False,
                'message': 'Too many login attempts. Please try again later.',
                'error_code': 'RATE_LIMITED'
            }), 429
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided',
                'error_code': 'NO_DATA'
            }), 400
        
        # Accept both email/username and password
        identifier = sanitize_string(data.get('email', '') or data.get('username', ''))
        password = data.get('password', '')
        
        if not identifier or not password:
            return jsonify({
                'success': False,
                'message': 'Email/username and password are required',
                'error_code': 'MISSING_CREDENTIALS'
            }), 400
        
        # Check if account is locked
        if is_account_locked(identifier.lower()):
            remaining_time = LOCKOUT_DURATION - (
                datetime.utcnow().timestamp() - 
                failed_login_attempts[identifier.lower()]['last_attempt']
            )
            app.logger.warning(f'Login attempt on locked account: {identifier}')
            return jsonify({
                'success': False,
                'message': f'Account temporarily locked. Try again in {int(remaining_time/60)} minutes.',
                'error_code': 'ACCOUNT_LOCKED',
                'retry_after': int(remaining_time)
            }), 423
        
        # Try to find user by email or username
        user = User.query.filter(
            (User.email == identifier.lower()) | (User.username == identifier.lower())
        ).first()
        
        if not user or not user.check_password(password):
            # Record failed attempt
            record_failed_attempt(identifier.lower())
            
            # Log security event for failed login
            log_security_event(
                event_type='FAILED_LOGIN_ATTEMPT',
                details=f'Invalid credentials for identifier: {identifier}',
                severity='WARNING',
                user_id=user.id if user else None,
                request_obj=request
            )
            
            # Generic error message to prevent user enumeration
            app.logger.warning(f'Failed login attempt for: {identifier} from IP: {client_ip}')
            return jsonify({
                'success': False,
                'message': 'Invalid credentials. Please check your email/username and password.',
                'error_code': 'INVALID_CREDENTIALS'
            }), 401
        
        if not user.is_active:
            app.logger.warning(f'Login attempt for deactivated account: {user.username}')
            return jsonify({
                'success': False,
                'message': 'Account is deactivated. Please contact support.',
                'error_code': 'ACCOUNT_DEACTIVATED'
            }), 401
        
        # Clear failed attempts on successful login
        clear_failed_attempts(identifier.lower())
        
        # Log successful login audit event
        log_audit_event(
            action_type='LOGIN',
            resource_type='USER',
            resource_id=user.id,
            details={
                'username': user.username,
                'role': user.role,
                'login_method': 'password'
            },
            user_id=user.id,
            request_obj=request
        )
        
        # Create JWT token with enhanced security claims
        additional_claims = {
            "role": user.role,
            "user_id": user.id,
            "session_id": str(uuid.uuid4()),  # Unique session identifier
            "client_ip": client_ip
        }
        
        access_token = create_access_token(
            identity=user.id,
            additional_claims=additional_claims,
            expires_delta=timedelta(days=7)
        )
        
        # Log successful login with session details
        app.logger.info(f'Successful login: {user.username} ({user.role}) from IP: {client_ip}')
        
        # Return user data without sensitive information
        user_data = user.to_dict()
        user_data.pop('password_hash', None)  # Ensure no password data leaks
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'access_token': access_token,
            'user': user_data,
            'session_expires_in': 7 * 24 * 3600  # 7 days in seconds
        }), 200
        
    except Exception as e:
        app.logger.error(f'Login error: {str(e)} for IP: {client_ip if "client_ip" in locals() else "unknown"}')
        return jsonify({
            'success': False,
            'message': 'Authentication service temporarily unavailable',
            'error_code': 'LOGIN_ERROR'
        }), 500

# Alias for /api/auth/login to support legacy frontend calls
@app.route('/api/login', methods=['POST'])
def login_alias():
    return login()

@app.route('/api/auth/validate', methods=['GET'])
@jwt_required()
def validate_token():
    """Validate current JWT token and return user info"""
    try:
        current_user_id = get_jwt_identity()
        current_user = db.session.get(User, current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
            
        # Get additional claims from token
        claims = get_jwt()
        
        return jsonify({
            'valid': True,
            'user': current_user.to_dict(),
            'role': current_user.role,
            'token_claims': {
                'role': claims.get('role'),
                'user_id': claims.get('user_id'),
                'session_id': claims.get('session_id'),
                'exp': claims.get('exp')
            }
        }), 200
        
    except Exception as e:
        app.logger.error(f'Token validation error: {str(e)}')
        return jsonify({'error': 'Token validation failed'}), 401

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =======================
# PRODUCTION APPOINTMENT BOOKING ENDPOINTS
# =======================

@app.route('/api/hospitals', methods=['GET'])
def get_hospitals():
    """Get all active hospitals"""
    try:
        hospitals = Hospital.query.filter_by(active=True).all()
        return jsonify([hospital.to_dict() for hospital in hospitals]), 200
    except Exception as e:
        app.logger.error(f'Error fetching hospitals: {str(e)}')
        return jsonify({'error': 'Failed to fetch hospitals'}), 500

@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Get departments, optionally filtered by hospital_id"""
    try:
        hospital_id = request.args.get('hospital_id')
        if hospital_id:
            departments = Department.query.filter_by(
                hospital_id=hospital_id,
                is_active=True
            ).all()
        else:
            departments = Department.query.filter_by(is_active=True).all()
        
        return jsonify([dept.to_dict() for dept in departments]), 200
    except Exception as e:
        app.logger.error(f'Error fetching departments: {str(e)}')
        return jsonify({'error': 'Failed to fetch departments'}), 500

@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    """Get doctors, optionally filtered by hospital_id and/or department_id"""
    try:
        hospital_id = request.args.get('hospital_id')
        department_id = request.args.get('department_id')
        
        query = db.session.query(DoctorProfile, User).join(User).filter(
            DoctorProfile.active == True,
            User.is_active == True
        )
        
        if hospital_id:
            query = query.filter(DoctorProfile.hospital_id == hospital_id)
        if department_id:
            query = query.filter(DoctorProfile.department_id == department_id)

        doctors = query.all()
        
        result = []
        for doctor_profile, user in doctors:
            doctor_data = doctor_profile.to_dict()
            doctor_data['doctor_name'] = user.full_name
            doctor_data['full_name'] = user.full_name
            doctor_data['email'] = user.email
            result.append(doctor_data)
        
        return jsonify(result), 200
    except Exception as e:
        app.logger.error(f'Error fetching doctors: {str(e)}')
        return jsonify({'error': 'Failed to fetch doctors'}), 500

@app.route('/api/slots', methods=['GET'])
@jwt_required()
def get_available_slots():
    """Get available time slots for a doctor on a specific date"""
    try:
        doctor_id = request.args.get('doctor_id')
        appointment_date = request.args.get('date')  # YYYY-MM-DD format
        
        if not doctor_id or not appointment_date:
            return jsonify({'error': 'doctor_id and date parameters are required'}), 400
            
        # Parse date
        try:
            target_date = datetime.strptime(appointment_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
            
        # Check if date is not in the past
        if target_date < date.today():
            return jsonify({'error': 'Cannot book appointments for past dates'}), 400
            
        # Get doctor profile
        doctor_profile = DoctorProfile.query.get(doctor_id)
        if not doctor_profile:
            return jsonify({'error': 'Doctor not found'}), 404
            
        # Check if doctor is available on that day
        weekday = target_date.strftime('%a').upper()[:3]  # MON, TUE, etc.
        if weekday not in doctor_profile.available_days:
            return jsonify({'error': 'Doctor not available on this day'}), 400
            
        # Generate time slots (30-minute slots)
        available_slots = []
        start_time = doctor_profile.available_from
        end_time = doctor_profile.available_to
        
        current_time = datetime.combine(target_date, start_time)
        end_datetime = datetime.combine(target_date, end_time)
        
        slot_duration = timedelta(minutes=30)
        
        while current_time < end_datetime:
            slot_end = current_time + slot_duration
            if slot_end <= end_datetime:
                time_slot = f"{current_time.strftime('%H:%M')}-{slot_end.strftime('%H:%M')}"
                
                # Check if slot is already booked
                existing_appointment = Appointment.query.filter_by(
                    doctor_id=doctor_profile.user_id,
                    appointment_date=target_date,
                    time_slot=time_slot
                ).filter(Appointment.status.in_(['BOOKED', 'CONFIRMED'])).first()
                
                if not existing_appointment:
                    available_slots.append({
                        'time_slot': time_slot,
                        'available': True
                    })
                else:
                    available_slots.append({
                        'time_slot': time_slot,
                        'available': False
                    })
                    
            current_time += slot_duration
            
        return jsonify({
            'doctor_id': doctor_id,
            'date': appointment_date,
            'slots': available_slots
        }), 200
        
    except Exception as e:
        app.logger.error(f'Error fetching available slots: {str(e)}')
        return jsonify({'error': 'Failed to fetch available slots'}), 500

@app.route('/api/patient/book-appointment', methods=['POST'])
@role_required(['patient'])
def book_appointment():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        if not data.get('doctor_id'):
            return jsonify({'error': 'doctor_id is required'}), 400
        if not data.get('appointment_date'):
            return jsonify({'error': 'appointment_date is required'}), 400

        # Accept doctor_id as DoctorProfile.id (UUID) - look up profile first
        doctor_profile = DoctorProfile.query.get(data['doctor_id'])
        if not doctor_profile:
            return jsonify({'error': 'Doctor not found'}), 404

        doctor = db.session.get(User, doctor_profile.user_id)
        if not doctor or doctor.role != 'doctor':
            return jsonify({'error': 'Invalid doctor'}), 400

        # Parse date and optional time
        appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        time_str = data.get('appointment_time') or '09:00'
        try:
            appointment_time = datetime.strptime(time_str, '%H:%M').time()
        except ValueError:
            appointment_time = datetime.strptime('09:00', '%H:%M').time()

        # Generate next token number for this doctor+date
        from sqlalchemy import text
        result = db.session.execute(
            text('SELECT COALESCE(MAX(token_number), 0) + 1 FROM appointments '
                 'WHERE doctor_id = :did AND appointment_date = :dt'),
            {'did': doctor_profile.user_id, 'dt': appointment_date}
        ).fetchone()
        token_number = result[0] if result else 1

        # Appointments for today go directly into the queue
        from datetime import date as date_cls
        initial_status = 'in_queue' if appointment_date == date_cls.today() else 'booked'

        appointment = Appointment(
            patient_id=current_user_id,
            doctor_id=doctor_profile.user_id,
            hospital_id=doctor_profile.hospital_id,
            department_id=doctor_profile.department_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            token_number=token_number,
            symptoms=data.get('symptoms', '').strip() or 'General consultation',
            status=initial_status,
            priority='normal',
        )
        db.session.add(appointment)
        db.session.commit()

        return jsonify({
            'message': 'Appointment booked successfully',
            'appointment': appointment.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'book_appointment error: {e}')
        return jsonify({'error': str(e)}), 500

# Frontend expects /api/appointments endpoint for booking  
@app.route('/api/appointments', methods=['POST'])
@role_required(['patient'])
def create_appointment():
    max_retries = 3
    for attempt in range(max_retries):
        try:
            current_user_id = get_jwt_identity()
            data = request.get_json()
            
            required_fields = ['doctor_id', 'appointment_date']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'{field} is required'}), 400
            
            # Get doctor profile to get department  
            # Frontend sends doctor_id which corresponds to DoctorProfile.id
            doctor_profile = DoctorProfile.query.get(data['doctor_id'])
            if not doctor_profile:
                return jsonify({'error': 'Doctor not found'}), 404
            
            # Parse appointment date
            appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
            appointment_time = datetime.now().time()  # Use current time
            
            # Check daily appointment limit
            daily_count = Appointment.query.filter(
                Appointment.doctor_id == doctor_profile.user_id,
                Appointment.appointment_date == appointment_date,
                Appointment.status != 'cancelled'
            ).count()
            
            if daily_count >= doctor_profile.max_patients_per_day:
                return jsonify({
                    'error': 'Doctor has reached maximum appointments for this date',
                    'max_appointments': doctor_profile.max_patients_per_day
                }), 400
            
            # Generate token number atomically using database sequence-like approach
            from sqlalchemy import func, text
            
            # Use a single atomic query to get and increment token
            result = db.session.execute(
                text("""
                    WITH next_token AS (
                        SELECT COALESCE(MAX(token_number), 0) + 1 as token_num
                        FROM appointments 
                        WHERE doctor_id = :doctor_id AND appointment_date = :appointment_date
                    )
                    SELECT token_num FROM next_token
                """),
                {
                    'doctor_id': doctor_profile.user_id,
                    'appointment_date': appointment_date
                }
            ).fetchone()
            
            token_number = result[0] if result else 1
            
            # Create appointment with proper validation
            appointment = Appointment(
                patient_id=current_user_id,
                doctor_id=doctor_profile.user_id,
                department_id=doctor_profile.department_id,
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                token_number=token_number,
                symptoms=sanitize_string(data.get('symptoms', data.get('reason', ''))),
                priority=data.get('priority', 'normal'),
                status='in_queue'
            )
            
            db.session.add(appointment)
            
            # Create audit log entry in same transaction
            log_entry = QueueLog(
                appointment_id=None,  # Will be updated after appointment is saved
                status_change='Appointment created',
                notes=f'Token #{token_number} assigned to patient {current_user_id}'
            )
            
            try:
                db.session.commit()
                
                # Log appointment creation audit event
                log_audit_event(
                    action_type='CREATE',
                    resource_type='APPOINTMENT',
                    resource_id=appointment.id,
                    details={
                        'patient_id': current_user_id,
                        'doctor_id': doctor_profile.user_id,
                        'appointment_date': str(appointment_date),
                        'token_number': token_number,
                        'department_id': doctor_profile.department_id
                    },
                    user_id=current_user_id,
                    request_obj=request
                )
                
                # Update log entry with appointment ID
                log_entry.appointment_id = appointment.id
                db.session.add(log_entry)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'data': {
                        'appointment_id': appointment.id,
                        'queue_token': token_number,
                        'appointment_date': str(appointment_date),
                        'status': 'in_queue',
                        'estimated_wait_time': (token_number - 1) * 15
                    },
                    'message': 'Appointment booked successfully'
                }), 201
                
            except Exception as commit_error:
                db.session.rollback()
                
                # Check if it's a unique constraint violation (token conflict)
                if 'unique constraint' in str(commit_error).lower() or 'duplicate key' in str(commit_error).lower():
                    if attempt < max_retries - 1:
                        continue  # Retry with new token
                    else:
                        return jsonify({
                            'error': 'Unable to book appointment due to high concurrent load. Please try again.',
                            'error_code': 'CONCURRENCY_CONFLICT'
                        }), 409
                else:
                    raise commit_error
                    
        except Exception as e:
            db.session.rollback()
            if attempt == max_retries - 1:
                app.logger.error(f'Appointment booking failed after {max_retries} attempts: {str(e)}')
                return jsonify({'success': False, 'message': f'Booking failed: {str(e)}'}), 500
            
    # Should not reach here
    return jsonify({'error': 'Booking failed after multiple retries'}), 500

@app.route('/api/patient/appointments', methods=['GET'])
@role_required(['patient'])
def get_patient_appointments():
    try:
        current_user_id = get_jwt_identity()
        appointments = Appointment.query.filter_by(patient_id=current_user_id).order_by(Appointment.appointment_date.desc()).all()
        
        result = []
        for appointment in appointments:
            appointment_data = appointment.to_dict()
            
            # Add queue position and estimated wait time
            if appointment.status in ['booked', 'in_queue']:
                ahead_count = Appointment.query.filter(
                    Appointment.doctor_id == appointment.doctor_id,
                    Appointment.appointment_date == appointment.appointment_date,
                    Appointment.token_number < appointment.token_number,
                    Appointment.status.in_(['booked', 'in_queue', 'consulting'])
                ).count()
                
                appointment_data['queue_position'] = ahead_count + 1
                appointment_data['estimated_wait_time'] = ahead_count * 15  # 15 minutes per patient
            
            result.append(appointment_data)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/queue/<int:doctor_id>', methods=['GET'])
@role_required(['doctor', 'receptionist'])
def get_doctor_queue(doctor_id):
    try:
        current_date = date.today()
        
        # Get active appointments
        appointments = Appointment.query.filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == current_date,
            Appointment.status.in_(['in_queue', 'consulting'])
        ).order_by(Appointment.token_number).all()
        
        result = []
        for appt in appointments:
            patient = db.session.get(User, appt.patient_id)
            result.append({
                'id': appt.id,
                'patient_name': patient.full_name if patient else 'Unknown',
                'token_number': appt.token_number,
                'status': appt.status,
                'symptoms': appt.symptoms,
                'appointment_time': str(appt.appointment_time)
            })
            
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/queue/next', methods=['POST'])
@role_required(['doctor'])
def next_patient():
    try:
        doctor_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Allow checking queue for other doctors if admin/reception (optional)
        # For now assume doctor manages their own queue
        
        current_date = date.today()
        
        # 1. Finish current patient
        current_appt = Appointment.query.filter_by(
            doctor_id=doctor_user_id,
            appointment_date=current_date,
            status='consulting'
        ).first()
        
        if current_appt:
            current_appt.status = 'completed'
            current_appt.actual_end_time = datetime.now()
            db.session.add(current_appt)
        
        # 2. Get next patient
        next_appt = Appointment.query.filter(
            Appointment.doctor_id == doctor_user_id,
            Appointment.appointment_date == current_date,
            Appointment.status == 'in_queue'
        ).order_by(Appointment.token_number).first()
        
        if next_appt:
            next_appt.status = 'consulting'
            next_appt.actual_start_time = datetime.now()
            db.session.add(next_appt)
            
            # Update doctor's current token
            profile = DoctorProfile.query.filter_by(user_id=doctor_user_id).first()
            if profile:
                profile.current_token = next_appt.token_number
                db.session.add(profile)
            
            db.session.commit()
            
            # Return next patient details
            patient = db.session.get(User, next_appt.patient_id)
            return jsonify({
                'message': 'Moved to next patient',
                'current_patient': {
                    'id': next_appt.id,
                    'name': patient.full_name if patient else 'Unknown',
                    'token': next_appt.token_number,
                    'symptoms': next_appt.symptoms
                }
            }), 200
        
        db.session.commit()
        return jsonify({'message': 'No more patients in queue', 'current_patient': None}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/patient/queue-status/<int:appointment_id>', methods=['GET'])
@role_required(['patient'])
def get_queue_status(appointment_id):
    try:
        current_user_id = get_jwt_identity()
        appointment = Appointment.query.filter_by(
            id=appointment_id,
            patient_id=current_user_id
        ).first()
        
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Calculate queue position — count all active appointments ahead (booked + in_queue + consulting)
        ahead_count = Appointment.query.filter(
            Appointment.doctor_id == appointment.doctor_id,
            Appointment.appointment_date == appointment.appointment_date,
            Appointment.token_number < appointment.token_number,
            Appointment.status.in_(['booked', 'in_queue', 'consulting'])
        ).count()
        
        # Get current doctor token
        doctor_profile = DoctorProfile.query.filter_by(user_id=appointment.doctor_id).first()
        current_token = doctor_profile.current_token if doctor_profile else 0
        
        return jsonify({
            'appointment': appointment.to_dict(),
            'queue_position': ahead_count + 1,
            'current_token': current_token,
            'estimated_wait_time': ahead_count * 15,
            'status': appointment.status
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/patient/prescriptions', methods=['GET'])
@role_required(['patient'])
def get_patient_prescriptions():
    try:
        current_user_id = get_jwt_identity()
        prescriptions = Prescription.query.filter_by(patient_id=current_user_id).order_by(Prescription.created_at.desc()).all()
        
        return jsonify([prescription.to_dict() for prescription in prescriptions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =======================
# DOCTOR ROUTES
# =======================

@app.route('/api/doctor/profile', methods=['GET', 'POST', 'PUT'])
@role_required(['doctor'])
def doctor_profile():
    try:
        current_user_id = get_jwt_identity()
        
        if request.method == 'GET':
            profile = DoctorProfile.query.filter_by(user_id=current_user_id).first()
            if not profile:
                # No profile yet - return safe defaults so the dashboard doesn't error
                user = User.query.get(current_user_id)
                return jsonify({
                    'id': None,
                    'user_id': current_user_id,
                    'doctor_name': user.full_name if user else '',
                    'full_name': user.full_name if user else '',
                    'hospital_id': None,
                    'hospital_name': None,
                    'department_id': None,
                    'department_name': None,
                    'specialization': None,
                    'experience_years': None,
                    'consultation_fee': 0.0,
                    'available_from': '09:00',
                    'available_to': '17:00',
                    'available_days': ['MON','TUE','WED','THU','FRI','SAT'],
                    'current_token': 0,
                    'active': True
                }), 200
            
            return jsonify(profile.to_dict()), 200
        
        elif request.method == 'POST':
            data = request.get_json()
            
            profile = DoctorProfile.query.filter_by(user_id=current_user_id).first()
            
            if not profile:
                profile = DoctorProfile(user_id=current_user_id)
                db.session.add(profile)
            
            # Update profile fields
            if 'department_id' in data:
                profile.department_id = data['department_id']
            if 'specialization' in data:
                profile.specialization = data['specialization']
            if 'experience_years' in data:
                profile.experience_years = data['experience_years']
            if 'consultation_fee' in data:
                profile.consultation_fee = data['consultation_fee']
            if 'available_from' in data:
                profile.available_from = datetime.strptime(data['available_from'], '%H:%M').time()
            if 'available_to' in data:
                profile.available_to = datetime.strptime(data['available_to'], '%H:%M').time()
            if 'max_patients_per_day' in data:
                profile.max_patients_per_day = data['max_patients_per_day']
            
            db.session.commit()
            
            return jsonify({'message': 'Profile updated successfully'}), 200
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/doctor/appointments', methods=['GET'])
@role_required(['doctor'])
def get_doctor_appointments():
    try:
        current_user_id = get_jwt_identity()
        date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        appointments = Appointment.query.filter_by(
            doctor_id=current_user_id,
            appointment_date=appointment_date
        ).order_by(Appointment.token_number).all()
        
        return jsonify([appointment.to_dict() for appointment in appointments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/doctor/queue', methods=['GET'])
@role_required(['doctor'])
def get_doctor_queue_v1():
    try:
        current_user_id = get_jwt_identity()
        date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        queue = Appointment.query.filter_by(
            doctor_id=current_user_id,
            appointment_date=appointment_date
        ).filter(Appointment.status.in_(['booked', 'in_queue', 'consulting'])).order_by(Appointment.token_number).all()
        
        return jsonify([appointment.to_dict() for appointment in queue]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/doctor/call-next', methods=['POST'])
@role_required(['doctor'])
def call_next_patient():
    try:
        current_user_id = get_jwt_identity()
        date_str = datetime.now().strftime('%Y-%m-%d')
        appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Get next patient in queue
        next_appointment = Appointment.query.filter_by(
            doctor_id=current_user_id,
            appointment_date=appointment_date,
            status='booked'
        ).order_by(Appointment.token_number).first()
        
        if not next_appointment:
            return jsonify({'message': 'No patients in queue'}), 404
        
        # Update appointment status
        next_appointment.status = 'consulting'
        next_appointment.actual_start_time = datetime.utcnow()
        
        # Update doctor's current token
        doctor_profile = DoctorProfile.query.filter_by(user_id=current_user_id).first()
        if doctor_profile:
            doctor_profile.current_token = next_appointment.token_number
        
        db.session.commit()
        
        # Log the status change
        log_entry = QueueLog(
            appointment_id=next_appointment.id,
            status_change='Patient called for consultation',
            notes=f'Token #{next_appointment.token_number} called'
        )
        db.session.add(log_entry)
        db.session.commit()
        
        return jsonify({
            'message': 'Next patient called',
            'appointment': next_appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/doctor/complete-consultation', methods=['POST'])
@role_required(['doctor'])
def complete_consultation():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        appointment_id = data.get('appointment_id')
        doctor_notes = data.get('doctor_notes', '')
        prescription_data = data.get('prescription_data', [])
        
        appointment = Appointment.query.filter_by(
            id=appointment_id,
            doctor_id=current_user_id,
            status='consulting'
        ).first()
        
        if not appointment:
            return jsonify({'error': 'Active consultation not found'}), 404
        
        # Update appointment
        appointment.status = 'completed'
        appointment.actual_end_time = datetime.utcnow()
        appointment.doctor_notes = doctor_notes
        
        # Create prescription if provided
        prescription_id = None
        if prescription_data:
            prescription = Prescription(
                appointment_id=appointment.id,
                patient_id=appointment.patient_id,
                doctor_id=current_user_id,
                prescription_data=prescription_data,
                pickup_token=str(random.randint(1000, 9999))
            )
            db.session.add(prescription)
            db.session.commit()
            prescription_id = prescription.id
            
            # Add to pharmacy queue for real-time updates
            prescription_queue.append(prescription.id)
            
            # Notify pharmacy (disabled for now)
            # socketio.emit('new_prescription', {
            #     'prescription_id': prescription.id,
            #     'patient_name': appointment.patient.full_name,
            #     'pickup_token': prescription.pickup_token
            # }, room='pharmacy')
        
        db.session.commit()
        
        # Log completion
        log_entry = QueueLog(
            appointment_id=appointment.id,
            status_change='Consultation completed',
            notes=f'Prescription created: {prescription_id}' if prescription_id else 'No prescription'
        )
        db.session.add(log_entry)
        db.session.commit()
        
        return jsonify({
            'message': 'Consultation completed successfully',
            'prescription_id': prescription_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Frontend expects /api/prescriptions endpoint
@app.route('/api/prescriptions', methods=['POST'])
@role_required(['doctor'])
def create_prescription():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        required_fields = ['appointment_id', 'medicines', 'notes']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get appointment details
        appointment = Appointment.query.get(data['appointment_id'])
        if not appointment or appointment.doctor_id != current_user_id:
            return jsonify({'error': 'Appointment not found or access denied'}), 404
        
        # Create prescription
        prescription = Prescription(
            appointment_id=appointment.id,
            patient_id=appointment.patient_id,
            doctor_id=current_user_id,
            prescription_data={'medicines': data['medicines'], 'notes': data['notes']},
            pharmacy_status='pending'
        )
        
        db.session.add(prescription)
        db.session.commit()
        
        return jsonify({
            'message': 'Prescription created successfully',
            'prescription_id': prescription.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Frontend expects /api/appointments/<id> for updating appointment status
@app.route('/api/appointments/<int:appointment_id>', methods=['PUT'])
@role_required(['doctor'])
def update_appointment_status(appointment_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment or appointment.doctor_id != current_user_id:
            return jsonify({'error': 'Appointment not found or access denied'}), 404
        
        # Update status
        if 'status' in data:
            appointment.status = data['status']
            if data['status'] == 'completed':
                appointment.actual_end_time = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Appointment updated successfully',
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/doctor/daily-summary', methods=['GET'])
@role_required(['doctor'])
def get_daily_summary():
    try:
        current_user_id = get_jwt_identity()
        date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        appointments = Appointment.query.filter_by(
            doctor_id=current_user_id,
            appointment_date=appointment_date
        ).all()
        
        total_appointments = len(appointments)
        completed = len([a for a in appointments if a.status == 'completed'])
        cancelled = len([a for a in appointments if a.status == 'cancelled'])
        pending = len([a for a in appointments if a.status in ['booked', 'in_queue']])
        
        return jsonify({
            'date': date_str,
            'total_appointments': total_appointments,
            'completed': completed,
            'cancelled': cancelled,
            'pending': pending,
            'appointments': [a.to_dict() for a in appointments]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =======================
# PHARMACY ROUTES
# =======================

@app.route('/api/pharmacy/prescriptions', methods=['GET'])
@role_required(['pharmacy'])
def get_pharmacy_prescriptions():
    try:
        # Pagination
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        
        # Filters
        status_filter = request.args.get('status', 'all')
        search = request.args.get('search', '')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        query = Prescription.query.filter_by(is_deleted=False)
        
        if status_filter != 'all':
            query = query.filter_by(pharmacy_status=status_filter)
        
        if search:
            query = query.join(Prescription.patient).filter(
                db.or_(
                    User.full_name.ilike(f'%{search}%'),
                    Prescription.pickup_token.ilike(f'%{search}%')
                )
            )
        
        if date_from:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
            query = query.filter(Prescription.created_at >= date_from_obj)
        
        if date_to:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
            date_to_obj = date_to_obj.replace(hour=23, minute=59, second=59)
            query = query.filter(Prescription.created_at <= date_to_obj)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        prescriptions = query.order_by(Prescription.created_at.desc()).paginate(
            page=page, per_page=limit, error_out=False
        )
        
        return jsonify({
            'prescriptions': [p.to_dict() for p in prescriptions.items],
            'total': total,
            'page': page,
            'pages': prescriptions.pages
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pharmacy/prescriptions/today', methods=['GET'])
@role_required(['pharmacy'])
def get_today_prescriptions():
    try:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
        
        prescriptions = Prescription.query.filter(
            Prescription.created_at >= today_start,
            Prescription.created_at <= today_end,
            Prescription.is_deleted == False,
            Prescription.pharmacy_status != 'dispensed'
        ).order_by(Prescription.created_at.asc()).all()
        
        return jsonify([p.to_dict() for p in prescriptions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pharmacy/prescriptions/<int:prescription_id>', methods=['GET'])
@role_required(['pharmacy'])
def get_prescription_detail(prescription_id):
    try:
        prescription = Prescription.query.get(prescription_id)
        if not prescription or prescription.is_deleted:
            return jsonify({'error': 'Prescription not found'}), 404
        
        return jsonify(prescription.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pharmacy/prescriptions/<int:prescription_id>/status', methods=['PUT'])
@role_required(['pharmacy'])
def update_prescription_status(prescription_id):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            data = request.get_json()
            new_status = data.get('status')
            pharmacy_notes = data.get('notes', '')
            
            if new_status not in ['pending', 'preparing', 'ready', 'dispensed', 'cancelled']:
                return jsonify({'error': 'Invalid status'}), 400
            
            # Use SELECT FOR UPDATE to prevent concurrent modifications
            prescription = db.session.query(Prescription).filter_by(
                id=prescription_id
            ).with_for_update().first()
            
            if not prescription or prescription.is_deleted:
                return jsonify({'error': 'Prescription not found'}), 404
            
            # Prevent modifying dispensed prescriptions
            if prescription.pharmacy_status == 'dispensed':
                return jsonify({'error': 'Cannot modify dispensed prescription'}), 400
            
            # If dispensing, validate stock and deduct atomically
            if new_status == 'dispensed' and prescription.pharmacy_status != 'dispensed':
                prescription_medicines = prescription.prescription_data.get('medicines', [])
                
                if not prescription_medicines:
                    return jsonify({'error': 'No medicines in prescription to dispense'}), 400
                
                # Check stock availability first
                stock_issues = []
                for med_item in prescription_medicines:
                    medicine_name = med_item.get('name', '').strip()
                    quantity_needed = int(med_item.get('quantity', 0))
                    
                    if not medicine_name or quantity_needed <= 0:
                        continue
                        
                    # Find medicine by name (case-insensitive)
                    medicine = Medicine.query.filter(
                        func.lower(Medicine.name) == func.lower(medicine_name),
                        Medicine.is_available == True
                    ).with_for_update().first()
                    
                    if not medicine:
                        stock_issues.append(f'Medicine "{medicine_name}" not found in inventory')
                        continue
                        
                    if medicine.stock_quantity < quantity_needed:
                        stock_issues.append(
                            f'Insufficient stock for "{medicine_name}": '
                            f'needed {quantity_needed}, available {medicine.stock_quantity}'
                        )
                
                if stock_issues:
                    db.session.rollback()
                    return jsonify({
                        'error': 'Cannot dispense prescription due to stock issues',
                        'stock_issues': stock_issues
                    }), 400
                
                # Deduct stock atomically
                dispensing_log = []
                for med_item in prescription_medicines:
                    medicine_name = med_item.get('name', '').strip()
                    quantity_needed = int(med_item.get('quantity', 0))
                    
                    if not medicine_name or quantity_needed <= 0:
                        continue
                        
                    # Update stock with atomic operation
                    result = db.session.execute(
                        text("""
                            UPDATE medicines 
                            SET stock_quantity = stock_quantity - :quantity,
                                updated_at = :now
                            WHERE LOWER(name) = LOWER(:medicine_name) 
                                AND is_available = true 
                                AND stock_quantity >= :quantity
                            RETURNING id, name, stock_quantity
                        """),
                        {
                            'quantity': quantity_needed,
                            'medicine_name': medicine_name,
                            'now': datetime.utcnow()
                        }
                    ).fetchone()
                    
                    if not result:
                        # Race condition or insufficient stock
                        db.session.rollback()
                        if attempt < max_retries - 1:
                            continue  # Retry the whole operation
                        return jsonify({
                            'error': f'Stock deduction failed for "{medicine_name}". Please try again.',
                            'error_code': 'STOCK_CONFLICT'
                        }), 409
                    
                    dispensing_log.append({
                        'medicine_id': result[0],
                        'medicine_name': result[1],
                        'quantity_dispensed': quantity_needed,
                        'remaining_stock': result[2]
                    })
                
                # Update prescription status
                prescription.pharmacy_status = new_status
                prescription.dispensed_at = datetime.utcnow()
                
                # Add dispensing details to pharmacy notes
                dispensing_summary = '\n'.join([
                    f'- {log["medicine_name"]}: {log["quantity_dispensed"]} units '
                    f'(remaining: {log["remaining_stock"]})'
                    for log in dispensing_log
                ])
                
                prescription.pharmacy_notes = f'{pharmacy_notes}\n\nDispensed:\n{dispensing_summary}'.strip()
                
            else:
                # Non-dispensing status update
                prescription.pharmacy_status = new_status
                if pharmacy_notes:
                    prescription.pharmacy_notes = pharmacy_notes
                    
                if new_status == 'cancelled':
                    prescription.is_deleted = True
            
            # Create audit log
            log_entry = QueueLog(
                appointment_id=prescription.appointment_id,
                status_change=f'Prescription {new_status}',
                notes=f'Prescription ID: {prescription.id}, Status: {prescription.pharmacy_status}'
            )
            db.session.add(log_entry)
            
            db.session.commit()
            
            # Log prescription status update audit event
            log_audit_event(
                action_type='UPDATE',
                resource_type='PRESCRIPTION',
                resource_id=prescription.id,
                details={
                    'new_status': new_status,
                    'dispensing_log': dispensing_log if new_status == 'dispensed' else None,
                    'total_medicines_dispensed': len(dispensing_log) if dispensing_log else 0,
                    'patient_id': prescription.patient_id
                },
                user_id=get_jwt_identity(),
                request_obj=request
            )
            
            return jsonify({
                'message': f'Prescription status updated to {new_status}',
                'prescription': prescription.to_dict(),
                'dispensing_log': dispensing_log if new_status == 'dispensed' else None
            }), 200
            
        except Exception as e:
            db.session.rollback()
            if 'concurrent update' in str(e).lower() or 'could not serialize' in str(e).lower():
                if attempt < max_retries - 1:
                    continue  # Retry on concurrency conflict
            
            if attempt == max_retries - 1:
                app.logger.error(f'Prescription status update failed after {max_retries} attempts: {str(e)}')
                return jsonify({
                    'error': 'Status update failed due to system error',
                    'details': str(e)
                }), 500
    
    return jsonify({'error': 'Update failed after multiple retries'}), 500

# Frontend expects /api/pharmacy/inventory endpoint
@app.route('/api/pharmacy/inventory', methods=['GET'])
@role_required(['pharmacy'])
def get_pharmacy_inventory():
    try:
        medicines = Medicine.query.filter_by(is_available=True).all()
        
        result = []
        for medicine in medicines:
            result.append({
                'id': medicine.id,
                'medicine_name': medicine.name,
                'generic_name': medicine.generic_name,
                'category': medicine.category,
                'quantity_in_stock': medicine.stock_quantity,
                'reorder_level': medicine.reorder_level,
                'price_per_unit': medicine.price_per_unit,
                'low_stock': medicine.stock_quantity <= medicine.reorder_level
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pharmacy/medicines', methods=['GET', 'POST'])
@role_required(['pharmacy'])
def manage_medicines():
    try:
        if request.method == 'GET':
            medicines = Medicine.query.filter_by(is_available=True).all()
            return jsonify([medicine.to_dict() for medicine in medicines]), 200
        
        elif request.method == 'POST':
            data = request.get_json()
            
            medicine = Medicine(
                name=data['name'],
                generic_name=data.get('generic_name', ''),
                category=data.get('category', ''),
                strength=data.get('strength', ''),
                form=data.get('form', ''),
                price_per_unit=data.get('price_per_unit', 0.0),
                stock_quantity=data.get('stock_quantity', 0),
                reorder_level=data.get('reorder_level', 10),
                expiry_date=datetime.strptime(data['expiry_date'], '%Y-%m-%d').date() if data.get('expiry_date') else None,
                manufacturer=data.get('manufacturer', '')
            )
            
            db.session.add(medicine)
            db.session.commit()
            
            return jsonify({
                'message': 'Medicine added successfully',
                'medicine': medicine.to_dict()
            }), 201
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pharmacy/medicines/<int:medicine_id>', methods=['PUT'])
@role_required(['pharmacy'])
def update_medicine(medicine_id):
    try:
        medicine = Medicine.query.get(medicine_id)
        if not medicine:
            return jsonify({'error': 'Medicine not found'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            medicine.name = data['name']
        if 'generic_name' in data:
            medicine.generic_name = data['generic_name']
        if 'category' in data:
            medicine.category = data['category']
        if 'strength' in data:
            medicine.strength = data['strength']
        if 'form' in data:
            medicine.form = data['form']
        if 'batch_number' in data:
            medicine.batch_number = data['batch_number']
        if 'price_per_unit' in data:
            medicine.price_per_unit = data['price_per_unit']
        if 'stock_quantity' in data:
            medicine.stock_quantity = data['stock_quantity']
        if 'reorder_level' in data:
            medicine.reorder_level = data['reorder_level']
        if 'expiry_date' in data and data['expiry_date']:
            medicine.expiry_date = datetime.strptime(data['expiry_date'], '%Y-%m-%d').date()
        if 'manufacturer' in data:
            medicine.manufacturer = data['manufacturer']
        if 'is_available' in data:
            medicine.is_available = data['is_available']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Medicine updated successfully',
            'medicine': medicine.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pharmacy/low-stock', methods=['GET'])
@role_required(['pharmacy'])
def get_low_stock_medicines():
    try:
        low_stock = Medicine.query.filter(
            Medicine.stock_quantity <= Medicine.reorder_level,
            Medicine.is_available == True
        ).all()
        
        return jsonify([medicine.to_dict() for medicine in low_stock]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =======================
# REGISTER BLUEPRINTS
# =======================
# DISABLED: Service layer refactor deferred to Phase-5
# from appointments.routes import appointments_bp
# app.register_blueprint(appointments_bp, url_prefix='/api/appointments')

# =======================
# DEBUG: Print all registered routes
# =======================
print("\n" + "=" * 60)
print("REGISTERED ROUTES:")
print("=" * 60)
for rule in app.url_map.iter_rules():
    if '/api/' in str(rule):
        print(f"  {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods - {'HEAD', 'OPTIONS'})}]")
print("=" * 60 + "\n")

# =======================
# UTILITY ROUTES
# =======================

@app.route('/api/initialize-db', methods=['POST'])
def initialize_database():
    try:
        # Drop all tables and recreate
        db.drop_all()
        db.create_all()
        
        # Create default departments
        departments = [
            Department(name='General Medicine', description='General consultation and treatment'),
            Department(name='Pediatrics', description='Child healthcare and treatment'),
            Department(name='Cardiology', description='Heart and cardiovascular treatment'),
            Department(name='Orthopedics', description='Bone and joint treatment'),
            Department(name='Dermatology', description='Skin and hair treatment'),
            Department(name='ENT', description='Ear, Nose, and Throat treatment'),
            Department(name='Gynecology', description='Women\'s health and treatment')
        ]
        
        for dept in departments:
            db.session.add(dept)
        
        # Create sample medicines
        medicines = [
            Medicine(name='Paracetamol', generic_name='Acetaminophen', category='Analgesic', 
                    strength='500mg', form='tablet', price_per_unit=2.0, stock_quantity=100),
            Medicine(name='Amoxicillin', generic_name='Amoxicillin', category='Antibiotic', 
                    strength='250mg', form='capsule', price_per_unit=5.0, stock_quantity=50),
            Medicine(name='Ibuprofen', generic_name='Ibuprofen', category='Anti-inflammatory', 
                    strength='400mg', form='tablet', price_per_unit=3.0, stock_quantity=75),
            Medicine(name='Cetirizine', generic_name='Cetirizine', category='Antihistamine', 
                    strength='10mg', form='tablet', price_per_unit=1.5, stock_quantity=80),
            Medicine(name='Omeprazole', generic_name='Omeprazole', category='Antacid', 
                    strength='20mg', form='capsule', price_per_unit=4.0, stock_quantity=60)
        ]
        
        for medicine in medicines:
            db.session.add(medicine)
        
        # Create sample doctors and their profiles
        sample_doctors = [
            {
                'username': 'dr_wilson',
                'email': 'sarah.wilson@hospital.com',
                'password_hash': generate_password_hash('doctor123'),
                'full_name': 'Dr. Sarah Wilson',
                'role': 'doctor',
                'specialization': 'Cardiology',
                'department_id': 3,
                'experience_years': 10
            },
            {
                'username': 'dr_brown',
                'email': 'james.brown@hospital.com',
                'password_hash': generate_password_hash('doctor123'),
                'full_name': 'Dr. James Brown',
                'role': 'doctor',
                'specialization': 'General Medicine',
                'department_id': 1,
                'experience_years': 15
            },
            {
                'username': 'dr_smith',
                'email': 'emily.smith@hospital.com',
                'password_hash': generate_password_hash('doctor123'),
                'full_name': 'Dr. Emily Smith',
                'role': 'doctor',
                'specialization': 'Pediatrics',
                'department_id': 2,
                'experience_years': 8
            }
        ]
        
        for doctor_data in sample_doctors:
            # Create user
            doctor_user = User(
                username=doctor_data['username'],
                email=doctor_data['email'],
                password_hash=doctor_data['password_hash'],
                full_name=doctor_data['full_name'],
                role=doctor_data['role'],
                is_active=True
            )
            db.session.add(doctor_user)
            db.session.flush()  # Get the user ID
            
            # Create doctor profile
            doctor_profile = DoctorProfile(
                user_id=doctor_user.id,
                department_id=doctor_data['department_id'],
                specialization=doctor_data['specialization'],
                experience_years=doctor_data['experience_years'],
                consultation_fee=500.0,
                max_patients_per_day=20,
                current_token=0
            )
            db.session.add(doctor_profile)
        
        db.session.commit()
        
        return jsonify({'message': 'Database initialized successfully with sample doctors'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
@jwt_required()
def get_system_stats():
    try:
        today = date.today()
        
        stats = {
            'total_users': User.query.count(),
            'total_appointments_today': Appointment.query.filter_by(appointment_date=today).count(),
            'completed_appointments_today': Appointment.query.filter_by(
                appointment_date=today, 
                status='completed'
            ).count(),
            'pending_prescriptions': Prescription.query.filter_by(pharmacy_status='pending').count(),
            'active_departments': Department.query.filter_by(is_active=True).count()
        }
        
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =======================
# =======================
# ADMIN ENDPOINTS
# =======================

@app.route('/api/admin/security-audit', methods=['GET'])
@role_required(['admin'])
def get_security_audit():
    """Get security audit information for administrators"""
    try:
        # Recent security events
        recent_audit_logs = AuditLog.query.filter(
            AuditLog.action_type == 'SECURITY_EVENT',
            AuditLog.timestamp >= datetime.utcnow() - timedelta(hours=24)
        ).order_by(AuditLog.timestamp.desc()).limit(50).all()
        
        # Failed login statistics
        failed_login_stats = {
            'active_lockouts': len([k for k, v in failed_login_attempts.items() 
                                  if v['count'] >= LOCKOUT_THRESHOLD]),
            'recent_failures': len([k for k, v in failed_login_attempts.items() 
                                  if datetime.utcnow().timestamp() - v['last_attempt'] < 3600]),
            'total_tracked_attempts': len(failed_login_attempts)
        }
        
        # Rate limiting statistics
        rate_limit_stats = {
            'currently_limited_ips': len(rate_limit_tracker),
            'total_tracked_ips': len(rate_limit_tracker)
        }
        
        return jsonify({
            'security_events': [log.to_dict() for log in recent_audit_logs],
            'failed_login_stats': failed_login_stats,
            'rate_limit_stats': rate_limit_stats,
            'audit_timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/database-migrate', methods=['POST'])
@role_required(['admin'])  
def migrate_database():
    """Apply database migrations and constraints"""
    try:
        # Create all tables and constraints
        db.create_all()
        
        migration_results = []
        
        # Create additional indexes manually if they don't exist
        try:
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_audit_user_time 
                ON audit_logs (user_id, timestamp);
            """))
            migration_results.append('Created audit_logs user_time index')
        except Exception as e:
            migration_results.append(f'Audit index: {str(e)[:100]}')
        
        try:
            db.session.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_medicine_name_lower 
                ON medicines (LOWER(name));
            """))
            migration_results.append('Created medicine name unique index')
        except Exception as e:
            migration_results.append(f'Medicine index: {str(e)[:100]}')
        except Exception as e:
            migration_results.append(f'Medicine index: {str(e)[:100]}')
        
        db.session.commit()
        
        # Log migration event
        log_audit_event(
            action_type='SYSTEM_MIGRATION',
            resource_type='DATABASE',
            details={'migration_results': migration_results},
            user_id=get_jwt_identity(),
            request_obj=request
        )
        
        return jsonify({
            'message': 'Database migration completed',
            'results': migration_results,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Migration failed',
            'details': str(e)[:200]
        }), 500

# =======================
# REACT FRONTEND SERVING
# =======================

# React frontend is served separately via Vite (npm run dev) on port 3000
# This backend only serves REST API endpoints on port 5000

# PRODUCTION DATA SEEDING FUNCTION
def seed_production_data():
    """Seed production-ready hospitals and departments"""
    try:
        # Create default hospital if doesn't exist
        if not Hospital.query.first():
            hospital = Hospital(
                id=str(uuid.uuid4()),
                name='Coimbatore Medical Center',
                location='Coimbatore', 
                active=True
            )
            db.session.add(hospital)
            db.session.flush()  # Get the ID
            
            # Create essential departments
            departments = [
                'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology',
                'General Medicine', 'Pediatrics', 'Gynecology', 'ENT', 
                'Ophthalmology', 'Gastroenterology'
            ]
            
            for dept_name in departments:
                department = Department(
                    id=str(uuid.uuid4()),
                    hospital_id=hospital.id,
                    name=dept_name,
                    description=f'{dept_name} Department',
                    is_active=True
                )
                db.session.add(department)
            
            db.session.commit()
            app.logger.info('Production data seeded successfully')
            
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Seeding failed: {str(e)}')

# =======================
# AUTO CLEANUP — PAST APPOINTMENTS
# =======================

def cleanup_past_appointments():
    """Mark any booked/in_queue/consulting appointments from previous days as expired."""
    try:
        today = date.today()
        expired = Appointment.query.filter(
            Appointment.appointment_date < today,
            Appointment.status.in_(['booked', 'in_queue', 'consulting'])
        ).all()
        count = len(expired)
        for appt in expired:
            appt.status = 'expired'
        if count:
            db.session.commit()
            app.logger.info(f'Auto-cleanup: marked {count} past appointment(s) as expired')
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Auto-cleanup failed: {e}')


def _nightly_cleanup_loop():
    """Background thread: runs cleanup daily at midnight."""
    import time as _time
    while True:
        now = datetime.now()
        # Seconds until next midnight
        next_midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=5, microsecond=0)
        sleep_secs = (next_midnight - now).total_seconds()
        _time.sleep(sleep_secs)
        with app.app_context():
            cleanup_past_appointments()


def schedule_nightly_cleanup():
    t = threading.Thread(target=_nightly_cleanup_loop, daemon=True)
    t.start()
    app.logger.info('Nightly appointment cleanup scheduler started')


if __name__ == '__main__':
    with app.app_context():
        # Create database tables
        db.create_all()
        
        # Seed production data
        seed_production_data()

        # Clean up any leftover past appointments on startup
        cleanup_past_appointments()

        # Schedule nightly cleanup at midnight
        schedule_nightly_cleanup()
        
    # Run the app
    print("Healthcare Queue-Free System Starting...")
    print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print("Server running at http://localhost:5001")
    app.run(debug=False, host='0.0.0.0', port=5001)