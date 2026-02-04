# 🏥 Queue-Free Healthcare Management System

[![Healthcare](https://img.shields.io/badge/Healthcare-Digital%20Queue-1E88E5)](https://github.com/Im-manisha14/Fullstackproject1-Queue)
[![Technology](https://img.shields.io/badge/Stack-React%20%2B%20Flask-26A69A)](https://github.com/Im-manisha14/Fullstackproject1-Queue)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQLite-F44336)](https://github.com/Im-manisha14/Fullstackproject1-Queue)
[![Authentication](https://img.shields.io/badge/Auth-JWT%20Role--based-4CAF50)](https://github.com/Im-manisha14/Fullstackproject1-Queue)

A comprehensive **Queue-Free Healthcare Management System** that digitizes hospital queues, streamlines patient appointments, and manages healthcare workflows with real-time updates. Built with modern web technologies and healthcare industry best practices.

---

## 🎯 **System Overview**

This system transforms traditional healthcare queues into a digital, efficient, and patient-friendly experience. Similar to solutions like Queueasy and QClinic, but specifically designed for healthcare environments with role-based access control.

### 🚀 **Key Features**

- **🔐 Role-Based Authentication**: Secure JWT-based login for Patients, Doctors, and Pharmacy staff
- **📱 Digital Queue Management**: Real-time queue updates with token-based appointments
- **💊 Digital Prescriptions**: Electronic prescription management and pharmacy integration  
- **📊 Real-time Dashboards**: Live updates using WebSocket connections
- **🏥 Multi-Department Support**: Comprehensive healthcare workflow management
- **📈 Analytics & Reporting**: Queue statistics and consultation metrics

---

## 🏗️ **System Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Patient       │    │     Doctor      │    │    Pharmacy    │
│   Dashboard     │    │   Dashboard     │    │   Dashboard     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  React Frontend │
                    │   (Port 3000)   │
                    └─────────────────┘
                                 │
                      REST API / WebSocket
                                 │
                    ┌─────────────────┐
                    │  Flask Backend  │
                    │   (Port 5000)   │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   / SQLite DB   │
                    └─────────────────┘
```

---

## 🛠️ **Technology Stack**

### **Frontend**
- **React 18** - Modern UI framework
- **React Context API** - State management  
- **Lucide React** - Professional icons
- **React Hot Toast** - User notifications
- **Modern CSS3** - Healthcare-themed design

### **Backend**
- **Python Flask** - Web framework
- **SQLAlchemy** - Database ORM
- **JWT Extended** - Authentication
- **Flask-CORS** - Cross-origin support
- **Flask-SocketIO** - Real-time communication

### **Database**
- **PostgreSQL** - Production database (recommended)
- **SQLite** - Development/fallback database

---

## 👥 **User Roles & Workflows**

### 👨‍⚕️ **Patient Journey**
```
Login → Book Appointment → Receive Token → Queue Status → Consultation → Prescription
```

**Patient Features:**
- 📅 Book appointments with preferred doctors
- 🎫 Receive digital queue tokens  
- ⏱️ Real-time queue position tracking
- 📋 View consultation history
- 💊 Access digital prescriptions

### 👩‍⚕️ **Doctor Journey** 
```
Login → View Queue → Call Next Patient → Consultation → Issue Prescription
```

**Doctor Features:**
- 📋 Manage patient queue efficiently
- 🩺 Access patient history and symptoms
- ⏭️ Call next patient with one click
- 📝 Create digital prescriptions
- 📊 View appointment analytics

### 💊 **Pharmacy Journey**
```
Login → Prescription Queue → Verify & Dispense → Update Status → Inventory Management
```

**Pharmacy Features:**
- 📋 View incoming prescriptions
- ✅ Verify and dispense medications
- 📦 Inventory management
- ⚠️ Low stock alerts
- 📊 Prescription analytics

---

## ⚡ **Quick Start Guide**

### **Prerequisites**
- Node.js 16+ and npm
- Python 3.8+ and pip
- PostgreSQL (optional - SQLite works for development)

### **1. Clone Repository**
```bash
git clone https://github.com/Im-manisha14/Fullstackproject1-Queue.git
cd Fullstackproject1-Queue
```

### **2. Backend Setup**
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# MacOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run Flask server
python app.py
```

### **3. Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Start React development server
npm start
```

### **4. Access the System**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

---

## 🔑 **Demo Accounts**

### **Patient Account**
```json
{
  "username": "patient1", 
  "password": "password123"
}
```

### **Doctor Account**
```json
{
  "username": "doctor1",
  "password": "password123"  
}
```

### **Pharmacy Account**
```json
{
  "username": "pharmacy1",
  "password": "password123"
}
```

---

## 📡 **API Documentation**

### **Authentication Endpoints**

#### **POST /api/auth/login**
Authenticate user and receive JWT token.

**Request:**
```json
{
  "username": "patient1",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "patient1", 
    "name": "John Doe",
    "role": "patient"
  }
}
```

#### **GET /api/auth/profile**
Get current user profile (requires JWT token).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "username": "patient1",
  "name": "John Doe", 
  "role": "patient",
  "email": "patient1@example.com"
}
```

### **Patient Endpoints**

#### **POST /api/patient/book-appointment**
Book a new appointment.

**Request:**
```json
{
  "doctor_id": 1,
  "appointment_date": "2026-02-05",
  "appointment_time": "10:00",
  "symptoms": "Fever and headache",
  "priority": "normal"
}
```

**Response:**
```json
{
  "message": "Appointment booked successfully",
  "appointment": {
    "id": 123,
    "token_number": "A001",
    "status": "scheduled",
    "queue_position": 3
  }
}
```

#### **GET /api/patient/appointments**
Get patient's appointments.

**Response:**
```json
{
  "appointments": [
    {
      "id": 123,
      "token_number": "A001", 
      "doctor_name": "Dr. Smith",
      "appointment_date": "2026-02-05",
      "status": "scheduled",
      "queue_position": 3
    }
  ]
}
```

### **Doctor Endpoints**

#### **GET /api/doctor/queue?date=2026-02-05**
Get doctor's patient queue for specific date.

**Response:**
```json
{
  "queue": [
    {
      "id": 123,
      "token_number": "A001",
      "patient_name": "John Doe",
      "symptoms": "Fever and headache",
      "status": "waiting",
      "priority": "normal"
    }
  ]
}
```

#### **POST /api/doctor/call-next**
Call next patient in queue.

**Response:**
```json
{
  "message": "Next patient called",
  "appointment": {
    "token_number": "A001",
    "patient_name": "John Doe"
  }
}
```

### **Pharmacy Endpoints**

#### **GET /api/pharmacy/prescriptions**
Get pending prescriptions.

**Response:**
```json
{
  "prescriptions": [
    {
      "id": 456,
      "patient_name": "John Doe",
      "doctor_name": "Dr. Smith", 
      "medicines": [
        {
          "name": "Paracetamol",
          "dosage": "500mg",
          "frequency": "Twice daily",
          "duration": "3 days"
        }
      ],
      "status": "pending"
    }
  ]
}
```

---

## 🔒 **Security Features**

### **Authentication & Authorization**
- **JWT Tokens**: 24-hour expiration with secure secret keys
- **Role-Based Access**: Strict route protection by user roles
- **Password Hashing**: Werkzeug secure password storage
- **CORS Protection**: Configured for secure cross-origin requests

### **Frontend Security**
- **Protected Routes**: Role validation before component rendering
- **Token Management**: Automatic token refresh and cleanup
- **Input Validation**: Form validation and sanitization

### **Backend Security**  
- **Role Decorators**: `@role_required(['patient'])` on all sensitive endpoints
- **JWT Validation**: Required authentication on protected routes
- **SQL Injection Prevention**: SQLAlchemy ORM parameter binding

---

## 📱 **User Interface**

### **Professional Healthcare Design**
- **Color Palette**: Medical blue (#1E88E5) and teal (#26A69A) theme
- **Typography**: Inter font for modern, readable interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Accessibility**: WCAG compliant with proper contrast ratios

### **Role-Specific Headers**
Each dashboard features a distinctive header indicating the user's role:
- 👨‍⚕️ **Patient Dashboard**: User icon with personalized welcome
- 🩺 **Doctor Dashboard**: Stethoscope icon with professional greeting  
- 💊 **Pharmacy Dashboard**: Pill icon with role-specific messaging

### **Real-time Notifications**
- **Toast Messages**: Success, error, and info notifications
- **Status Updates**: Live queue position and appointment status
- **Color-Coded Alerts**: Green (success), orange (warning), red (error)

---

## 🚀 **Deployment Guide**

### **Production Deployment**

#### **Backend (Flask)**
```bash
# Set environment variables
export FLASK_ENV=production
export DATABASE_URL=postgresql://user:pass@localhost/healthcare_db
export JWT_SECRET_KEY=your-production-secret-key

# Install production dependencies
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

#### **Frontend (React)**
```bash
# Build for production
npm run build

# Serve with nginx or static server
npm install -g serve
serve -s build -p 3000
```

#### **Database Setup (PostgreSQL)**
```sql
-- Create database
CREATE DATABASE healthcare_db;
CREATE USER healthcare_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE healthcare_db TO healthcare_user;
```

---

## 🧪 **Testing**

### **Manual Testing Flow**

#### **1. Patient Flow**
1. Login with patient credentials
2. Book appointment with available doctor  
3. Verify token number received
4. Check queue position updates
5. View appointment in history

#### **2. Doctor Flow** 
1. Login with doctor credentials
2. View today's patient queue
3. Call next patient 
4. Complete consultation
5. Issue digital prescription

#### **3. Pharmacy Flow**
1. Login with pharmacy credentials
2. View incoming prescriptions
3. Process and dispense medication
4. Update prescription status
5. Check inventory levels

### **API Testing**
```bash
# Test health endpoint
curl http://localhost:5000/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"patient1","password":"password123"}'

# Test protected endpoint
curl -X GET http://localhost:5000/api/patient/appointments \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

## 📊 **System Monitoring**

### **Health Checks**
- **Backend Health**: `GET /health` - Returns system status
- **Database Connection**: Automatic connection testing
- **JWT Validation**: Token expiration monitoring

### **Logging & Analytics**
- **User Activity**: Login/logout tracking
- **Queue Metrics**: Average wait times, peak hours
- **Prescription Analytics**: Processing times, medication trends

---

## 🔧 **Configuration**

### **Environment Variables**

#### **Backend (.env)**
```env
# Database
DATABASE_URL=postgresql://postgres:Manisha14@localhost/queue
# or for SQLite fallback
DATABASE_URL=sqlite:///healthcare.db

# Security
JWT_SECRET_KEY=healthcare-queue-secret-key-2026
SECRET_KEY=healthcare-socket-secret-2026
FLASK_ENV=development

# Optional
PORT=5000
CORS_ORIGINS=http://localhost:3000
```

#### **Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_ENV=development
```

---

## 🤝 **Contributing**

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** changes (`git commit -m 'Add AmazingFeature'`)
4. **Push** to branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### **Development Guidelines**
- Follow existing code style and patterns
- Add appropriate comments for complex logic  
- Test new features thoroughly
- Update documentation for API changes

---

## 📝 **Changelog**

### **Version 2.0.0** (Current)
- ✅ Complete system redesign with professional healthcare theme
- ✅ Enhanced role-based authentication and route protection
- ✅ Improved UI/UX with healthcare color palette
- ✅ Real-time notifications and status updates
- ✅ Comprehensive API documentation
- ✅ Production-ready deployment configuration

### **Version 1.0.0**
- ✅ Basic queue management system
- ✅ JWT authentication
- ✅ React frontend with Flask backend
- ✅ SQLite database support

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 **Support & Contact**

- **GitHub**: [@Im-manisha14](https://github.com/Im-manisha14)
- **Repository**: [Fullstackproject1-Queue](https://github.com/Im-manisha14/Fullstackproject1-Queue)
- **Issues**: [Report a bug](https://github.com/Im-manisha14/Fullstackproject1-Queue/issues)

---

## 🏆 **Acknowledgments**

- Inspired by modern healthcare queue management solutions
- Built with healthcare industry best practices
- Designed for scalability and real-world deployment

---

<div align="center">

**🏥 Queue-Free Healthcare System - Transforming Healthcare Experiences**

[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com/Im-manisha14/Fullstackproject1-Queue)
[![Healthcare](https://img.shields.io/badge/For-Healthcare-1E88E5.svg)](https://github.com/Im-manisha14/Fullstackproject1-Queue)

</div>