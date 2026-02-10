from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    role = Column(String) # 'patient', 'doctor', 'pharmacy'

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    department = Column(String)
    status = Column(String, default="Available")
    
    user = relationship("User")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    token_number = Column(Integer)
    status = Column(String, default="Waiting") # Waiting, In Progress, Completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("Doctor")

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    medicine = Column(String)
    dosage = Column(String)
    status = Column(String, default="Pending") # Pending, Dispensed

    appointment = relationship("Appointment")
