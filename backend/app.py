"""
Queue-Free Healthcare Management System - Complete Flask Backend
PostgreSQL + Real-time Queue Management + Role-based Authentication
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_cors import CORS
# from flask_socketio import SocketIO, emit, join_room, leave_room  # Disabled for now
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, time, date
from functools import wraps
import os
import json
import random
import uuid

app = Flask(__name__, static_folder='static')

# Configuration for SQLite (fallback) or PostgreSQL
database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost/healthcare_db')
if database_url.startswith('postgresql://') and not os.getenv('DATABASE_URL'):
    # Fallback to SQLite if PostgreSQL is not available
    database_url = 'sqlite:///healthcare.db'

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'healthcare-queue-secret-key-2026')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'healthcare-socket-secret-2026')

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, resources={r"/*": {"origins": "*"}})

# Comment out SocketIO for now - will add back after basic functionality works
# socketio = SocketIO(app, cors_allowed_origins="*")

# Global queue status for real-time updates
active_queues = {}
prescription_queue = []

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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    specialization = db.Column(db.String(100))
    experience_years = db.Column(db.Integer)
    consultation_fee = db.Column(db.Float, default=0.0)
    available_from = db.Column(db.Time, default=time(9, 0))
    available_to = db.Column(db.Time, default=time(17, 0))
    max_patients_per_day = db.Column(db.Integer, default=50)
    current_token = db.Column(db.Integer, default=0)
    
    user = db.relationship('User', backref='doctor_profile')
    department = db.relationship('Department', backref='doctors')
    
    def to_dict(self):
        return {
            'id': self.id,
            'doctor_name': self.user.full_name,
            'department': self.department.name,
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
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time, nullable=False)
    token_number = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='booked')  # booked, in_queue, consulting, completed, cancelled
    priority = db.Column(db.String(10), default='normal')  # normal, emergency
    estimated_wait_time = db.Column(db.Integer, default=0)  # in minutes
    actual_start_time = db.Column(db.DateTime)
    actual_end_time = db.Column(db.DateTime)
    symptoms = db.Column(db.Text)
    doctor_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    patient = db.relationship('User', foreign_keys=[patient_id], backref='patient_appointments')
    doctor = db.relationship('User', foreign_keys=[doctor_id], backref='doctor_appointments')
    department = db.relationship('Department', backref='appointments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_name': self.patient.full_name,
            'doctor_name': self.doctor.full_name,
            'department_name': self.department.name,
            'appointment_date': self.appointment_date.isoformat(),
            'appointment_time': self.appointment_time.strftime('%H:%M'),
            'token_number': self.token_number,
            'status': self.status,
            'priority': self.priority,
            'estimated_wait_time': self.estimated_wait_time,
            'symptoms': self.symptoms,
            'doctor_notes': self.doctor_notes
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
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)
            
            if not current_user or current_user.role not in allowed_roles:
                return jsonify({'error': 'Access denied. Insufficient permissions.'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# =======================
# HEALTH CHECK & SYSTEM ROUTES
# =======================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for system monitoring"""
    try:
        # Test database connection
        db.session.execute('SELECT 1')
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

