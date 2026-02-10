from app.database import SessionLocal, engine
from app import models
from passlib.context import CryptContext

db = SessionLocal()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_data():
    # Check if data exists
    if db.query(models.User).first():
        print("Data already exists.")
        return

    # Create Users
    users = [
        {"email": "patient@example.com", "password": "password", "role": "patient", "name": "John Doe"},
        {"email": "doctor@example.com", "password": "password", "role": "doctor", "name": "Dr. Smith"},
        {"email": "pharmacy@example.com", "password": "password", "role": "pharmacy", "name": "City Pharmacy"},
    ]

    for u in users:
        hashed = pwd_context.hash(u["password"])
        db_user = models.User(email=u["email"], hashed_password=hashed, name=u["name"], role=u["role"])
        db.add(db_user)
        db.commit()
    
    # Create Doctor Profile
    doctor_user = db.query(models.User).filter(models.User.email == "doctor@example.com").first()
    doctor = models.Doctor(user_id=doctor_user.id, department="Cardiology", status="Available")
    db.add(doctor)
    db.commit()

    print("Seed data created successfully.")

if __name__ == "__main__":
    seed_data()
