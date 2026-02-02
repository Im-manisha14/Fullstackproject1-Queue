"""
Complete Queue-Free Healthcare System - Flask Backend
All routes included in a single file for the 15-file limit
"""
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, time, date
from functools import wraps

app = Flask(__name__, static_folder='static')

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:password@localhost:5432/healthcare_queue'
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
    role = db.Column(db.String(20), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

class Department(db.Model):
    __tablename__ = 'departments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    user = db.relationship('User', backref='doctor_profile')
    department = db.relationship('Department', backref='doctors')

class Appointment(db.Model):
    __tablename__ = 'appointments'
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time, nullable=False)
    token_number = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='booked')
    priority = db.Column(db.String(10), default='normal')
    estimated_duration = db.Column(db.Integer, default=15)
    actual_start_time = db.Column(db.DateTime)
    actual_end_time = db.Column(db.DateTime)
    symptoms = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    patient = db.relationship('User', foreign_keys=[patient_id], backref='patient_appointments')
    doctor = db.relationship('User', foreign_keys=[doctor_id], backref='doctor_appointments')
    department = db.relationship('Department', backref='appointments')

class QueueEntry(db.Model):
    __tablename__ = 'queue_entries'
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    queue_position = db.Column(db.Integer, nullable=False)
    estimated_wait_time = db.Column(db.Integer)
    checked_in_at = db.Column(db.DateTime, default=datetime.utcnow)
    called_at = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='waiting')
    appointment = db.relationship('Appointment', backref='queue_entries')

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    prescription_number = db.Column(db.String(20), unique=True, nullable=False)
    diagnosis = db.Column(db.Text)
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    dispensed_at = db.Column(db.DateTime)
    appointment = db.relationship('Appointment', backref='prescriptions')

class Medicine(db.Model):
    __tablename__ = 'medicines'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    generic_name = db.Column(db.String(100))
    manufacturer = db.Column(db.String(100))
    dosage_form = db.Column(db.String(50))
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
    prescription = db.relationship('Prescription', backref='medications')
    medicine = db.relationship('Medicine', backref='prescription_medications')

# JWT Configuration
@jwt.additional_claims_loader
def add_claims_to_jwt(identity):
    user = User.query.get(identity)
    return {'role': user.role, 'email': user.email, 'full_name': user.full_name}

