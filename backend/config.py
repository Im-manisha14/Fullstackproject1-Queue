"""
Production Configuration for Healthcare Queue Management System
Comprehensive configuration management for different environments
"""

import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'healthcare-queue-secret-key-2026-production'
    
    # Database Configuration - PostgreSQL
    POSTGRES_HOST = os.environ.get('POSTGRES_HOST', 'localhost')
    POSTGRES_PORT = os.environ.get('POSTGRES_PORT', '5432')
    POSTGRES_USER = os.environ.get('POSTGRES_USER', 'postgres')
    POSTGRES_PASSWORD = os.environ.get('POSTGRES_PASSWORD', 'Manisha14')
    POSTGRES_DB = os.environ.get('POSTGRES_DB', 'queue')
    
    SQLALCHEMY_DATABASE_URI = f'postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 30,
        'pool_timeout': 20
    }
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_ALGORITHM = 'HS256'
    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ['access']
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With']
    CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
    
    # SocketIO Configuration
    SOCKETIO_CORS_ALLOWED_ORIGINS = CORS_ORIGINS
    SOCKETIO_ASYNC_MODE = 'eventlet'  # or 'threading' based on deployment
    
    # Security Configuration
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx'}
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE', 'logs/healthcare_app.log')
    
    # Rate Limiting
    RATELIMIT_DEFAULT = "1000 per hour"
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'memory://')
    
    # Email Configuration (for notifications)
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', '587'))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
    # Healthcare Specific Configuration
    APPOINTMENT_BOOKING_ADVANCE_DAYS = int(os.environ.get('APPOINTMENT_BOOKING_ADVANCE_DAYS', '30'))
    MAX_APPOINTMENTS_PER_DAY = int(os.environ.get('MAX_APPOINTMENTS_PER_DAY', '50'))
    CONSULTATION_TIME_SLOT_MINUTES = int(os.environ.get('CONSULTATION_TIME_SLOT_MINUTES', '15'))
    DOCTOR_WORKING_HOURS_START = os.environ.get('DOCTOR_WORKING_HOURS_START', '09:00')
    DOCTOR_WORKING_HOURS_END = os.environ.get('DOCTOR_WORKING_HOURS_END', '17:00')
    
    # Queue Management
    QUEUE_TIMEOUT_MINUTES = int(os.environ.get('QUEUE_TIMEOUT_MINUTES', '30'))
    NO_SHOW_TIMEOUT_MINUTES = int(os.environ.get('NO_SHOW_TIMEOUT_MINUTES', '10'))
    AUTO_ADVANCE_QUEUE = os.environ.get('AUTO_ADVANCE_QUEUE', 'true').lower() in ['true', 'on', '1']
    
    # Notification Configuration
    SMS_ENABLED = os.environ.get('SMS_ENABLED', 'false').lower() in ['true', 'on', '1']
    EMAIL_NOTIFICATIONS_ENABLED = os.environ.get('EMAIL_NOTIFICATIONS_ENABLED', 'true').lower() in ['true', 'on', '1']
    PUSH_NOTIFICATIONS_ENABLED = os.environ.get('PUSH_NOTIFICATIONS_ENABLED', 'false').lower() in ['true', 'on', '1']
    
    # Monitoring and Analytics
    ENABLE_METRICS = os.environ.get('ENABLE_METRICS', 'true').lower() in ['true', 'on', '1']
    METRICS_PORT = int(os.environ.get('METRICS_PORT', '8080'))
    
    @staticmethod
    def init_app(app):
        """Initialize app with configuration"""
        # Create necessary directories
        os.makedirs('logs', exist_ok=True)
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    
    # Less strict security for development
    SESSION_COOKIE_SECURE = False
    WTF_CSRF_ENABLED = False
    
    # More verbose logging
    LOG_LEVEL = 'DEBUG'
    
    # Database with less strict pooling
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 5,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 10
    }

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    
    # Use in-memory SQLite for testing
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # Disable security features for testing
    WTF_CSRF_ENABLED = False
    SESSION_COOKIE_SECURE = False
    
    # Faster JWT expiration for testing
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    
    # Disable rate limiting
    RATELIMIT_ENABLED = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Enhanced security
    SESSION_COOKIE_SECURE = True
    WTF_CSRF_ENABLED = True
    
    # Production logging
    LOG_LEVEL = 'INFO'
    
    # Enhanced database pooling
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 30,
        'pool_timeout': 20,
        'echo': False
    }
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Log to syslog in production
        import logging
        from logging.handlers import SysLogHandler
        syslog_handler = SysLogHandler()
        syslog_handler.setLevel(logging.WARNING)
        app.logger.addHandler(syslog_handler)

