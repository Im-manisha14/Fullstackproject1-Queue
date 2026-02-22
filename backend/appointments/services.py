"""
Appointments Service Layer
Contains ALL business logic for appointment booking and management
NO Flask imports - pure business logic only
"""

# TEMPORARY: Import db from app.py using late imports to avoid circular dependency
# TODO Phase-5: Move all models to models/ and use extensions.py properly
from models.user import User
from datetime import datetime
from utils.responses import success, error
from sqlalchemy import func

# db will be imported inside functions to avoid circular import


def validate_appointment_data(data):
    """
    Validate appointment booking data
    
    Returns: (is_valid, error_message)
    """
    required_fields = ['doctor_id', 'appointment_date']
    
    for field in required_fields:
        if field not in data or not data[field]:
            return False, f"{field} is required"
    
    # Validate date format
    try:
        appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        
        # Check if date is in the past
        if appointment_date < datetime.now().date():
            return False, "Cannot book appointments in the past"
            
    except ValueError:
        return False, "Invalid date format. Use YYYY-MM-DD"
    
    return True, None


def check_duplicate_booking(patient_id, doctor_id, appointment_date):
    """
    Check if patient already has appointment with this doctor on this date
    
    Returns: (has_duplicate, existing_appointment)
    """
    # Late import to avoid circular dependency
    from app import Appointment
    
    existing = Appointment.query.filter_by(
        patient_id=patient_id,
        doctor_id=doctor_id,
        appointment_date=appointment_date,
        status='waiting'  # Only check active appointments
    ).first()
    
    return (existing is not None, existing)


def generate_queue_token(doctor_id, appointment_date):
    """
    Generate safe queue token for the day
    Uses MAX(token) + 1 to prevent duplicates
    
    Returns: token_number (int)
    """
    # Late import to avoid circular dependency
    from app import Appointment, db
    
    # Get maximum token for this doctor on this date
    max_token = db.session.query(func.max(Appointment.token_number)).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == appointment_date
    ).scalar()
    
    # If no appointments yet, start at 1
    return (max_token or 0) + 1


def book_appointment(data, patient_id):
    """
    Book a new appointment
    
    Args:
        data: dict with appointment details
        patient_id: ID of the patient booking
        
    Returns:
        tuple: (response_dict, status_code)
    """
    # Late import to avoid circular dependency
    from app import DoctorProfile, Appointment, db
    
    try:
        # 1. Validate input
        is_valid, error_msg = validate_appointment_data(data)
        if not is_valid:
            return error(error_msg, 400)
        
        # 2. Check doctor exists
        doctor_profile = DoctorProfile.query.filter_by(user_id=data['doctor_id']).first()
        if not doctor_profile:
            return error('Doctor not found', 404)
        
        # Parse date
        appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d').date()
        
        # 3. Check duplicate booking
        has_duplicate, existing = check_duplicate_booking(
            patient_id, 
            doctor_profile.user_id, 
            appointment_date
        )
        
        if has_duplicate:
            return error(
                f'You already have an appointment with this doctor on this date. Token: {existing.token_number}',
                400
            )
        
        # 4. Generate queue token safely
        queue_token = generate_queue_token(doctor_profile.user_id, appointment_date)
        
        # 5. Create appointment
        appointment = Appointment(
            patient_id=patient_id,
            doctor_id=doctor_profile.user_id,
            department_id=doctor_profile.department_id,
            appointment_date=appointment_date,
            appointment_time=datetime.now().time(),  # Default to current time
            token_number=queue_token,  # Use token_number field
            status='waiting'
        )
        
        # Add optional fields if provided
        if 'symptoms' in data:
            appointment.symptoms = data['symptoms']
        if 'reason' in data:
            appointment.symptoms = data['reason']  # Map 'reason' to 'symptoms'
        
        # 6. Commit transaction
        db.session.add(appointment)
        db.session.commit()
        
        # 7. Return success with standardized response
        return success({
            'appointment_id': appointment.id,
            'queue_token': queue_token,
            'appointment_date': str(appointment_date),
            'status': 'waiting',
            'message': 'Appointment booked successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return error(f'Booking failed: {str(e)}', 500)


def get_patient_appointments(patient_id):
    """
    Get all appointments for a patient
    
    Args:
        patient_id: ID of the patient
        
    Returns:
        tuple: (response_dict, status_code)
    """
    # Late import to avoid circular dependency
    from app import Appointment, Department
    
    try:
        appointments = Appointment.query.filter_by(
            patient_id=patient_id
        ).order_by(Appointment.appointment_date.desc()).all()
        
        # Format appointments
        result = []
        for appt in appointments:
            doctor = User.query.get(appt.doctor_id)
            department = Department.query.get(appt.department_id)
            
            result.append({
                'id': appt.id,
                'doctor_name': doctor.full_name if doctor else 'Unknown',
                'department': department.name if department else 'Unknown',
                'appointment_date': str(appt.appointment_date),
                'queue_token': appt.token_number,  # Model uses token_number
                'status': appt.status,
                'created_at': appt.created_at.isoformat() if appt.created_at else None
            })
        
        return success(result), 200
        
    except Exception as e:
        return error(f'Failed to fetch appointments: {str(e)}', 500)
