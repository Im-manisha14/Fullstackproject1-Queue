"""
Appointments Routes (Thin Layer)
Routes should do almost nothing - just call services
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from appointments.services import book_appointment, get_patient_appointments

appointments_bp = Blueprint('appointments', __name__)


@appointments_bp.route('/', methods=['POST'])
@jwt_required()
def create_appointment():
    """Book a new appointment - thin wrapper calling service"""
    # Get current user from JWT
    current_user_id = get_jwt_identity()
    
    # Call service layer
    response, status_code = book_appointment(
        request.get_json(),
        current_user_id
    )
    
    return jsonify(response), status_code


@appointments_bp.route('/', methods=['GET'])
@jwt_required()
def list_appointments():
    """Get patient's appointments - thin wrapper calling service"""
    current_user_id = get_jwt_identity()
    
    response, status_code = get_patient_appointments(current_user_id)
    
    return jsonify(response), status_code

