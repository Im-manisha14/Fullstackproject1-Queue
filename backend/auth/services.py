"""
Authentication Service Layer
Contains all business logic for login, registration, and user management
"""

from extensions import db
from models.user import User
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash
from utils.validators import validate_email, validate_password, validate_role
from utils.responses import success, error

def login_user(email_or_username, password):
    """
    Authenticate user and return JWT token
    
    Args:
        email_or_username: User's email or username
        password: User's password
        
    Returns:
        tuple: (response_dict, status_code)
    """
    # Validation
    if not email_or_username or not password:
        return error('Email/username and password are required', 400)
    
    # Find user by email or username
    user = User.query.filter(
        (User.email == email_or_username) | (User.username == email_or_username)
    ).first()
    
    if not user:
        return error('Invalid credentials', 401)
    
    # Check password
    if not user.check_password(password):
        return error('Invalid credentials', 401)
    
    # Check if account is active
    if not user.is_active:
        return error('Account is deactivated', 401)
    
    # Create JWT token with role in claims
    additional_claims = {"role": user.role}
    access_token = create_access_token(
        identity=user.id,
        additional_claims=additional_claims
    )
    
    # Return success with token and user data
    return success({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200


def register_user(username, email, password, full_name, role='patient'):
    """
    Register a new user
    
    Args:
        username: Unique username
        email: User's email
        password: User's password
        full_name: User's full name
        role: User role (patient, doctor, pharmacy)
        
    Returns:
        tuple: (response_dict, status_code)
    """
    # Validate inputs
    is_valid, msg = validate_email(email)
    if not is_valid:
        return error(msg, 400)
    
    is_valid, msg = validate_password(password)
    if not is_valid:
        return error(msg, 400)
    
    is_valid, msg = validate_role(role)
    if not is_valid:
        return error(msg, 400)
    
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return error('Email already registered', 400)
    
    if User.query.filter_by(username=username).first():
        return error('Username already taken', 400)
    
    # Create new user with transaction safety
    try:
        new_user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            full_name=full_name,
            role=role
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return success({
            'user': new_user.to_dict(),
            'message': 'Registration successful'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return error(f'Registration failed: {str(e)}', 500)
