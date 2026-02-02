# Q-Free Health - Queue-Free Healthcare Appointment System

A comprehensive healthcare management platform built with React frontend, Flask backend, and PostgreSQL database. This system enables queue-free appointment booking, real-time queue management, digital prescriptions, and pharmacy integration.

## 🏥 System Overview

**Q-Free Health** transforms traditional healthcare appointment systems by providing:
- **Queue-Free Booking**: Smart appointment scheduling with real-time slot validation
- **Live Queue Management**: Real-time queue tracking with wait time predictions
- **Digital Prescriptions**: Seamless prescription workflow from doctor to pharmacy
- **Role-Based Access**: Separate dashboards for patients, doctors, and pharmacists
- **Professional Design**: Clean, accessible UI following healthcare industry standards

## 🏗️ Architecture

```
Frontend (React + HTML/CSS/JS) ↔ Backend (Flask REST API) ↔ Database (PostgreSQL)
```

- **Frontend**: React SPA with role-based dashboards
- **Backend**: Flask REST API with JWT authentication
- **Database**: PostgreSQL with normalized schema
- **Deployment**: Docker containers with Nginx reverse proxy

## 📋 Features by Role

### 👤 Patient Module
- Secure registration and authentication
- Department and doctor search
- Real-time appointment booking
- Live queue status with wait time estimates
- Digital prescription viewing
- Appointment history and management

### 👨‍⚕️ Doctor Module
- Daily OPD schedule management
- Real-time patient queue with token system
- Digital prescription creation
- Patient consultation workflow
- Analytics dashboard (patients seen, average time)
- Emergency patient prioritization

### 💊 Pharmacy Module
- Digital prescription queue management
- Real-time inventory tracking
- Low stock alerts and notifications
- Medicine dispensing workflow
- Prescription status updates

## 🛠️ Technology Stack

### Frontend
- **React 18** - Component-based UI framework
- **HTML5 & CSS3** - Semantic markup and responsive design
- **JavaScript ES6+** - Modern JavaScript features
- **Babel** - JavaScript transpilation

### Backend
- **Flask 2.3** - Python web framework
- **Flask-SQLAlchemy** - Database ORM
- **Flask-JWT-Extended** - JWT authentication
- **Flask-CORS** - Cross-origin resource sharing
- **PostgreSQL** - Relational database
- **psycopg2** - PostgreSQL adapter

### DevOps & Deployment
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy and static file serving
- **PostgreSQL 15** - Production database

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- PostgreSQL (if running locally)
- Python 3.9+ (for local development)

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Fullstackproject-QueueFreeAppoinment
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:5000
   - Database: localhost:5432

### Option 2: Local Development

1. **Database Setup**
   ```bash
   # Install PostgreSQL and create database
   createdb queue
   psql -d queue -f database/schema.sql
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   # Serve with any HTTP server or open index.html directly
   python -m http.server 3000
   ```

## 🔐 Default Login Credentials

### Test Accounts
```
Patient:
Email: patient@qfree.com
Password: password123

Doctor:
Email: dr.smith@qfree.com
Password: password123

Pharmacy:
Email: pharmacy@qfree.com
Password: password123
```

## 📊 Database Schema

### Core Tables
- **users** - User authentication and profiles
- **departments** - Medical departments
- **doctors** - Doctor profiles and availability
- **patients** - Patient profiles and medical history
- **appointments** - Appointment bookings with token system
- **queue_status** - Real-time queue management
- **prescriptions** - Digital prescription data
- **pharmacy_inventory** - Medicine stock management
- **audit_logs** - System activity tracking

### Key Features
- **Normalized Design**: Proper foreign key relationships
- **ACID Compliance**: Transaction-safe operations
- **Indexing**: Optimized queries for performance
- **JSON Storage**: Flexible prescription and medicine data
- **Audit Trail**: Complete system activity logging

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - New user registration

### Appointments
- `GET /api/appointments/my` - User's appointments
- `POST /api/appointments` - Book new appointment
- `POST /api/queue/update` - Update queue status

