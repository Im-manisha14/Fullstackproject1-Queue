# 🏥 Secure Healthcare Management System

A comprehensive healthcare appointment management system with **role-based access control**, **JWT authentication**, and **strict security measures** designed for hospitals and medical facilities.

## 🔒 Security Features

### Role-Based Access Control (RBAC)
- **Patient Role**: Can only view and manage their own appointments and prescriptions
- **Doctor Role**: Can only access their consultation queue and create prescriptions for their patients
- **Pharmacy Role**: Can only access prescription fulfillment and inventory management
- **Admin Role**: Can verify users, manage system settings, and access all data with proper authorization

### Authentication & Authorization
- **JWT Tokens** with role information and expiration
- **Secure password hashing** using Werkzeug
- **Token-based session management** with automatic expiry
- **Multi-factor verification** for healthcare staff (doctors/pharmacy require admin approval)

### Data Protection
- **Complete data isolation** between roles
- **API-level authorization** enforcement
- **Frontend route protection** based on user roles
- **Secure HTTP headers** and CSP policies
- **Input validation** and SQL injection prevention

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ 
- Node.js (for development tools)
- Modern web browser with JavaScript enabled

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Fullstackproject-QueueFreeAppoinment
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
```

3. **Initialize Database**
```bash
python secure_init_db.py
```

4. **Start Backend Server**
```bash
python app.py
```
Server will run on `http://localhost:5000`

5. **Frontend Setup**
```bash
cd ../frontend
# Open index.html in your browser or serve via HTTP server
python -m http.server 3000  # Python 3
# OR
php -S localhost:3000  # PHP
```

Frontend will be available at `http://localhost:3000`

## 👥 Default User Accounts

| Role | Email | Password | Status |
|------|-------|----------|--------|
| **Admin** | admin@hospital.com | SecureAdmin123! | ✅ Active |
| **Patient** | patient@test.com | TestPatient123! | ✅ Active |
| **Doctor** | doctor@test.com | TestDoctor123! | ⏳ Pending Verification |
| **Pharmacy** | pharmacy@test.com | TestPharmacy123! | ⏳ Pending Verification |

> ⚠️ **Security Note**: Change all default passwords in production. Doctor and Pharmacy accounts require admin verification before access.

## 🏗️ System Architecture

### Backend (Flask)
```
📁 backend/
├── app.py                    # Main Flask application
├── secure_init_db.py         # Database initialization
├── requirements.txt          # Python dependencies
└── instance/
    └── queue.db             # SQLite database
```

**Key Security Features:**
- Role-based decorators (`@admin_required`, `@doctor_required`, etc.)
- JWT token validation with role claims
- Data access restrictions at model level
- API endpoint authorization checks

### Frontend (React)
```
📁 frontend/
├── index.html                     # Main HTML with security headers
├── app.js                         # Main React application
├── components/
│   ├── SecureLogin.js            # Unified login component
│   ├── PatientDashboard.js       # Patient-specific interface
│   ├── DoctorDashboard.js        # Doctor-specific interface
│   ├── PharmacyDashboard.js      # Pharmacy-specific interface
│   └── AdminDashboard.js         # Admin management interface
└── style/
    └── secure-healthcare.css      # Comprehensive styling
```

**Key Security Features:**
- Role-based route protection (`SecureRoute` component)
- Token expiration handling
- Secure API communication
- UI access restrictions based on user role

## 🔐 Security Implementation Details

### 1. Authentication Flow
```
User → Login → Backend Validates → JWT with Role → Frontend Routes to Role Dashboard
```

### 2. Authorization Checks
- **Backend**: Every API endpoint validates JWT and checks user role
- **Frontend**: Components render based on authenticated user's role
- **Database**: Queries filtered by user identity and role permissions

