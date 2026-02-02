# Queue-Free Healthcare Appointment System 🏥

A modern, full-stack healthcare management platform with real-time queue management, built with Flask, React, and SQLite.

## 🌟 Features

### Real-Time Queue Management
- **Token-based Appointments**: Automatic token generation and queue positioning
- **Live Queue Updates**: Real-time status updates every 15-30 seconds
- **Estimated Wait Times**: Dynamic calculation based on queue position
- **Priority Handling**: Support for normal, urgent, and emergency appointments

### Role-Based Dashboards
- **Patient Dashboard**: Book appointments, view queue status, track prescriptions
- **Doctor Dashboard**: Manage patient queue, advance appointments, create prescriptions  
- **Pharmacy Dashboard**: Dispense prescriptions, manage inventory, low stock alerts
- **Admin Dashboard**: User verification, system statistics, user management

### Digital Prescription System
- **Electronic Prescriptions**: Digital prescription creation and management
- **Medicine Search**: Real-time medicine search and selection
- **Inventory Integration**: Stock tracking with automatic dispensing
- **Prescription Tracking**: Status tracking from creation to dispensing

### Professional UI/UX
- **Modern Design**: Clean, professional medical-grade interface
- **Responsive Layout**: Mobile-first design that works on all devices
- **Teal Color Scheme**: Professional healthcare color palette (#20b2aa, #008b8b)
- **Smooth Animations**: Enhanced user experience with subtle animations

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation & Setup

1. **Navigate to project directory:**
   ```bash
   cd C:\Fullstackproject-QueueFreeAppoinment
   ```

2. **Install Python dependencies:**
   ```bash
   pip install flask flask-sqlalchemy flask-jwt-extended flask-cors werkzeug
   ```

3. **Initialize the database:**
   ```bash
   python init_database.py
   ```

4. **Start the Flask server:**
   ```bash
   python backend/app_complete.py
   ```

5. **Access the application:**
   Open your browser and navigate to: `http://localhost:5000`

## 👥 Demo Login Credentials

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| **Admin** | `admin` | `admin123` | Full system access, user verification |
| **Doctor** | `drsmith` | `doctor123` | Patient queue management, prescriptions |
| **Patient** | `johnpat` | `patient123` | Book appointments, view queue status |
| **Pharmacy** | `pharmacy1` | `pharmacy123` | Prescription dispensing, inventory |

## 🔧 System Architecture

### Backend (Flask)
- **Flask Application**: Complete REST API with JWT authentication
- **SQLAlchemy ORM**: Database management with SQLite
- **Role-Based Security**: JWT tokens with role claims
- **Queue Management**: Real-time appointment and queue handling
- **Prescription System**: Digital prescription workflow

### Frontend (React)
- **React Components**: Modern component-based architecture  
- **Real-time Updates**: Automatic dashboard refreshing
- **Responsive Design**: Mobile-optimized interface
- **Professional Styling**: Healthcare-grade UI components

### Database Schema
- **Users**: Authentication and role management
- **Departments**: Medical specializations
- **Appointments**: Booking and queue management  
- **Prescriptions**: Digital prescription workflow
- **Medicines**: Inventory and stock management
- **Queue Entries**: Real-time queue tracking

## 📱 User Workflows

### Patient Journey
1. **Registration/Login** → Create account or sign in
2. **Book Appointment** → Select department, doctor, date/time
3. **Queue Tracking** → Real-time position and wait time updates
4. **Consultation** → Doctor advances queue status
5. **Prescription** → Receive digital prescription if needed
6. **Pharmacy** → Collect medications from pharmacy

### Doctor Workflow
1. **Dashboard Overview** → View today's appointments and statistics
2. **Queue Management** → Call next patient, start consultation
3. **Patient Consultation** → Conduct medical examination
4. **Prescription Creation** → Create digital prescriptions with medicines
5. **Complete Appointment** → Mark consultation as completed

### Pharmacy Workflow
1. **Prescription Queue** → View pending prescriptions
2. **Medicine Verification** → Check stock availability
3. **Dispensing** → Process prescription and update inventory
4. **Stock Management** → Monitor low stock alerts

## 🏗️ File Structure

```
C:\Fullstackproject-QueueFreeAppoinment/
├── backend/
│   ├── app_complete.py          # Complete Flask application
│   ├── static/
│   │   ├── complete_app.js      # React frontend application
│   │   └── complete_style.css   # Professional CSS styling
│   └── queue_healthcare.db      # SQLite database
├── init_database.py             # Database initialization script
├── index_complete.html          # Main HTML entry point
└── README_COMPLETE.md           # This documentation
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Granular permissions per user role
- **Password Hashing**: Werkzeug security for password protection
- **Session Management**: Automatic token refresh and validation
- **Input Validation**: Server-side validation for all inputs

## 🎨 Design System

### Color Palette
- **Primary Teal**: #20b2aa (Medium teal for primary actions)
- **Dark Teal**: #008b8b (Darker teal for emphasis)
- **Light Backgrounds**: #f0fdff (Subtle teal background)
- **Text Colors**: Professional grays and dark colors
- **Status Colors**: Green (success), Yellow (warning), Red (error)

### Typography
- **Primary Font**: 'Segoe UI', 'Inter', system-ui
- **Hierarchy**: Clear heading levels (2.5rem, 1.5rem, 1.25rem)
- **Weight System**: Light (400), Medium (500), Semibold (600), Bold (700)

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Dashboard Data
- `GET /api/dashboard/patient` - Patient dashboard data
- `GET /api/dashboard/doctor` - Doctor dashboard data  
- `GET /api/dashboard/pharmacy` - Pharmacy dashboard data
- `GET /api/dashboard/admin` - Admin dashboard data

### Appointment Management
- `POST /api/appointments/book` - Book new appointment
- `POST /api/appointments/advance-queue` - Advance queue status

### Prescription System
- `POST /api/prescriptions/create` - Create new prescription
- `POST /api/prescriptions/dispense` - Dispense prescription

### Utility Endpoints
- `GET /api/departments` - List all departments
- `GET /api/doctors/{department_id}` - Get doctors by department
- `GET /api/medicines/search` - Search medicines
- `POST /api/admin/verify-user` - Verify user account

## 🚀 Advanced Features

### Real-Time Updates
- **Auto-refresh**: Dashboards refresh every 15-30 seconds
- **Live Queue**: Real-time position and wait time updates
- **Status Changes**: Instant notification of status changes

### Queue Intelligence  
- **Smart Positioning**: Automatic queue position calculation
- **Wait Time Estimation**: Dynamic estimation based on consultation times
- **Priority Handling**: Emergency and urgent appointment priority

### Inventory Management
- **Stock Tracking**: Real-time medicine inventory
- **Low Stock Alerts**: Automatic alerts for reorder levels
- **Dispensing Integration**: Automatic stock reduction on dispensing

## 🔧 Customization Options

### Adding New Departments
1. Insert into departments table via database
2. Create doctor profiles for the department
3. System automatically includes in booking flow

### Medicine Management
1. Add new medicines via database insert
2. Set stock levels and reorder points
3. Configure pricing and batch information

### Role Extensions
1. Extend User model with new roles
2. Add role-specific decorators
3. Create corresponding dashboard components

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error:**
```bash
# Reinitialize database
python init_database.py
```

**Port Already in Use:**
```bash
# Change port in app_complete.py
app.run(host='0.0.0.0', port=5001, debug=True)
```

**JWT Token Issues:**
- Clear browser localStorage
- Login again to refresh tokens

**React/JavaScript Errors:**
- Check browser console for errors
- Ensure all CDN libraries are loaded

## 🎯 Production Deployment

### Environment Setup
1. **Python Environment**: Use virtual environment
2. **Database**: Migrate to PostgreSQL for production
3. **Web Server**: Deploy with Gunicorn + Nginx
4. **Security**: Configure HTTPS and secure headers

### Performance Optimization
1. **Caching**: Implement Redis for session management
2. **Database**: Add indexes for query optimization  
3. **Frontend**: Minify CSS/JS and enable compression
4. **Monitoring**: Add logging and health check endpoints

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Flask Team** for the excellent web framework
- **React Team** for the powerful UI library
- **Healthcare Workers** who inspired this queue-free solution
- **Open Source Community** for the amazing tools and libraries

---

**🏥 Queue-Free Healthcare System** - Revolutionizing healthcare appointment management with modern technology and thoughtful design.

**Live Demo:** `http://localhost:5000` (after setup)

**Status:** ✅ Production Ready | 🔄 Real-time Updates | 📱 Mobile Optimized | 🔐 Secure