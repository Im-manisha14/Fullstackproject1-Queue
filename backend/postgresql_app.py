from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, verify_jwt_in_request
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, date
import os
from functools import wraps

app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:Manisha14@localhost/queue'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, origins=["http://localhost:3000"])

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # patient, doctor, pharmacy
    phone = db.Column(db.String(15))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Department(db.Model):
    __tablename__ = 'departments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    doctors = db.relationship('Doctor', backref='department', lazy=True)

class Doctor(db.Model):
    __tablename__ = 'doctors'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    specialization = db.Column(db.String(100))
    experience_years = db.Column(db.Integer)
    consultation_fee = db.Column(db.Numeric(10, 2))
    available_from = db.Column(db.Time, default=datetime.strptime('09:00', '%H:%M').time())
    available_to = db.Column(db.Time, default=datetime.strptime('17:00', '%H:%M').time())
    
    user = db.relationship('User', backref='doctor_profile')
    appointments = db.relationship('Appointment', backref='doctor', lazy=True)

class Patient(db.Model):
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(10))
    address = db.Column(db.Text)
    emergency_contact = db.Column(db.String(15))
    
    user = db.relationship('User', backref='patient_profile')
    appointments = db.relationship('Appointment', backref='patient', lazy=True)

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time, nullable=False)
    token_number = db.Column(db.Integer, nullable=False)
    queue_position = db.Column(db.Integer)
    status = db.Column(db.String(20), default='booked')  # booked, in_progress, completed, cancelled
    symptoms = db.Column(db.Text)
    diagnosis = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    prescriptions = db.relationship('Prescription', backref='appointment', lazy=True)

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    medicine_name = db.Column(db.String(100), nullable=False)
    dosage = db.Column(db.String(50))
    frequency = db.Column(db.String(50))
    duration = db.Column(db.String(50))
    instructions = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')  # pending, preparing, ready, dispensed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Medicine(db.Model):
    __tablename__ = 'medicines'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    generic_name = db.Column(db.String(100))
    category = db.Column(db.String(50))
    stock_quantity = db.Column(db.Integer, default=0)
    unit_price = db.Column(db.Numeric(10, 2))
    expiry_date = db.Column(db.Date)
    minimum_stock = db.Column(db.Integer, default=10)

# Role-based access decorator
def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
                current_user_id = get_jwt_identity()
                user = User.query.get(current_user_id)
                
                if not user or user.role not in allowed_roles:
                    return jsonify({'error': 'Access denied'}), 403
                
                return f(*args, **kwargs)
            except Exception as e:
                return jsonify({'error': 'Invalid token'}), 401
        
        return decorated_function
    return decorator

# Auth Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Check if user exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    # Create new user
    user = User(
        username=data['username'],
        email=data['email'],
        full_name=data['full_name'],
        role=data['role'],
        phone=data.get('phone', '')
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    # Create role-specific profile
    if user.role == 'patient':
        patient = Patient(
            user_id=user.id,
            date_of_birth=datetime.strptime(data.get('date_of_birth', '2000-01-01'), '%Y-%m-%d').date(),
            gender=data.get('gender', ''),
            address=data.get('address', ''),
            emergency_contact=data.get('emergency_contact', '')
        )
        db.session.add(patient)
    elif user.role == 'doctor':
        doctor = Doctor(
            user_id=user.id,
            department_id=data.get('department_id', 1),
            specialization=data.get('specialization', ''),
            experience_years=data.get('experience_years', 0),
            consultation_fee=data.get('consultation_fee', 500.00)
        )
        db.session.add(doctor)
    
    db.session.commit()
    
    access_token = create_access_token(identity=user.id)
    
    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'full_name': user.full_name,
            'role': user.role,
            'email': user.email
        }
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    user = User.query.filter_by(username=data['username']).first()
    
    if user and user.check_password(data['password']):
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'full_name': user.full_name,
                'role': user.role,
                'email': user.email
            }
        })
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'full_name': user.full_name,
        'role': user.role,
        'email': user.email,
        'phone': user.phone
    })

