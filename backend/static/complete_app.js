// Queue-Free Healthcare System - React Frontend
const { useState, useEffect, useCallback } = React;

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Utility functions
const makeRequest = async (url, options = {}) => {
    const token = localStorage.getItem('access_token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };
    
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }
    
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }
    
    return data;
};

// Alert Component
const Alert = ({ type, message, onClose }) => (
    <div className={`alert alert-${type}`} onClick={onClose}>
        <span>{message}</span>
        <button className="alert-close">×</button>
    </div>
);

// Loading Component
const Loading = () => (
    <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
    </div>
);

// Login Component
const Login = ({ onLogin, onRegister }) => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        try {
            const data = await makeRequest(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                body: formData
            });

            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user_data', JSON.stringify(data.user));
            onLogin(data.user);
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Queue-Free Healthcare System</h1>
                    <p>Professional Healthcare Management</p>
                </div>

                {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-links">
                    <p>Don't have an account? <button className="link-btn" onClick={onRegister}>Register here</button></p>
                </div>

                <div className="demo-credentials">
                    <h4>Demo Credentials:</h4>
                    <p><strong>Admin:</strong> admin / admin123</p>
                    <p><strong>Doctor:</strong> drsmith / doctor123</p>
                    <p><strong>Patient:</strong> johnpat / patient123</p>
                    <p><strong>Pharmacy:</strong> pharmacy1 / pharmacy123</p>
                </div>
            </div>
        </div>
    );
};

