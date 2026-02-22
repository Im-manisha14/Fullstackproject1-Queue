"""
Input validation utilities
"""

def validate_email(email):
    """Basic email validation"""
    if not email or '@' not in email:
        return False, "Invalid email format"
    return True, None

def validate_password(password):
    """Password validation"""
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters"
    return True, None

def validate_role(role):
    """Validate user role"""
    valid_roles = ['patient', 'doctor', 'pharmacy']
    if role not in valid_roles:
        return False, f"Role must be one of: {', '.join(valid_roles)}"
    return True, None
