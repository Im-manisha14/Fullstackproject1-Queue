# QueueFree Appointment System

 A modern, queue-less appointment management system designed for Patients, Doctors, and Pharmacies. Built with a Frontend-First approach using React and a robust FastAPI backend.

## 🚀 Tech Stack

### Frontend
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Routing:** React Router DOM

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy
- **Authentication:** JWT (Planned)

## 📂 Project Structure

```
/frontend    -> React Application
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
- **Patient Portal:** Search doctors, book appointments, view live queue status.
- **Doctor Portal:** Manage patient queue, call next patient, complete consultations.
- **Pharmacy Portal:** View and dispense prescriptions.
- **Real-time Updates:** (Planned with WebSockets)

## 📝 License
This project is open-source and available under the MIT License.