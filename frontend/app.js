// Secure Healthcare Management System - React Frontend
const { useState, useEffect, useCallback } = React;

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Utility functions
const getAuthToken = () => localStorage.getItem('auth_token');
const getCurrentUser = () => JSON.parse(localStorage.getItem('user') || 'null');
const isTokenExpired = () => {
    const expires = localStorage.getItem('token_expires');
    return expires && Date.now() > parseInt(expires);
};

const apiCall = async (endpoint, options = {}) => {
    const token = getAuthToken();
    
    // Check if token is expired
    if (isTokenExpired()) {
        localStorage.clear();
        window.location.reload();
        return;
    }
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
    };

    try {
        console.log(`Making API call to: ${API_BASE_URL}${endpoint}`);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        console.log(`API Response status: ${response.status}`);

        if (response.status === 401) {
            // Unauthorized - clear token and redirect to login
            localStorage.clear();
            window.location.reload();
            return;
        }

        if (response.status === 403) {
            // Forbidden - show access denied
            throw new Error('Access denied. You do not have permission to access this resource.');
        }

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.error || errorMessage;
            } catch (e) {
                console.log('Could not parse error response as JSON');
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('API Response:', result);
        return result;
    } catch (error) {
        console.error('API Call Error:', error);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Cannot connect to server. Please ensure the backend is running on port 5000.');
        }
        throw error;
    }
};

// Secure Route Guard Component
const SecureRoute = ({ user, allowedRoles, children, fallback }) => {
    if (!user || !user.role) {
        return fallback || <div className="access-denied">Please log in to access this page.</div>;
    }

    if (!allowedRoles.includes(user.role)) {
        return (
            <div className="access-denied">
                <div className="access-denied-content">
                    <h2>Access Denied</h2>
                    <p>You do not have permission to access this resource.</p>
                    <p>Your role: <strong>{user.role}</strong></p>
                    <p>Required roles: <strong>{allowedRoles.join(', ')}</strong></p>
                </div>
            </div>
        );
    }

    return children;
};

// Main Application Component with Role-Based Security
const SecureHealthcareApp = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Check for existing authentication on app load
        checkExistingAuth();
    }, []);

    const checkExistingAuth = async () => {
        const token = getAuthToken();
        const userData = getCurrentUser();
        
        if (token && userData && !isTokenExpired()) {
            try {
                // Verify token with backend
                const response = await apiCall('/auth/verify-token');
                if (response.valid) {
                    setUser(userData);
                } else {
                    logout();
                }
            } catch (err) {
                console.error('Token verification failed:', err);
                logout();
            }
        } else {
            logout();
        }
        
        setIsLoading(false);
    };

    const handleLogin = (userData) => {
        setUser(userData);
        setError('');
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
        setError('');
    };

    const renderDashboard = () => {
        if (!user) return null;

        switch (user.role) {
            case 'patient':
                return (
                    <SecureRoute user={user} allowedRoles={['patient']}>
                        <PatientDashboard user={user} />
                    </SecureRoute>
                );
            case 'doctor':
                return (
                    <SecureRoute user={user} allowedRoles={['doctor']}>
                        <DoctorDashboard user={user} />
                    </SecureRoute>
                );
            case 'pharmacy':
                return (
                    <SecureRoute user={user} allowedRoles={['pharmacy']}>
                        <PharmacyDashboard user={user} />
                    </SecureRoute>
                );
            case 'admin':
                return (
                    <SecureRoute user={user} allowedRoles={['admin']}>
                        <AdminDashboard user={user} />
                    </SecureRoute>
                );
            default:
                return (
                    <div className="error-state">
                        <h2>Invalid User Role</h2>
                        <p>Your account has an unrecognized role: {user.role}</p>
                        <button onClick={logout} className="danger-btn">Logout</button>
                    </div>
                );
        }
    };

    if (isLoading) {
        return (
            <div className="app-loading">
                <div className="loading-spinner"></div>
                <p>Loading Healthcare Management System...</p>
            </div>
        );
    }

    return (
        <div className="secure-healthcare-app">
            {/* Security Header */}
            <div className="security-header">
                <div className="system-info">
                    <h1>🏥 Healthcare Management System</h1>
                    <span className="security-badge">🔒 Secure Role-Based Access</span>
                </div>
                
                {user && (
                    <div className="user-info">
                        <div className="user-details">
                            <span className="user-name">{user.full_name}</span>
                            <span className={`role-badge ${user.role}`}>{user.role.toUpperCase()}</span>
                            {user.is_verified !== undefined && (
                                <span className={`verification-badge ${user.is_verified ? 'verified' : 'unverified'}`}>
                                    {user.is_verified ? '✅ Verified' : '⏳ Pending Verification'}
                                </span>
                            )}
                        </div>
                        <button onClick={logout} className="logout-btn">
                            Secure Logout
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="global-error">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* Main Content Area */}
            <div className="main-content">
                {!user ? (
                    <SecureLogin onLogin={handleLogin} />
                ) : !user.is_verified && user.role !== 'patient' ? (
                    <div className="verification-pending">
                        <div className="verification-content">
                            <h2>Account Verification Pending</h2>
                            <p>Your {user.role} account is awaiting admin verification.</p>
                            <p>You will receive access once your credentials are verified by our administration team.</p>
                            <div className="verification-details">
                                <p><strong>Account Type:</strong> {user.role}</p>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Status:</strong> Pending Verification</p>
                            </div>
                            <button onClick={logout} className="secondary-btn">Logout</button>
                        </div>
                    </div>
                ) : (
                    renderDashboard()
                )}
            </div>

            {/* Security Footer */}
            <div className="security-footer">
                <p>🔒 This system implements strict role-based access control. All activities are logged and monitored.</p>
                <p>Unauthorized access attempts will be reported to system administrators.</p>
            </div>
        </div>
    );
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(<SecureHealthcareApp />);
});

