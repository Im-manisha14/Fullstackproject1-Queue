# QueueFree Appointment System

A modern, queue-less appointment management system designed for Patients, Doctors, and Pharmacies. Built with a Frontend-First approach using React and a robust FastAPI backend.

## 🚀 Tech Stack

### Frontend
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Components:** Custom Reusable UI Components
- **Icons:** Lucide React
- **Routing:** React Router DOM
- **State Management:** React Context API
- **Notifications:** React Hot Toast
- **Real-time:** Socket.io Client

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy
- **Authentication:** JWT
- **Real-time:** Socket.io (Python-SocketIO)

## 📂 Project Structure

```
/frontend    -> React Application
  /src
    /components  -> Reusable UI components
    /pages       -> Application pages (Dashboards, Login, Register)
    /utils       -> API and Socket utilities
/backend     -> FastAPI Application
```

## 🛠️ Setup & Installation

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
App runs on: `http://localhost:5173`

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv:
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API runs on: `http://localhost:8000`

## ✨ Features

- **Patient Portal:** 
    - Search doctors by department
    - Book appointments
    - View live queue status and wait times
    - Access digital prescriptions
- **Doctor Portal:** 
    - Manage patient queue
    - Call next patient
    - Complete consultations with digital prescriptions
- **Pharmacy Portal:** 
    - View incoming prescriptions
    - Update prescription status (Preparing, Ready, Dispensed)
    - Manage medicine inventory and stock alerts
- **Real-time Updates:** Live queue position and status updates via WebSockets

## 📝 License
This project is open-source and available under the MIT License.