### 3. Role Verification Process
1. **Patient Registration**: Auto-approved, immediate access
2. **Doctor/Pharmacy Registration**: Pending admin approval
3. **Admin Verification**: Manual credential verification before approval
4. **Account Activation**: Only verified accounts can access system features

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify-token` - Token validation
- `POST /api/auth/logout` - Secure logout

### Patient Endpoints
- `GET /api/patient/profile` - Patient profile data
- `GET /api/patient/appointments` - Patient's appointments
- `GET /api/patient/prescriptions` - Patient's prescriptions
- `POST /api/appointments` - Book new appointment

### Doctor Endpoints  
- `GET /api/doctor/profile` - Doctor profile data
- `GET /api/doctor/appointments` - Doctor's appointment queue
- `GET /api/doctor/prescriptions` - Doctor's prescriptions
- `POST /api/prescriptions` - Create prescription
- `PUT /api/appointments/{id}` - Update appointment status

### Pharmacy Endpoints
- `GET /api/pharmacy/prescriptions` - Prescription fulfillment queue
- `GET /api/pharmacy/inventory` - Medicine inventory
- `PUT /api/pharmacy/prescriptions/{id}/status` - Update prescription status
- `POST /api/pharmacy/inventory` - Add inventory item

### Admin Endpoints
- `GET /api/admin/pending-users` - Users awaiting verification
- `POST /api/admin/verify-user/{id}` - Approve/reject user
- `GET /api/admin/users` - All system users

## 🛡️ Security Best Practices Implemented

### 1. **Input Validation & Sanitization**
- All user inputs validated on both frontend and backend
- SQL injection prevention through parameterized queries
- XSS protection via proper data encoding

### 2. **Session Management**
- JWT tokens with short expiration (8 hours)
- Automatic token refresh handling
- Secure token storage in localStorage with expiry checks

### 3. **Access Control**
- **Principle of Least Privilege**: Users can only access their own data
- **Role-based restrictions**: Endpoints check user roles before processing
- **Data isolation**: Patients cannot access doctor/pharmacy data

### 4. **Error Handling**
- Generic error messages to prevent information leakage  
- Detailed logging for security monitoring
- Graceful handling of unauthorized access attempts

### 5. **HTTPS & Security Headers** (Production)
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection headers

## 🧪 Testing the Security Model

### Test Scenarios

1. **Cross-Role Access Test**
   - Login as Patient → Try to access `/api/doctor/appointments` → Should get 403 Forbidden

2. **Token Expiration Test**
   - Wait for token to expire → Any API call should redirect to login

3. **Role Verification Test**
   - Register as Doctor → Should require admin approval before dashboard access

4. **Data Isolation Test**
   - Patient A cannot view Patient B's appointments
   - Doctor A cannot view Doctor B's patients

### Security Testing Commands
```bash
# Test unauthorized access
curl -X GET http://localhost:5000/api/doctor/appointments
# Should return 401 Unauthorized

# Test with invalid token
curl -X GET http://localhost:5000/api/patient/profile \
  -H "Authorization: Bearer invalid_token"
# Should return 401 Unauthorized

# Test role mismatch
# Login as patient, then try doctor endpoint
curl -X GET http://localhost:5000/api/doctor/appointments \
  -H "Authorization: Bearer <patient_token>"
# Should return 403 Forbidden
```

## 📈 Scalability & Production Considerations

### Database
- **Development**: SQLite (included)
- **Production**: PostgreSQL recommended
- **Migration**: Update `SQLALCHEMY_DATABASE_URI` in app.py

### Security Enhancements for Production
- **HTTPS**: Use SSL/TLS certificates
- **Environment Variables**: Store secrets in environment variables
- **Rate Limiting**: Implement API rate limiting
- **Audit Logging**: Enhanced security event logging
- **Backup**: Regular encrypted database backups

### Performance Optimization
- **Database Indexing**: Add indexes on frequently queried columns
- **Caching**: Implement Redis for session management
- **CDN**: Use CDN for static assets
- **Load Balancing**: Multiple server instances for high availability

## 🤝 Contributing

When contributing to this secure system:

1. **Security First**: All changes must maintain security model
2. **Role Testing**: Test changes across all user roles
3. **Code Review**: Security-focused code review required
4. **Documentation**: Update security documentation for any changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Security Disclaimer

This system implements comprehensive security measures, but security is an ongoing process. In production:

- Regular security audits are recommended
- Keep all dependencies updated
- Monitor for security vulnerabilities
- Implement additional security layers as needed
- Follow healthcare data protection regulations (HIPAA, etc.)

---

**Built with security, privacy, and scalability in mind for modern healthcare facilities.**