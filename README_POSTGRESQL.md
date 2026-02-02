# Queue-Free Healthcare Management System

## Enhanced PostgreSQL System Setup Guide

### Prerequisites Installation

1. **Install PostgreSQL:**
   - Download from: https://www.postgresql.org/download/
   - Default settings: localhost:5432, user: postgres, password: password
   - Create database: `queue_healthcare`

2. **Install Python Dependencies:**
   ```bash
   cd backend
   pip install -r requirements_postgresql.txt
   ```

### Database Setup

1. **Initialize Database:**
   ```bash
   cd backend
   python init_postgresql.py
   ```

2. **Start Flask Server:**
   ```bash
   python app.py
   ```

### System Features

#### Real-time Queue Management
- **Live Queue Updates**: Patients see their position and estimated wait time
- **Token System**: Each appointment gets a unique token number
- **Priority Handling**: Emergency cases get higher priority
- **Auto Advancement**: Queue progresses automatically as consultations complete

#### Role-based Dashboards

**Patient Dashboard:**
- Book appointments with real-time slot validation
- View live queue status with estimated wait time
- Track appointment history and status
- Access digital prescriptions

**Doctor Dashboard:**
- View daily schedule and patient queue
- Real-time queue management (call next, start consultation)
- Create digital prescriptions with medicine search
- Track consultation statistics

**Pharmacy Dashboard:**
- Process digital prescriptions
- Real-time inventory management
- Low stock alerts
- Medicine dispensing tracking

**Admin Dashboard:**
- Verify new healthcare staff
- System monitoring and statistics
- User management

#### Advanced Features
- **PostgreSQL Database**: Robust data management with foreign key integrity
- **JWT Authentication**: Secure token-based authentication
- **Responsive UI**: Works on desktop and mobile devices
- **Real-time Updates**: Dashboards refresh automatically
- **Professional Design**: Clean, medical-grade interface

### Test Accounts

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Admin | admin | admin123 | Full system access |
| Doctor | dr_smith | password123 | General Medicine |
| Doctor | dr_johnson | password123 | Cardiology |
| Doctor | dr_williams | password123 | Neurology |
| Patient | patient1 | password123 | Alice Cooper |
| Patient | patient2 | password123 | Bob Wilson |
| Patient | patient3 | password123 | Carol Martinez |
| Pharmacy | pharmacy1 | password123 | David Pharmacy |
| Pharmacy | pharmacy2 | password123 | Emma Medicines |

### Usage Workflow

1. **Patient Books Appointment:**
   - Login → Book Appointment → Select Department/Doctor → Choose Date/Time
   - Receive token number and queue position

2. **Doctor Manages Queue:**
   - Login → View Current Queue → Call Next Patient → Start Consultation
   - Create Prescription → Complete Consultation

3. **Pharmacy Processes Prescription:**
   - Login → View Pending Prescriptions → Check Stock → Dispense Medicine

4. **Real-time Updates:**
   - All dashboards refresh automatically
   - Queue positions update in real-time
   - Stock levels tracked continuously

### API Endpoints

#### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login

#### Dashboard Data
- GET `/api/dashboard/patient` - Patient dashboard data
- GET `/api/dashboard/doctor` - Doctor dashboard data
- GET `/api/dashboard/pharmacy` - Pharmacy dashboard data
- GET `/api/dashboard/admin` - Admin dashboard data

#### Appointments
- POST `/api/appointments/book` - Book new appointment
- POST `/api/appointments/advance-queue` - Advance queue status

#### Prescriptions
- POST `/api/prescriptions/create` - Create prescription
- POST `/api/prescriptions/dispense` - Dispense prescription

#### Utilities
- GET `/api/departments` - List departments
- GET `/api/doctors/<dept_id>` - List doctors by department
- GET `/api/medicines/search?q=<query>` - Search medicines
- POST `/api/admin/verify-user` - Verify user account

### System Architecture

```
Frontend (React)
├── Login/Registration
├── Role-based Dashboards
├── Real-time Queue Display
└── Prescription Management

Backend (Flask)
├── JWT Authentication
├── Role-based Authorization
├── RESTful APIs
└── PostgreSQL Integration

Database (PostgreSQL)
├── Users & Authentication
├── Appointments & Queue
├── Prescriptions & Pharmacy
└── Audit Logging
```

### Database Schema

- **users**: User accounts with roles
- **departments**: Medical departments
- **doctor_profiles**: Doctor specializations
- **appointments**: Appointment bookings
- **queue_entries**: Real-time queue management
- **prescriptions**: Digital prescriptions
- **medicines**: Pharmacy inventory
- **prescription_medications**: Prescription details
- **audit_logs**: System activity tracking

### Production Deployment Notes

1. **Environment Variables**: Move secrets to .env file
2. **HTTPS**: Enable SSL certificates
3. **Database**: Use production PostgreSQL instance
4. **Monitoring**: Implement logging and monitoring
5. **Backups**: Set up automated database backups

### Troubleshooting

- **Database Connection**: Ensure PostgreSQL is running on localhost:5432
- **Authentication Issues**: Check JWT secret key configuration
- **Permission Errors**: Verify user roles and verification status
- **Queue Updates**: Check real-time refresh intervals

Access the system at: http://localhost:5000