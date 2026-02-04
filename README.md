# 🏥 Queue-Free Healthcare Management System

[![Healthcare](https://img.shields.io/badge/Healthcare-Digital%20Queue-1E88E5)](https://github.com/Im-manisha14/Fullstackproject1-Queue)
[![Technology](https://img.shields.io/badge/Stack-React%20%2B%20Flask-26A69A)](https://github.com/Im-manisha14/Fullstackproject1-Queue)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQLite-F44336)](https://github.com/Im-manisha14/Fullstackproject1-Queue)
[![Authentication](https://img.shields.io/badge/Auth-JWT%20Role--based-4CAF50)](https://github.com/Im-manisha14/Fullstackproject1-Queue)

A comprehensive **Queue-Free Healthcare Management System** that digitizes hospital queues, streamlines patient appointments, and manages healthcare workflows with real-time updates. Built with modern web technologies and healthcare industry best practices.

---

## 🎯 **System Overview**

This system transforms traditional healthcare queues into a digital, efficient, and patient-friendly experience. Similar to solutions like Queueasy and QClinic, but specifically designed for healthcare environments with role-based access control.

## 🚀 Quick Start

### Prerequisites

1. **Python 3.8+** - [Download Python](https://python.org/downloads/)
2. **Node.js 16+** - [Download Node.js](https://nodejs.org/)
3. **PostgreSQL** - [Download PostgreSQL](https://postgresql.org/download/)

### One-Click Launch

The easiest way to start the entire system:

```bash
python run_system.py
```

This script will:
- ✅ Check all dependencies
- 📦 Install all required packages
- 🚀 Start both backend and frontend servers
- 🌐 Open the application in your browser
- 📊 Display all system information

### Manual Setup (Alternative)

If you prefer to set up manually:

#### 1. Database Setup

Create PostgreSQL database:
```sql
CREATE DATABASE healthcare_db;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE healthcare_db TO postgres;
```

#### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend will run on: http://localhost:5000

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend will run on: http://localhost:3000

## 🎯 Features

### Patient Features
- **Account Registration & Login** with secure JWT authentication
- **Browse Departments** and available doctors
- **Book Appointments** with preferred time slots
- **Real-time Queue Tracking** - see your position and estimated wait time
- **Live Notifications** when it's your turn
- **Prescription Tracking** - monitor prescription status from doctor to pharmacy

### Doctor Features
- **Daily Queue Management** - view all scheduled appointments
- **Patient Consultation** - call next patient with one click
- **Digital Prescriptions** - create and send prescriptions instantly
- **Real-time Updates** - automatic queue position updates
- **Appointment History** - track completed consultations

### Pharmacy Features
- **Prescription Queue** - receive prescriptions from doctors instantly
- **Medicine Inventory** - track stock levels and expiry dates
- **Dispensing Workflow** - manage prescription preparation and pickup
- **Low Stock Alerts** - automatic reorder notifications
- **Pickup Token System** - organized pickup process

## 🏗️ Technical Architecture

### Backend (Flask + PostgreSQL)
- **Flask Web Framework** with REST API endpoints
- **PostgreSQL Database** with normalized relational schema
- **JWT Authentication** with role-based access control
- **Flask-SocketIO** for real-time WebSocket communication
- **SQLAlchemy ORM** for database operations

### Frontend (React + Tailwind)
- **React 18** with functional components and hooks
- **React Router** for client-side routing
- **Tailwind CSS** for responsive design
- **Socket.IO Client** for real-time updates
- **Axios** for HTTP API requests

### Key Technologies
```
Backend:
- Flask 2.3+
- PostgreSQL 13+
- SQLAlchemy 2.0+
- Flask-JWT-Extended
- Flask-SocketIO
- Flask-CORS

Frontend:
- React 18.2+
- React Router DOM 6+
- Tailwind CSS 3+
- Socket.IO Client 4+
- Axios 1.6+
- Lucide React (icons)
```

## 🗄️ Database Schema

### Core Tables

**Users**
- Patient, Doctor, and Pharmacy accounts
- Role-based access control
- Secure password hashing

**Departments**
- Medical specializations
- Department-specific information

**Doctor Profiles**
- Doctor qualifications and schedules
- Consultation fees and availability

**Appointments**
- Complete appointment lifecycle
- Queue management and status tracking
- Priority-based scheduling

**Prescriptions**
- Digital prescription management
- Real-time status updates
- Pharmacy workflow integration

**Medicines**
- Inventory management
- Stock tracking and alerts
- Pricing and supplier information

## 🔐 Authentication & Security

- **JWT Tokens** with 24-hour expiration
- **Password Hashing** using Werkzeug security
- **Role-based Routes** with authentication decorators
- **CORS Protection** for cross-origin requests
- **Input Validation** on all API endpoints

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Patient APIs
- `GET /api/patient/departments` - List all departments
- `GET /api/patient/doctors` - List available doctors
- `POST /api/patient/book-appointment` - Book appointment
- `GET /api/patient/appointments` - Get patient appointments
- `GET /api/patient/prescriptions` - Get patient prescriptions

### Doctor APIs
- `GET /api/doctor/appointments` - Get doctor's appointments
- `POST /api/doctor/call-patient` - Call next patient
- `POST /api/doctor/complete-consultation` - Complete consultation
- `POST /api/doctor/create-prescription` - Create prescription

### Pharmacy APIs
- `GET /api/pharmacy/prescriptions` - Get prescription queue
- `PUT /api/pharmacy/update-prescription` - Update prescription status
- `GET /api/pharmacy/medicines` - Get medicine inventory
- `GET /api/pharmacy/low-stock` - Get low stock alerts

## 🔄 Real-time Features

### WebSocket Events

**Queue Updates:**
- `queue_updated` - Queue position changes
- `appointment_called` - Patient called for consultation
- `prescription_ready` - Prescription ready for pickup

**System Notifications:**
- `new_prescription` - New prescription received
- `queue_position_changed` - Real-time position updates
- `appointment_completed` - Consultation completed

## 🧪 Test Accounts

The system includes pre-configured test accounts:

**Patient Account:**
- Email: `patient@test.com`
- Password: `password123`

**Doctor Account:**
- Email: `doctor@test.com`
- Password: `password123`

**Pharmacy Account:**
- Email: `pharmacy@test.com`
- Password: `password123`

## 📱 User Interface
 
 ### Professional Design
 - **Medical Blue Theme** (`#1E88E5`) for a calm, professional healthcare environment
 - **Split-Screen Login** with animated branding and role selection
 - **Clean Typography** using Inter font for maximum readability
 
 ### Dashboard Experience
 - **Patient Portal:** Streamlined flow from Booking to Queue tracking.
   - *Key View:* Live Queue Status with estimated wait times
 - **Doctor Console:** Efficient queue management with "Call Next" actions.
   - *Key View:* Real-time Patient Queue & Schedule
 - **Pharmacy Panel:** Inventory tracking and prescription dispensing.
   - *Key View:* Pending Dispensations & Low Stock Alerts
 
 ### Accessibility & Responsiveness
 - **Mobile-First** layout ensuring usability on all devices
 - **High Contrast** text for better readability
 - **Clear Status Indicators** (Badges) for appointment states
 - **Smooth Transitions** for a polished user feel

## 🛠️ Development

### Project Structure
```
/
├── backend/                 # Flask backend
│   ├── app.py              # Main application
│   ├── requirements.txt    # Python dependencies
│   └── static/             # Static files
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Dashboard pages
│   │   ├── contexts/       # React contexts
│   │   └── utils/          # API and utility functions
│   ├── public/            # Public assets
│   └── package.json       # Node dependencies
└── run_system.py          # System launcher
```

### Environment Variables

Create `.env` files for configuration:

**Backend (.env):**
```
DATABASE_URL=postgresql://postgres:postgres@localhost/healthcare_db
JWT_SECRET_KEY=your-secret-key
SECRET_KEY=your-socket-secret
```

**Frontend (.env):**
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 🚀 Deployment

### Production Setup

1. **Database Migration**
   ```bash
   python backend/init_postgresql.py
   ```

2. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

3. **Configure Production Settings**
   - Set secure JWT secret keys
   - Configure PostgreSQL connection
   - Enable HTTPS for production

### Docker Deployment

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: healthcare_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    
  backend:
    build: ./backend
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db/healthcare_db
    
  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "3000:3000"
```

## 📊 System Monitoring

### Health Checks
- `GET /api/health` - System health status
- Database connectivity monitoring
- Service availability tracking

### Logging
- Request/response logging
- Error tracking and reporting
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Database Connection Error:**
- Ensure PostgreSQL is running
- Verify database credentials
- Check if database exists

**Port Already in Use:**
- Frontend (3000): `npx kill-port 3000`
- Backend (5000): `npx kill-port 5000`

**WebSocket Connection Failed:**
- Check CORS configuration
- Verify Socket.IO versions match
- Ensure backend WebSocket server is running

### Getting Help

1. Check the console for error messages
2. Verify all dependencies are installed
3. Ensure database is properly configured
4. Review the API endpoint documentation

---

## 🎉 Success!

If everything is working correctly, you should see:
- ✅ Backend API responding at http://localhost:5000
- ✅ Frontend application at http://localhost:3000  
- ✅ Real-time WebSocket connections active
- ✅ Database operations working
- ✅ Authentication system functional
- ✅ All three role dashboards operational

**The Queue-Free Healthcare System is now ready for use!**