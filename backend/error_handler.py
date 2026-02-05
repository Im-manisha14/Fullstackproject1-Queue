"""
Enhanced Error Handling and Validation Module
Provides comprehensive error handling, logging, and validation utilities
"""

import logging
import traceback
from functools import wraps
from flask import jsonify, request, current_app
from datetime import datetime
import json
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/healthcare_app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Create logs directory if it doesn't exist
os.makedirs('logs', exist_ok=True)

class ValidationError(Exception):
    """Custom validation error"""
    def __init__(self, message, field=None):
        self.message = message
        self.field = field
        super().__init__(message)

class BusinessLogicError(Exception):
    """Custom business logic error"""
    def __init__(self, message, error_code=None):
        self.message = message
        self.error_code = error_code
        super().__init__(message)

class DatabaseError(Exception):
    """Custom database error"""
    def __init__(self, message, operation=None):
        self.message = message
        self.operation = operation
        super().__init__(message)

def handle_errors(f):
    """Decorator for comprehensive error handling"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
            
        except ValidationError as e:
            logger.warning(f"Validation error in {f.__name__}: {e.message}")
            return jsonify({
                'success': False,
                'message': f'Validation error: {e.message}',
                'error_type': 'validation_error',
                'field': e.field
            }), 400
            
        except BusinessLogicError as e:
            logger.warning(f"Business logic error in {f.__name__}: {e.message}")
            return jsonify({
                'success': False,
                'message': e.message,
                'error_type': 'business_error',
                'error_code': e.error_code
            }), 422
            
        except DatabaseError as e:
            logger.error(f"Database error in {f.__name__}: {e.message}")
            return jsonify({
                'success': False,
                'message': 'A database error occurred. Please try again.',
                'error_type': 'database_error'
            }), 500
            
        except Exception as e:
            logger.error(f"Unexpected error in {f.__name__}: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({
                'success': False,
                'message': 'An unexpected error occurred. Please try again.',
                'error_type': 'server_error'
            }), 500
            
    return decorated_function

def log_api_request(f):
    """Decorator to log API requests"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = datetime.now()
        
        # Log request
        logger.info(f"API Request: {request.method} {request.path}")
        logger.info(f"User-Agent: {request.headers.get('User-Agent', 'Unknown')}")
        logger.info(f"IP Address: {request.remote_addr}")
        
        try:
            result = f(*args, **kwargs)
            
            # Log successful response
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"API Response: {request.method} {request.path} - Success ({duration:.3f}s)")
            
            return result
            
        except Exception as e:
            # Log error response
            duration = (datetime.now() - start_time).total_seconds()
            logger.error(f"API Response: {request.method} {request.path} - Error: {str(e)} ({duration:.3f}s)")
            raise
            
    return decorated_function

