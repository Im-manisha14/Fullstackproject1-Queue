"""
Flask extensions initialization
Prevents circular imports by centralizing extension objects
"""

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

# Initialize extensions without app
db = SQLAlchemy()
jwt = JWTManager()