# Patient Routes
@app.route('/api/patient/doctors', methods=['GET'])
@role_required(['patient'])
def get_doctors():
    department_id = request.args.get('department_id', type=int)
    
    query = db.session.query(Doctor, User, Department).join(User).join(Department)
    
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    
    doctors = query.all()
    
    result = []
    for doctor, user, department in doctors:
        result.append({
            'id': doctor.id,
            'name': user.full_name,
            'department': department.name,
            'specialization': doctor.specialization,
            'experience_years': doctor.experience_years,
            'consultation_fee': float(doctor.consultation_fee) if doctor.consultation_fee else 0,
            'available_from': doctor.available_from.strftime('%H:%M') if doctor.available_from else '09:00',
            'available_to': doctor.available_to.strftime('%H:%M') if doctor.available_to else '17:00'
        })
    
    return jsonify(result)

@app.route('/api/patient/departments', methods=['GET'])
@role_required(['patient'])
def get_departments():
    departments = Department.query.all()
    
    result = []
    for dept in departments:
        result.append({
            'id': dept.id,
            'name': dept.name,
            'description': dept.description
        })
    
    return jsonify(result)

@app.route('/api/patient/book-appointment', methods=['POST'])
@role_required(['patient'])
def book_appointment():
    data = request.get_json()
    current_user_id = get_jwt_identity()
    
    # Get patient
    patient = Patient.query.filter_by(user_id=current_user_id).first()
    if not patient:
        return jsonify({'error': 'Patient profile not found'}), 404
    
    # Parse appointment date and time
    appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
    appointment_time = datetime.strptime(data['appointment_time'], '%H:%M').time()
    
    # Generate token number
    existing_appointments = Appointment.query.filter_by(
        doctor_id=data['doctor_id'],
        appointment_date=appointment_date
    ).count()
    token_number = existing_appointments + 1
    
    # Create appointment
    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=data['doctor_id'],
        appointment_date=appointment_date,
        appointment_time=appointment_time,
        token_number=token_number,
        queue_position=token_number,
        symptoms=data.get('symptoms', ''),
        status='booked'
    )
    
    db.session.add(appointment)
    db.session.commit()
    
    return jsonify({
        'id': appointment.id,
        'token_number': appointment.token_number,
        'queue_position': appointment.queue_position,
        'message': 'Appointment booked successfully'
    }), 201

@app.route('/api/patient/appointments', methods=['GET'])
@role_required(['patient'])
def get_patient_appointments():
    current_user_id = get_jwt_identity()
    patient = Patient.query.filter_by(user_id=current_user_id).first()
    
    if not patient:
        return jsonify({'error': 'Patient profile not found'}), 404
    
    appointments = db.session.query(Appointment, Doctor, User, Department)\
        .join(Doctor)\
        .join(User, Doctor.user_id == User.id)\
        .join(Department, Doctor.department_id == Department.id)\
        .filter(Appointment.patient_id == patient.id)\
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).all()
    
    result = []
    for appointment, doctor, user, department in appointments:
        result.append({
            'id': appointment.id,
            'doctor_name': user.full_name,
            'department': department.name,
            'appointment_date': appointment.appointment_date.strftime('%Y-%m-%d'),
            'appointment_time': appointment.appointment_time.strftime('%H:%M'),
            'token_number': appointment.token_number,
            'queue_position': appointment.queue_position,
            'status': appointment.status,
            'symptoms': appointment.symptoms,
            'diagnosis': appointment.diagnosis
        })
    
    return jsonify(result)

@app.route('/api/patient/queue-status/<int:appointment_id>', methods=['GET'])
@role_required(['patient'])
def get_queue_status(appointment_id):
    current_user_id = get_jwt_identity()
    patient = Patient.query.filter_by(user_id=current_user_id).first()
    
    appointment = Appointment.query.filter_by(id=appointment_id, patient_id=patient.id).first()
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    # Calculate current position
    current_position = Appointment.query.filter(
        Appointment.doctor_id == appointment.doctor_id,
        Appointment.appointment_date == appointment.appointment_date,
        Appointment.status == 'booked',
        Appointment.queue_position < appointment.queue_position
    ).count()
    
    # Estimated waiting time (assume 15 minutes per patient)
    estimated_wait = current_position * 15
    
    return jsonify({
        'current_position': current_position + 1,
        'total_queue': appointment.queue_position,
        'estimated_wait_minutes': estimated_wait,
        'status': appointment.status
    })

