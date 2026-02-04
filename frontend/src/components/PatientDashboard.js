import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const PatientDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Booking form
  const [bookingForm, setBookingForm] = useState({
    doctor_id: '',
    appointment_date: '',
    appointment_time: '10:00',
    symptoms: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const getToken = () => localStorage.getItem('token');

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAppointments(),
        loadDoctors(),
        loadDepartments()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await fetch(`${API_BASE}/patient/appointments`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await fetch(`${API_BASE}/patient/doctors`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE}/patient/departments`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/patient/book-appointment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(bookingForm)
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Appointment booked! Your token number is: ${data.token_number}`);
        setBookingForm({
          doctor_id: '',
          appointment_date: '',
          appointment_time: '10:00',
          symptoms: ''
        });
        loadAppointments();
        setActiveTab('appointments');
      } else {
        alert(data.error || 'Booking failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      booked: 'status-booked',
      in_progress: 'status-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status] || ''}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const renderOverview = () => (
    <div className="dashboard-content">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div>
            <h3>{appointments.length}</h3>
            <p>Total Appointments</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div>
            <h3>{appointments.filter(a => a.status === 'booked').length}</h3>
            <p>Upcoming</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div>
            <h3>{appointments.filter(a => a.status === 'completed').length}</h3>
            <p>Completed</p>
          </div>
        </div>
      </div>

      <div className="recent-appointments">
        <h3>Recent Appointments</h3>
        {appointments.slice(0, 3).map(appointment => (
          <div key={appointment.id} className="appointment-card">
            <div className="appointment-info">
              <h4>{appointment.doctor_name}</h4>
              <p>{appointment.department}</p>
              <p>{appointment.appointment_date} at {appointment.appointment_time}</p>
              <p>Token: #{appointment.token_number}</p>
            </div>
            <div className="appointment-status">
              {getStatusBadge(appointment.status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBooking = () => (
    <div className="dashboard-content">
      <h2>Book New Appointment</h2>
      
      <form onSubmit={handleBookAppointment} className="booking-form">
        <div className="form-row">
          <div className="form-group">
            <label>Doctor</label>
            <select
              value={bookingForm.doctor_id}
              onChange={(e) => setBookingForm({...bookingForm, doctor_id: e.target.value})}
              required
            >
              <option value="">Select a doctor</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.department} (₹{doctor.consultation_fee})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={bookingForm.appointment_date}
              onChange={(e) => setBookingForm({...bookingForm, appointment_date: e.target.value})}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Time</label>
            <select
              value={bookingForm.appointment_time}
              onChange={(e) => setBookingForm({...bookingForm, appointment_time: e.target.value})}
              required
            >
              <option value="10:00">10:00 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="12:00">12:00 PM</option>
              <option value="14:00">2:00 PM</option>
              <option value="15:00">3:00 PM</option>
              <option value="16:00">4:00 PM</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Symptoms (Optional)</label>
          <textarea
            value={bookingForm.symptoms}
            onChange={(e) => setBookingForm({...bookingForm, symptoms: e.target.value})}
            rows="3"
            placeholder="Describe your symptoms..."
          />
        </div>

        <button type="submit" className="book-button" disabled={loading}>
          {loading ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>
    </div>
  );

  const renderAppointments = () => (
    <div className="dashboard-content">
      <h2>My Appointments</h2>
      
      <div className="appointments-list">
        {appointments.length === 0 ? (
          <div className="empty-state">
            <p>No appointments found.</p>
            <button 
              className="primary-button"
              onClick={() => setActiveTab('book')}
            >
              Book Your First Appointment
            </button>
          </div>
        ) : (
          appointments.map(appointment => (
            <div key={appointment.id} className="appointment-card detailed">
              <div className="appointment-header">
                <h3>{appointment.doctor_name}</h3>
                {getStatusBadge(appointment.status)}
              </div>
              
              <div className="appointment-details">
                <div className="detail-item">
                  <span className="label">Department:</span>
                  <span>{appointment.department}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Date & Time:</span>
                  <span>{appointment.appointment_date} at {appointment.appointment_time}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Token Number:</span>
                  <span>#{appointment.token_number}</span>
                </div>
                {appointment.symptoms && (
                  <div className="detail-item">
                    <span className="label">Symptoms:</span>
                    <span>{appointment.symptoms}</span>
                  </div>
                )}
                {appointment.diagnosis && (
                  <div className="detail-item">
                    <span className="label">Diagnosis:</span>
                    <span>{appointment.diagnosis}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="hospital-icon">🏥</div>
          <div>
            <h1>Patient Dashboard</h1>
            <p>Welcome, {user.full_name}</p>
          </div>
        </div>
        
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </header>

      <nav className="dashboard-nav">
        <button
          className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`nav-item ${activeTab === 'book' ? 'active' : ''}`}
          onClick={() => setActiveTab('book')}
        >
          📅 Book Appointment
        </button>
        <button
          className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          📋 My Appointments
        </button>
      </nav>

      <main className="dashboard-main">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'book' && renderBooking()}
        {activeTab === 'appointments' && renderAppointments()}
      </main>
    </div>
  );
};

export default PatientDashboard;