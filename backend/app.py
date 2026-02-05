"""
Queue-Free Healthcare Management System - Complete Flask Backend
PostgreSQL + Real-time Queue Management + Role-based Authentication
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, time, date
from functools import wraps
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy import text
import os
import json
import random
import uuid
import psycopg2

app = Flask(__name__, static_folder='static')

# Configuration for PostgreSQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:Manisha14@localhost/queue'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
    'pool_timeout': 20,
    'max_overflow': 0
}
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'healthcare-queue-secret-key-2026')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'healthcare-socket-secret-2026')

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO with threading mode to avoid eventlet compatibility issues
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Global queue status for real-time updates
active_queues = {}
prescription_queue = []

# JWT Token Blacklist for security
blacklisted_tokens = set()

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload['jti']
    return jti in blacklisted_tokens

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return {
        'success': False,
        'message': 'Token has expired',
        'data': None
    }, 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return {
        'success': False,
        'message': 'Invalid token',
        'data': None
    }, 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return {
        'success': False,
        'message': 'Authorization token required',
        'data': None
    }, 401

# =======================
# DATABASE MODELS
# =======================

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    role = db.Column(db.String(20), nullable=False, index=True)  # patient, doctor, pharmacy
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Add check constraints
    __table_args__ = (
        db.CheckConstraint("role IN ('patient', 'doctor', 'pharmacy')", name='check_valid_role'),
        db.CheckConstraint("length(username) >= 3", name='check_username_length'),
        db.CheckConstraint("length(full_name) >= 2", name='check_name_length'),
    )
    
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

class Department(db.Model):
    __tablename__ = 'departments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active
        }

class DoctorProfile(db.Model):
    __tablename__ = 'doctor_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='RESTRICT'), nullable=False)
    specialization = db.Column(db.String(100))
    hospital = db.Column(db.String(100), nullable=False, default='Coimbatore Medical College Hospital')
    experience_years = db.Column(db.Integer)
    consultation_fee = db.Column(db.Float, default=0.0)
    available_from = db.Column(db.Time, default=time(9, 0))
    available_to = db.Column(db.Time, default=time(17, 0))
    max_patients_per_day = db.Column(db.Integer, default=50)
    current_token = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships with cascading
    user = db.relationship('User', backref=db.backref('doctor_profile', uselist=False, cascade='all, delete-orphan'))
    department = db.relationship('Department', backref='doctors')
    
    # Add check constraints
    __table_args__ = (
        db.CheckConstraint("experience_years >= 0", name='check_positive_experience'),
        db.CheckConstraint("consultation_fee >= 0", name='check_positive_fee'),
        db.CheckConstraint("max_patients_per_day > 0", name='check_positive_max_patients'),
        db.CheckConstraint("current_token >= 0", name='check_positive_current_token'),
        db.CheckConstraint("available_from < available_to", name='check_valid_time_range'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'doctor_name': self.user.full_name,
            'department_id': self.department_id,
            'department': self.department.name,
            'hospital': self.hospital,
            'specialization': self.specialization,
            'experience_years': self.experience_years,
            'consultation_fee': self.consultation_fee,
            'available_from': self.available_from.strftime('%H:%M') if self.available_from else None,
            'available_to': self.available_to.strftime('%H:%M') if self.available_to else None,
            'current_token': self.current_token
        }

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='RESTRICT'), nullable=False)
    appointment_date = db.Column(db.Date, nullable=False, index=True)
    appointment_time = db.Column(db.Time, nullable=False)
    token_number = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='booked', nullable=False, index=True)
    priority = db.Column(db.String(10), default='normal', nullable=False)
    estimated_wait_time = db.Column(db.Integer, default=0)
    actual_start_time = db.Column(db.DateTime)
    actual_end_time = db.Column(db.DateTime)
    symptoms = db.Column(db.Text, nullable=False)
    doctor_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Enhanced relationships
    patient = db.relationship('User', foreign_keys=[patient_id], backref='patient_appointments')
    doctor = db.relationship('User', foreign_keys=[doctor_id], backref='doctor_appointments')
    department = db.relationship('Department', backref='appointments')
    
    # Add constraints
    __table_args__ = (
        db.CheckConstraint("status IN ('booked', 'in_queue', 'consulting', 'completed', 'cancelled', 'no_show')", name='check_valid_status'),
        db.CheckConstraint("priority IN ('normal', 'emergency')", name='check_valid_priority'),
        db.CheckConstraint("token_number > 0", name='check_positive_token'),
        db.CheckConstraint("estimated_wait_time >= 0", name='check_positive_wait_time'),
        db.UniqueConstraint('doctor_id', 'appointment_date', 'token_number', name='unique_doctor_date_token'),
        db.Index('idx_appointment_date_status', 'appointment_date', 'status'),
        db.Index('idx_doctor_date_token', 'doctor_id', 'appointment_date', 'token_number'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_name': self.patient.full_name,
            'doctor_name': self.doctor.full_name,
            'department': self.department.name,  # Frontend expects 'department', not 'department_name'
            'department_name': self.department.name,  # Keep both for compatibility
            'appointment_date': self.appointment_date.isoformat(),
            'appointment_time': self.appointment_time.strftime('%H:%M'),
            'token_number': self.token_number,
            'status': self.status,
            'priority': self.priority,
            'estimated_wait_time': self.estimated_wait_time,
            'symptoms': self.symptoms,
            'doctor_notes': self.doctor_notes,
            'diagnosis': self.doctor_notes,  # Frontend expects 'diagnosis' field
            'actual_start_time': self.actual_start_time.isoformat() if self.actual_start_time else None,
            'actual_end_time': self.actual_end_time.isoformat() if self.actual_end_time else None
        }

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    prescription_data = db.Column(db.JSON, nullable=False)  # List of medicines
    pharmacy_status = db.Column(db.String(20), default='pending')  # pending, preparing, ready, dispensed
    pharmacy_notes = db.Column(db.Text)
    pickup_token = db.Column(db.String(10))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    dispensed_at = db.Column(db.DateTime)
    
    appointment = db.relationship('Appointment', backref='prescriptions')
    patient = db.relationship('User', foreign_keys=[patient_id])
    doctor = db.relationship('User', foreign_keys=[doctor_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_name': self.patient.full_name,
            'doctor_name': self.doctor.full_name,
            'prescription_data': self.prescription_data,
            'pharmacy_status': self.pharmacy_status,
            'pharmacy_notes': self.pharmacy_notes,
            'pickup_token': self.pickup_token,
            'created_at': self.created_at.isoformat(),
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
    price_per_unit = db.Column(db.Float, default=0.0)
    stock_quantity = db.Column(db.Integer, default=0)
    reorder_level = db.Column(db.Integer, default=10)
    expiry_date = db.Column(db.Date)
    manufacturer = db.Column(db.String(100))
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'generic_name': self.generic_name,
            'category': self.category,
            'strength': self.strength,
            'form': self.form,
            'price_per_unit': self.price_per_unit,
            'stock_quantity': self.stock_quantity,
            'reorder_level': self.reorder_level,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'manufacturer': self.manufacturer,
            'is_available': self.is_available
        }

class QueueLog(db.Model):
    __tablename__ = 'queue_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    status_change = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    
    appointment = db.relationship('Appointment', backref='queue_logs')

# =======================
# ROLE-BASED ACCESS CONTROL
# =======================

def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            try:
                current_user_id = get_current_user_id()
                
                if not current_user_id:
                    return {
                        'success': False,
                        'message': 'Invalid user identity',
                        'data': None
                    }, 401
                
                # Convert string ID to integer for database query
                current_user = User.query.get(int(current_user_id))
                
                if not current_user:
                    return {
                        'success': False,
                        'message': 'User not found',
                        'data': None
                    }, 404
                    
                if not current_user.is_active:
                    return {
                        'success': False,
                        'message': 'Account is deactivated',
                        'data': None
                    }, 403
                
                if current_user.role not in allowed_roles:
                    return {
                        'success': False,
                        'message': f'Access denied. Required roles: {", ".join(allowed_roles)}',
                        'data': None
                    }, 403
                
                return f(*args, **kwargs)
                
            except Exception as e:
                return {
                    'success': False,
                    'message': 'Authorization failed',
                    'data': None
                }, 500
        return decorated_function
    return decorator

def get_current_user_id():
    """Helper function to get current user ID as integer from JWT"""
    return int(get_jwt_identity())

# =======================
# HEALTH CHECK & SYSTEM ROUTES
# =======================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for system monitoring"""
    try:
        # Test database connection
        db.session.execute(text('SELECT 1'))
        db_status = 'healthy'
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'database': db_status,
        'version': '1.0.0',
        'services': {
            'authentication': 'active',
            'appointments': 'active',
            'prescriptions': 'active',
            'websockets': 'active'
        }
    }), 200