# Doctor Routes
@app.route('/api/doctor/queue', methods=['GET'])
@role_required(['doctor'])
def get_doctor_queue():
    current_user_id = get_jwt_identity()
    doctor = Doctor.query.filter_by(user_id=current_user_id).first()
    
    if not doctor:
        return jsonify({'error': 'Doctor profile not found'}), 404
    
    today = date.today()
    appointments = db.session.query(Appointment, Patient, User)\
        .join(Patient)\
        .join(User, Patient.user_id == User.id)\
        .filter(Appointment.doctor_id == doctor.id)\
        .filter(Appointment.appointment_date == today)\
        .filter(Appointment.status.in_(['booked', 'in_progress']))\
        .order_by(Appointment.queue_position).all()
    
    result = []
    for appointment, patient, user in appointments:
        result.append({
            'id': appointment.id,
            'patient_name': user.full_name,
            'token_number': appointment.token_number,
            'appointment_time': appointment.appointment_time.strftime('%H:%M'),
            'symptoms': appointment.symptoms,
            'status': appointment.status,
            'queue_position': appointment.queue_position
        })
    
    return jsonify(result)

@app.route('/api/doctor/call-next', methods=['POST'])
@role_required(['doctor'])
def call_next_patient():
    current_user_id = get_jwt_identity()
    doctor = Doctor.query.filter_by(user_id=current_user_id).first()
    
    if not doctor:
        return jsonify({'error': 'Doctor profile not found'}), 404
    
    today = date.today()
    next_appointment = Appointment.query.filter_by(
        doctor_id=doctor.id,
        appointment_date=today,
        status='booked'
    ).order_by(Appointment.queue_position).first()
    
    if not next_appointment:
        return jsonify({'message': 'No patients in queue'}), 200
    
    next_appointment.status = 'in_progress'
    db.session.commit()
    
    return jsonify({
        'appointment_id': next_appointment.id,
        'token_number': next_appointment.token_number,
        'message': 'Patient called successfully'
    })

@app.route('/api/doctor/complete-consultation', methods=['POST'])
@role_required(['doctor'])
def complete_consultation():
    data = request.get_json()
    current_user_id = get_jwt_identity()
    doctor = Doctor.query.filter_by(user_id=current_user_id).first()
    
    appointment = Appointment.query.filter_by(
        id=data['appointment_id'],
        doctor_id=doctor.id
    ).first()
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    # Update appointment
    appointment.diagnosis = data.get('diagnosis', '')
    appointment.status = 'completed'
    
    # Add prescriptions
    prescriptions = data.get('prescriptions', [])
    for prescription_data in prescriptions:
        prescription = Prescription(
            appointment_id=appointment.id,
            medicine_name=prescription_data['medicine_name'],
            dosage=prescription_data['dosage'],
            frequency=prescription_data['frequency'],
            duration=prescription_data['duration'],
            instructions=prescription_data.get('instructions', '')
        )
        db.session.add(prescription)
    
    db.session.commit()
    
    return jsonify({'message': 'Consultation completed successfully'})

# Pharmacy Routes
@app.route('/api/pharmacy/prescriptions', methods=['GET'])
@role_required(['pharmacy'])
def get_prescriptions():
    status_filter = request.args.get('status', 'all')
    
    query = db.session.query(Prescription, Appointment, Patient, User, Doctor, User.alias('doctor_user'))\
        .join(Appointment)\
        .join(Patient)\
        .join(User, Patient.user_id == User.id)\
        .join(Doctor)\
        .join(User.alias('doctor_user'), Doctor.user_id == User.alias('doctor_user').id)
    
    if status_filter != 'all':
        query = query.filter(Prescription.status == status_filter)
    
    prescriptions = query.order_by(Prescription.created_at.desc()).all()
    
    result = []
    for prescription, appointment, patient, patient_user, doctor, doctor_user in prescriptions:
        result.append({
            'id': prescription.id,
            'patient_name': patient_user.full_name,
            'doctor_name': doctor_user.full_name,
            'medicine_name': prescription.medicine_name,
            'dosage': prescription.dosage,
            'frequency': prescription.frequency,
            'duration': prescription.duration,
            'instructions': prescription.instructions,
            'status': prescription.status,
            'created_at': prescription.created_at.strftime('%Y-%m-%d %H:%M')
        })
    
    return jsonify(result)

