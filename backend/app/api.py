from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Auth & Users ---
@router.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password, name=user.name, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login")
def login(user_credentials: schemas.UserCreate, db: Session = Depends(get_db)):
    # Simplified login for Phase 3 (Phase 4: JWT)
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user or not pwd_context.verify(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"user": user, "token": "fake-jwt-token"} 

# --- Patient Endpoints ---
@router.get("/doctors", response_model=List[schemas.Doctor])
def get_doctors(db: Session = Depends(get_db)):
    return db.query(models.Doctor).all()

@router.post("/appointments", response_model=schemas.Appointment)
def book_appointment(appt: schemas.AppointmentCreate, current_user_id: int = 1, db: Session = Depends(get_db)): # Hardcoded user_id for now
    # Simple logic: Token = max(token) + 1
    last_token = db.query(models.Appointment).order_by(models.Appointment.token_number.desc()).first()
    new_token = (last_token.token_number + 1) if last_token else 1
    
    new_appt = models.Appointment(
        patient_id=current_user_id,
        doctor_id=appt.doctor_id,
        token_number=new_token
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    return new_appt

# --- Doctor Endpoints ---
@router.get("/queue", response_model=List[schemas.Appointment])
def get_queue(db: Session = Depends(get_db)):
    return db.query(models.Appointment).filter(models.Appointment.status != "Completed").all()

@router.put("/appointments/{id}/status")
def update_status(id: int, status: str, db: Session = Depends(get_db)):
    appt = db.query(models.Appointment).filter(models.Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = status
    db.commit()
    return {"message": "Status updated"}

# --- Pharmacy Endpoints ---
@router.get("/prescriptions", response_model=List[schemas.Prescription])
def get_prescriptions(db: Session = Depends(get_db)):
    return db.query(models.Prescription).all()
