const { useState, useEffect, useRef } = React;

// API Configuration
const API_BASE = 'http://localhost:5000/api';

// Utility Functions
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric'
    });
};

const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

// API Service
const apiService = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            ...options
        };

        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }
        
        return data;
    },

    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    },

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async getDashboard(role) {
        return this.request(`/dashboard/${role}`);
    },

    async bookAppointment(data) {
        return this.request('/appointments/book', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async advanceQueue(appointmentId) {
        return this.request('/appointments/advance-queue', {
            method: 'POST',
            body: JSON.stringify({ appointment_id: appointmentId })
        });
    },

    async createPrescription(data) {
        return this.request('/prescriptions/create', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async dispensePrescription(prescriptionId) {
        return this.request('/prescriptions/dispense', {
            method: 'POST',
            body: JSON.stringify({ prescription_id: prescriptionId })
        });
    },

    async getDepartments() {
        return this.request('/departments');
    },

    async getDoctorsByDepartment(departmentId) {
        return this.request(`/doctors/${departmentId}`);
    },

    async searchMedicines(query) {
        return this.request(`/medicines/search?q=${encodeURIComponent(query)}`);
    },

    async verifyUser(userId) {
        return this.request('/admin/verify-user', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
    }
};

// Status Badge Component
const StatusBadge = ({ status, priority }) => {
    const getStatusClass = (status) => {
        switch (status) {
            case 'booked': return 'status-booked';
            case 'in_queue': return 'status-in-queue';
            case 'consulting': return 'status-consulting';
            case 'completed': return 'status-completed';
            case 'pending': return 'status-pending';
            case 'dispensed': return 'status-dispensed';
            default: return 'status-booked';
        }
    };

    const getPriorityClass = (priority) => {
        return priority === 'emergency' ? 'priority-emergency' : 'priority-normal';
    };

    return (
        <div>
            <span className={`status ${getStatusClass(status)}`}>
                {status.replace('_', ' ')}
            </span>
            {priority && priority !== 'normal' && (
                <span className={`priority-${priority}`}> ({priority})</span>
            )}
        </div>
    );
};

// Loading Component
const Loading = ({ message = "Loading..." }) => (
    <div className="loading">
        <div className="loading-spinner"></div>
        <p>{message}</p>
    </div>
);

// Alert Component
const Alert = ({ type, message, onClose }) => (
    <div className={`alert alert-${type}`}>
        {message}
        {onClose && (
            <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', fontSize: '18px' }}>
                ×
            </button>
        )}
    </div>
);

// Login Component
const Login = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        full_name: '',
        phone: '',
        role: 'patient',
        department_id: '',
        specialization: '',
        experience_years: '',
        consultation_fee: ''
    });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await apiService.getDepartments();
                setDepartments(response.departments);
            } catch (error) {
                console.error('Failed to fetch departments:', error);
            }
        };
        fetchDepartments();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        try {
            if (isLogin) {
                const response = await apiService.login({
                    username: formData.username,
                    password: formData.password
                });
                
                localStorage.setItem('token', response.access_token);
                localStorage.setItem('user', JSON.stringify(response.user));
                onLogin(response.user);
            } else {
                const response = await apiService.register(formData);
                setAlert({ type: 'success', message: response.message });
                
                if (formData.role === 'patient') {
                    setTimeout(() => {
                        setIsLogin(true);
                        setFormData(prev => ({ ...prev, password: '' }));
                    }, 2000);
                }
            }
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="login-container">
            <div className="login-left">
                <div className="hospital-branding">
                    <div className="hospital-logo">⚕</div>
                    <h1 className="hospital-name">Medical Center</h1>
                    <p className="hospital-tagline">Advanced Healthcare Management</p>
                </div>

                <div className="form-container">
                    <h2 className="form-title">
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </h2>

                    {alert && (
                        <Alert 
                            type={alert.type} 
                            message={alert.message} 
                            onClose={() => setAlert(null)} 
                        />
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                name="username"
                                className="form-input"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                placeholder="Enter username"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Enter password"
                            />
                        </div>

                        {!isLogin && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter email"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        className="form-input"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter full name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        className="form-input"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="Enter phone number"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select
                                        name="role"
                                        className="form-select"
                                        value={formData.role}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="patient">Patient</option>
                                        <option value="doctor">Doctor</option>
                                        <option value="pharmacy">Pharmacy Staff</option>
                                    </select>
                                </div>

                                {formData.role === 'doctor' && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Department</label>
                                            <select
                                                name="department_id"
                                                className="form-select"
                                                value={formData.department_id}
                                                onChange={handleChange}
                                                required
                                            >
                                                <option value="">Select Department</option>
                                                {departments.map(dept => (
                                                    <option key={dept.id} value={dept.id}>
                                                        {dept.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Specialization</label>
                                            <input
                                                type="text"
                                                name="specialization"
                                                className="form-input"
                                                value={formData.specialization}
                                                onChange={handleChange}
                                                placeholder="Your specialization"
                                            />
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Experience (years)</label>
                                                <input
                                                    type="number"
                                                    name="experience_years"
                                                    className="form-input"
                                                    value={formData.experience_years}
                                                    onChange={handleChange}
                                                    min="0"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Consultation Fee</label>
                                                <input
                                                    type="number"
                                                    name="consultation_fee"
                                                    className="form-input"
                                                    value={formData.consultation_fee}
                                                    onChange={handleChange}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setAlert(null);
                                setFormData(prev => ({ ...prev, password: '' }));
                            }}
                        >
                            {isLogin ? 'Need an account?' : 'Already have an account?'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="login-right">
                <div style={{ color: 'white', textAlign: 'center', padding: '40px' }}>
                </div>
            </div>
        </div>
    );
};

// Patient Dashboard
const PatientDashboard = ({ user }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [showBooking, setShowBooking] = useState(false);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await apiService.getDashboard('patient');
            setDashboardData(response.data);
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading message="Loading your dashboard..." />;

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Patient Dashboard</h1>
                <p className="dashboard-subtitle">Welcome back, {user.full_name}</p>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.appointments?.length || 0}</div>
                    <div className="stat-label">Total Appointments</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">
                        {dashboardData?.appointments?.filter(apt => apt.status === 'in_queue').length || 0}
                    </div>
                    <div className="stat-label">In Queue</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.prescriptions?.length || 0}</div>
                    <div className="stat-label">Pending Prescriptions</div>
                </div>
            </div>

            {!showBooking ? (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Quick Actions</h2>
                    </div>
                    <div className="card-content">
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowBooking(true)}
                        >
                            Book New Appointment
                        </button>
                    </div>
                </div>
            ) : (
                <AppointmentBooking 
                    onCancel={() => setShowBooking(false)}
                    onSuccess={() => {
                        setShowBooking(false);
                        fetchDashboardData();
                        setAlert({ type: 'success', message: 'Appointment booked successfully!' });
                    }}
                />
            )}

            {/* Current Queue Status */}
            {dashboardData?.appointments?.some(apt => apt.queue_info && apt.status !== 'completed') && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Your Queue Status</h2>
                    </div>
                    <div className="card-content">
                        {dashboardData.appointments
                            .filter(apt => apt.queue_info && apt.status !== 'completed')
                            .map(appointment => (
                                <div key={appointment.id} className="queue-info">
                                    <div className="queue-position">
                                        Position: {appointment.queue_info.position}
                                    </div>
                                    <div className="queue-wait-time">
                                        Estimated wait: {appointment.queue_info.estimated_wait} minutes
                                    </div>
                                    <div style={{ marginTop: '10px', fontSize: '14px' }}>
                                        {appointment.doctor} - {appointment.department}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Recent Appointments */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Your Appointments</h2>
                </div>
                <div className="card-content">
                    {dashboardData?.appointments?.length ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Token</th>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Doctor</th>
                                        <th>Department</th>
                                        <th>Status</th>
                                        <th>Symptoms</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData.appointments.map(appointment => (
                                        <tr key={appointment.id}>
                                            <td>#{appointment.token_number}</td>
                                            <td>{formatDate(appointment.date)}</td>
                                            <td>{formatTime(appointment.time)}</td>
                                            <td>{appointment.doctor}</td>
                                            <td>{appointment.department}</td>
                                            <td><StatusBadge status={appointment.status} /></td>
                                            <td>{appointment.symptoms}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p>No appointments found. Book your first appointment!</p>
                    )}
                </div>
            </div>

            {/* Prescriptions */}
            {dashboardData?.prescriptions?.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Your Prescriptions</h2>
                    </div>
                    <div className="card-content">
                        {dashboardData.prescriptions.map(prescription => (
                            <div key={prescription.id} className="prescription-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <strong>#{prescription.prescription_number}</strong>
                                    <StatusBadge status={prescription.status} />
                                </div>
                                <p><strong>Date:</strong> {formatDate(prescription.date)}</p>
                                <p><strong>Diagnosis:</strong> {prescription.diagnosis}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Appointment Booking Component
const AppointmentBooking = ({ onCancel, onSuccess }) => {
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [formData, setFormData] = useState({
        department_id: '',
        doctor_id: '',
        appointment_date: '',
        appointment_time: '',
        symptoms: '',
        priority: 'normal'
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (formData.department_id) {
            fetchDoctors(formData.department_id);
        }
    }, [formData.department_id]);

    const fetchDepartments = async () => {
        try {
            const response = await apiService.getDepartments();
            setDepartments(response.departments);
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        }
    };

    const fetchDoctors = async (departmentId) => {
        try {
            const response = await apiService.getDoctorsByDepartment(departmentId);
            setDoctors(response.doctors);
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        try {
            await apiService.bookAppointment(formData);
            onSuccess();
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // Generate available time slots
    const generateTimeSlots = () => {
        const slots = [];
        for (let hour = 9; hour < 17; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                slots.push(time);
            }
        }
        return slots;
    };

    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    return (
        <div className="card">
            <div className="card-header">
                <h2 className="card-title">Book New Appointment</h2>
            </div>
            <div className="card-content">
                {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

                <form onSubmit={handleSubmit} className="booking-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Department</label>
                            <select
                                name="department_id"
                                className="form-select"
                                value={formData.department_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Doctor</label>
                            <select
                                name="doctor_id"
                                className="form-select"
                                value={formData.doctor_id}
                                onChange={handleChange}
                                required
                                disabled={!formData.department_id}
                            >
                                <option value="">Select Doctor</option>
                                {doctors.map(doctor => (
                                    <option key={doctor.id} value={doctor.id}>
                                        {doctor.name} - {doctor.specialization}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                name="appointment_date"
                                className="form-input"
                                value={formData.appointment_date}
                                onChange={handleChange}
                                min={getTomorrowDate()}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Time</label>
                            <select
                                name="appointment_time"
                                className="form-select"
                                value={formData.appointment_time}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Time</option>
                                {generateTimeSlots().map(time => (
                                    <option key={time} value={time}>
                                        {formatTime(time)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Priority</label>
                        <select
                            name="priority"
                            className="form-select"
                            value={formData.priority}
                            onChange={handleChange}
                        >
                            <option value="normal">Normal</option>
                            <option value="emergency">Emergency</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Symptoms / Reason</label>
                        <textarea
                            name="symptoms"
                            className="form-textarea"
                            value={formData.symptoms}
                            onChange={handleChange}
                            required
                            placeholder="Describe your symptoms or reason for visit"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Booking...' : 'Book Appointment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Doctor Dashboard
const DoctorDashboard = ({ user }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [showPrescription, setShowPrescription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 15000); // Refresh every 15 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await apiService.getDashboard('doctor');
            setDashboardData(response.data);
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleAdvanceQueue = async (appointmentId) => {
        try {
            await apiService.advanceQueue(appointmentId);
            fetchDashboardData();
            setAlert({ type: 'success', message: 'Queue advanced successfully' });
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        }
    };

    if (loading) return <Loading message="Loading your practice..." />;

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Doctor Dashboard</h1>
                <p className="dashboard-subtitle">Good day, Dr. {user.full_name}</p>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.statistics?.total_today || 0}</div>
                    <div className="stat-label">Total Today</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.statistics?.completed || 0}</div>
                    <div className="stat-label">Completed</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.statistics?.in_progress || 0}</div>
                    <div className="stat-label">In Progress</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.statistics?.average_time || 15}</div>
                    <div className="stat-label">Avg Time (min)</div>
                </div>
            </div>

            {/* Current Queue */}
            {dashboardData?.current_queue?.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Current Queue</h2>
                    </div>
                    <div className="card-content">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Token</th>
                                        <th>Time</th>
                                        <th>Patient</th>
                                        <th>Symptoms</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData.current_queue.map(appointment => (
                                        <tr key={appointment.id}>
                                            <td>#{appointment.token_number}</td>
                                            <td>{formatTime(appointment.time)}</td>
                                            <td>{appointment.patient_name}</td>
                                            <td>{appointment.symptoms}</td>
                                            <td>
                                                <StatusBadge 
                                                    status={appointment.status} 
                                                    priority={appointment.priority} 
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => handleAdvanceQueue(appointment.id)}
                                                >
                                                    {appointment.status === 'booked' ? 'Call Next' : 
                                                     appointment.status === 'in_queue' ? 'Start Consultation' :
                                                     'Complete'}
                                                </button>
                                                {appointment.status === 'consulting' && (
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => setShowPrescription(appointment)}
                                                        style={{ marginLeft: '5px' }}
                                                    >
                                                        Prescribe
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* All Today's Appointments */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Today's Schedule</h2>
                </div>
                <div className="card-content">
                    {dashboardData?.appointments?.length ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Token</th>
                                        <th>Time</th>
                                        <th>Patient</th>
                                        <th>Symptoms</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData.appointments.map(appointment => (
                                        <tr key={appointment.id}>
                                            <td>#{appointment.token_number}</td>
                                            <td>{formatTime(appointment.time)}</td>
                                            <td>{appointment.patient_name}</td>
                                            <td>{appointment.symptoms}</td>
                                            <td><StatusBadge status={appointment.status} /></td>
                                            <td>
                                                <span className={`priority-${appointment.priority}`}>
                                                    {appointment.priority}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p>No appointments scheduled for today.</p>
                    )}
                </div>
            </div>

            {/* Prescription Modal */}
            {showPrescription && (
                <PrescriptionForm
                    appointment={showPrescription}
                    onClose={() => setShowPrescription(null)}
                    onSuccess={() => {
                        setShowPrescription(null);
                        fetchDashboardData();
                        setAlert({ type: 'success', message: 'Prescription created successfully' });
                    }}
                />
            )}
        </div>
    );
};

// Prescription Form Component
const PrescriptionForm = ({ appointment, onClose, onSuccess }) => {
    const [medicines, setMedicines] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        diagnosis: '',
        notes: '',
        medications: []
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    const searchMedicines = async (query) => {
        if (query.length < 2) return;
        try {
            const response = await apiService.searchMedicines(query);
            setMedicines(response.medicines);
        } catch (error) {
            console.error('Failed to search medicines:', error);
        }
    };

    const addMedication = (medicine) => {
        const medication = {
            medicine_id: medicine.id,
            medicine_name: medicine.name,
            strength: medicine.strength,
            quantity: 1,
            instructions: 'Take as prescribed',
            duration: 7
        };
        
        setFormData(prev => ({
            ...prev,
            medications: [...prev.medications, medication]
        }));
        setSearchQuery('');
        setMedicines([]);
    };

    const removeMedication = (index) => {
        setFormData(prev => ({
            ...prev,
            medications: prev.medications.filter((_, i) => i !== index)
        }));
    };

    const updateMedication = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            medications: prev.medications.map((med, i) => 
                i === index ? { ...med, [field]: value } : med
            )
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.diagnosis.trim()) {
            setAlert({ type: 'error', message: 'Diagnosis is required' });
            return;
        }
        if (formData.medications.length === 0) {
            setAlert({ type: 'error', message: 'At least one medication is required' });
            return;
        }

        setLoading(true);
        try {
            await apiService.createPrescription({
                appointment_id: appointment.id,
                diagnosis: formData.diagnosis,
                notes: formData.notes,
                medications: formData.medications
            });
            onSuccess();
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '10px',
                padding: '30px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto'
            }}>
                <h2 style={{ marginBottom: '20px' }}>Create Prescription</h2>
                <p style={{ marginBottom: '20px', color: '#666' }}>
                    Patient: <strong>{appointment.patient_name}</strong> | 
                    Token: <strong>#{appointment.token_number}</strong>
                </p>

                {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Diagnosis *</label>
                        <textarea
                            className="form-textarea"
                            value={formData.diagnosis}
                            onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                            required
                            placeholder="Enter diagnosis"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            className="form-textarea"
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Additional notes and instructions"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Search Medicines</label>
                        <input
                            type="text"
                            className="form-input"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                searchMedicines(e.target.value);
                            }}
                            placeholder="Type medicine name..."
                        />
                        
                        {medicines.length > 0 && (
                            <div style={{
                                border: '1px solid #ddd',
                                borderRadius: '5px',
                                marginTop: '5px',
                                maxHeight: '150px',
                                overflow: 'auto'
                            }}>
                                {medicines.map(medicine => (
                                    <div
                                        key={medicine.id}
                                        style={{
                                            padding: '10px',
                                            borderBottom: '1px solid #eee',
                                            cursor: 'pointer',
                                            background: '#fff'
                                        }}
                                        onClick={() => addMedication(medicine)}
                                        onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                                        onMouseLeave={(e) => e.target.style.background = '#fff'}
                                    >
                                        <strong>{medicine.name}</strong> - {medicine.strength}
                                        <br />
                                        <small>Stock: {medicine.stock_quantity}</small>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Selected Medications</label>
                        {formData.medications.length === 0 ? (
                            <p style={{ color: '#666', fontStyle: 'italic' }}>No medications added yet</p>
                        ) : (
                            <div>
                                {formData.medications.map((medication, index) => (
                                    <div key={index} style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '5px',
                                        padding: '15px',
                                        marginBottom: '10px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <strong>{medication.medicine_name} - {medication.strength}</strong>
                                            <button
                                                type="button"
                                                onClick={() => removeMedication(index)}
                                                style={{
                                                    background: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    padding: '5px 10px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Quantity</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="form-input"
                                                    value={medication.quantity}
                                                    onChange={(e) => updateMedication(index, 'quantity', parseInt(e.target.value))}
                                                    style={{ fontSize: '14px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Duration (days)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="form-input"
                                                    value={medication.duration}
                                                    onChange={(e) => updateMedication(index, 'duration', parseInt(e.target.value))}
                                                    style={{ fontSize: '14px' }}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div style={{ marginTop: '10px' }}>
                                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Instructions</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={medication.instructions}
                                                onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                                                placeholder="e.g., Take twice daily after meals"
                                                style={{ fontSize: '14px' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '30px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Prescription'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Pharmacy Dashboard
const PharmacyDashboard = ({ user }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await apiService.getDashboard('pharmacy');
            setDashboardData(response.data);
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDispensePrescription = async (prescriptionId) => {
        try {
            await apiService.dispensePrescription(prescriptionId);
            fetchDashboardData();
            setAlert({ type: 'success', message: 'Prescription dispensed successfully' });
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        }
    };

    if (loading) return <Loading message="Loading pharmacy dashboard..." />;

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Pharmacy Dashboard</h1>
                <p className="dashboard-subtitle">Welcome, {user.full_name}</p>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.statistics?.pending_count || 0}</div>
                    <div className="stat-label">Pending Prescriptions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.statistics?.low_stock_count || 0}</div>
                    <div className="stat-label">Low Stock Items</div>
                </div>
            </div>

            {/* Pending Prescriptions */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Pending Prescriptions</h2>
                </div>
                <div className="card-content">
                    {dashboardData?.pending_prescriptions?.length ? (
                        <div>
                            {dashboardData.pending_prescriptions.map(prescription => (
                                <div key={prescription.id} className="prescription-item">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <div>
                                            <strong>#{prescription.prescription_number}</strong>
                                            <p style={{ margin: '5px 0', color: '#666' }}>
                                                Patient: {prescription.patient_name} | Date: {prescription.date}
                                            </p>
                                        </div>
                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={() => handleDispensePrescription(prescription.id)}
                                        >
                                            Dispense
                                        </button>
                                    </div>
                                    
                                    <p style={{ marginBottom: '10px' }}><strong>Diagnosis:</strong> {prescription.diagnosis}</p>
                                    
                                    <div>
                                        <strong>Medications:</strong>
                                        <ul className="medication-list">
                                            {prescription.medications.map((medication, index) => (
                                                <li key={index} className="medication-item">
                                                    <div className="medication-name">
                                                        {medication.name} - {medication.strength}
                                                    </div>
                                                    <div className="medication-details">
                                                        Quantity: {medication.quantity} | 
                                                        Instructions: {medication.instructions} | 
                                                        Stock Available: {medication.available_stock}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No pending prescriptions.</p>
                    )}
                </div>
            </div>

            {/* Low Stock Alert */}
            {dashboardData?.low_stock_medicines?.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Low Stock Alert</h2>
                    </div>
                    <div className="card-content">
                        <div className="alert alert-warning">
                            The following medicines are running low on stock:
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Medicine</th>
                                        <th>Strength</th>
                                        <th>Current Stock</th>
                                        <th>Reorder Level</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData.low_stock_medicines.map((medicine, index) => (
                                        <tr key={index}>
                                            <td>{medicine.name}</td>
                                            <td>{medicine.strength}</td>
                                            <td style={{ color: medicine.current_stock === 0 ? '#d32f2f' : '#f57c00' }}>
                                                {medicine.current_stock}
                                            </td>
                                            <td>{medicine.reorder_level}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Admin Dashboard
const AdminDashboard = ({ user }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await apiService.getDashboard('admin');
            setDashboardData(response.data);
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyUser = async (userId) => {
        try {
            await apiService.verifyUser(userId);
            fetchDashboardData();
            setAlert({ type: 'success', message: 'User verified successfully' });
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        }
    };

    if (loading) return <Loading message="Loading admin dashboard..." />;

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Admin Dashboard</h1>
                <p className="dashboard-subtitle">System Administration - {user.full_name}</p>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.statistics?.total_users || 0}</div>
                    <div className="stat-label">Total Users</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.statistics?.appointments_today || 0}</div>
                    <div className="stat-label">Appointments Today</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.statistics?.pending_prescriptions || 0}</div>
                    <div className="stat-label">Pending Prescriptions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{dashboardData?.statistics?.unverified_count || 0}</div>
                    <div className="stat-label">Unverified Users</div>
                </div>
            </div>

            {/* Unverified Users */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Pending User Verifications</h2>
                </div>
                <div className="card-content">
                    {dashboardData?.unverified_users?.length ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Registration Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData.unverified_users.map(user => (
                                        <tr key={user.id}>
                                            <td>{user.full_name}</td>
                                            <td>{user.username}</td>
                                            <td>{user.email}</td>
                                            <td>
                                                <span className={`status status-${user.role}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>{user.created_at}</td>
                                            <td>
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => handleVerifyUser(user.id)}
                                                >
                                                    Verify
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p>No pending user verifications.</p>
                    )}
                </div>
            </div>

            {/* System Overview */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">System Overview</h2>
                </div>
                <div className="card-content">
                    <div className="alert alert-info">
                        System is running normally. All services are operational.
                        <br />
                        Database: PostgreSQL | Backend: Flask | Frontend: React
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main App Component
const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for stored user session
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const renderDashboard = () => {
        switch (user.role) {
            case 'patient':
                return <PatientDashboard user={user} />;
            case 'doctor':
                return <DoctorDashboard user={user} />;
            case 'pharmacy':
                return <PharmacyDashboard user={user} />;
            case 'admin':
                return <AdminDashboard user={user} />;
            default:
                return <div>Invalid user role</div>;
        }
    };

    if (loading) return <Loading message="Initializing application..." />;

    if (!user) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="app-container">
            <header className="header">
                <div className="header-content">
                    <div className="logo">
                        <div className="logo-icon">⚕</div>
                        <h1>Medical Center</h1>
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user.full_name}</span>
                        <span style={{ opacity: 0.8 }}>({user.role})</span>
                        <button className="logout-btn" onClick={handleLogout}>
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>
            <main className="main-content">
                {renderDashboard()}
            </main>
        </div>
    );
};

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));