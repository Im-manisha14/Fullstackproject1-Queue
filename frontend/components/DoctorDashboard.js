// Doctor Dashboard Component
const DoctorDashboard = ({ user }) => {
    const API_BASE_URL = 'http://localhost:5000/api';
    
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('appointments');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDoctorData();
    }, [selectedDate]);

    const loadDoctorData = async () => {
        setIsLoading(true);
        try {
            // Load doctor profile
            const profileResponse = await apiCall('/doctor/profile');
            setProfile(profileResponse);

            // Load appointments for selected date
            const appointmentsResponse = await apiCall(`/doctor/appointments?date=${selectedDate}`);
            setAppointments(appointmentsResponse);

            // Load prescriptions created by this doctor
            const prescriptionsResponse = await apiCall('/doctor/prescriptions');
            setPrescriptions(prescriptionsResponse);
        } catch (err) {
            setError('Error loading doctor data');
            console.error('Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateAppointmentStatus = async (appointmentId, newStatus) => {
        try {
            await apiCall(`/appointments/${appointmentId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            
            // Reload appointments
            loadDoctorData();
        } catch (err) {
            setError('Error updating appointment status');
            console.error('Error:', err);
        }
    };

    const handleCreatePrescription = (appointmentId) => {
        // This would open a prescription modal
        console.log('Create prescription for appointment:', appointmentId);
    };

    if (isLoading) {
        return <div className="loading">Loading doctor dashboard...</div>;
    }

    return (
        <div className="doctor-dashboard">
            <div className="dashboard-header">
                <h1>Dr. {user.full_name}</h1>
                <p className="user-role">Doctor Portal</p>
                {profile && (
                    <div className="doctor-info">
                        <p><strong>Specialization:</strong> {profile.specialization}</p>
                        <p><strong>Department:</strong> {profile.department}</p>
                        <p><strong>License:</strong> {profile.license_number}</p>
                    </div>
                )}
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
                            <div className="date-filter">
                                <label htmlFor="appointmentDate">Date:</label>
                                <input
                                    type="date"
                                    id="appointmentDate"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {appointments.length === 0 ? (
                            <div className="empty-state">
                                <p>No appointments for {new Date(selectedDate).toLocaleDateString()}</p>
                            </div>
                        ) : (
                            <div className="appointments-queue">
                                <h3>Appointment Queue - {new Date(selectedDate).toLocaleDateString()}</h3>
                                {appointments.map(appointment => (
                                    <div key={appointment.id} className={`appointment-card doctor-view ${appointment.status}`}>
                                        <div className="appointment-header">
                                            <div className="token-info">
                                                <span className="token-number">#{appointment.token_number}</span>
                                                <span className="appointment-time">{appointment.appointment_time}</span>
                                            </div>
                                            <span className={`status-badge ${appointment.status}`}>
                                                {appointment.status}
                                            </span>
                                        </div>
                                        <div className="patient-info">
                                            <h4>{appointment.patient_name}</h4>
                                            <p><strong>Phone:</strong> {appointment.patient_phone}</p>
                                            {appointment.symptoms && (
                                                <p><strong>Symptoms:</strong> {appointment.symptoms}</p>
                                            )}
                                            <p><strong>Duration:</strong> {appointment.estimated_duration} minutes</p>
                                        </div>
                                        <div className="appointment-actions">
                                            {appointment.status === 'scheduled' && (
                                                <>
                                                    <button 
                                                        className="primary-btn"
                                                        onClick={() => updateAppointmentStatus(appointment.id, 'in_progress')}
                                                    >
                                                        Start Consultation
                                                    </button>
                                                </>
                                            )}
                                            {appointment.status === 'in_progress' && (
                                                <>
                                                    <button 
                                                        className="success-btn"
                                                        onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                                                    >
                                                        Complete
                                                    </button>
                                                    <button 
                                                        className="secondary-btn"
                                                        onClick={() => handleCreatePrescription(appointment.id)}
                                                    >
                                                        Create Prescription
                                                    </button>
                                                </>
                                            )}
                                            {appointment.status === 'completed' && (
                                                <button 
                                                    className="secondary-btn"
                                                    onClick={() => handleCreatePrescription(appointment.id)}
                                                >
                                                    View/Edit Prescription
                                                </button>
                                            )}
                                        </div>
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
                                <p>No prescriptions created yet</p>
                            </div>
                        ) : (
                            <div className="prescriptions-list">
                                {prescriptions.map(prescription => (
                                    <div key={prescription.id} className="prescription-card doctor-view">
                                        <div className="prescription-header">
                                            <h3>Patient: {prescription.patient_name}</h3>
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
                                                <h4>Prescribed Medicines:</h4>
                                                {prescription.medicines.map((medicine, index) => (
                                                    <div key={index} className="medicine-item">
                                                        <p><strong>{medicine.name}</strong></p>
                                                        <p>Dosage: {medicine.dosage}</p>
                                                        <p>Frequency: {medicine.frequency}</p>
                                                        <p>Duration: {medicine.duration}</p>
                                                        {medicine.instructions && (
                                                            <p>Instructions: {medicine.instructions}</p>
                                                        )}
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
                                <h3>Doctor Information</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <label>Full Name:</label>
                                        <span>Dr. {profile.full_name}</span>
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
                                        <label>Specialization:</label>
                                        <span>{profile.specialization}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Department:</label>
                                        <span>{profile.department}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>License Number:</label>
                                        <span>{profile.license_number}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Consultation Fee:</label>
                                        <span>${profile.consultation_fee}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Availability:</label>
                                        <span>{profile.availability_start} - {profile.availability_end}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Max Patients/Day:</label>
                                        <span>{profile.max_patients_per_day}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};