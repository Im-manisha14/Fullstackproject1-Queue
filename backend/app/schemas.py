from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: str
    name: str
    role: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        orm_mode = True

# Doctor Schema
class DoctorBase(BaseModel):
    department: str
    status: str = "Available"

class DoctorCreate(DoctorBase):
    user_id: int

class Doctor(DoctorBase):
    id: int
    user: User
    class Config:
        orm_mode = True

# Appointment Schema
class AppointmentBase(BaseModel):
    doctor_id: int

class AppointmentCreate(AppointmentBase):
    pass

class Appointment(AppointmentBase):
    id: int
    patient: User
    doctor: Doctor # Use nested Doctor schema
    token_number: int
    status: str
    created_at: datetime
    class Config:
        orm_mode = True

# Prescription Schema
class PrescriptionBase(BaseModel):
    medicine: str
    dosage: str

class PrescriptionCreate(PrescriptionBase):
    appointment_id: int

class Prescription(PrescriptionBase):
    id: int
    status: str
    class Config:
        orm_mode = True

# Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str
    user: User
