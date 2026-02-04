import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const DoctorDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [loading, setLoading] = useState(false);

  // Consultation form
  const [consultationForm, setConsultationForm] = useState({
    appointment_id: '',
    diagnosis: '',
    prescriptions: []
  });

  // Prescription form
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicine_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  });

  useEffect(() => {
    loadQueue();
    // Auto-refresh queue every 30 seconds
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const getToken = () => localStorage.getItem('token');

  const loadQueue = async () => {
    try {
      const response = await fetch(`${API_BASE}/doctor/queue`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const data = await response.json();
      setQueue(data);
    } catch (error) {
      console.error('Error loading queue:', error);
    }
  };

  const callNextPatient = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/doctor/call-next`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        if (data.appointment_id) {
          alert(`Patient called! Token #${data.token_number}`);
          loadQueue();
          setActiveTab('consultation');
          setCurrentPatient(queue.find(p => p.id === data.appointment_id));
          setConsultationForm({
            appointment_id: data.appointment_id,
            diagnosis: '',
            prescriptions: []
          });
        } else {
          alert(data.message);
        }
      } else {
        alert(data.error || 'Failed to call patient');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addPrescription = () => {
    if (prescriptionForm.medicine_name && prescriptionForm.dosage) {
      setConsultationForm(prev => ({
        ...prev,
        prescriptions: [...prev.prescriptions, prescriptionForm]
      }));
      setPrescriptionForm({
        medicine_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      });
    }
  };

  const removePrescription = (index) => {
    setConsultationForm(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index)
    }));
  };

  const completeConsultation = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/doctor/complete-consultation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(consultationForm)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Consultation completed successfully!');
        setCurrentPatient(null);
        setConsultationForm({
          appointment_id: '',
          diagnosis: '',
          prescriptions: []
        });
        loadQueue();
        setActiveTab('queue');
      } else {
        alert(data.error || 'Failed to complete consultation');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderQueue = () => (
    <div className="dashboard-content">
      <div className="queue-header">
        <h2>Today's Queue</h2>
        <button 
          className="call-next-button"
          onClick={callNextPatient}
          disabled={loading || queue.length === 0}
        >
          {loading ? 'Calling...' : 'Call Next Patient'}
        </button>
      </div>

      <div className="queue-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div>
            <h3>{queue.length}</h3>
            <p>Patients in Queue</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div>
            <h3>{queue.filter(p => p.status === 'booked').length}</h3>
            <p>Waiting</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div>
            <h3>{queue.filter(p => p.status === 'in_progress').length}</h3>
            <p>In Progress</p>
          </div>
        </div>
      </div>

      <div className="queue-list">
        {queue.length === 0 ? (
          <div className="empty-state">
            <p>No patients in queue today.</p>
          </div>
        ) : (
          queue.map(patient => (
            <div 
              key={patient.id} 
              className={`queue-item ${patient.status === 'in_progress' ? 'active' : ''}`}
            >
              <div className="patient-info">
                <div className="token-number">#{patient.token_number}</div>
                <div className="patient-details">
                  <h3>{patient.patient_name}</h3>
                  <p>Time: {patient.appointment_time}</p>
                  {patient.symptoms && <p>Symptoms: {patient.symptoms}</p>}
                </div>
              </div>
              <div className="patient-status">
                <span className={`status-badge status-${patient.status}`}>
                  {patient.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderConsultation = () => (
    <div className="dashboard-content">
      <h2>Patient Consultation</h2>

      {currentPatient ? (
        <div className="consultation-section">
          <div className="patient-summary">
            <h3>Current Patient: {currentPatient.patient_name}</h3>
            <p>Token: #{currentPatient.token_number}</p>
            <p>Time: {currentPatient.appointment_time}</p>
            {currentPatient.symptoms && <p>Symptoms: {currentPatient.symptoms}</p>}
          </div>

          <form onSubmit={completeConsultation} className="consultation-form">
            <div className="form-group">
              <label>Diagnosis</label>
              <textarea
                value={consultationForm.diagnosis}
                onChange={(e) => setConsultationForm({
                  ...consultationForm,
                  diagnosis: e.target.value
                })}
                rows="4"
                placeholder="Enter diagnosis..."
                required
              />
            </div>

            <div className="prescription-section">
              <h3>Prescriptions</h3>
              
              <div className="prescription-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Medicine</label>
                    <input
                      type="text"
                      value={prescriptionForm.medicine_name}
                      onChange={(e) => setPrescriptionForm({
                        ...prescriptionForm,
                        medicine_name: e.target.value
                      })}
                      placeholder="Medicine name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Dosage</label>
                    <input
                      type="text"
                      value={prescriptionForm.dosage}
                      onChange={(e) => setPrescriptionForm({
                        ...prescriptionForm,
                        dosage: e.target.value
                      })}
                      placeholder="e.g., 500mg"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Frequency</label>
                    <input
                      type="text"
                      value={prescriptionForm.frequency}
                      onChange={(e) => setPrescriptionForm({
                        ...prescriptionForm,
                        frequency: e.target.value
                      })}
                      placeholder="e.g., 3 times daily"
                    />
                  </div>
                  <div className="form-group">
                    <label>Duration</label>
                    <input
                      type="text"
                      value={prescriptionForm.duration}
                      onChange={(e) => setPrescriptionForm({
                        ...prescriptionForm,
                        duration: e.target.value
                      })}
                      placeholder="e.g., 7 days"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Instructions</label>
                  <input
                    type="text"
                    value={prescriptionForm.instructions}
                    onChange={(e) => setPrescriptionForm({
                      ...prescriptionForm,
                      instructions: e.target.value
                    })}
                    placeholder="Special instructions"
                  />
                </div>

                <button
                  type="button"
                  className="add-prescription-button"
                  onClick={addPrescription}
                >
                  Add Medicine
                </button>
              </div>

              {consultationForm.prescriptions.length > 0 && (
                <div className="prescription-list">
                  <h4>Added Medicines:</h4>
                  {consultationForm.prescriptions.map((prescription, index) => (
                    <div key={index} className="prescription-item">
                      <div className="prescription-details">
                        <strong>{prescription.medicine_name}</strong>
                        <span>{prescription.dosage} - {prescription.frequency} - {prescription.duration}</span>
                        {prescription.instructions && <span>Instructions: {prescription.instructions}</span>}
                      </div>
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => removePrescription(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="complete-consultation-button"
              disabled={loading}
            >
              {loading ? 'Completing...' : 'Complete Consultation'}
            </button>
          </form>
        </div>
      ) : (
        <div className="empty-state">
          <p>No patient currently selected for consultation.</p>
          <p>Call a patient from the queue to begin.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="hospital-icon">👨‍⚕️</div>
          <div>
            <h1>Doctor Dashboard</h1>
            <p>Welcome, {user.full_name}</p>
          </div>
        </div>
        
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </header>

      <nav className="dashboard-nav">
        <button
          className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          👥 Patient Queue
        </button>
        <button
          className={`nav-item ${activeTab === 'consultation' ? 'active' : ''}`}
          onClick={() => setActiveTab('consultation')}
        >
          🩺 Consultation
        </button>
      </nav>

      <main className="dashboard-main">
        {activeTab === 'queue' && renderQueue()}
        {activeTab === 'consultation' && renderConsultation()}
      </main>
    </div>
  );
};

export default DoctorDashboard;