# Role decorators
def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get('role')
            if user_role not in allowed_roles:
                return jsonify({'success': False, 'message': f'Access denied. Required roles: {allowed_roles}'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

admin_required = role_required(['admin'])
doctor_required = role_required(['doctor', 'admin'])
patient_required = role_required(['patient', 'admin'])
pharmacy_required = role_required(['pharmacy', 'admin'])

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        required_fields = ['username', 'email', 'password', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'success': False, 'message': 'Username already exists'}), 400
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'success': False, 'message': 'Email already exists'}), 400
        
        valid_roles = ['patient', 'doctor', 'pharmacy']
        if data['role'] not in valid_roles:
            return jsonify({'success': False, 'message': 'Invalid role'}), 400
        
        user = User(
            username=data['username'], email=data['email'],
            password_hash=generate_password_hash(data['password']),
            full_name=data.get('full_name', data['username'].title()), phone=data.get('phone', ''),
            role=data['role'], is_verified=True if data['role'] == 'patient' else False
        )
        db.session.add(user)
        db.session.commit()
        
        if data['role'] == 'doctor' and data.get('department_id'):
            doctor_profile = DoctorProfile(
                user_id=user.id, department_id=data['department_id'],
                specialization=data.get('specialization', ''),
                experience_years=data.get('experience_years', 0),
                consultation_fee=data.get('consultation_fee', 100.0)
            )
            db.session.add(doctor_profile)
            db.session.commit()
        
        message = 'Registration successful'
        if data['role'] != 'patient':
            message += '. Your account is pending admin verification.'
        
        return jsonify({
            'success': True, 'message': message,
            'user': {'id': user.id, 'username': user.username, 'full_name': user.full_name, 'role': user.role, 'is_verified': user.is_verified}
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

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
            return jsonify({'success': False, 'message': 'Account pending admin verification'}), 403
        
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'success': True, 'message': 'Login successful', 'access_token': access_token,
            'user': {'id': user.id, 'username': user.username, 'full_name': user.full_name, 'email': user.email, 'role': user.role, 'phone': user.phone}
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Dashboard routes
@app.route('/api/dashboard/patient', methods=['GET'])
@patient_required
def patient_dashboard():
    try:
        user_id = get_jwt_identity()
        appointments = db.session.query(Appointment, User, Department)\
            .join(User, Appointment.doctor_id == User.id)\
            .join(Department, Appointment.department_id == Department.id)\
            .filter(Appointment.patient_id == user_id)\
            .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).limit(10).all()
        
        appointment_list = []
        for appointment, doctor, department in appointments:
            queue_info = None
            if appointment.status in ['booked', 'in_queue']:
                queue_entry = QueueEntry.query.filter_by(appointment_id=appointment.id).first()
                if queue_entry:
                    queue_info = {'position': queue_entry.queue_position, 'estimated_wait': queue_entry.estimated_wait_time, 'status': queue_entry.status}
            
            appointment_list.append({
                'id': appointment.id, 'token_number': appointment.token_number,
                'date': appointment.appointment_date.strftime('%Y-%m-%d'), 'time': appointment.appointment_time.strftime('%H:%M'),
                'doctor': doctor.full_name, 'department': department.name, 'status': appointment.status,
                'symptoms': appointment.symptoms, 'queue_info': queue_info
            })
        
        prescriptions = db.session.query(Prescription, Appointment)\
            .join(Appointment, Prescription.appointment_id == Appointment.id)\
            .filter(Appointment.patient_id == user_id, Prescription.status == 'pending')\
            .order_by(Prescription.created_at.desc()).all()
        
        prescription_list = [
            {'id': p.id, 'prescription_number': p.prescription_number, 'date': p.created_at.strftime('%Y-%m-%d'), 'diagnosis': p.diagnosis, 'status': p.status}
            for p, a in prescriptions
        ]
        
        return jsonify({'success': True, 'data': {'appointments': appointment_list, 'prescriptions': prescription_list}}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/dashboard/doctor', methods=['GET'])
@doctor_required
def doctor_dashboard():
    try:
        user_id = get_jwt_identity()
        today = date.today()
        
        appointments = db.session.query(Appointment, User)\
            .join(User, Appointment.patient_id == User.id)\
            .filter(Appointment.doctor_id == user_id, Appointment.appointment_date == today)\
            .order_by(Appointment.token_number).all()
        
        appointment_list, current_queue = [], []
        for appointment, patient in appointments:
            appointment_data = {
                'id': appointment.id, 'token_number': appointment.token_number, 'time': appointment.appointment_time.strftime('%H:%M'),
                'patient_name': patient.full_name, 'symptoms': appointment.symptoms, 'status': appointment.status, 'priority': appointment.priority
            }
            appointment_list.append(appointment_data)
            if appointment.status in ['booked', 'in_queue']:
                current_queue.append(appointment_data)
        
        total_today = len(appointments)
        completed = len([a for a, _ in appointments if a.status == 'completed'])
        in_progress = len([a for a, _ in appointments if a.status in ['in_queue', 'consulting']])
        
        return jsonify({
            'success': True, 'data': {
                'appointments': appointment_list, 'current_queue': current_queue,
                'statistics': {'total_today': total_today, 'completed': completed, 'in_progress': in_progress, 'average_time': 15}
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/dashboard/pharmacy', methods=['GET'])
@pharmacy_required
def pharmacy_dashboard():
    try:
        prescriptions = db.session.query(Prescription, Appointment, User)\
            .join(Appointment, Prescription.appointment_id == Appointment.id)\
            .join(User, Appointment.patient_id == User.id)\
            .filter(Prescription.status == 'pending').order_by(Prescription.created_at.desc()).all()
        
        prescription_list = []
        for prescription, appointment, patient in prescriptions:
            medications = db.session.query(PrescriptionMedication, Medicine)\
                .join(Medicine, PrescriptionMedication.medicine_id == Medicine.id)\
                .filter(PrescriptionMedication.prescription_id == prescription.id).all()
            
            medication_list = [
                {'name': m.name, 'strength': m.strength, 'quantity': pm.quantity, 'instructions': pm.dosage_instructions, 'available_stock': m.stock_quantity}
                for pm, m in medications
            ]
            
            prescription_list.append({
                'id': prescription.id, 'prescription_number': prescription.prescription_number, 'patient_name': patient.full_name,
                'date': prescription.created_at.strftime('%Y-%m-%d %H:%M'), 'medications': medication_list, 'diagnosis': prescription.diagnosis
            })
        
        low_stock = Medicine.query.filter(Medicine.stock_quantity <= Medicine.reorder_level).all()
        low_stock_list = [
            {'name': m.name, 'strength': m.strength, 'current_stock': m.stock_quantity, 'reorder_level': m.reorder_level}
            for m in low_stock
        ]
        
        return jsonify({
            'success': True, 'data': {
                'pending_prescriptions': prescription_list, 'low_stock_medicines': low_stock_list,
                'statistics': {'pending_count': len(prescription_list), 'low_stock_count': len(low_stock_list)}
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/dashboard/admin', methods=['GET'])
@admin_required
def admin_dashboard():
    try:
        unverified_users = User.query.filter_by(is_verified=False).all()
        user_list = [
            {'id': u.id, 'username': u.username, 'full_name': u.full_name, 'email': u.email, 'role': u.role, 'created_at': u.created_at.strftime('%Y-%m-%d %H:%M')}
            for u in unverified_users
        ]
        
        today = date.today()
        total_users = User.query.count()
        total_appointments_today = Appointment.query.filter_by(appointment_date=today).count()
        pending_prescriptions = Prescription.query.filter_by(status='pending').count()
        
        return jsonify({
            'success': True, 'data': {
                'unverified_users': user_list,
                'statistics': {'total_users': total_users, 'appointments_today': total_appointments_today, 'pending_prescriptions': pending_prescriptions, 'unverified_count': len(user_list)}
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Appointment routes
@app.route('/api/appointments/book', methods=['POST'])
@patient_required
def book_appointment():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        required_fields = ['doctor_id', 'appointment_date', 'appointment_time', 'symptoms']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        doctor = User.query.get(data['doctor_id'])
        if not doctor or doctor.role != 'doctor':
            return jsonify({'success': False, 'message': 'Invalid doctor'}), 400
        
        doctor_profile = DoctorProfile.query.filter_by(user_id=doctor.id).first()
        if not doctor_profile:
            return jsonify({'success': False, 'message': 'Doctor profile not found'}), 400
        
        appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        appointment_time = datetime.strptime(data['appointment_time'], '%H:%M').time()
        
        last_token = Appointment.query.filter_by(doctor_id=data['doctor_id'], appointment_date=appointment_date).order_by(Appointment.token_number.desc()).first()
        token_number = (last_token.token_number + 1) if last_token else 1
        
        appointment = Appointment(
            patient_id=user_id, doctor_id=data['doctor_id'], department_id=doctor_profile.department_id,
            appointment_date=appointment_date, appointment_time=appointment_time, token_number=token_number,
            symptoms=data['symptoms'], priority=data.get('priority', 'normal')
        )
        db.session.add(appointment)
        db.session.commit()
        
        queue_entry = QueueEntry(appointment_id=appointment.id, queue_position=token_number, estimated_wait_time=token_number * 15)
        db.session.add(queue_entry)
        db.session.commit()
        
        return jsonify({
            'success': True, 'message': 'Appointment booked successfully',
            'appointment': {'id': appointment.id, 'token_number': token_number, 'estimated_wait': queue_entry.estimated_wait_time}
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/appointments/advance-queue', methods=['POST'])
@doctor_required
def advance_queue():
    try:
        data = request.get_json()
        appointment_id = data.get('appointment_id')
        
        if not appointment_id:
            return jsonify({'success': False, 'message': 'Appointment ID required'}), 400
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 400
        
        if appointment.status == 'booked':
            appointment.status = 'in_queue'
        elif appointment.status == 'in_queue':
            appointment.status = 'consulting'
            appointment.actual_start_time = datetime.utcnow()
        elif appointment.status == 'consulting':
            appointment.status = 'completed'
            appointment.actual_end_time = datetime.utcnow()
        
        queue_entry = QueueEntry.query.filter_by(appointment_id=appointment_id).first()
        if queue_entry:
            if appointment.status == 'consulting':
                queue_entry.called_at = datetime.utcnow()
                queue_entry.status = 'consulting'
            elif appointment.status == 'completed':
                queue_entry.status = 'completed'
        
        db.session.commit()
        return jsonify({'success': True, 'message': f'Appointment status updated to {appointment.status}'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Prescription routes
@app.route('/api/prescriptions/create', methods=['POST'])
@doctor_required
def create_prescription():
    try:
        data = request.get_json()
        required_fields = ['appointment_id', 'diagnosis', 'medications']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        appointment = Appointment.query.get(data['appointment_id'])
        if not appointment:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 400
        
        today_str = datetime.now().strftime('%Y%m%d')
        count = Prescription.query.filter(Prescription.prescription_number.like(f'RX{today_str}%')).count()
        prescription_number = f"RX{today_str}{count+1:04d}"
        
        prescription = Prescription(
            appointment_id=data['appointment_id'], prescription_number=prescription_number,
            diagnosis=data['diagnosis'], notes=data.get('notes', '')
        )
        db.session.add(prescription)
        db.session.flush()
        
        for med_data in data['medications']:
            medicine = Medicine.query.get(med_data['medicine_id'])
            if not medicine:
                continue
            prescription_med = PrescriptionMedication(
                prescription_id=prescription.id, medicine_id=med_data['medicine_id'],
                quantity=med_data['quantity'], dosage_instructions=med_data.get('instructions', ''),
                duration_days=med_data.get('duration', 0)
            )
            db.session.add(prescription_med)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Prescription created successfully', 'prescription_number': prescription_number}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/prescriptions/dispense', methods=['POST'])
@pharmacy_required
def dispense_prescription():
    try:
        data = request.get_json()
        prescription_id = data.get('prescription_id')
        
        if not prescription_id:
            return jsonify({'success': False, 'message': 'Prescription ID required'}), 400
        
        prescription = Prescription.query.get(prescription_id)
        if not prescription:
            return jsonify({'success': False, 'message': 'Prescription not found'}), 400
        
        medications = PrescriptionMedication.query.filter_by(prescription_id=prescription_id).all()
        for med in medications:
            medicine = Medicine.query.get(med.medicine_id)
            if medicine.stock_quantity < med.quantity:
                return jsonify({'success': False, 'message': f'Insufficient stock for {medicine.name}'}), 400
            medicine.stock_quantity -= med.quantity
            med.dispensed_quantity = med.quantity
        
        prescription.status = 'dispensed'
        prescription.dispensed_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Prescription dispensed successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Utility routes
@app.route('/api/departments', methods=['GET'])
def get_departments():
    try:
        departments = Department.query.all()
        department_list = [{'id': d.id, 'name': d.name, 'description': d.description} for d in departments]
        return jsonify({'success': True, 'departments': department_list}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/doctors/<int:department_id>', methods=['GET'])
def get_doctors_by_department(department_id):
    try:
        doctors = db.session.query(User, DoctorProfile)\
            .join(DoctorProfile, User.id == DoctorProfile.user_id)\
            .filter(DoctorProfile.department_id == department_id, User.is_verified == True).all()
        
        doctor_list = [
            {'id': u.id, 'name': u.full_name, 'specialization': p.specialization, 'experience_years': p.experience_years,
             'consultation_fee': p.consultation_fee, 'available_from': p.available_from.strftime('%H:%M'), 'available_to': p.available_to.strftime('%H:%M')}
            for u, p in doctors
        ]
        return jsonify({'success': True, 'doctors': doctor_list}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/medicines/search', methods=['GET'])
def search_medicines():
    try:
        query = request.args.get('q', '')
        medicines = Medicine.query.filter(Medicine.name.ilike(f'%{query}%')).limit(20).all()
        medicine_list = [
            {'id': m.id, 'name': m.name, 'generic_name': m.generic_name, 'strength': m.strength, 'dosage_form': m.dosage_form, 'stock_quantity': m.stock_quantity}
            for m in medicines
        ]
        return jsonify({'success': True, 'medicines': medicine_list}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/verify-user', methods=['POST'])
@admin_required
def verify_user():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'message': 'User ID required'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 400
        
        user.is_verified = True
        db.session.commit()
        return jsonify({'success': True, 'message': f'User {user.full_name} verified successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Frontend routes
@app.route('/')
def index():
    return '''<!DOCTYPE html>
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
    </html>'''

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)