@app.route('/api/test-jwt', methods=['POST'])
def test_jwt():
    """Test JWT token validation"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'No token provided'}), 400
        
        # Try to decode the token manually
        from flask_jwt_extended import decode_token
        
        try:
            decoded = decode_token(token)
            return jsonify({
                'success': True,
                'decoded': decoded,
                'message': 'Token is valid'
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Token validation failed'
            }), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =======================
# AUTHENTICATION ROUTES
# =======================

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields (username is optional, will use email as fallback)
        required_fields = ['email', 'password', 'full_name', 'role']
        for field in required_fields:
            if field not in data or not data[field]:
                return {
                    'success': False,
                    'message': f'{field} is required',
                    'data': None
                }, 400
        
        # Use email as username if username is not provided or empty
        if 'username' not in data or not data['username']:
            data['username'] = data['email']
        
        # Validate password strength
        password = data['password']
        if len(password) < 6:
            return {
                'success': False,
                'message': 'Password must be at least 6 characters long',
                'data': None
            }, 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return {
                'success': False,
                'message': 'Username already exists',
                'data': None
            }, 400
        
        if User.query.filter_by(email=data['email']).first():
            return {
                'success': False,
                'message': 'Email already exists',
                'data': None
            }, 400
        
        # Validate role
        if data['role'] not in ['patient', 'doctor', 'pharmacy']:
            return {
                'success': False,
                'message': 'Invalid role. Must be patient, doctor, or pharmacy',
                'data': None
            }, 400
        
        # Create new user
        password_hash = generate_password_hash(data['password'])
        new_user = User(
            username=data['username'],
            email=data['email'],
            password_hash=password_hash,
            full_name=data['full_name'],
            phone=data.get('phone', ''),
            role=data['role']
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'User registered successfully',
            'data': {'user_id': new_user.id}
        }, 201
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'message': f'Registration failed: {str(e)}',
            'data': None
        }, 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Accept both email/username and password
        identifier = data.get('email') or data.get('username')
        password = data.get('password')
        
        if not identifier or not password:
            return {
                'success': False,
                'message': 'Email/username and password are required',
                'data': None
            }, 400
        
        # Try to find user by email or username
        user = User.query.filter(
            (User.email == identifier) | (User.username == identifier)
        ).first()
        
        if not user or not user.check_password(password):
            return {
                'success': False,
                'message': 'Invalid credentials',
                'data': None
            }, 401
        
        if not user.is_active:
            return {
                'success': False,
                'message': 'Account is deactivated. Please contact administrator.',
                'data': None
            }, 401
        
        # Create JWT token with user role
        # IMPORTANT: identity must be a string, not an integer
        additional_claims = {"role": user.role, "username": user.username}
        access_token = create_access_token(
            identity=str(user.id),  # Convert to string
            additional_claims=additional_claims
        )
        
        print(f"=== LOGIN SUCCESSFUL ===")
        print(f"User: {user.username} (ID: {user.id}, Role: {user.role})")
        print(f"Token (first 50 chars): {access_token[:50]}...")
        print(f"JWT Secret Key: {app.config['JWT_SECRET_KEY'][:20]}...")
        
        return {
            'success': True,
            'message': 'Login successful',
            'data': {
                'access_token': access_token,
                'user': user.to_dict()
            }
        }, 200
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Login failed: {str(e)}',
            'data': None
        }, 500

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        print("=== PROFILE ENDPOINT CALLED ===")
        print(f"Headers: {dict(request.headers)}")
        
        current_user_id = get_current_user_id()
        print(f"Current user ID from JWT (string): {current_user_id}")
        
        # Convert string ID back to integer for database query
        user = User.query.get(int(current_user_id))
        
        if not user:
            print(f"User not found for ID: {current_user_id}")
            return {
                'success': False,
                'message': 'User not found',
                'data': None
            }, 404
        
        print(f"User found: {user.username} ({user.role})")
        return {
            'success': True,
            'message': 'Profile retrieved successfully',
            'data': user.to_dict()
        }, 200
        
    except Exception as e:
        print(f"Profile endpoint error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': str(e),
            'data': None
        }, 500

@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        jti = get_jwt()['jti']
        blacklisted_tokens.add(jti)
        
        return {
            'success': True,
            'message': 'Successfully logged out',
            'data': None
        }, 200
        
    except Exception as e:
        return {
            'success': False,
            'message': str(e),
            'data': None
        }, 500

# =======================
# PATIENT ROUTES
# =======================

@app.route('/api/patient/departments', methods=['GET'])
@role_required(['patient'])
def get_departments():
    try:
        departments = Department.query.filter_by(is_active=True).all()
        return {
            'success': True,
            'message': 'Departments retrieved successfully',
            'data': [dept.to_dict() for dept in departments]
        }, 200
    except Exception as e:
        return {
            'success': False,
            'message': f'Failed to get departments: {str(e)}',
            'data': None
        }, 500

@app.route('/api/patient/doctors', methods=['GET'])
@role_required(['patient'])
def get_doctors():
    try:
        department_id = request.args.get('department_id')
        query = db.session.query(DoctorProfile, User, Department).join(User).join(Department)
        
        if department_id:
            query = query.filter(DoctorProfile.department_id == department_id)
        
        doctors = query.all()
        
        result = []
        for doctor_profile, user, department in doctors:
            result.append({
                'id': user.id,  # Frontend expects user.id not doctor_profile.id
                'name': user.full_name,  # Frontend expects 'name' not 'doctor_name'
                'department': department.name,  # Frontend expects 'department' 
                'specialization': doctor_profile.specialization,
                'consultation_fee': doctor_profile.consultation_fee,
                'hospital': doctor_profile.hospital,
                'experience_years': doctor_profile.experience_years,
                'available_from': doctor_profile.available_from.strftime('%H:%M') if doctor_profile.available_from else None,
                'available_to': doctor_profile.available_to.strftime('%H:%M') if doctor_profile.available_to else None,
                'current_token': doctor_profile.current_token
            })
        
        return jsonify(result), 200  # Return doctors array directly, not wrapped
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Frontend expects /api/doctors endpoint
@app.route('/api/doctors', methods=['GET'])
@role_required(['patient'])
def get_all_doctors():
    try:
        query = db.session.query(DoctorProfile, User, Department).join(User).join(Department)
        doctors = query.all()
        
        result = []
        for doctor_profile, user, department in doctors:
            result.append({
                'id': doctor_profile.id,
                'name': user.full_name,
                'specialization': doctor_profile.specialization,
                'department': department.name,
                'hospital': doctor_profile.hospital,
                'consultation_fee': doctor_profile.consultation_fee,
                'current_token': doctor_profile.current_token
            })
        
        return {
            'success': True,
            'message': 'All doctors retrieved successfully', 
            'data': {'doctors': result}
        }, 200
    except Exception as e:
        return {
            'success': False,
            'message': f'Failed to get doctors: {str(e)}',
            'data': None
        }, 500

@app.route('/api/patient/book-appointment', methods=['POST'])
@role_required(['patient'])
def book_appointment():
    try:
        current_user_id = get_current_user_id()
        data = request.get_json()
        
        required_fields = ['doctor_id', 'appointment_date', 'appointment_time', 'symptoms']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get doctor and department info
        doctor = User.query.get(data['doctor_id'])
        if not doctor or doctor.role != 'doctor':
            return jsonify({'error': 'Invalid doctor'}), 400
        
        doctor_profile = DoctorProfile.query.filter_by(user_id=doctor.id).first()
        if not doctor_profile:
            return jsonify({'error': 'Doctor profile not found'}), 400
        
        # Parse appointment date and time
        appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        appointment_time = datetime.strptime(data['appointment_time'], '%H:%M').time()
        
        # Check for existing appointments at the same time
        existing = Appointment.query.filter_by(
            doctor_id=data['doctor_id'],
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status='booked'
        ).first()
        
        if existing:
            return jsonify({'error': 'This time slot is already booked'}), 400
        
        # Generate token number for the day
        daily_appointments = Appointment.query.filter_by(
            doctor_id=data['doctor_id'],
            appointment_date=appointment_date
        ).count()
        
        token_number = daily_appointments + 1
        
        # Create appointment
        appointment = Appointment(
            patient_id=current_user_id,
            doctor_id=data['doctor_id'],
            department_id=doctor_profile.department_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            token_number=token_number,
            symptoms=data['symptoms'],
            priority=data.get('priority', 'normal')
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        # Log the appointment creation
        log_entry = QueueLog(
            appointment_id=appointment.id,
            status_change='Appointment booked',
            notes=f'Token #{token_number} assigned'
        )
        db.session.add(log_entry)
        db.session.commit()
        
        # Emit real-time update (disabled for now)
        # socketio.emit('appointment_booked', {
        #     'appointment_id': appointment.id,
        #     'token_number': token_number,
        #     'doctor_name': doctor.full_name
        # }, room=f'patient_{current_user_id}')
        
        return jsonify({
            'message': 'Appointment booked successfully',
            'token_number': token_number,  # Frontend expects token_number at root level
            'appointment': appointment.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Frontend expects /api/appointments endpoint for booking  
@app.route('/api/appointments', methods=['POST'])
@role_required(['patient'])
def create_appointment():
    try:
        current_user_id = get_current_user_id()
        data = request.get_json()
        
        required_fields = ['doctor_id', 'appointment_date', 'appointment_time', 'symptoms']
        for field in required_fields:
            if field not in data or not data[field]:
                return {
                    'success': False,
                    'message': f'{field} is required',
                    'data': None
                }, 400
        
        # Get doctor profile to get department  
        doctor_profile = DoctorProfile.query.get(data['doctor_id'])
        if not doctor_profile:
            return {
                'success': False,
                'message': 'Doctor not found',
                'data': None
            }, 404
        
        # Parse appointment date and time
        try:
            appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
            appointment_time = datetime.strptime(data['appointment_time'], '%H:%M').time()
        except ValueError:
            return {
                'success': False,
                'message': 'Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time',
                'data': None
            }, 400

        # Prevent booking past dates
        if appointment_date < datetime.now().date():
            return {
                'success': False,
                'message': 'Cannot book appointments in the past',
                'data': None
            }, 400

        # Check Doctor Availability (Time)
        if doctor_profile.available_from and doctor_profile.available_to:
            if not (doctor_profile.available_from <= appointment_time <= doctor_profile.available_to):
                return {
                    'success': False,
                    'message': f'Doctor is only available between {doctor_profile.available_from.strftime("%H:%M")} and {doctor_profile.available_to.strftime("%H:%M")}',
                    'data': None
                }, 400

        # Check for Double Booking (Same Patient, Same Doctor, Same Day)
        existing_appointment = Appointment.query.filter_by(
            patient_id=current_user_id,
            doctor_id=doctor_profile.user_id,
            appointment_date=appointment_date
        ).filter(Appointment.status.in_(['booked', 'in_queue', 'consulting'])).first()
        
        if existing_appointment:
            return {
                'success': False,
                'message': 'You already have an appointment with this doctor today',
                'data': None
            }, 409
        
        # Generate token number for the day
        daily_appointments = Appointment.query.filter_by(
            doctor_id=doctor_profile.user_id,
            appointment_date=appointment_date
        ).count()
        
        # Check Max Patients
        if daily_appointments >= doctor_profile.max_patients_per_day:
            return {
                'success': False,
                'message': 'Doctor has reached maximum patients for this day',
                'data': None
            }, 400
        
        token_number = daily_appointments + 1
        
        # Create appointment
        appointment = Appointment(
            patient_id=current_user_id,
            doctor_id=doctor_profile.user_id,
            department_id=doctor_profile.department_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            token_number=token_number,
            symptoms=data['symptoms'],
            priority=data.get('priority', 'normal')
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        # Real-time: Notify the doctor
        socketio.emit('new_appointment', {
            'message': 'New appointment booked',
            'appointment': appointment.to_dict()
        }, room=f'user_{appointment.doctor_id}')
        
        return {
            'success': True,
            'message': 'Appointment booked successfully',
            'data': {
                'appointment_id': appointment.id,
                'token_number': token_number,
                'status': 'booked',
                'appointment_date': data['appointment_date'],
                'appointment_time': data['appointment_time']
            }
        }, 201
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'message': f'Failed to book appointment: {str(e)}',
            'data': None
        }, 500

@app.route('/api/patient/appointments', methods=['GET'])
@role_required(['patient'])
def get_patient_appointments():
    try:
        current_user_id = get_current_user_id()
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
                    Appointment.status.in_(['in_queue', 'consulting'])
                ).count()
                
                appointment_data['queue_position'] = ahead_count + 1
                appointment_data['estimated_wait_time'] = ahead_count * 15  # 15 minutes per patient
            
            result.append(appointment_data)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/patient/queue-status/<int:appointment_id>', methods=['GET'])
@role_required(['patient'])
def get_queue_status(appointment_id):
    try:
        current_user_id = get_current_user_id()
        appointment = Appointment.query.filter_by(
            id=appointment_id,
            patient_id=current_user_id
        ).first()
        
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Calculate queue position
        ahead_count = Appointment.query.filter(
            Appointment.doctor_id == appointment.doctor_id,
            Appointment.appointment_date == appointment.appointment_date,
            Appointment.token_number < appointment.token_number,
            Appointment.status.in_(['in_queue', 'consulting'])
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
        current_user_id = get_current_user_id()
        prescriptions = Prescription.query.filter_by(patient_id=current_user_id).order_by(Prescription.created_at.desc()).all()
        
        return jsonify([prescription.to_dict() for prescription in prescriptions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/verify', methods=['GET'])
@jwt_required()
def verify_token():
    try:
        current_user_id = get_current_user_id()
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'valid': False}), 401
        return jsonify({'valid': True, 'role': user.role, 'user_id': user.id}), 200
    except Exception:
        return jsonify({'valid': False}), 401

@app.route('/api/appointments/<int:appointment_id>/cancel', methods=['POST', 'DELETE'])
@role_required(['patient', 'doctor'])
def cancel_appointment(appointment_id):
    """
    Cancel appointment with proper token reordering and notifications
    """
    try:
        current_user_id = get_current_user_id()
        current_user = User.query.get(current_user_id)
        
        with db.session.begin():
            # Get appointment with lock
            appointment = db.session.query(Appointment).with_for_update().get(appointment_id)
            
            if not appointment:
                return {
                    'success': False,
                    'message': 'Appointment not found',
                    'data': None
                }, 404
            
            # Check permissions
            if current_user.role == 'patient' and appointment.patient_id != current_user_id:
                return {
                    'success': False,
                    'message': 'You can only cancel your own appointments',
                    'data': None
                }, 403
            
            if current_user.role == 'doctor' and appointment.doctor_id != current_user_id:
                return {
                    'success': False,
                    'message': 'You can only cancel appointments for your patients',
                    'data': None
                }, 403
            
            # Check if appointment can be cancelled
            if appointment.status in ['completed', 'cancelled']:
                return {
                    'success': False,
                    'message': f'Cannot cancel {appointment.status} appointment',
                    'data': None
                }, 400
            
            # Store original token for reordering
            cancelled_token = appointment.token_number
            appointment_date = appointment.appointment_date
            doctor_id = appointment.doctor_id
            
            # Update appointment status
            appointment.status = 'cancelled'
            appointment.actual_end_time = datetime.utcnow()
            
            # Reorder subsequent tokens to fill the gap
            subsequent_appointments = db.session.query(Appointment).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date == appointment_date,
                Appointment.token_number > cancelled_token,
                Appointment.status.in_(['booked', 'in_queue'])
            ).all()
            
            for apt in subsequent_appointments:
                apt.token_number -= 1
            
            # Log the cancellation
            log_entry = QueueLog(
                appointment_id=appointment.id,
                status_change=f'CANCELLED by {current_user.role}',
                notes=f'Token #{cancelled_token} cancelled, subsequent tokens reordered'
            )
            db.session.add(log_entry)
        
        # Real-time notifications
        if current_user.role == 'patient':
            # Notify doctor
            socketio.emit('appointment_cancelled', {
                'message': f'Patient {appointment.patient.full_name} cancelled appointment',
                'appointment': appointment.to_dict(),
                'cancelled_by': 'patient'
            }, room=f'user_{appointment.doctor_id}')
        else:
            # Notify patient
            socketio.emit('appointment_cancelled', {
                'message': 'Your appointment has been cancelled by the doctor',
                'appointment': appointment.to_dict(),
                'cancelled_by': 'doctor'
            }, room=f'user_{appointment.patient_id}')
        
        # Notify affected patients about token changes
        for apt in subsequent_appointments:
            socketio.emit('token_updated', {
                'message': f'Your token number has been updated to {apt.token_number}',
                'appointment': apt.to_dict()
            }, room=f'user_{apt.patient_id}')
        
        return {
            'success': True,
            'message': 'Appointment cancelled successfully',
            'data': {
                'appointment': appointment.to_dict(),
                'affected_appointments': len(subsequent_appointments)
            }
        }, 200
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'message': f'Failed to cancel appointment: {str(e)}',
            'data': None
        }, 500

@app.route('/api/appointments/<int:appointment_id>/mark-no-show', methods=['POST'])
@role_required(['doctor'])
def mark_no_show(appointment_id):
    """
    Mark patient as no-show and handle queue progression
    """
    try:
        current_user_id = get_current_user_id()
        
        with db.session.begin():
            appointment = db.session.query(Appointment).with_for_update().filter_by(
                id=appointment_id,
                doctor_id=current_user_id
            ).first()
            
            if not appointment:
                return {
                    'success': False,
                    'message': 'Appointment not found or access denied',
                    'data': None
                }, 404
            
            if appointment.status not in ['booked', 'in_queue', 'consulting']:
                return {
                    'success': False,
                    'message': f'Cannot mark {appointment.status} appointment as no-show',
                    'data': None
                }, 400
            
            # Update status
            appointment.status = 'no_show'
            appointment.actual_end_time = datetime.utcnow()
            
            # Log the no-show
            log_entry = QueueLog(
                appointment_id=appointment.id,
                status_change='MARKED as NO_SHOW',
                notes=f'Patient did not show up for token #{appointment.token_number}'
            )
            db.session.add(log_entry)
        
        # Notify patient
        socketio.emit('appointment_no_show', {
            'message': 'You have been marked as no-show for your appointment',
            'appointment': appointment.to_dict()
        }, room=f'user_{appointment.patient_id}')
        
        return {
            'success': True,
            'message': 'Patient marked as no-show',
            'data': {'appointment': appointment.to_dict()}
        }, 200
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'message': f'Failed to mark no-show: {str(e)}',
            'data': None
        }, 500

@app.route('/api/doctor/logout-cleanup', methods=['POST'])
@role_required(['doctor'])
def doctor_logout_cleanup():
    """
    Handle doctor logout - reschedule or cancel pending appointments
    """
    try:
        current_user_id = get_current_user_id()
        data = request.get_json()
        action = data.get('action', 'reschedule')  # 'reschedule' or 'cancel'
        
        today = datetime.now().date()
        
        with db.session.begin():
            # Get all pending appointments for today
            pending_appointments = db.session.query(Appointment).filter(
                Appointment.doctor_id == current_user_id,
                Appointment.appointment_date == today,
                Appointment.status.in_(['booked', 'in_queue'])
            ).all()
            
            if not pending_appointments:
                return {
                    'success': True,
                    'message': 'No pending appointments to handle',
                    'data': {'affected_count': 0}
                }, 200
            
            if action == 'cancel':
                # Cancel all pending appointments
                for appointment in pending_appointments:
                    appointment.status = 'cancelled'
                    appointment.actual_end_time = datetime.utcnow()
                    
                    # Log cancellation
                    log_entry = QueueLog(
                        appointment_id=appointment.id,
                        status_change='CANCELLED due to doctor logout',
                        notes='Doctor logged out with pending appointments'
                    )
                    db.session.add(log_entry)
                    
                    # Notify patient
                    socketio.emit('appointment_cancelled', {
                        'message': 'Your appointment has been cancelled due to doctor unavailability',
                        'appointment': appointment.to_dict(),
                        'reason': 'doctor_logout'
                    }, room=f'user_{appointment.patient_id}')
                
                message = f'Cancelled {len(pending_appointments)} pending appointments'
                
            else:  # reschedule
                # For now, just notify patients - in real system, this would integrate with scheduling
                for appointment in pending_appointments:
                    # Log rescheduling request
                    log_entry = QueueLog(
                        appointment_id=appointment.id,
                        status_change='PENDING RESCHEDULE due to doctor logout',
                        notes='Appointment needs to be rescheduled'
                    )
                    db.session.add(log_entry)
                    
                    # Notify patient
                    socketio.emit('appointment_reschedule_needed', {
                        'message': 'Your appointment needs to be rescheduled due to doctor unavailability',
                        'appointment': appointment.to_dict()
                    }, room=f'user_{appointment.patient_id}')
                
                message = f'Marked {len(pending_appointments)} appointments for rescheduling'
        
        return {
            'success': True,
            'message': message,
            'data': {'affected_count': len(pending_appointments)}
        }, 200
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'message': f'Failed to handle logout cleanup: {str(e)}',
            'data': None
        }, 500
    """
    Cancel appointment with proper token reordering and notifications
    """
    try:
        current_user_id = get_current_user_id()
        current_user = User.query.get(current_user_id)
        
        with db.session.begin():
            # Get appointment with lock
            appointment = db.session.query(Appointment).with_for_update().get(appointment_id)
            
            if not appointment:
                return {
                    'success': False,
                    'message': 'Appointment not found',
                    'data': None
                }, 404
            
            # Check permissions
            if current_user.role == 'patient' and appointment.patient_id != current_user_id:
                return {
                    'success': False,
                    'message': 'You can only cancel your own appointments',
                    'data': None
                }, 403
            
            if current_user.role == 'doctor' and appointment.doctor_id != current_user_id:
                return {
                    'success': False,
                    'message': 'You can only cancel appointments for your patients',
                    'data': None
                }, 403
            
            # Check if appointment can be cancelled
            if appointment.status in ['completed', 'cancelled']:
                return {
                    'success': False,
                    'message': f'Cannot cancel {appointment.status} appointment',
                    'data': None
                }, 400
            
            # Store original token for reordering
            cancelled_token = appointment.token_number
            appointment_date = appointment.appointment_date
            doctor_id = appointment.doctor_id
            
            # Update appointment status
            appointment.status = 'cancelled'
            appointment.actual_end_time = datetime.utcnow()
            
            # Reorder subsequent tokens to fill the gap
            subsequent_appointments = db.session.query(Appointment).filter(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date == appointment_date,
                Appointment.token_number > cancelled_token,
                Appointment.status.in_(['booked', 'in_queue'])
            ).all()
            
            for apt in subsequent_appointments:
                apt.token_number -= 1
            
            # Log the cancellation
            log_entry = QueueLog(
                appointment_id=appointment.id,
                status_change=f'CANCELLED by {current_user.role}',
                notes=f'Token #{cancelled_token} cancelled, subsequent tokens reordered'
            )
            db.session.add(log_entry)
        
        # Real-time notifications
        if current_user.role == 'patient':
            # Notify doctor
            socketio.emit('appointment_cancelled', {
                'message': f'Patient {appointment.patient.full_name} cancelled appointment',
                'appointment': appointment.to_dict(),
                'cancelled_by': 'patient'
            }, room=f'user_{appointment.doctor_id}')
        else:
            # Notify patient
            socketio.emit('appointment_cancelled', {
                'message': 'Your appointment has been cancelled by the doctor',
                'appointment': appointment.to_dict(),
                'cancelled_by': 'doctor'
            }, room=f'user_{appointment.patient_id}')
        
        # Notify affected patients about token changes
        for apt in subsequent_appointments:
            socketio.emit('token_updated', {
                'message': f'Your token number has been updated to {apt.token_number}',
                'appointment': apt.to_dict()
            }, room=f'user_{apt.patient_id}')
        
        return {
            'success': True,
            'message': 'Appointment cancelled successfully',
            'data': {
                'appointment': appointment.to_dict(),
                'affected_appointments': len(subsequent_appointments)
            }
        }, 200
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'message': f'Failed to cancel appointment: {str(e)}',
            'data': None
        }, 500

# =======================
# DOCTOR ROUTES
# =======================
# =======================

@app.route('/api/doctor/profile', methods=['GET', 'POST'])
@role_required(['doctor'])
def doctor_profile():
    try:
        current_user_id = get_current_user_id()
        
        if request.method == 'GET':
            profile = DoctorProfile.query.filter_by(user_id=current_user_id).first()
            if not profile:
                return jsonify({'message': 'Profile not found. Please complete your profile.'}), 404
            
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
        current_user_id = get_current_user_id()
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
def get_doctor_queue():
    try:
        current_user_id = get_current_user_id()
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
        current_user_id = get_current_user_id()
        date_str = datetime.now().strftime('%Y-%m-%d')
        appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Start a transaction with row locking to prevent race conditions
        with db.session.begin():
            # Get next patient in queue with row lock
            next_appointment = db.session.query(Appointment).with_for_update().filter_by(
                doctor_id=current_user_id,
                appointment_date=appointment_date,
                status='booked'
            ).order_by(Appointment.token_number).first()
            
            if not next_appointment:
                return {
                    'success': False,
                    'message': 'No patients in queue',
                    'data': None
                }, 404
            
            # Check if doctor already has a patient in consultation
            ongoing_consultation = db.session.query(Appointment).filter_by(
                doctor_id=current_user_id,
                appointment_date=appointment_date,
                status='consulting'
            ).first()
            
            if ongoing_consultation:
                return {
                    'success': False,
                    'message': 'Please complete current consultation before calling next patient',
                    'data': {'current_patient': ongoing_consultation.patient.full_name}
                }, 400
            
            # Update appointment status with strict state transition
            next_appointment.status = 'consulting'
            next_appointment.actual_start_time = datetime.utcnow()
            
            # Update doctor's current token with row lock
            doctor_profile = db.session.query(DoctorProfile).with_for_update().filter_by(
                user_id=current_user_id
            ).first()
            
            if doctor_profile:
                doctor_profile.current_token = next_appointment.token_number
            
            # Log the status change
            log_entry = QueueLog(
                appointment_id=next_appointment.id,
                status_change='WAITING → CALLED',
                notes=f'Token #{next_appointment.token_number} called by doctor {current_user_id}'
            )
            db.session.add(log_entry)
        
        # Emit real-time updates after transaction
        socketio.emit('patient_called', {
            'appointment_id': next_appointment.id,
            'token_number': next_appointment.token_number,
            'patient_name': next_appointment.patient.full_name,
            'doctor_id': current_user_id
        }, room=f'doctor_{current_user_id}')
        
        socketio.emit('consultation_started', {
            'message': 'Your consultation has started. Please proceed to the doctor\'s chamber.',
            'token_number': next_appointment.token_number,
            'status': 'consulting'
        }, room=f'user_{next_appointment.patient_id}')
        
        return {
            'success': True,
            'message': 'Next patient called successfully',
            'data': {
                'appointment': next_appointment.to_dict(),
                'patient_name': next_appointment.patient.full_name
            }
        }, 200
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'message': f'Failed to call next patient: {str(e)}',
            'data': None
        }, 500

@app.route('/api/doctor/complete-consultation', methods=['POST'])
@role_required(['doctor'])
def complete_consultation():
    try:
        current_user_id = get_current_user_id()
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
        
        # Notify patient (disabled for now)
        # socketio.emit('consultation_completed', {
        #     'message': 'Your consultation is completed.',
        #     'has_prescription': bool(prescription_data),
        #     'prescription_id': prescription_id
        # }, room=f'patient_{appointment.patient_id}')
        
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
        current_user_id = get_current_user_id()
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
        
        # Real-time: Notify Pharmacy and Patient
        socketio.emit('new_prescription', {
            'message': 'New prescription requesting dispensing',
            'prescription': prescription.to_dict()
        }, room='pharmacy_global')
        
        socketio.emit('new_prescription', {
            'message': 'New prescription created',
            'prescription': prescription.to_dict()
        }, room=f'user_{appointment.patient_id}')
        
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
        current_user_id = get_current_user_id()
        data = request.get_json()
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment or appointment.doctor_id != current_user_id:
            return jsonify({'error': 'Appointment not found or access denied'}), 404
        
        # Update status
        if 'status' in data:
            new_status = data['status']
            
            # Hardening: Prevent cancelling active/completed appointments
            # BUT allow doctors to mark as 'no_show' or 'cancelled' if patient is missing
            if new_status == 'cancelled':
                # Get current user info
                current_user_id = get_current_user_id()
                user = User.query.get(current_user_id)
                # Allow doctor to cancel/no_show even if consulting (e.g. patient didn't show up)
                if appointment.status in ['consulting', 'completed'] and user.role != 'doctor':
                     return jsonify({'error': 'Cannot cancel an appointment that is already in progress or completed.'}), 400
            
            # Allow specific no_show status
            current_user_id = get_current_user_id()
            user = User.query.get(current_user_id)
            if new_status == 'no_show' and user.role == 'doctor':
                 # Doctor marking patient as missing
                 pass 

            appointment.status = new_status
            if new_status == 'completed':
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
        current_user_id = get_current_user_id()
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
        status_filter = request.args.get('status', 'all')
        
        query = Prescription.query
        if status_filter != 'all':
            query = query.filter_by(pharmacy_status=status_filter)
        
        prescriptions = query.order_by(Prescription.created_at.desc()).all()
        
        return jsonify([prescription.to_dict() for prescription in prescriptions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/prescriptions/dispense', methods=['POST'])
@role_required(['pharmacy'])
def dispense_medicines():
    try:
        data = request.get_json()
        prescription_id = data.get('prescription_id')
        
        prescription = Prescription.query.get(prescription_id)
        if not prescription:
            return jsonify({'error': 'Prescription not found'}), 404
            
        if prescription.pharmacy_status == 'dispensed':
            return jsonify({'error': 'Prescription already dispensed'}), 400

        # Inventory Management: Decrement Stock
        # "medications" is the key in the JSON stored in DB based on frontend structure
        meds_list = prescription.prescription_data.get('medications', [])
        
        for item in meds_list:
            medicine_id = item.get('medicine_id')
            quantity_needed = int(item.get('quantity', 0))
            
            # Lock the medicine row to prevent race conditions
            medicine = db.session.query(Medicine).with_for_update().get(medicine_id)
            
            if not medicine:
                db.session.rollback()
                return jsonify({'error': f'Medicine ID {medicine_id} not found'}), 400
                
            if medicine.stock_quantity < quantity_needed:
                db.session.rollback()
                return jsonify({'error': f'Insufficient stock for {medicine.name}. Available: {medicine.stock_quantity}'}), 400
            
            medicine.stock_quantity -= quantity_needed

        # Update Status
        prescription.pharmacy_status = 'dispensed'
        prescription.dispensed_at = datetime.utcnow()
        
        db.session.commit()
        
        # Real-time: Notify Patient
        socketio.emit('prescription_dispensed', {
            'message': 'Your medicines are ready for collection',
            'prescription': prescription.to_dict()
        }, room=f'user_{prescription.patient_id}')
        
        return jsonify({
            'message': 'Prescription dispensed and inventory updated',
            'prescription': prescription.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/pharmacy/prescriptions/<int:prescription_id>/status', methods=['PUT'])
@role_required(['pharmacy'])
def update_prescription_status(prescription_id):
    # Backward compatibility or manual status updates
    try:
        data = request.get_json()
        new_status = data.get('status')
        pharmacy_notes = data.get('notes', '')
        
        if new_status not in ['pending', 'preparing', 'ready', 'dispensed']:
            return jsonify({'error': 'Invalid status'}), 400
        
        prescription = Prescription.query.get(prescription_id)
        if not prescription:
            return jsonify({'error': 'Prescription not found'}), 404
        
        prescription.pharmacy_status = new_status
        prescription.pharmacy_notes = pharmacy_notes
        
        if new_status == 'dispensed':
            prescription.dispensed_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Prescription status updated successfully',
            'prescription': prescription.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

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
# WEBSOCKET EVENTS WITH AUTHENTICATION
# =======================

# Socket connection tracking
connected_users = {}

@socketio.on('connect')
def handle_connect(auth):
    """
    Enhanced socket connection with JWT authentication
    """
    try:
        # Get token from auth data or query params
        token = None
        if auth and 'token' in auth:
            token = auth['token']
        else:
            token = request.args.get('token')
        
        if not token:
            print("❌ Socket Connection Refused: No authentication token provided")
            return False  # Reject connection
        
        # Verify JWT token
        try:
            from flask_jwt_extended import decode_token
            decoded_token = decode_token(token)
            user_id = decoded_token['sub']
            
            # Check if token is blacklisted
            if decoded_token['jti'] in blacklisted_tokens:
                print(f"❌ Socket Connection Refused: Token blacklisted for user {user_id}")
                return False
                
        except Exception as jwt_error:
            print(f"❌ Socket Connection Refused: Invalid token - {str(jwt_error)}")
            return False
        
        # Verify user exists and is active
        user = User.query.get(user_id)
        if not user or not user.is_active:
            print(f"❌ Socket Connection Refused: User {user_id} not found or inactive")
            return False
        
        # Store connection info
        connected_users[request.sid] = {
            'user_id': user_id,
            'username': user.username,
            'role': user.role,
            'connected_at': datetime.utcnow()
        }
        
        # Join authenticated rooms
        join_room(f'user_{user_id}')  # Personal notifications
        join_room(f'role_{user.role}')  # Role-based updates
        
        # Role-specific room joining
        if user.role == 'doctor':
            join_room(f'doctor_{user_id}')
        elif user.role == 'pharmacy':
            join_room('pharmacy_global')
        elif user.role == 'patient':
            join_room(f'patient_{user_id}')
        
        # Send connection confirmation
        emit('authenticated', {
            'success': True,
            'message': f'Connected securely as {user.role}',
            'user': {
                'id': user_id,
                'username': user.username,
                'role': user.role
            }
        })
        
        print(f"✅ Socket Connected: User {user_id} ({user.username}) as {user.role}")
        
    except Exception as e:
        print(f"❌ Socket Connection Failed: {str(e)}")
        return False

@socketio.on('disconnect')
def handle_disconnect():
    """
    Handle socket disconnection and cleanup
    """
    if request.sid in connected_users:
        user_info = connected_users[request.sid]
        user_id = user_info['user_id']
        username = user_info['username']
        role = user_info['role']
        
        # Leave all rooms (automatic, but we can add custom logic)
        leave_room(f'user_{user_id}')
        leave_room(f'role_{role}')
        
        # Remove from tracking
        del connected_users[request.sid]
        
        print(f"🔌 Socket Disconnected: User {user_id} ({username})")
    else:
        print("🔌 Socket Disconnected: Unknown session")

@socketio.on('join_queue_updates')
def handle_join_queue_updates(data):
    """
    Join queue-specific room for real-time updates
    """
    if request.sid not in connected_users:
        emit('error', {'message': 'Not authenticated'})
        return
    
    user_info = connected_users[request.sid]
    appointment_id = data.get('appointment_id')
    
    if appointment_id:
        # Verify user owns this appointment or is the doctor
        appointment = Appointment.query.get(appointment_id)
        if appointment and (appointment.patient_id == user_info['user_id'] or 
                          appointment.doctor_id == user_info['user_id']):
            join_room(f'appointment_{appointment_id}')
            emit('joined_queue_updates', {'appointment_id': appointment_id})

@socketio.on('leave_queue_updates')  
def handle_leave_queue_updates(data):
    """
    Leave queue-specific room
    """
    appointment_id = data.get('appointment_id')
    if appointment_id:
        leave_room(f'appointment_{appointment_id}')
        emit('left_queue_updates', {'appointment_id': appointment_id})

@socketio.on('get_connected_users')
def handle_get_connected_users():
    """
    Admin function to see connected users (for debugging)
    """
    if request.sid not in connected_users:
        emit('error', {'message': 'Not authenticated'})
        return
        
    user_info = connected_users[request.sid]
    
    # Only allow admins or for debugging
    if user_info['role'] in ['doctor', 'pharmacy']:  # Admin roles
        emit('connected_users', {
            'count': len(connected_users),
            'users': list(connected_users.values())
        })

# Helper function to emit to specific users safely
def emit_to_user(user_id, event, data):
    """
    Safely emit to a specific user if they're connected
    """
    room = f'user_{user_id}'
    socketio.emit(event, data, room=room)

def emit_to_role(role, event, data):
    """
    Emit to all users of a specific role
    """
    room = f'role_{role}'
    socketio.emit(event, data, room=room)

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
# DASHBOARD ROUTES
# =======================

@app.route('/api/dashboard/<role>', methods=['GET'])
@jwt_required()
def get_dashboard_data(role):
    try:
        current_user_id = get_current_user_id()
        user = User.query.get(current_user_id)
        
        if not user or user.role != role:
            return jsonify({'error': 'Unauthorized'}), 401
            
        data = {}
        
        if role == 'patient':
            # Get appointments
            appointments = Appointment.query.filter_by(patient_id=current_user_id).order_by(Appointment.appointment_date.desc()).all()
            prescriptions = Prescription.query.filter_by(patient_id=current_user_id).all()
            
            # Calculate Active Queue Status
            active_apt = Appointment.query.filter_by(patient_id=current_user_id).filter(Appointment.status.in_(['booked', 'in_queue'])).first()
            
            current_serving = 0
            estimated_wait = 0
            
            if active_apt:
                # Find doctor's current token
                doc_profile = DoctorProfile.query.filter_by(user_id=active_apt.doctor_id).first()
                if doc_profile:
                    current_serving = doc_profile.current_token
                    
                # Queue position calculation
                ahead_count = Appointment.query.filter(
                    Appointment.doctor_id == active_apt.doctor_id,
                    Appointment.appointment_date == active_apt.appointment_date,
                    Appointment.token_number < active_apt.token_number,
                    Appointment.status.in_(['in_queue', 'consulting'])
                ).count()
                estimated_wait = ahead_count * 15 # 15 mins per patient
                
            data = {
                'appointments': [a.to_dict() for a in appointments],
                'prescriptions': [p.to_dict() for p in prescriptions],
                'active_appointment': active_apt.to_dict() if active_apt else None,
                'current_serving': current_serving,
                'estimated_wait': estimated_wait
            }
            
        elif role == 'doctor':
             current_user_id = get_current_user_id()
             date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
             appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
             
             appointments = Appointment.query.filter_by(
                doctor_id=current_user_id,
                appointment_date=appointment_date
             ).order_by(Appointment.token_number).all()
             
             data = {
                 'appointments': [a.to_dict() for a in appointments],
                 'statistics': {
                     'total_today': len(appointments),
                     'completed': len([a for a in appointments if a.status == 'completed']),
                     'pending': len([a for a in appointments if a.status in ['booked', 'in_queue']])
                 }
             }
             
        elif role == 'pharmacy':
             pending = Prescription.query.filter_by(pharmacy_status='pending').all()
             low_stock = Medicine.query.filter(Medicine.stock_quantity <= Medicine.reorder_level).count()
             
             data = {
                 'pending_prescriptions': [p.to_dict() for p in pending],
                 'low_stock_count': low_stock
             }

        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

# =======================
# SERVE REACT APP
# =======================

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    # Don't intercept API routes
    if path.startswith('api/'):
        return jsonify({'error': 'API endpoint not found'}), 404
        
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    print("Healthcare Queue-Free System Starting...")
    print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print("Server running at http://localhost:5000")
    print("Health check: http://localhost:5000/api/health")
    print("=" * 50)
    
    # Start with debug mode to ensure code reloading
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
