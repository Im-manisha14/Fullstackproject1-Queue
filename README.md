# 🏥 MediQueue Pro - Professional Healthcare Management System

A **production-grade healthcare management system** with real-time queue management, professional hospital interface, and role-based authentication.

---

## ✨ Key Features

### 👨‍⚕️ **Professional Doctor Portal**
- **Real-time Patient Queue** with priority indicators (🔴 Urgent | 🟡 Priority | 🟢 Normal)
- **Hospital-Grade Control Panel** with live metrics dashboard
- **Clinical Workspace** - Notes, prescriptions, and patient history
- **Smart Queue Sorting** - Automatic priority-based patient flow
- **Session Analytics** - Daily performance and consultation metrics

### 🎨 **Professional Design**
- **Clean Medical Interface** - Hospital-grade color palette and typography
- **Responsive Layout** - Seamless desktop, tablet, and mobile experience
- **Smooth Animations** - Professional transitions and micro-interactions
- **Accessibility** - WCAG compliant with keyboard navigation

---

## 🛠️ Technology Stack

**Backend:** Flask • SQLAlchemy • JWT • SQLite  
**Frontend:** React 18 • Vite • Lucide Icons • CSS3  
**Authentication:** JWT tokens with secure storage  
**Database:** SQLite (production-ready, upgradable to PostgreSQL)

---

## 📁 Clean Project Structure

```
MediQueue-Pro/
├── backend/
│   ├── app.py                     # Flask API server
│   ├── setup_clean_db.py          # Database setup script
│   ├── requirements.txt           # Python dependencies
│   └── instance/
│       └── healthcare_fresh.db    # SQLite database
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── DoctorDashboard.jsx     # Professional doctor portal
    │   │   ├── DoctorDashboard.css     # Hospital-grade styling
    │   │   ├── PatientDashboard.jsx    # Patient portal
    │   │   └── PharmacyDashboard.jsx   # Pharmacy portal
    │   ├── contexts/
    │   │   └── AuthContext.jsx         # Authentication state
    │   └── utils/
    │       └── api.js                  # API client
    └── package.json
```

---

## 🚀 Quick Start (5 Minutes)

### 1️⃣ **Backend Setup**

```powershell
# Navigate to backend
cd backend

# Activate virtual environment
../.venv/Scripts/Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Setup database with test data
python setup_clean_db.py

# Start server (port 5001)
python app.py
```

### 2️⃣ **Frontend Setup**

```powershell
# New terminal - navigate to frontend
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

### 3️⃣ **Access Application**

- **Frontend:** http://localhost:3004 (or shown port)
- **Backend API:** http://localhost:5001

---

## 🔐 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Doctor** | doctor@example.com | password123 |
| **Patient** | patient@test.com | password123 |

---

## 📊 Test Data Included

✅ **6 Test Appointments** with varying priorities  
✅ **Complete Doctor Profile** with hospital and department  
✅ **Patient Account** for testing bookings  
✅ **Priority Levels:** Urgent (🔴), Priority (🟡), Normal (🟢)  
✅ **Status Flow:** booked → confirmed → waiting → consulting → completed

---

## 🔄 Real-Time Queue Management

### Priority System
- **🔴 URGENT** - Emergency cases (chest pain, breathing issues)
- **🟡 PRIORITY** - High priority (severe symptoms, high fever)
- **🟢 NORMAL** - Routine consultations

### Doctor Workflow
1. Login to professional control panel
2. View real-time queue with priority indicators
3. Call next patient (auto-sorted by urgency)
4. Record clinical notes in consultation workspace
5. Add medications to digital prescription
6. Complete consultation → Next patient ready

---

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/validate` - Token validation

### Doctor Portal
- `GET /api/doctor/queue` - Get patient queue with priorities
- `POST /api/doctor/call-next` - Call next patient
- `POST /api/doctor/complete-consultation` - Complete consultation
- `GET /api/doctor/daily-summary` - Daily metrics

### Patient Portal
- `POST /api/patient/book-appointment` - Book appointment
- `GET /api/patient/appointments` - Appointment history
- `GET /api/patient/queue-status/:id` - Real-time queue position

---

## 🎨 Professional Design System

### Color Palette
```css
Primary (Medical Blue):  #5B7C99
Success (Green):         #52B788
Warning (Yellow):        #F6E05E
Danger (Red):           #E53E3E
Background:             #F7FAFC
```

### Typography
- **Headlines:** Inter, 24px, Bold
- **Body:** Inter, 14px, Regular
- **Monospace:** Courier New (timers)

---

## 🔧 Configuration

### Environment Variables (.env)
```env
DATABASE_URL=sqlite:///instance/healthcare_fresh.db
JWT_SECRET_KEY=your-super-secret-jwt-key-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3004
FLASK_ENV=development
```

---

## 🚨 Troubleshooting

### Reset Database
```powershell
cd backend
python setup_clean_db.py
```

### Backend Issues
- **Port 5001 in use:** Change in `app.py` line 2655
- **Database errors:** Run `python setup_clean_db.py`
- **Import errors:** Activate virtual environment

### Frontend Issues
- **Port conflicts:** Vite auto-detects ports 3000-3004
- **API errors:** Verify backend running on port 5001
- **Auth issues:** Clear browser localStorage

---

## 📈 Performance Features

- ⚡ **Real-time Updates** - Queue refreshes every 10 seconds
- 🎯 **Optimistic UI** - Instant user feedback
- 🔄 **Auto-reconnect** - Handles network interruptions
- 💾 **Database Pooling** - Efficient connection management
- 🔒 **JWT Caching** - Reduced authentication overhead

---

## 🔒 Security

✅ Password hashing (Werkzeug)  
✅ JWT token authentication  
✅ CORS protection  
✅ SQL injection prevention  
✅ XSS protection  
✅ Protected routes with authentication

---

## 📝 Database Schema

### Core Tables
- **users** - User accounts (doctor, patient, pharmacy)
- **doctor_profiles** - Doctor details and specializations
- **appointments** - Bookings with priority levels
- **prescriptions** - Digital prescription records
- **hospitals** - Healthcare facilities
- **departments** - Hospital departments
- **queue_logs** - Audit trail

---

## 🎯 Production Deployment

- [ ] Change JWT secret keys in `.env`
- [ ] Update `ALLOWED_ORIGINS` for production
- [ ] Switch to PostgreSQL
- [ ] Enable HTTPS
- [ ] Configure logging
- [ ] Setup database backups
- [ ] Add rate limiting
- [ ] Build frontend: `npm run build`

---

## 📞 Support

**Troubleshooting Steps:**
1. Check both servers are running (backend on 5001, frontend on 3004)
2. Verify browser console for errors
3. Check Network tab for API responses
4. Run `python setup_clean_db.py` to reset database
5. Clear browser cache and localStorage

---

**Built with ❤️ for professional healthcare experiences**  
**Status:** ✅ Production-ready with clean, professional interface