// Register Component
const Register = ({ onBack }) => {
    const [formData, setFormData] = useState({
        username: '', email: '', password: '', role: 'patient'
    });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const data = await makeRequest(`${API_BASE_URL}/departments`);
                setDepartments(data.departments);
            } catch (error) {
                console.error('Error fetching departments:', error);
            }
        };
        fetchDepartments();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        try {
            const data = await makeRequest(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                body: formData
            });

            setAlert({ type: 'success', message: data.message });
            setTimeout(() => onBack(), 2000);
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Create Account</h1>
                    <p>Join our platform</p>
                </div>

                {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <select name="role" value={formData.role} onChange={handleChange} required>
                            <option value="patient">Patient</option>
                            <option value="doctor">Doctor</option>
                            <option value="pharmacy">Pharmacy Staff</option>
                        </select>
                    </div>

                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-links">
                    <p>Already have an account? <button className="link-btn" onClick={onBack}>Sign in here</button></p>
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

    const fetchDashboard = useCallback(async () => {
        try {
            const data = await makeRequest(`${API_BASE_URL}/dashboard/patient`);
            setDashboardData(data.data);
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [fetchDashboard]);

    if (loading) return <Loading />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2>Patient Dashboard</h2>
                <p>Welcome back, {user.full_name}</p>
            </div>

            {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

            <div className="dashboard-actions">
                <button className="btn btn-primary" onClick={() => setShowBooking(true)}>
                    Book New Appointment
                </button>
                <button className="btn btn-secondary" onClick={fetchDashboard}>
                    Refresh
                </button>
            </div>

            {showBooking && (
                <BookAppointment 
                    onClose={() => setShowBooking(false)} 
                    onSuccess={() => {
                        setShowBooking(false);
                        fetchDashboard();
                        setAlert({ type: 'success', message: 'Appointment booked successfully!' });
                    }}
                />
            )}

            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <h3>Recent Appointments</h3>
                    {dashboardData?.appointments?.length > 0 ? (
                        <div className="appointments-list">
                            {dashboardData.appointments.map(apt => (
                                <div key={apt.id} className="appointment-item">
                                    <div className="appointment-info">
                                        <h4>Token #{apt.token_number}</h4>
                                        <p><strong>{apt.doctor}</strong> - {apt.department}</p>
                                        <p>📅 {apt.date} at {apt.time}</p>
                                        <p>💬 {apt.symptoms}</p>
                                        <span className={`status-badge status-${apt.status}`}>
                                            {apt.status.toUpperCase()}
                                        </span>
                                    </div>
                                    {apt.queue_info && (
                                        <div className="queue-info">
                                            <p>Queue Position: #{apt.queue_info.position}</p>
                                            <p>Estimated Wait: {apt.queue_info.estimated_wait} mins</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-data">No appointments found</p>
                    )}
                </div>

                <div className="dashboard-card">
                    <h3>Pending Prescriptions</h3>
                    {dashboardData?.prescriptions?.length > 0 ? (
                        <div className="prescriptions-list">
                            {dashboardData.prescriptions.map(pres => (
                                <div key={pres.id} className="prescription-item">
                                    <h4>#{pres.prescription_number}</h4>
                                    <p>📅 {pres.date}</p>
                                    <p>🩺 {pres.diagnosis}</p>
                                    <span className={`status-badge status-${pres.status}`}>
                                        {pres.status.toUpperCase()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-data">No pending prescriptions</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Doctor Dashboard
const DoctorDashboard = ({ user }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [showPrescription, setShowPrescription] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    const fetchDashboard = useCallback(async () => {
        try {
            const data = await makeRequest(`${API_BASE_URL}/dashboard/doctor`);
            setDashboardData(data.data);
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    }, []);

    const advanceQueue = async (appointmentId) => {
        try {
            await makeRequest(`${API_BASE_URL}/appointments/advance-queue`, {
                method: 'POST',
                body: { appointment_id: appointmentId }
            });
            fetchDashboard();
            setAlert({ type: 'success', message: 'Queue advanced successfully!' });
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        }
    };

    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 15000); // Refresh every 15 seconds
        return () => clearInterval(interval);
    }, [fetchDashboard]);

    if (loading) return <Loading />;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2>Doctor Dashboard</h2>
                <p>Welcome, Dr. {user.full_name}</p>
            </div>

            {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

            <div className="statistics-grid">
                <div className="stat-card">
                    <h3>{dashboardData?.statistics?.total_today || 0}</h3>
                    <p>Total Today</p>
                </div>
                <div className="stat-card">
                    <h3>{dashboardData?.statistics?.completed || 0}</h3>
                    <p>Completed</p>
                </div>
                <div className="stat-card">
                    <h3>{dashboardData?.statistics?.in_progress || 0}</h3>
                    <p>In Progress</p>
                </div>
                <div className="stat-card">
                    <h3>{dashboardData?.statistics?.average_time || 0} min</h3>
                    <p>Avg Time</p>
                </div>
            </div>

            {showPrescription && selectedAppointment && (
                <CreatePrescription 
                    appointment={selectedAppointment}
                    onClose={() => {
                        setShowPrescription(false);
                        setSelectedAppointment(null);
                    }}
                    onSuccess={() => {
                        setShowPrescription(false);
                        setSelectedAppointment(null);
                        fetchDashboard();
                        setAlert({ type: 'success', message: 'Prescription created successfully!' });
                    }}
                />
            )}

            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <h3>Current Queue</h3>
                    {dashboardData?.current_queue?.length > 0 ? (
                        <div className="queue-list">
                            {dashboardData.current_queue.map(apt => (
                                <div key={apt.id} className="queue-item">
                                    <div className="queue-info">
                                        <h4>Token #{apt.token_number}</h4>
                                        <p><strong>{apt.patient_name}</strong></p>
                                        <p>⏰ {apt.time}</p>
                                        <p>💬 {apt.symptoms}</p>
                                        <span className={`priority-badge priority-${apt.priority}`}>
                                            {apt.priority.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="queue-actions">
                                        <button 
                                            className="btn btn-small btn-primary"
                                            onClick={() => advanceQueue(apt.id)}
                                        >
                                            {apt.status === 'booked' ? 'Call Next' : 
                                             apt.status === 'in_queue' ? 'Start' : 'Complete'}
                                        </button>
                                        {apt.status === 'consulting' && (
                                            <button 
                                                className="btn btn-small btn-secondary"
                                                onClick={() => {
                                                    setSelectedAppointment(apt);
                                                    setShowPrescription(true);
                                                }}
                                            >
                                                Prescribe
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-data">No patients in queue</p>
                    )}
                </div>

                <div className="dashboard-card">
                    <h3>Today's Schedule</h3>
                    {dashboardData?.appointments?.length > 0 ? (
                        <div className="appointments-list">
                            {dashboardData.appointments.slice(0, 8).map(apt => (
                                <div key={apt.id} className="appointment-item">
                                    <div className="appointment-time">{apt.time}</div>
                                    <div className="appointment-info">
                                        <h4>Token #{apt.token_number}</h4>
                                        <p>{apt.patient_name}</p>
                                        <span className={`status-badge status-${apt.status}`}>
                                            {apt.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-data">No appointments today</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Book Appointment Modal
const BookAppointment = ({ onClose, onSuccess }) => {
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [formData, setFormData] = useState({
        department_id: '', doctor_id: '', appointment_date: '', appointment_time: '', symptoms: '', priority: 'normal'
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const data = await makeRequest(`${API_BASE_URL}/departments`);
                setDepartments(data.departments);
            } catch (error) {
                setAlert({ type: 'error', message: error.message });
            }
        };
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (formData.department_id) {
            const fetchDoctors = async () => {
                try {
                    const data = await makeRequest(`${API_BASE_URL}/doctors/${formData.department_id}`);
                    setDoctors(data.doctors);
                } catch (error) {
                    setAlert({ type: 'error', message: error.message });
                }
            };
            fetchDoctors();
        }
    }, [formData.department_id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        try {
            await makeRequest(`${API_BASE_URL}/appointments/book`, {
                method: 'POST',
                body: formData
            });
            onSuccess();
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3>Book New Appointment</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Department</label>
                        <select name="department_id" value={formData.department_id} onChange={handleChange} required>
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>

                    {doctors.length > 0 && (
                        <div className="form-group">
                            <label>Doctor</label>
                            <select name="doctor_id" value={formData.doctor_id} onChange={handleChange} required>
                                <option value="">Select Doctor</option>
                                {doctors.map(doc => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.name} - {doc.specialization} (Fee: ${doc.consultation_fee})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Date</label>
                            <input 
                                type="date" 
                                name="appointment_date" 
                                value={formData.appointment_date} 
                                onChange={handleChange} 
                                min={new Date().toISOString().split('T')[0]}
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Time</label>
                            <input type="time" name="appointment_time" value={formData.appointment_time} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Priority</label>
                        <select name="priority" value={formData.priority} onChange={handleChange}>
                            <option value="normal">Normal</option>
                            <option value="urgent">Urgent</option>
                            <option value="emergency">Emergency</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Symptoms/Reason for Visit</label>
                        <textarea 
                            name="symptoms" 
                            value={formData.symptoms} 
                            onChange={handleChange} 
                            placeholder="Describe your symptoms or reason for the appointment"
                            required 
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Booking...' : 'Book Appointment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Create Prescription Modal
const CreatePrescription = ({ appointment, onClose, onSuccess }) => {
    const [medicines, setMedicines] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        appointment_id: appointment.id,
        diagnosis: '',
        notes: '',
        medications: []
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    const searchMedicines = useCallback(async (query) => {
        if (!query.trim()) return;
        try {
            const data = await makeRequest(`${API_BASE_URL}/medicines/search?q=${encodeURIComponent(query)}`);
            setMedicines(data.medicines);
        } catch (error) {
            console.error('Error searching medicines:', error);
        }
    }, []);

    const addMedication = (medicine) => {
        const exists = formData.medications.find(m => m.medicine_id === medicine.id);
        if (exists) return;

        setFormData({
            ...formData,
            medications: [
                ...formData.medications,
                {
                    medicine_id: medicine.id,
                    medicine_name: medicine.name,
                    strength: medicine.strength,
                    quantity: 1,
                    instructions: '',
                    duration: 7
                }
            ]
        });
        setSearchTerm('');
        setMedicines([]);
    };

    const removeMedication = (index) => {
        const newMedications = formData.medications.filter((_, i) => i !== index);
        setFormData({ ...formData, medications: newMedications });
    };

    const updateMedication = (index, field, value) => {
        const newMedications = [...formData.medications];
        newMedications[index][field] = value;
        setFormData({ ...formData, medications: newMedications });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        if (formData.medications.length === 0) {
            setAlert({ type: 'error', message: 'Please add at least one medication' });
            setLoading(false);
            return;
        }

        try {
            await makeRequest(`${API_BASE_URL}/prescriptions/create`, {
                method: 'POST',
                body: formData
            });
            onSuccess();
        } catch (error) {
            setAlert({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm) {
                searchMedicines(searchTerm);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, searchMedicines]);

    return (
        <div className="modal-overlay">
            <div className="modal modal-large">
                <div className="modal-header">
                    <h3>Create Prescription</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

                <div className="prescription-info">
                    <p><strong>Patient:</strong> {appointment.patient_name}</p>
                    <p><strong>Token:</strong> #{appointment.token_number}</p>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Diagnosis</label>
                        <textarea 
                            value={formData.diagnosis} 
                            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                            placeholder="Enter diagnosis"
                            required 
                        />
                    </div>

                    <div className="form-group">
                        <label>Clinical Notes</label>
                        <textarea 
                            value={formData.notes} 
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional notes (optional)"
                        />
                    </div>

                    <div className="form-group">
                        <label>Search & Add Medicines</label>
                        <div className="medicine-search">
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search medicines..."
                            />
                            {medicines.length > 0 && (
                                <div className="search-results">
                                    {medicines.map(medicine => (
                                        <div key={medicine.id} className="search-result" onClick={() => addMedication(medicine)}>
                                            <strong>{medicine.name} {medicine.strength}</strong>
                                            <small>{medicine.generic_name} - {medicine.dosage_form}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {formData.medications.length > 0 && (
                        <div className="medications-section">
                            <h4>Selected Medications</h4>
                            {formData.medications.map((med, index) => (
                                <div key={index} className="medication-row">
                                    <div className="medication-info">
                                        <strong>{med.medicine_name} {med.strength}</strong>
                                    </div>
                                    <div className="medication-inputs">
                                        <input 
                                            type="number" 
                                            placeholder="Qty"
                                            value={med.quantity}
                                            onChange={(e) => updateMedication(index, 'quantity', parseInt(e.target.value))}
                                            min="1"
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Instructions"
                                            value={med.instructions}
                                            onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                                        />
                                        <input 
                                            type="number" 
                                            placeholder="Days"
                                            value={med.duration}
                                            onChange={(e) => updateMedication(index, 'duration', parseInt(e.target.value))}
                                            min="1"
                                        />
                                        <button type="button" className="btn btn-danger btn-small" onClick={() => removeMedication(index)}>×</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Prescription'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main App Component
const App = () => {
    const [user, setUser] = useState(null);
    const [currentView, setCurrentView] = useState('login');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const userData = localStorage.getItem('user_data');
        
        if (token && userData) {
            try {
                setUser(JSON.parse(userData));
                setCurrentView('dashboard');
            } catch (error) {
                localStorage.clear();
            }
        }
        setLoading(false);
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
        setCurrentView('dashboard');
    };

    const handleLogout = () => {
        localStorage.clear();
        setUser(null);
        setCurrentView('login');
    };

    if (loading) return <Loading />;

    const renderDashboard = () => {
        switch (user.role) {
            case 'patient': return <PatientDashboard user={user} />;
            case 'doctor': return <DoctorDashboard user={user} />;
            case 'pharmacy': return <div>Pharmacy Dashboard Coming Soon</div>;
            case 'admin': return <div>Admin Dashboard Coming Soon</div>;
            default: return <div>Invalid user role</div>;
        }
    };

    return (
        <div className="app">
            {user && (
                <nav className="navbar">
                    <div className="navbar-brand">
                        <h2>Queue-Free Healthcare System</h2>
                    </div>
                    <div className="navbar-user">
                        <span>Welcome {user.full_name} ({user.role.toUpperCase()})</span>
                        <button className="btn btn-small btn-secondary" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </nav>
            )}

            <main className="main-content">
                {currentView === 'login' && (
                    <Login 
                        onLogin={handleLogin} 
                        onRegister={() => setCurrentView('register')} 
                    />
                )}
                {currentView === 'register' && (
                    <Register onBack={() => setCurrentView('login')} />
                )}
                {currentView === 'dashboard' && user && renderDashboard()}
            </main>
        </div>
    );
};

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));