class Validator:
    """Data validation utilities"""
    
    @staticmethod
    def validate_required_fields(data, required_fields):
        """Validate that all required fields are present and non-empty"""
        missing_fields = []
        empty_fields = []
        
        for field in required_fields:
            if field not in data:
                missing_fields.append(field)
            elif not data[field] or str(data[field]).strip() == '':
                empty_fields.append(field)
        
        if missing_fields:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
        
        if empty_fields:
            raise ValidationError(f"Empty required fields: {', '.join(empty_fields)}")
    
    @staticmethod
    def validate_email(email):
        """Validate email format"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            raise ValidationError("Invalid email format", field="email")
    
    @staticmethod
    def validate_phone(phone):
        """Validate phone number format"""
        import re
        # Allow various phone formats
        pattern = r'^[\+]?[1-9][\d]{0,15}$'
        clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
        if not re.match(pattern, clean_phone):
            raise ValidationError("Invalid phone number format", field="phone")
    
    @staticmethod
    def validate_password(password):
        """Validate password strength"""
        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters long", field="password")
        
        if not any(c.isupper() for c in password):
            raise ValidationError("Password must contain at least one uppercase letter", field="password")
        
        if not any(c.islower() for c in password):
            raise ValidationError("Password must contain at least one lowercase letter", field="password")
        
        if not any(c.isdigit() for c in password):
            raise ValidationError("Password must contain at least one digit", field="password")
    
    @staticmethod
    def validate_date_format(date_string, field_name="date"):
        """Validate date format (YYYY-MM-DD)"""
        try:
            from datetime import datetime
            datetime.strptime(date_string, '%Y-%m-%d')
        except ValueError:
            raise ValidationError(f"Invalid date format for {field_name}. Use YYYY-MM-DD format.", field=field_name)
    
    @staticmethod
    def validate_time_format(time_string, field_name="time"):
        """Validate time format (HH:MM)"""
        try:
            from datetime import datetime
            datetime.strptime(time_string, '%H:%M')
        except ValueError:
            raise ValidationError(f"Invalid time format for {field_name}. Use HH:MM format.", field=field_name)
    
    @staticmethod
    def validate_role(role):
        """Validate user role"""
        allowed_roles = ['patient', 'doctor', 'pharmacist', 'admin']
        if role not in allowed_roles:
            raise ValidationError(f"Invalid role. Must be one of: {', '.join(allowed_roles)}", field="role")
    
    @staticmethod
    def validate_urgency(urgency):
        """Validate appointment urgency level"""
        allowed_urgency = ['low', 'normal', 'high', 'emergency']
        if urgency not in allowed_urgency:
            raise ValidationError(f"Invalid urgency level. Must be one of: {', '.join(allowed_urgency)}", field="urgency")

class SecurityValidator:
    """Security-related validation utilities"""
    
    @staticmethod
    def validate_sql_injection(data):
        """Basic SQL injection prevention"""
        sql_keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'EXEC', 'UNION']
        
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str):
                    for keyword in sql_keywords:
                        if keyword.lower() in value.lower():
                            raise ValidationError(f"Potentially dangerous input detected in {key}", field=key)
        elif isinstance(data, str):
            for keyword in sql_keywords:
                if keyword.lower() in data.lower():
                    raise ValidationError("Potentially dangerous input detected")
    
    @staticmethod
    def validate_xss(data):
        """Basic XSS prevention"""
        dangerous_patterns = ['<script', 'javascript:', 'onload=', 'onerror=', 'onclick=']
        
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str):
                    for pattern in dangerous_patterns:
                        if pattern.lower() in value.lower():
                            raise ValidationError(f"Potentially dangerous script detected in {key}", field=key)
        elif isinstance(data, str):
            for pattern in dangerous_patterns:
                if pattern.lower() in data.lower():
                    raise ValidationError("Potentially dangerous script detected")
    
    @staticmethod
    def validate_file_upload(filename):
        """Validate file upload security"""
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx']
        dangerous_extensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.js', '.php', '.asp']
        
        filename_lower = filename.lower()
        
        # Check for dangerous extensions
        for ext in dangerous_extensions:
            if filename_lower.endswith(ext):
                raise ValidationError(f"File type not allowed: {ext}")
        
        # Check for allowed extensions (if any file restrictions needed)
        has_allowed_ext = any(filename_lower.endswith(ext) for ext in allowed_extensions)
        if not has_allowed_ext and '.' in filename:
            ext = filename_lower[filename_lower.rfind('.'):]
            raise ValidationError(f"File type not allowed: {ext}")

def create_success_response(message, data=None, status_code=200):
    """Create standardized success response"""
    response = {
        'success': True,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }
    
    if data is not None:
        response['data'] = data
    
    return jsonify(response), status_code

def create_error_response(message, error_type='error', status_code=400, details=None):
    """Create standardized error response"""
    response = {
        'success': False,
        'message': message,
        'error_type': error_type,
        'timestamp': datetime.now().isoformat()
    }
    
    if details:
        response['details'] = details
    
    return jsonify(response), status_code

# Database helper functions
def safe_db_operation(operation_func, error_message="Database operation failed"):
    """Safely execute database operations with proper error handling"""
    try:
        result = operation_func()
        return result
    except Exception as e:
        logger.error(f"Database operation failed: {str(e)}")
        raise DatabaseError(error_message, operation=operation_func.__name__)

# Rate limiting helper (basic implementation)
request_counts = {}

def rate_limit_check(identifier, limit=100, window=3600):
    """Basic rate limiting check"""
    current_time = datetime.now().timestamp()
    
    if identifier not in request_counts:
        request_counts[identifier] = []
    
    # Clean old entries
    request_counts[identifier] = [
        timestamp for timestamp in request_counts[identifier]
        if current_time - timestamp < window
    ]
    
    # Check limit
    if len(request_counts[identifier]) >= limit:
        raise ValidationError("Rate limit exceeded. Please try again later.")
    
    # Add current request
    request_counts[identifier].append(current_time)

# Health check utilities
def check_database_connection():
    """Check database connectivity"""
    try:
        from backend.app import db
        db.session.execute('SELECT 1')
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False

def get_system_health():
    """Get overall system health status"""
    health_status = {
        'database': check_database_connection(),
        'timestamp': datetime.now().isoformat(),
        'status': 'healthy'
    }
    
    if not health_status['database']:
        health_status['status'] = 'degraded'
    
    return health_status