@app.route('/api/pharmacy/update-prescription-status', methods=['POST'])
@role_required(['pharmacy'])
def update_prescription_status():
    data = request.get_json()
    
    prescription = Prescription.query.get(data['prescription_id'])
    if not prescription:
        return jsonify({'error': 'Prescription not found'}), 404
    
    prescription.status = data['status']
    db.session.commit()
    
    return jsonify({'message': 'Prescription status updated successfully'})

@app.route('/api/pharmacy/medicines', methods=['GET'])
@role_required(['pharmacy'])
def get_medicines():
    medicines = Medicine.query.all()
    
    result = []
    for medicine in medicines:
        result.append({
            'id': medicine.id,
            'name': medicine.name,
            'generic_name': medicine.generic_name,
            'category': medicine.category,
            'stock_quantity': medicine.stock_quantity,
            'unit_price': float(medicine.unit_price) if medicine.unit_price else 0,
            'expiry_date': medicine.expiry_date.strftime('%Y-%m-%d') if medicine.expiry_date else None,
            'minimum_stock': medicine.minimum_stock
        })
    
    return jsonify(result)

# Initialize database
def init_database():
    with app.app_context():
        db.create_all()
        
        # Create sample departments
        if not Department.query.first():
            departments = [
                Department(name='Cardiology', description='Heart and cardiovascular care'),
                Department(name='Neurology', description='Brain and nervous system care'),
                Department(name='Orthopedics', description='Bone and joint care'),
                Department(name='General Medicine', description='General health consultation'),
                Department(name='Pediatrics', description='Child healthcare')
            ]
            for dept in departments:
                db.session.add(dept)
            
            # Create sample medicines
            medicines = [
                Medicine(name='Paracetamol', generic_name='Acetaminophen', category='Analgesic', stock_quantity=100, unit_price=5.00),
                Medicine(name='Amoxicillin', generic_name='Amoxicillin', category='Antibiotic', stock_quantity=50, unit_price=15.00),
                Medicine(name='Ibuprofen', generic_name='Ibuprofen', category='Anti-inflammatory', stock_quantity=75, unit_price=8.00),
                Medicine(name='Omeprazole', generic_name='Omeprazole', category='Antacid', stock_quantity=60, unit_price=12.00)
            ]
            for medicine in medicines:
                db.session.add(medicine)
            
            # Create demo users
            demo_users = [
                {
                    'username': 'patient1',
                    'email': 'patient@demo.com',
                    'password': 'password',
                    'full_name': 'John Patient',
                    'role': 'patient',
                    'phone': '1234567890'
                },
                {
                    'username': 'doctor1',
                    'email': 'doctor@demo.com',
                    'password': 'password',
                    'full_name': 'Dr. Sarah Wilson',
                    'role': 'doctor',
                    'phone': '0987654321'
                },
                {
                    'username': 'pharmacy1',
                    'email': 'pharmacy@demo.com',
                    'password': 'password',
                    'full_name': 'Pharmacy Staff',
                    'role': 'pharmacy',
                    'phone': '5555555555'
                }
            ]
            
            for user_data in demo_users:
                user = User(
                    username=user_data['username'],
                    email=user_data['email'],
                    full_name=user_data['full_name'],
                    role=user_data['role'],
                    phone=user_data['phone']
                )
                user.set_password(user_data['password'])
                db.session.add(user)
                db.session.flush()
                
                if user.role == 'patient':
                    patient = Patient(
                        user_id=user.id,
                        date_of_birth=date(1990, 1, 1),
                        gender='Male',
                        address='123 Demo Street',
                        emergency_contact='9999999999'
                    )
                    db.session.add(patient)
                elif user.role == 'doctor':
                    doctor = Doctor(
                        user_id=user.id,
                        department_id=1,  # Cardiology
                        specialization='Cardiologist',
                        experience_years=10,
                        consultation_fee=500.00
                    )
                    db.session.add(doctor)
            
            db.session.commit()
            print("Database initialized with sample data!")

if __name__ == '__main__':
    init_database()
    print("Queue-Free Healthcare System Starting...")
    print("Database: PostgreSQL (queue)")
    print("Server running at http://localhost:5000")
    print("Demo accounts: patient1/password, doctor1/password, pharmacy1/password")
    print("="*50)
    app.run(debug=True, host='0.0.0.0', port=5000)