// Authentication Components
const LoginForm = ({ onLogin, onSwitchToRegister }) => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        console.log('Attempting login with:', { email: credentials.email, password: '***' });

        try {
            const response = await apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            console.log('Login successful:', response);
            localStorage.setItem('auth_token', response.access_token);
            localStorage.setItem('user', JSON.stringify(response.user));
            onLogin(response.user);
        } catch (err) {
            console.error('Login failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-left">
                <div className="auth-form">
                    <h2>Hospital</h2>
                    <p className="auth-subtitle">Management Service</p>
                    {error && <div className="error-message">{error}</div>}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={credentials.email}
                                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={credentials.password}
                                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                                required
                            />
                        </div>
                        
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                    
                    <div className="auth-switch">
                        <p>Don't have an account? <button onClick={onSwitchToRegister} className="link-button">Register here</button></p>
                    </div>
                </div>
            </div>
            <div className="auth-right">
                <div className="hospital-brand">
                    <h1>Q-Free</h1>
                    <div className="subtitle">Health Management System</div>
                </div>
            </div>
        </div>
    );
};

const RegisterForm = ({ onSwitchToLogin }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'patient',
        full_name: '',
        phone: '',
        date_of_birth: '',
        gender: '',
        address: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        setLoading(true);
        setError('');

        try {
            await apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    role: formData.role,
                    full_name: formData.full_name,
                    phone: formData.phone,
                    date_of_birth: formData.date_of_birth,
                    gender: formData.gender,
                    address: formData.address
                })
            });

            setSuccess(true);
            setTimeout(() => onSwitchToLogin(), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-left">
                    <div className="auth-form success-message">
                        <h2>Registration Successful!</h2>
                        <p>Your account has been created. Redirecting to login...</p>
                    </div>
                </div>
                <div className="auth-right">
                    <div className="hospital-brand">
                        <h1>Q-Free</h1>
                        <div className="subtitle">Health Management System</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-left">
                <div className="auth-form">
                    <h2>Hospital</h2>
                    <p className="auth-subtitle">Registration Service</p>
                    {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="role">Account Type</label>
                        <select
                            id="role"
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="patient">Patient</option>
                            <option value="doctor">Doctor</option>
                            <option value="pharmacy">Pharmacy</option>
                        </select>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="full_name">Full Name</label>
                            <input
                                type="text"
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="phone">Phone</label>
                            <input
                                type="tel"
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                required
                            />
                        </div>
                    </div>
                    
                    {formData.role === 'patient' && (
                        <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="date_of_birth">Date of Birth</label>
                                    <input
                                        type="date"
                                        id="date_of_birth"
                                        value={formData.date_of_birth}
                                        onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="gender">Gender</label>
                                    <select
                                        id="gender"
                                        value={formData.gender}
                                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="address">Address</label>
                                <textarea
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    rows="3"
                                />
                            </div>
                        </>
                    )}
                    
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>
                
                <div className="auth-switch">
                    <p>Already have an account? <button onClick={onSwitchToLogin} className="link-button">Login here</button></p>
                </div>
                </div>
            </div>
            <div className="auth-right">
                <div className="hospital-brand">
                    <h1>Q-Free</h1>
                    <div className="subtitle">Health Management System</div>
                </div>
            </div>
        </div>
    );
};