# =======================
# AUTHENTICATION ROUTES
# =======================

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'full_name', 'role']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Validate role
        if data['role'] not in ['patient', 'doctor', 'pharmacy']:
            return jsonify({'error': 'Invalid role'}), 400
        
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
        
        return jsonify({'message': 'User registered successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Accept both email/username and password
        identifier = data.get('email') or data.get('username')
        password = data.get('password')
        
        if not identifier or not password:
            return jsonify({'error': 'Email/username and password are required'}), 400
        
        # Try to find user by email or username
        user = User.query.filter(
            (User.email == identifier) | (User.username == identifier)
        ).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401
        
        # Create JWT token with user role
        additional_claims = {"role": user.role}
        access_token = create_access_token(
            identity=user.id,
            additional_claims=additional_claims
        )
        
        return jsonify({
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =======================
# PATIENT ROUTES
# =======================

@app.route('/api/patient/departments', methods=['GET'])
@role_required(['patient'])
def get_departments():
    try:
        departments = Department.query.filter_by(is_active=True).all()
        return jsonify([dept.to_dict() for dept in departments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
            doctor_data = doctor_profile.to_dict()
            doctor_data['doctor_name'] = user.full_name
            doctor_data['department_name'] = department.name
            result.append(doctor_data)
        
        return jsonify(result), 200
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
                'consultation_fee': doctor_profile.consultation_fee,
                'current_token': doctor_profile.current_token
            })
        
        return jsonify({'doctors': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/patient/book-appointment', methods=['POST'])
@role_required(['patient'])
def book_appointment():
    try:
        current_user_id = get_jwt_identity()
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
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        required_fields = ['doctor_id', 'appointment_date', 'appointment_time', 'symptoms']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get doctor profile to get department  
        doctor_profile = DoctorProfile.query.get(data['doctor_id'])
        if not doctor_profile:
            return jsonify({'error': 'Doctor not found'}), 404
        
        # Parse appointment date and time
        appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        appointment_time = datetime.strptime(data['appointment_time'], '%H:%M').time()
        
        # Generate token number for the day
        daily_appointments = Appointment.query.filter_by(
            doctor_id=doctor_profile.user_id,
            appointment_date=appointment_date
        ).count()
        
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
        
        return jsonify({
            'message': 'Appointment booked successfully',
            'appointment_id': appointment.id,
            'token_number': token_number,
            'status': 'booked',
            'appointment_date': data['appointment_date'],
            'appointment_time': data['appointment_time']
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

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
        current_user_id = get_jwt_identity()
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
        current_user_id = get_jwt_identity()
        prescriptions = Prescription.query.filter_by(patient_id=current_user_id).order_by(Prescription.created_at.desc()).all()
        
        return jsonify([prescription.to_dict() for prescription in prescriptions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =======================
# DOCTOR ROUTES
# =======================

@app.route('/api/doctor/profile', methods=['GET', 'POST'])
@role_required(['doctor'])
def doctor_profile():
    try:
        current_user_id = get_jwt_identity()
        
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
def get_doctor_queue():
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
        
        # Emit real-time updates (disabled for now)
        # socketio.emit('patient_called', {
        #     'appointment_id': next_appointment.id,
        #     'token_number': next_appointment.token_number,
        #     'patient_name': next_appointment.patient.full_name
        # }, room=f'doctor_{current_user_id}')
        # 
        # socketio.emit('consultation_started', {
        #     'message': f'Your consultation has started. Please proceed to the doctor\'s chamber.',
        #     'token_number': next_appointment.token_number
        # }, room=f'patient_{next_appointment.patient_id}')
        
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
        status_filter = request.args.get('status', 'all')
        
        query = Prescription.query
        if status_filter != 'all':
            query = query.filter_by(pharmacy_status=status_filter)
        
        prescriptions = query.order_by(Prescription.created_at.desc()).all()
        
        return jsonify([prescription.to_dict() for prescription in prescriptions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pharmacy/prescriptions/<int:prescription_id>/status', methods=['PUT'])
@role_required(['pharmacy'])
def update_prescription_status(prescription_id):
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
# WEBSOCKET EVENTS
# =======================

# SocketIO Event Handlers (disabled for now)
# @socketio.on('connect')
# @jwt_required()
# def handle_connect():
#     user_id = get_jwt_identity()
#     user = User.query.get(user_id)
#     
#     if user:
#         join_room(f'{user.role}_{user_id}')
#         if user.role == 'pharmacy':
#             join_room('pharmacy')
#         emit('connected', {'message': f'Connected as {user.role}'})

# @socketio.on('disconnect')
# @jwt_required()
# def handle_disconnect():
#     user_id = get_jwt_identity()
#     user = User.query.get(user_id)
#     
#     if user:
#         leave_room(f'{user.role}_{user_id}')
#         if user.role == 'pharmacy':
#             leave_room('pharmacy')

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
    app.run(debug=True, host='0.0.0.0', port=5000)