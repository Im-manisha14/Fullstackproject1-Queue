"""
Queue-Free Healthcare Management System - Clean Flask Backend
"""

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__, static_folder='static')

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/healthcare.db'
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
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

class Department(db.Model):
    __tablename__ = 'departments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = db.relationship('User', foreign_keys=[patient_id], backref='patient_appointments')
    doctor = db.relationship('User', foreign_keys=[doctor_id], backref='doctor_appointments')
    department = db.relationship('Department', backref='appointments')

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'))
    medicines = db.Column(db.Text, nullable=False)  # JSON string
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='sent_to_pharmacy')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = db.relationship('User', foreign_keys=[patient_id], backref='patient_prescriptions')
    doctor = db.relationship('User', foreign_keys=[doctor_id], backref='doctor_prescriptions')

# JWT Claims
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
                    'message': f'Access denied. Required roles: {allowed_roles}'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Authentication Routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')  # This can be email or username
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Email/Username and password required'}), 400
        
        # Try to find user by email first, then by username
        user = User.query.filter_by(email=username).first()
        if not user:
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

# Dashboard Routes
@app.route('/api/patient/dashboard')
@role_required(['patient', 'admin'])
def patient_dashboard():
    user_id = get_jwt_identity()
    appointments = Appointment.query.filter_by(patient_id=user_id).limit(10).all()
    prescriptions = Prescription.query.filter_by(patient_id=user_id).limit(10).all()
    
    return jsonify({
        'success': True,
        'appointments': [{'id': a.id, 'date': str(a.appointment_date), 'status': a.status} for a in appointments],
        'prescriptions': [{'id': p.id, 'status': p.status, 'created_at': str(p.created_at)} for p in prescriptions]
    })

@app.route('/api/doctor/dashboard')
@role_required(['doctor', 'admin'])
def doctor_dashboard():
    user_id = get_jwt_identity()
    appointments = Appointment.query.filter_by(doctor_id=user_id).limit(10).all()
    
    return jsonify({
        'success': True,
        'appointments': [{'id': a.id, 'patient_id': a.patient_id, 'date': str(a.appointment_date), 'status': a.status} for a in appointments]
    })

@app.route('/api/pharmacy/dashboard')
@role_required(['pharmacy', 'admin'])
def pharmacy_dashboard():
    prescriptions = Prescription.query.filter_by(status='sent_to_pharmacy').limit(10).all()
    
    return jsonify({
        'success': True,
        'prescriptions': [{'id': p.id, 'patient_id': p.patient_id, 'medicines': p.medicines} for p in prescriptions]
    })

@app.route('/api/admin/dashboard')
@role_required(['admin'])
def admin_dashboard():
    users_count = User.query.count()
    appointments_count = Appointment.query.count()
    
    return jsonify({
        'success': True,
        'stats': {
            'users': users_count,
            'appointments': appointments_count
        }
    })

@app.route('/')
def index():
    return '''
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Queue-Free Healthcare Management</title>
            <style>
                body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #20b2aa, #008b8b); color: white; text-align: center; padding: 50px; }
                h1 { font-size: 2.5em; margin-bottom: 20px; }
                p { font-size: 1.2em; margin-bottom: 30px; }
                .status { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; display: inline-block; }
            </style>
        </head>
        <body>
            <h1>🏥 Queue-Free Healthcare Management System</h1>
            <div class="status">
                <p>✅ Backend API is running successfully!</p>
                <p>🔗 Frontend: <a href="http://localhost:3000/login.html" style="color: #fff;">http://localhost:3000/login.html</a></p>
                <p>🔐 Test Login: admin@hospital.com / admin123</p>
            </div>
        </body>
        </html>
    '''

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")
    
    app.run(debug=True, host='0.0.0.0', port=5000)