// Patient Dashboard Components
const PatientDashboard = ({ user, onLogout }) => {
    const [activeView, setActiveView] = useState('appointments');
    const [appointments, setAppointments] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAppointments();
        loadDepartments();
    }, []);

    const loadAppointments = async () => {
        try {
            const data = await apiCall('/appointments/my');
            setAppointments(data);
        } catch (error) {
            console.error('Failed to load appointments:', error);
        }
    };

    const loadDepartments = async () => {
        try {
            const data = await apiCall('/departments');
            setDepartments(data);
        } catch (error) {
            console.error('Failed to load departments:', error);
        }
    };

    const loadDoctors = async (departmentId) => {
        try {
            const data = await apiCall(`/doctors?department_id=${departmentId}`);
            setDoctors(data);
        } catch (error) {
            console.error('Failed to load doctors:', error);
        }
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1>Patient Portal</h1>
                    <div className="user-info">
                        <span>Welcome, {user.full_name}</span>
                        <button onClick={onLogout} className="btn btn-secondary">Logout</button>
                    </div>
                </div>
            </header>

            <div className="dashboard-content">
                <nav className="dashboard-nav">
                    <button
                        className={activeView === 'appointments' ? 'active' : ''}
                        onClick={() => setActiveView('appointments')}
                    >
                        My Appointments
                    </button>
                    <button
                        className={activeView === 'book' ? 'active' : ''}
                        onClick={() => setActiveView('book')}
                    >
                        Book Appointment
                    </button>
                    <button
                        className={activeView === 'queue' ? 'active' : ''}
                        onClick={() => setActiveView('queue')}
                    >
                        Queue Status
                    </button>
                </nav>

                <div className="dashboard-main">
                    {activeView === 'appointments' && (
                        <PatientAppointments appointments={appointments} onRefresh={loadAppointments} />
                    )}
                    {activeView === 'book' && (
                        <BookAppointment 
                            departments={departments} 
                            doctors={doctors}
                            onLoadDoctors={loadDoctors}
                            onBookingSuccess={loadAppointments}
                        />
                    )}
                    {activeView === 'queue' && (
                        <QueueStatus appointments={appointments.filter(apt => apt.status === 'waiting' || apt.status === 'scheduled')} />
                    )}
                </div>
            </div>
        </div>
    );
};