class DockerConfig(ProductionConfig):
    """Docker container configuration"""
    
    # Docker-specific database connection
    POSTGRES_HOST = os.environ.get('POSTGRES_HOST', 'postgres')
    SQLALCHEMY_DATABASE_URI = f'postgresql://{Config.POSTGRES_USER}:{Config.POSTGRES_PASSWORD}@{POSTGRES_HOST}:{Config.POSTGRES_PORT}/{Config.POSTGRES_DB}'
    
    # Container-specific settings
    LOG_FILE = '/app/logs/healthcare_app.log'
    UPLOAD_FOLDER = '/app/uploads'

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'docker': DockerConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment"""
    return config[os.getenv('FLASK_ENV', 'default')]

# Healthcare-specific constants
class HealthcareConstants:
    """Healthcare domain constants"""
    
    # User roles
    USER_ROLES = ['patient', 'doctor', 'pharmacist', 'admin']
    
    # Appointment statuses
    APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
    
    # Queue statuses
    QUEUE_STATUSES = ['waiting', 'called', 'consulting', 'completed', 'skipped']
    
    # Urgency levels
    URGENCY_LEVELS = ['low', 'normal', 'high', 'emergency']
    
    # Prescription statuses
    PRESCRIPTION_STATUSES = ['pending', 'filled', 'cancelled', 'expired']
    
    # Notification types
    NOTIFICATION_TYPES = ['appointment_reminder', 'queue_update', 'prescription_ready', 'appointment_cancelled']
    
    # Time slots (in minutes)
    TIME_SLOTS = [15, 30, 45, 60]
    
    # Working days
    WORKING_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    
    # Maximum values
    MAX_SYMPTOMS_LENGTH = 500
    MAX_PRESCRIPTION_NOTES_LENGTH = 1000
    MAX_CONSULTATION_NOTES_LENGTH = 2000
    
    # Default values
    DEFAULT_CONSULTATION_TIME = 15  # minutes
    DEFAULT_QUEUE_BUFFER_TIME = 5   # minutes between appointments
    DEFAULT_LATE_ARRIVAL_GRACE = 10 # minutes grace period for late arrivals

# Environment validation
def validate_environment():
    """Validate that all required environment variables are set"""
    required_vars = [
        'POSTGRES_PASSWORD',  # Most critical
    ]
    
    optional_vars = [
        'SECRET_KEY',
        'JWT_SECRET_KEY',
        'MAIL_USERNAME',
        'MAIL_PASSWORD'
    ]
    
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        raise EnvironmentError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    # Warn about missing optional variables
    missing_optional = [var for var in optional_vars if not os.getenv(var)]
    if missing_optional:
        print(f"Warning: Missing optional environment variables: {', '.join(missing_optional)}")
        print("Using default values. Consider setting these for production.")

if __name__ == '__main__':
    # Validate environment when run directly
    validate_environment()
    print("✅ Environment validation passed")
    
    # Print current configuration
    current_config = get_config()
    print(f"Current environment: {os.getenv('FLASK_ENV', 'development')}")
    print(f"Configuration class: {current_config.__name__}")
    print(f"Database URI: {current_config.SQLALCHEMY_DATABASE_URI}")
    print(f"Debug mode: {current_config.DEBUG}")
    print(f"Testing mode: {current_config.TESTING}")