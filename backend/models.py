"""
PostgreSQL Database Models for Queue-Free Healthcare System
Enhanced with queue management, prescriptions, and pharmacy inventory
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from app import db

# User Model
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

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(100), nullable=False)
    table_name = db.Column(db.String(50))
    record_id = db.Column(db.Integer)
    old_values = db.Column(db.Text)  # JSON
    new_values = db.Column(db.Text)  # JSON
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='audit_logs')