const PatientAppointments = ({ appointments, onRefresh }) => {
    return (
        <div className="appointments-list">
            <div className="section-header">
                <h2>My Appointments</h2>
                <button onClick={onRefresh} className="btn btn-secondary">Refresh</button>
            </div>

            {appointments.length === 0 ? (
                <div className="empty-state">
                    <p>No appointments found. Book your first appointment!</p>
                </div>
            ) : (
                <div className="appointments-grid">
                    {appointments.map(appointment => (
                        <div key={appointment.id} className="appointment-card">
                            <div className="appointment-header">
                                <span className="token-number">Token #{appointment.token_number}</span>
                                <span className={`status-badge status-${appointment.status}`}>
                                    {appointment.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                            
                            <div className="appointment-details">
                                <h3>{appointment.doctor_name}</h3>
                                <p className="department">{appointment.department}</p>
                                <p className="date-time">
                                    {new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.appointment_time}
                                </p>
                                
                                {appointment.estimated_wait_time && (
                                    <div className="wait-info">
                                        <span>Estimated wait: {appointment.estimated_wait_time} minutes</span>
                                        <span>Position in queue: #{appointment.queue_position}</span>
                                    </div>
                                )}
                                
                                {appointment.symptoms && (
                                    <p className="symptoms">Symptoms: {appointment.symptoms}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const BookAppointment = ({ departments, doctors, onLoadDoctors, onBookingSuccess }) => {
    const [formData, setFormData] = useState({
        department_id: '',
        doctor_id: '',
        appointment_date: '',
        appointment_time: '',
        symptoms: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleDepartmentChange = (e) => {
        const departmentId = e.target.value;
        setFormData({...formData, department_id: departmentId, doctor_id: ''});
        if (departmentId) {
            onLoadDoctors(departmentId);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await apiCall('/appointments', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            setSuccess(`Appointment booked successfully! Token number: ${response.token_number}`);
            setFormData({
                department_id: '',
                doctor_id: '',
                appointment_date: '',
                appointment_time: '',
                symptoms: ''
            });
            onBookingSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    return (
        <div className="booking-form">
            <h2>Book New Appointment</h2>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="department">Department</label>
                    <select
                        id="department"
                        value={formData.department_id}
                        onChange={handleDepartmentChange}
                        required
                    >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                </div>

                {formData.department_id && (
                    <div className="form-group">
                        <label htmlFor="doctor">Doctor</label>
                        <select
                            id="doctor"
                            value={formData.doctor_id}
                            onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
                            required
                        >
                            <option value="">Select Doctor</option>
                            {doctors.map(doctor => (
                                <option key={doctor.id} value={doctor.id}>
                                    {doctor.name} - {doctor.specialization} (${doctor.consultation_fee})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="appointment_date">Date</label>
                        <input
                            type="date"
                            id="appointment_date"
                            min={minDate}
                            value={formData.appointment_date}
                            onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="appointment_time">Time</label>
                        <select
                            id="appointment_time"
                            value={formData.appointment_time}
                            onChange={(e) => setFormData({...formData, appointment_time: e.target.value})}
                            required
                        >
                            <option value="">Select Time</option>
                            <option value="09:00">09:00 AM</option>
                            <option value="09:30">09:30 AM</option>
                            <option value="10:00">10:00 AM</option>
                            <option value="10:30">10:30 AM</option>
                            <option value="11:00">11:00 AM</option>
                            <option value="11:30">11:30 AM</option>
                            <option value="14:00">02:00 PM</option>
                            <option value="14:30">02:30 PM</option>
                            <option value="15:00">03:00 PM</option>
                            <option value="15:30">03:30 PM</option>
                            <option value="16:00">04:00 PM</option>
                            <option value="16:30">04:30 PM</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="symptoms">Symptoms/Reason for Visit</label>
                    <textarea
                        id="symptoms"
                        value={formData.symptoms}
                        onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                        rows="4"
                        placeholder="Describe your symptoms or reason for consultation..."
                    />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Booking...' : 'Book Appointment'}
                </button>
            </form>
        </div>
    );
};

const QueueStatus = ({ appointments }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="queue-status">
            <h2>Live Queue Status</h2>
            
            <div className="current-time">
                <p>Current Time: {currentTime.toLocaleString()}</p>
            </div>

            {appointments.length === 0 ? (
                <div className="empty-state">
                    <p>No active appointments in queue</p>
                </div>
            ) : (
                <div className="queue-cards">
                    {appointments.map(appointment => (
                        <div key={appointment.id} className="queue-card">
                            <div className="queue-card-header">
                                <span className="token">Token #{appointment.token_number}</span>
                                <span className={`status status-${appointment.status}`}>
                                    {appointment.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                            
                            <div className="queue-details">
                                <h3>{appointment.doctor_name}</h3>
                                <p>{appointment.department}</p>
                                <p className="appointment-time">
                                    Scheduled: {appointment.appointment_time}
                                </p>
                                
                                {appointment.estimated_wait_time !== null && (
                                    <div className="wait-estimate">
                                        <div className="wait-time">
                                            Estimated wait: <strong>{appointment.estimated_wait_time} minutes</strong>
                                        </div>
                                        <div className="queue-position">
                                            Queue position: <strong>#{appointment.queue_position}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Doctor Dashboard Components
const DoctorDashboard = ({ user, onLogout }) => {
    const [activeView, setActiveView] = useState('queue');
    const [appointments, setAppointments] = useState([]);
    const [currentToken, setCurrentToken] = useState(1);

    useEffect(() => {
        loadTodayAppointments();
        const interval = setInterval(loadTodayAppointments, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadTodayAppointments = async () => {
        try {
            const data = await apiCall('/appointments/my');
            setAppointments(data);
        } catch (error) {
            console.error('Failed to load appointments:', error);
        }
    };

    const updateAppointmentStatus = async (appointmentId, status) => {
        try {
            await apiCall('/queue/update', {
                method: 'POST',
                body: JSON.stringify({ appointment_id: appointmentId, status })
            });
            loadTodayAppointments();
        } catch (error) {
            console.error('Failed to update appointment:', error);
        }
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1>Doctor Portal</h1>
                    <div className="user-info">
                        <span>Welcome, {user.full_name}</span>
                        <button onClick={onLogout} className="btn btn-secondary">Logout</button>
                    </div>
                </div>
            </header>

            <div className="dashboard-content">
                <nav className="dashboard-nav">
                    <button
                        className={activeView === 'queue' ? 'active' : ''}
                        onClick={() => setActiveView('queue')}
                    >
                        Today's Queue
                    </button>
                    <button
                        className={activeView === 'prescriptions' ? 'active' : ''}
                        onClick={() => setActiveView('prescriptions')}
                    >
                        Prescriptions
                    </button>
                    <button
                        className={activeView === 'analytics' ? 'active' : ''}
                        onClick={() => setActiveView('analytics')}
                    >
                        Analytics
                    </button>
                </nav>

                <div className="dashboard-main">
                    {activeView === 'queue' && (
                        <DoctorQueue 
                            appointments={appointments} 
                            onUpdateStatus={updateAppointmentStatus}
                            onRefresh={loadTodayAppointments}
                        />
                    )}
                    {activeView === 'prescriptions' && <PrescriptionManager />}
                    {activeView === 'analytics' && <DoctorAnalytics appointments={appointments} />}
                </div>
            </div>
        </div>
    );
};

const DoctorQueue = ({ appointments, onUpdateStatus, onRefresh }) => {
    const waitingAppointments = appointments.filter(apt => apt.status === 'waiting' || apt.status === 'scheduled');
    const currentAppointment = appointments.find(apt => apt.status === 'in_progress');

    return (
        <div className="doctor-queue">
            <div className="section-header">
                <h2>Today's Patient Queue</h2>
                <button onClick={onRefresh} className="btn btn-secondary">Refresh</button>
            </div>

            {currentAppointment && (
                <div className="current-patient">
                    <h3>Current Patient</h3>
                    <div className="patient-card current">
                        <div className="patient-info">
                            <h4>Token #{currentAppointment.token_number} - {currentAppointment.patient_name}</h4>
                            <p>Phone: {currentAppointment.patient_phone}</p>
                            <p>Symptoms: {currentAppointment.symptoms}</p>
                        </div>
                        <div className="patient-actions">
                            <button 
                                onClick={() => onUpdateStatus(currentAppointment.id, 'completed')}
                                className="btn btn-primary"
                            >
                                Complete Consultation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="waiting-queue">
                <h3>Waiting Patients ({waitingAppointments.length})</h3>
                
                {waitingAppointments.length === 0 ? (
                    <div className="empty-state">
                        <p>No patients waiting</p>
                    </div>
                ) : (
                    <div className="patients-list">
                        {waitingAppointments.map(appointment => (
                            <div key={appointment.id} className="patient-card">
                                <div className="patient-info">
                                    <h4>Token #{appointment.token_number} - {appointment.patient_name}</h4>
                                    <p>Phone: {appointment.patient_phone}</p>
                                    <p>Scheduled: {appointment.appointment_time}</p>
                                    {appointment.symptoms && <p>Symptoms: {appointment.symptoms}</p>}
                                </div>
                                <div className="patient-actions">
                                    {!currentAppointment && appointment.token_number === Math.min(...waitingAppointments.map(apt => apt.token_number)) && (
                                        <button 
                                            onClick={() => onUpdateStatus(appointment.id, 'in_progress')}
                                            className="btn btn-primary"
                                        >
                                            Start Consultation
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const PrescriptionManager = () => {
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const addMedicine = () => {
        setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }]);
    };

    const updateMedicine = (index, field, value) => {
        const updated = medicines.map((med, i) => 
            i === index ? { ...med, [field]: value } : med
        );
        setMedicines(updated);
    };

    const createPrescription = async () => {
        setLoading(true);
        try {
            await apiCall('/prescriptions', {
                method: 'POST',
                body: JSON.stringify({
                    appointment_id: selectedAppointment,
                    medicines,
                    notes
                })
            });
            
            setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }]);
            setNotes('');
            setSelectedAppointment(null);
            alert('Prescription created successfully!');
        } catch (error) {
            console.error('Failed to create prescription:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="prescription-manager">
            <h2>Digital Prescription</h2>
            
            <div className="prescription-form">
                <div className="form-group">
                    <label>Medicines</label>
                    {medicines.map((medicine, index) => (
                        <div key={index} className="medicine-row">
                            <input
                                type="text"
                                placeholder="Medicine name"
                                value={medicine.name}
                                onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Dosage"
                                value={medicine.dosage}
                                onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Frequency"
                                value={medicine.frequency}
                                onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Duration"
                                value={medicine.duration}
                                onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                            />
                        </div>
                    ))}
                    <button onClick={addMedicine} className="btn btn-secondary">Add Medicine</button>
                </div>

                <div className="form-group">
                    <label htmlFor="notes">Additional Notes</label>
                    <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows="4"
                        placeholder="Additional instructions or notes..."
                    />
                </div>

                <button 
                    onClick={createPrescription} 
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading ? 'Creating...' : 'Create Prescription'}
                </button>
            </div>
        </div>
    );
};

const DoctorAnalytics = ({ appointments }) => {
    const totalPatients = appointments.length;
    const completedToday = appointments.filter(apt => apt.status === 'completed').length;
    const averageTime = completedToday > 0 ? Math.round(480 / completedToday) : 0; // 8 hours = 480 minutes

    return (
        <div className="doctor-analytics">
            <h2>Today's Analytics</h2>
            
            <div className="analytics-grid">
                <div className="analytics-card">
                    <h3>Total Appointments</h3>
                    <div className="metric">{totalPatients}</div>
                </div>
                
                <div className="analytics-card">
                    <h3>Patients Seen</h3>
                    <div className="metric">{completedToday}</div>
                </div>
                
                <div className="analytics-card">
                    <h3>Average Time per Patient</h3>
                    <div className="metric">{averageTime} min</div>
                </div>
                
                <div className="analytics-card">
                    <h3>Pending Queue</h3>
                    <div className="metric">{totalPatients - completedToday}</div>
                </div>
            </div>
        </div>
    );
};

// Pharmacy Dashboard Components
const PharmacyDashboard = ({ user, onLogout }) => {
    const [activeView, setActiveView] = useState('prescriptions');
    const [prescriptions, setPrescriptions] = useState([]);
    const [inventory, setInventory] = useState([]);

    useEffect(() => {
        loadPrescriptions();
        loadInventory();
    }, []);

    const loadPrescriptions = async () => {
        try {
            const data = await apiCall('/pharmacy/prescriptions');
            setPrescriptions(data);
        } catch (error) {
            console.error('Failed to load prescriptions:', error);
        }
    };

    const loadInventory = async () => {
        try {
            const data = await apiCall('/pharmacy/inventory');
            setInventory(data);
        } catch (error) {
            console.error('Failed to load inventory:', error);
        }
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1>Pharmacy Portal</h1>
                    <div className="user-info">
                        <span>Welcome, {user.full_name}</span>
                        <button onClick={onLogout} className="btn btn-secondary">Logout</button>
                    </div>
                </div>
            </header>

            <div className="dashboard-content">
                <nav className="dashboard-nav">
                    <button
                        className={activeView === 'prescriptions' ? 'active' : ''}
                        onClick={() => setActiveView('prescriptions')}
                    >
                        Prescriptions
                    </button>
                    <button
                        className={activeView === 'inventory' ? 'active' : ''}
                        onClick={() => setActiveView('inventory')}
                    >
                        Inventory
                    </button>
                </nav>

                <div className="dashboard-main">
                    {activeView === 'prescriptions' && (
                        <PrescriptionQueue prescriptions={prescriptions} onRefresh={loadPrescriptions} />
                    )}
                    {activeView === 'inventory' && (
                        <InventoryManagement inventory={inventory} onRefresh={loadInventory} />
                    )}
                </div>
            </div>
        </div>
    );
};

const PrescriptionQueue = ({ prescriptions, onRefresh }) => {
    return (
        <div className="prescription-queue">
            <div className="section-header">
                <h2>Digital Prescriptions Queue</h2>
                <button onClick={onRefresh} className="btn btn-secondary">Refresh</button>
            </div>

            {prescriptions.length === 0 ? (
                <div className="empty-state">
                    <p>No pending prescriptions</p>
                </div>
            ) : (
                <div className="prescriptions-list">
                    {prescriptions.map(prescription => (
                        <div key={prescription.id} className="prescription-card">
                            <div className="prescription-header">
                                <h3>Patient: {prescription.patient_name}</h3>
                                <span className={`status-badge status-${prescription.status}`}>
                                    {prescription.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                            
                            <div className="prescription-details">
                                <p><strong>Doctor:</strong> {prescription.doctor_name}</p>
                                <p><strong>Date:</strong> {prescription.created_at}</p>
                                
                                <div className="medicines-list">
                                    <h4>Medicines:</h4>
                                    {prescription.medicines.map((medicine, index) => (
                                        <div key={index} className="medicine-item">
                                            <span className="medicine-name">{medicine.name}</span>
                                            <span className="dosage">{medicine.dosage}</span>
                                            <span className="frequency">{medicine.frequency}</span>
                                            <span className="duration">{medicine.duration}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                {prescription.notes && (
                                    <p className="notes"><strong>Notes:</strong> {prescription.notes}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const InventoryManagement = ({ inventory, onRefresh }) => {
    const lowStockItems = inventory.filter(item => item.low_stock);

    return (
        <div className="inventory-management">
            <div className="section-header">
                <h2>Pharmacy Inventory</h2>
                <button onClick={onRefresh} className="btn btn-secondary">Refresh</button>
            </div>

            {lowStockItems.length > 0 && (
                <div className="alerts-section">
                    <h3 className="alert-title">Low Stock Alerts</h3>
                    <div className="alert-cards">
                        {lowStockItems.map(item => (
                            <div key={item.id} className="alert-card">
                                <h4>{item.medicine_name}</h4>
                                <p>Current stock: {item.quantity_in_stock}</p>
                                <p>Minimum required: {item.minimum_stock_alert}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="inventory-grid">
                {inventory.map(item => (
                    <div key={item.id} className={`inventory-card ${item.low_stock ? 'low-stock' : ''}`}>
                        <h4>{item.medicine_name}</h4>
                        <p className="generic-name">{item.generic_name}</p>
                        <p className="manufacturer">{item.manufacturer}</p>
                        <div className="stock-info">
                            <span className="stock-quantity">Stock: {item.quantity_in_stock}</span>
                            <span className="unit-price">${item.unit_price}</span>
                        </div>
                        {item.low_stock && <div className="stock-warning">Low Stock!</div>}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Main App Component
const App = () => {
    const [user, setUser] = useState(null);
    const [showLogin, setShowLogin] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getAuthToken();
        const savedUser = getCurrentUser();
        
        if (token && savedUser) {
            setUser(savedUser);
        }
        
        setLoading(false);
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading Q-Free Health...</p>
            </div>
        );
    }

    if (!user) {
        return showLogin ? (
            <LoginForm 
                onLogin={handleLogin} 
                onSwitchToRegister={() => setShowLogin(false)} 
            />
        ) : (
            <RegisterForm 
                onSwitchToLogin={() => setShowLogin(true)} 
            />
        );
    }

    // Role-based dashboard routing
    switch (user.role) {
        case 'patient':
            return <PatientDashboard user={user} onLogout={handleLogout} />;
        case 'doctor':
            return <DoctorDashboard user={user} onLogout={handleLogout} />;
        case 'pharmacy':
            return <PharmacyDashboard user={user} onLogout={handleLogout} />;
        default:
            return (
                <div className="error-container">
                    <h2>Access Denied</h2>
                    <p>Invalid user role: {user.role}</p>
                    <button onClick={handleLogout} className="btn btn-primary">Logout</button>
                </div>
            );
    }
};

// Render the app
const container = document.getElementById('app');
const root = ReactDOM.createRoot(container);
root.render(React.createElement(App));