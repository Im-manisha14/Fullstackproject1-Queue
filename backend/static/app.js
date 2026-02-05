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
            // Frontend Hardening: Auto-logout on 401 (Token Expired)
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Force reload to clear state and show Login
                if (!window.location.hash.includes('login')) {
                    window.location.reload();
                }
                throw new Error('Session expired. Please login again.');
            }
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
    },

    async verifySession() {
        return this.request('/auth/verify');
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

// Reusable Empty State Component
const EmptyState = ({ icon, message }) => (
    <div className="empty-state fade-in">
        <div className="empty-state-icon">
            <i className={`fas ${icon}`}></i>
        </div>
        <p>{message}</p>
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

    const toggleMode = () => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="login-page">
            <div className="login-card fade-in">
                <div className="login-header">
                    <div className="brand-logo">
                        <i className="fas fa-hospital-symbol"></i>
                    </div>
                    <h1 className="brand-title">Queue-Free Healthcare Appointments – Track Your Turn Live</h1>
                    <p className="brand-subtitle">
                        {isLogin ? 'Book appointments, monitor real-time queues, and reduce waiting time.' : 'Create your account to skip the wait.'}
                    </p>
                </div>

                {alert && (
                    <div className={`alert alert-${alert.type === 'error' ? 'error' : 'success'} mb-4`}>
                        {alert.message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Username Field */}
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            name="username"
                            className="form-input"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            placeholder="username"
                        />
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="form-input"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Extra Registration Fields */}
                    {!isLogin && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    className="form-input"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    required={!isLogin}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required={!isLogin}
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select
                                    name="role"
                                    className="form-select"
                                    value={formData.role}
                                    onChange={handleChange}
                                >
                                    <option value="patient">Patient</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="pharmacy">Pharmacy Staff</option>
                                </select>
                            </div>

                            {/* Doctor Specific Fields */}
                            {formData.role === 'doctor' && (
                                <div className="p-4 mb-4 bg-gray-50 rounded border border-gray-200">
                                    <div className="form-group">
                                        <label className="form-label">Specialization</label>
                                        <input
                                            type="text"
                                            name="specialization"
                                            className="form-input"
                                            value={formData.specialization}
                                            onChange={handleChange}
                                            required={formData.role === 'doctor'}
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
                                            required={formData.role === 'doctor'}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary w-full mt-4"
                        disabled={loading}
                    >
                        {loading ? (
                            <span><i className="fas fa-spinner fa-spin"></i> Processing...</span>
                        ) : (
                            isLogin ? 'Login' : 'Sign Up'
                        )}
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-sm text-secondary">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                            <button
                                type="button"
                                className="btn-link ml-1 text-primary font-bold"
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setAlert(null);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                            >
                                {isLogin ? 'Sign up' : 'Login'}
                            </button>
                        </p>
                    </div>
                </form>
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
                <div className="dashboard-brand">
                    <div className="brand-icon-box">
                        <i className="fas fa-user-injured"></i>
                    </div>
                    <div>
                        <h1 className="dashboard-title">Patient Portal</h1>
                        <p className="dashboard-subtitle">Welcome back, {user.full_name}</p>
                    </div>
                </div>
                <div className="dashboard-actions">
                    <button className="btn btn-secondary" onClick={fetchDashboardData}>
                        <i className="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            {/* 1. Welcome Card (Top) */}
            <div className="card mb-6">
                <div className="card-content flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-primary mb-1">Welcome, {user.full_name}</h1>
                        <p className="text-secondary">Manage your appointments and view live status.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-secondary uppercase tracking-wide font-bold">Your Appointments</div>
                        <div className="text-3xl font-bold">{dashboardData?.appointments?.length || 0}</div>
                    </div>
                </div>
            </div>

            {/* 2. Queue Status (IMPORTANT - Highlight Card) */}
            {dashboardData?.active_appointment ? (
                <div className="card mb-6" style={{ borderLeft: '6px solid var(--primary)', background: 'var(--primary-light)' }}>
                    <div className="card-content">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-blue-900">
                                <i className="fas fa-bullhorn mr-2"></i> Live Queue Status
                            </h2>
                            <StatusBadge status={dashboardData.active_appointment.status} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="text-secondary text-sm font-bold uppercase">Your Token</div>
                                <div className="text-4xl font-bold text-primary mt-2">#{dashboardData.active_appointment.token_number}</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="text-secondary text-sm font-bold uppercase">Estimated Wait</div>
                                <div className="text-4xl font-bold text-gray-800 mt-2">{dashboardData.estimated_wait}m</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="text-secondary text-sm font-bold uppercase">Queue Position</div>
                                <div className="text-4xl font-bold text-gray-800 mt-2">
                                    {Math.ceil(dashboardData.estimated_wait / 15)}
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar with Visual Cue */}
                        <div className="mt-6 bg-white p-4 rounded-lg">
                            <div className="flex justify-between text-sm text-secondary mb-2">
                                <span>In Queue</span>
                                <span className={dashboardData.estimated_wait <= 15 ? "text-success font-bold" : ""}>
                                    {dashboardData.estimated_wait <= 15 ? <i className="fas fa-check-circle"></i> : null} Your Turn is Coming
                                </span>
                            </div>
                            <div className="progress-container h-4 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="progress-bar bg-primary h-full transition-all duration-1000"
                                    style={{ width: `${Math.max(5, 100 - ((dashboardData.estimated_wait / 15) * 10))}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card mb-6 border-l-4 border-gray-300">
                    <div className="card-content flex items-center gap-4 text-secondary">
                        <i className="fas fa-info-circle text-2xl"></i>
                        <div>
                            <div className="font-bold">No Active Queue</div>
                            <div className="text-sm">You are not currently in a queue. Book an appointment to join.</div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Actions (Book Appointment) */}
            {!showBooking ? (
                <div className="card mb-6">
                    <div className="card-content flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold mb-1">Need a Doctor?</h2>
                            <p className="text-secondary">Schedule a new visit or check your past prescriptions.</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowBooking(true)}
                            >
                                <i className="fas fa-plus-circle"></i> Book Appointment
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => document.getElementById('prescriptions-section').scrollIntoView({ behavior: 'smooth' })}
                            >
                                <i className="fas fa-file-prescription"></i> View Prescriptions
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mb-6">
                    <AppointmentBooking
                        onCancel={() => setShowBooking(false)}
                        onSuccess={() => {
                            setShowBooking(false);
                            fetchDashboardData();
                            setAlert({ type: 'success', message: 'Appointment booked successfully!' });
                        }}
                    />
                </div>
            )}

            {/* 4. History & Prescriptions (Secondary Info) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="prescriptions-section">
                {/* Recent Appointments */}
                <div className="card">
                    <div className="card-header border-b p-4">
                        <h3 className="font-bold">Recent History</h3>
                    </div>
                    <div className="card-content p-0">
                        {dashboardData?.appointments?.length ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-sm text-secondary">
                                    <tr>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Doctor</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {dashboardData.appointments.slice(0, 5).map(apt => (
                                        <tr key={apt.id} className="border-t border-gray-100">
                                            <td className="p-3 font-medium">{formatDate(apt.date)}</td>
                                            <td className="p-3">{apt.doctor}</td>
                                            <td className="p-3"><StatusBadge status={apt.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-muted">No appointments found.</div>
                        )}
                    </div>
                </div>

                {/* Prescriptions */}
                <div className="card">
                    <div className="card-header border-b p-4">
                        <h3 className="font-bold">My Prescriptions</h3>
                    </div>
                    <div className="card-content max-h-64 overflow-y-auto custom-scrollbar">
                        {dashboardData?.prescriptions?.length ? (
                            <div className="flex flex-col gap-3">
                                {dashboardData.prescriptions.map(pres => (
                                    <div key={pres.id} className="p-3 border rounded hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-primary">#{pres.prescription_number}</span>
                                            <span className="text-xs text-secondary">{formatDate(pres.date)}</span>
                                        </div>
                                        <div className="text-sm font-medium">{pres.diagnosis}</div>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="text-xs text-secondary">{pres.medications.length} Medicines</div>
                                            <StatusBadge status={pres.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted">No prescriptions yet.</div>
                        )}
                    </div>
                </div>
            </div>
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
    const [processingId, setProcessingId] = useState(null);
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
        setProcessingId(appointmentId);
        try {
            await apiService.advanceQueue(appointmentId);
            fetchDashboardData();
            setAlert({ type: 'success', message: 'Queue advanced successfully' });
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <Loading message="Loading your practice..." />;

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <div className="dashboard-brand">
                    <div className="brand-icon-box">
                        <i className="fas fa-user-md"></i>
                    </div>
                    <div>
                        <h1 className="dashboard-title">Doctor's Console</h1>
                        <p className="dashboard-subtitle">Good day, Dr. {user.full_name}</p>
                    </div>
                </div>
                <div className="dashboard-actions">
                    <button className="btn btn-secondary" onClick={fetchDashboardData}>
                        <i className="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><i className="fas fa-ticket-alt"></i></div>
                    <div className="stat-content">
                        <div className="stat-number">
                            {dashboardData?.active_appointment ? `#${dashboardData.active_appointment.token_number}` : '-'}
                        </div>
                        <div className="stat-label">Your Token</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="fas fa-user-check"></i></div>
                    <div className="stat-content">
                        <div className="stat-number">
                            {dashboardData?.current_serving ? `#${dashboardData.current_serving}` : '-'}
                        </div>
                        <div className="stat-label">Now Serving</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="fas fa-hourglass-half"></i></div>
                    <div className="stat-content">
                        <div className="stat-number">
                            {dashboardData?.estimated_wait ? `${dashboardData.estimated_wait}m` : '0m'}
                        </div>
                        <div className="stat-label">Est. Wait</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="fas fa-clock"></i></div>
                    <div className="stat-content">
                        <div className="stat-number">{dashboardData?.statistics?.average_time || 15}</div>
                        <div className="stat-label">Avg Time (min)</div>
                    </div>
                </div>
            </div>

            {/* Doctor Layout: Left (Queue) + Right (Active Patient) */}
            <div className="doctor-layout">
                {/* LEFT COLUMN: Queue List */}
                <div className="card h-full" style={{ margin: 0 }}>
                    <div className="card-header flex justify-between items-center sticky top-0 bg-white z-10">
                        <h2 className="card-title">Waiting Queue</h2>
                        <span className="state-badge status-in-queue">
                            {dashboardData?.current_queue?.filter(p => p.status !== 'consulting').length || 0} Waiting
                        </span>
                    </div>
                    <div className="queue-list-container">
                        {dashboardData?.current_queue?.filter(p => p.status !== 'consulting').length > 0 ? (
                            dashboardData.current_queue
                                .filter(p => p.status !== 'consulting')
                                .map(appointment => (
                                    <div key={appointment.id} className="queue-card-item">
                                        <div>
                                            <div className="font-bold">Token #{appointment.token_number}</div>
                                            <div className="text-sm text-secondary">{appointment.patient_name}</div>
                                        </div>
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => handleAdvanceQueue(appointment.id)}
                                            disabled={processingId === appointment.id}
                                        >
                                            {processingId === appointment.id ? <i className="fas fa-spinner fa-spin"></i> : "Call"}
                                        </button>
                                    </div>
                                ))
                        ) : (
                            <div className="p-4 text-center text-muted">No patients waiting.</div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Active Patient Area */}
                <div className="patient-action-area">
                    <h2 className="text-xl font-bold mb-4 border-b pb-2">Current Consultation</h2>
                    {dashboardData?.current_queue?.find(p => p.status === 'consulting') ? (
                        (() => {
                            const activePatient = dashboardData.current_queue.find(p => p.status === 'consulting');
                            return (
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="text-4xl font-bold text-primary mb-2">
                                                #{activePatient.token_number}
                                            </div>
                                            <div className="text-xl font-bold">{activePatient.patient_name}</div>
                                            <div className="text-secondary mt-1">
                                                <i className="fas fa-clock"></i> Checked in: {formatTime(activePatient.time)}
                                            </div>
                                        </div>
                                        <StatusBadge status="consulting" />
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                                        <label className="text-xs font-bold text-blue-800 uppercase tracking-wide">Reported Symptoms</label>
                                        <p className="text-lg text-blue-900 mt-1">{activePatient.symptoms}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            className="btn btn-success w-full py-3 text-lg"
                                            onClick={() => setShowPrescription(activePatient)}
                                        >
                                            <i className="fas fa-file-prescription"></i> Write Prescription
                                        </button>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '8px' }}>
                                            <button
                                                className="btn btn-outline-danger w-full py-3 text-lg"
                                                onClick={async () => {
                                                    if (confirm('Mark this patient as missing?')) {
                                                        try {
                                                            await apiService.request(`/appointments/${activePatient.id}`, {
                                                                method: 'PUT',
                                                                body: JSON.stringify({ status: 'no_show' })
                                                            });
                                                            fetchDashboardData();
                                                            setAlert({ type: 'info', message: 'Patient marked as No Show' });
                                                        } catch (err) {
                                                            setAlert({ type: 'error', message: err.message });
                                                        }
                                                    }
                                                }}
                                                title="Patient Missing"
                                            >
                                                <i className="fas fa-user-times"></i>
                                            </button>

                                            <button
                                                className="btn btn-primary w-full py-3 text-lg"
                                                onClick={() => handleAdvanceQueue(activePatient.id)}
                                                disabled={processingId === activePatient.id}
                                            >
                                                {processingId === activePatient.id ? (
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                ) : (
                                                    <span><i className="fas fa-check"></i> Complete Visit</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()
                    ) : (
                        <div className="text-center py-12 text-muted">
                            <div className="text-6xl mb-4 text-gray-200"><i className="fas fa-user-md"></i></div>
                            <h3 className="text-xl font-medium mb-2">Ready for Next Patient</h3>
                            <p>Select a patient from the queue 'Call' button to start consultation.</p>
                        </div>
                    )}
                </div>
            </div>

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
                                            <td><StatusBadge status={appointment.status} /></td>
                                            <td>
                                                <span className={`priority-${appointment.priority} font-bold`}>
                                                    {appointment.priority.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon="fa-calendar-day"
                            message="No appointments scheduled for today."
                        />
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
        <div className="modal-overlay">
            <div className="modal-content fade-in">
                <h2 className="modal-title">Create Prescription</h2>
                <p className="text-secondary mb-4">
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
                            <div className="dropdown-list">
                                {medicines.map(medicine => (
                                    <div
                                        key={medicine.id}
                                        className="dropdown-item"
                                        onClick={() => addMedication(medicine)}
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
    const [processingId, setProcessingId] = useState(null);
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
        setProcessingId(prescriptionId);
        try {
            await apiService.dispensePrescription(prescriptionId);
            fetchDashboardData();
            setAlert({ type: 'success', message: 'Prescription dispensed successfully' });
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <Loading message="Loading pharmacy dashboard..." />;

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <div className="dashboard-brand">
                    <div className="brand-icon-box">
                        <i className="fas fa-clinic-medical"></i>
                    </div>
                    <div>
                        <h1 className="dashboard-title">Pharmacy Panel</h1>
                        <p className="dashboard-subtitle">Dispensing Unit - {user.full_name}</p>
                    </div>
                </div>
                <button className="btn btn-secondary" onClick={fetchDashboardData}>
                    <i className="fas fa-sync-alt"></i> Refresh
                </button>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><i className="fas fa-file-prescription"></i></div>
                    <div className="stat-content">
                        <div className="stat-number">{dashboardData?.statistics?.pending_count || 0}</div>
                        <div className="stat-label">Pending Orders</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><i className="fas fa-exclamation-triangle"></i></div>
                    <div className="stat-content">
                        <div className="stat-number">{dashboardData?.statistics?.low_stock_count || 0}</div>
                        <div className="stat-label">Low Stock Items</div>
                    </div>
                </div>
            </div>

            {/* Pending Prescriptions */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Pending For Dispensing</h2>
                </div>
                <div className="card-content">
                    {dashboardData?.pending_prescriptions?.length ? (
                        <div className="flex flex-col gap-4">
                            {dashboardData.pending_prescriptions.map(prescription => (
                                <div key={prescription.id} className="p-4 border rounded mb-4 bg-white relative">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <div className="font-bold text-lg">#{prescription.prescription_number}</div>
                                            <div className="text-muted text-sm">
                                                Patient: {prescription.patient_name} | Date: {prescription.date}
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={() => handleDispensePrescription(prescription.id)}
                                            disabled={processingId === prescription.id}
                                        >
                                            {processingId === prescription.id ? (
                                                <span><i className="fas fa-spinner fa-spin"></i> Processing...</span>
                                            ) : (
                                                <span><i className="fas fa-check"></i> Mark Dispensed</span>
                                            )}
                                        </button>
                                    </div>

                                    <div className="mb-4">
                                        <strong>Diagnosis:</strong> {prescription.diagnosis}
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded">
                                        <div className="font-bold mb-2">Medications:</div>
                                        <ul className="medication-list">
                                            {prescription.medications.map((medication, index) => (
                                                <li key={index} className="medication-item">
                                                    <div className="font-bold text-primary">
                                                        {medication.name} <span className="text-muted">({medication.strength})</span>
                                                    </div>
                                                    <div className="text-sm flex gap-4 mt-1">
                                                        <span><strong>Qty:</strong> {medication.quantity}</span>
                                                        <span><strong>Sig:</strong> {medication.instructions}</span>
                                                        <span className={medication.available_stock < medication.quantity ? "text-error" : "text-success"}>
                                                            <strong>Stock:</strong> {medication.available_stock}
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon="fa-prescription-bottle-alt"
                            message="No pending prescriptions to dispense."
                        />
                    )}
                </div>
            </div>

            {/* Low Stock Alert */}
            {dashboardData?.low_stock_medicines?.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Stock Alerts</h2>
                    </div>
                    <div className="card-content">
                        <div className="alert alert-warning">
                            <i className="fas fa-exclamation-circle"></i> The following medicines are running low on stock.
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
                                            <td className={medicine.current_stock === 0 ? 'text-error font-bold' : 'text-warning font-bold'}>
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
                                                <span className={`state-badge status-${user.role}`}>
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
                        <EmptyState
                            icon="fa-user-check"
                            message="All users verified."
                        />
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

    // Socket IO Logic
    useEffect(() => {
        let socket = null;
        if (user) {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Initialize Socket with Auth Handshake
                    const socketUrl = API_BASE.replace('/api', '');
                    socket = io(socketUrl, {
                        query: { token: token },
                        transports: ['websocket']
                    });

                    socket.on('connect', () => {
                        console.log('Socket Connected Securely');
                    });

                    socket.on('queue_update', (data) => {
                        if (data.message) alert(`🔔 Queue Update: ${data.message}`);
                    });

                    socket.on('new_appointment', (data) => {
                        if (data.message) alert(`📅 New Appointment: ${data.message}`);
                    });

                    socket.on('new_prescription', (data) => {
                        if (data.message) alert(`💊 Pharmacy Update: ${data.message}`);
                    });

                    socket.on('prescription_dispensed', (data) => {
                        if (data.message) alert(`✅ Medicines Ready: ${data.message}`);
                    });

                } catch (err) {
                    console.error("Socket Init Failed:", err);
                }
            }
        }

        return () => {
            if (socket) socket.disconnect();
        };
    }, [user]);

    useEffect(() => {
        const initApp = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    // Frontend Hardening: Verify token with backend
                    const response = await apiService.verifySession();
                    if (response.valid) {
                        const userObj = JSON.parse(storedUser);
                        // Double check role integrity
                        if (userObj.role !== response.role) {
                            throw new Error('Role mismatch');
                        }
                        setUser(userObj);
                    } else {
                        throw new Error('Invalid session');
                    }
                } catch (error) {
                    console.error('Session verification failed:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        initApp();
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
                        <div className="logo-icon"><i className="fas fa-hospital-symbol"></i></div>
                        <h1>Medical Center</h1>
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user.full_name}</span>
                        <span className="user-role-badge">{user.role}</span>
                        <button className="logout-btn" onClick={handleLogout}>
                            <i className="fas fa-sign-out-alt"></i> Logout
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