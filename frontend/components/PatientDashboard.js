// Patient Dashboard Component
const PatientDashboard = ({ user }) => {
    const API_BASE_URL = 'http://localhost:5000/api';
    
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('appointments');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadPatientData();
    }, []);

    const loadPatientData = async () => {
        setIsLoading(true);
        try {
            // Load patient profile
            const profileResponse = await apiCall('/patient/profile');
            setProfile(profileResponse);

            // Load appointments
            const appointmentsResponse = await apiCall('/patient/appointments');
            setAppointments(appointmentsResponse);

            // Load prescriptions
            const prescriptionsResponse = await apiCall('/patient/prescriptions');
            setPrescriptions(prescriptionsResponse);
        } catch (err) {
            setError('Error loading patient data');
            console.error('Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBookAppointment = () => {
        // This would open a booking modal or redirect to booking page
        console.log('Book appointment clicked');
    };

    if (isLoading) {
        return <div className="loading">Loading patient dashboard...</div>;
    }

    return (
        <div className="patient-dashboard">
            <div className="dashboard-header">
                <h1>Welcome, {user.full_name}</h1>
                <p className="user-role">Patient Portal</p>
                <div className="quick-stats">
                    <div className="stat-card">
                        <h3>{appointments.length}</h3>
                        <p>Total Appointments</p>
                    </div>
                    <div className="stat-card">
                        <h3>{appointments.filter(a => a.status === 'scheduled').length}</h3>
                        <p>Upcoming</p>
                    </div>
                    <div className="stat-card">
                        <h3>{prescriptions.length}</h3>
                        <p>Prescriptions</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-nav">
                <button
                    className={activeTab === 'appointments' ? 'nav-btn active' : 'nav-btn'}
                    onClick={() => setActiveTab('appointments')}
                >
                    My Appointments
                </button>
                <button
                    className={activeTab === 'prescriptions' ? 'nav-btn active' : 'nav-btn'}
                    onClick={() => setActiveTab('prescriptions')}
                >
                    My Prescriptions
                </button>
                <button
                    className={activeTab === 'profile' ? 'nav-btn active' : 'nav-btn'}
                    onClick={() => setActiveTab('profile')}
                >
                    My Profile
                </button>
            </div>

            <div className="dashboard-content">
                {error && <div className="error-message">{error}</div>}

                {activeTab === 'appointments' && (
                    <div className="appointments-section">
                        <div className="section-header">
                            <h2>My Appointments</h2>
                            <button className="primary-btn" onClick={handleBookAppointment}>
                                Book New Appointment
                            </button>
                        </div>
                        
                        {appointments.length === 0 ? (
                            <div className="empty-state">
                                <p>No appointments found</p>
                            </div>
                        ) : (
                            <div className="appointments-list">
                                {appointments.map(appointment => (
                                    <div key={appointment.id} className="appointment-card">
                                        <div className="appointment-header">
                                            <h3>Dr. {appointment.doctor_name}</h3>
                                            <span className={`status-badge ${appointment.status}`}>
                                                {appointment.status}
                                            </span>
                                        </div>
                                        <div className="appointment-details">
                                            <p><strong>Department:</strong> {appointment.department}</p>
                                            <p><strong>Specialization:</strong> {appointment.specialization}</p>
                                            <p><strong>Date:</strong> {new Date(appointment.appointment_date).toLocaleDateString()}</p>
                                            <p><strong>Time:</strong> {appointment.appointment_time}</p>
                                            <p><strong>Token Number:</strong> {appointment.token_number}</p>
                                            {appointment.symptoms && (
                                                <p><strong>Symptoms:</strong> {appointment.symptoms}</p>
                                            )}
                                        </div>
                                        {appointment.status === 'scheduled' && (
                                            <div className="appointment-actions">
                                                <button className="danger-btn">Cancel Appointment</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'prescriptions' && (
                    <div className="prescriptions-section">
                        <h2>My Prescriptions</h2>
                        
                        {prescriptions.length === 0 ? (
                            <div className="empty-state">
                                <p>No prescriptions found</p>
                            </div>
                        ) : (
                            <div className="prescriptions-list">
                                {prescriptions.map(prescription => (
                                    <div key={prescription.id} className="prescription-card">
                                        <div className="prescription-header">
                                            <h3>Prescribed by Dr. {prescription.doctor_name}</h3>
                                            <span className={`status-badge ${prescription.status}`}>
                                                {prescription.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="prescription-details">
                                            <p><strong>Date:</strong> {new Date(prescription.created_at).toLocaleDateString()}</p>
                                            {prescription.notes && (
                                                <p><strong>Notes:</strong> {prescription.notes}</p>
                                            )}
                                            <div className="medicines-list">
                                                <h4>Medicines:</h4>
                                                {prescription.medicines.map((medicine, index) => (
                                                    <div key={index} className="medicine-item">
                                                        <p><strong>{medicine.name}</strong></p>
                                                        <p>Dosage: {medicine.dosage}</p>
                                                        <p>Frequency: {medicine.frequency}</p>
                                                        <p>Duration: {medicine.duration}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'profile' && profile && (
                    <div className="profile-section">
                        <h2>My Profile</h2>
                        <div className="profile-card">
                            <div className="profile-info">
                                <h3>Personal Information</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <label>Full Name:</label>
                                        <span>{profile.full_name}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Email:</label>
                                        <span>{profile.email}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Phone:</label>
                                        <span>{profile.phone || 'Not provided'}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Date of Birth:</label>
                                        <span>{profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not provided'}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Gender:</label>
                                        <span>{profile.gender || 'Not specified'}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Emergency Contact:</label>
                                        <span>{profile.emergency_contact || 'Not provided'}</span>
                                    </div>
                                </div>
                                {profile.address && (
                                    <div className="address-section">
                                        <label>Address:</label>
                                        <p>{profile.address}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};