### Medical Data
- `GET /api/departments` - List departments
- `GET /api/doctors` - List doctors by department
- `POST /api/prescriptions` - Create prescription
- `GET /api/pharmacy/prescriptions` - Pharmacy queue
- `GET /api/pharmacy/inventory` - Medicine inventory

## 🎨 Design System

### Color Palette
- **Primary Blue**: #2563eb (buttons, links, accents)
- **Dark Blue**: #1e3a8a (headings, important text)
- **Light Blue**: #f0f9ff (backgrounds, highlights)
- **Gray Scale**: #f8fafc to #1f2937 (text, borders)
- **Status Colors**: Green (success), Yellow (warning), Red (error)

### Typography
- **Font Family**: Inter, Segoe UI, Roboto, system fonts
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Responsive**: Scales appropriately on mobile devices

## 🔒 Security Features

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Session management

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Audit logging for compliance

## 📱 Responsive Design

The system is fully responsive and works on:
- **Desktop**: Full dashboard experience
- **Tablet**: Optimized layout with touch support
- **Mobile**: Compact interface with essential features
- **Accessibility**: WCAG 2.1 compliant design

## 🧪 Testing

### Manual Testing Workflow
1. **User Registration**: Create accounts for each role
2. **Patient Flow**: Book appointment → Check queue → View prescription
3. **Doctor Flow**: View queue → Start consultation → Create prescription
4. **Pharmacy Flow**: Process prescription → Update inventory

### API Testing
```bash
# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@qfree.com","password":"password123"}'

# Test appointment booking (with JWT token)
curl -X POST http://localhost:5000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"doctor_id":1,"appointment_date":"2026-02-03","appointment_time":"10:00","symptoms":"Routine checkup"}'
```

## 📈 Performance Considerations

### Database Optimization
- Indexed columns for frequent queries
- Connection pooling
- Query optimization
- Pagination for large datasets

### Frontend Performance
- Component lazy loading
- Efficient state management
- Optimized re-renders
- Image optimization

### Caching Strategy
- Static asset caching
- API response caching
- Database query caching
- Browser storage for user sessions

## 🔧 Configuration

### Environment Variables
```bash
# Backend Configuration
FLASK_ENV=production
DATABASE_URL=postgresql://postgres:Manisha14@localhost/queue
JWT_SECRET_KEY=healthcare-queue-secret-key-2026

# Database Configuration
POSTGRES_DB=queue
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Manisha14
```

### Feature Flags
- Real-time updates (WebSocket support)
- Email notifications
- SMS reminders
- Analytics tracking
- Audit logging level

## 🚀 Deployment

### Production Checklist
- [ ] Update JWT secret key
- [ ] Configure HTTPS certificates
- [ ] Set up database backups
- [ ] Configure monitoring
- [ ] Set up log aggregation
- [ ] Update CORS origins
- [ ] Configure rate limiting

### Scaling Considerations
- **Horizontal Scaling**: Multiple backend instances
- **Database**: PostgreSQL read replicas
- **Caching**: Redis for session storage
- **CDN**: Static asset delivery
- **Load Balancer**: Traffic distribution

## 📞 Support & Troubleshooting

### Common Issues
1. **Database Connection**: Verify PostgreSQL is running and credentials are correct
2. **CORS Errors**: Check API URL in frontend configuration
3. **JWT Errors**: Verify token expiration and secret key
4. **Queue Not Updating**: Check real-time update intervals

### Debug Mode
Enable debug logging by setting `FLASK_ENV=development` in backend configuration.

### Logs Location
- **Backend**: Application logs in console
- **Database**: PostgreSQL logs
- **Nginx**: Access and error logs in container

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Follow coding standards
4. Add tests for new features
5. Submit pull request

### Code Style
- **Python**: PEP 8 compliance
- **JavaScript**: ES6+ standards
- **CSS**: BEM methodology
- **SQL**: Proper formatting and comments

## 📄 License

This project is developed for educational and healthcare improvement purposes. All code is open source under MIT License.

---

**Q-Free Health** - Transforming Healthcare Through Technology

For questions or support, contact the development team or create an issue in the repository.