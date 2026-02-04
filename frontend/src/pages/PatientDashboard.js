import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { patientAPI } from '../utils/api';
import socketService from '../utils/socket';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Activity, 
  Stethoscope,
  FileText
} from 'lucide-react';

const PatientDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [queueStatus, setQueueStatus] = useState({});

  // Appointment booking form
  const [bookingForm, setBookingForm] = useState({
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    symptoms: '',
    priority: 'normal'
  });

  useEffect(() => {
    loadInitialData();
    setupSocketListeners();

    return () => {
      // Clean up socket listeners
      socketService.off('appointment_booked');
      socketService.off('consultation_started');
      socketService.off('consultation_completed');
      socketService.off('prescription_status_update');
    };
  }, []);

  const setupSocketListeners = () => {
    socketService.on('appointment_booked', (data) => {
      toast.success(`Appointment booked! Token #${data.token_number}`);
      loadAppointments();
    });

    socketService.on('consultation_started', (data) => {
      toast.success(data.message);
      loadAppointments();
    });

    socketService.on('consultation_completed', (data) => {
      toast.success(data.message);
      loadAppointments();
      if (data.has_prescription) {
        loadPrescriptions();
      }
    });

    socketService.on('prescription_status_update', (data) => {
      toast.info(data.message);
      loadPrescriptions();
    });
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAppointments(),
        loadPrescriptions(),
        loadDepartments()
      ]);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await patientAPI.getAppointments();
      setAppointments(response.data);
      
      // Load queue status for active appointments
      const activeAppointments = response.data.filter(
        apt => apt.status === 'booked' || apt.status === 'in_queue'
      );
      
      for (const apt of activeAppointments) {
        loadQueueStatus(apt.id);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  };

  const loadQueueStatus = async (appointmentId) => {
    try {
      const response = await patientAPI.getQueueStatus(appointmentId);
      setQueueStatus(prev => ({
        ...prev,
        [appointmentId]: response.data
      }));
    } catch (error) {
      console.error('Failed to load queue status:', error);
    }
  };

  const loadPrescriptions = async () => {
    try {
      const response = await patientAPI.getPrescriptions();
      setPrescriptions(response.data);
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await patientAPI.getDepartments();
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadDoctors = async (departmentId = '') => {
    try {
      const response = await patientAPI.getDoctors(departmentId);
      setDoctors(response.data);
    } catch (error) {
      console.error('Failed to load doctors:', error);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await patientAPI.bookAppointment(bookingForm);
      
      // Reset form
      setBookingForm({
        doctor_id: '',
        appointment_date: '',
        appointment_time: '',
        symptoms: '',
        priority: 'normal'
      });
      
      // Reload appointments
      await loadAppointments();
      setActiveTab('appointments');
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to book appointment';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      booked: 'status-booked',
      in_queue: 'status-in-queue',
      consulting: 'status-consulting',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    
    return (
      <span className={statusClasses[status] || 'status-pending'}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getPrescriptionStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      preparing: 'status-preparing',
      ready: 'status-ready',
      dispensed: 'status-dispensed'
    };
    
    return (
      <span className={statusClasses[status] || 'status-pending'}>
        {status.toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01 ${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderOverview = () => {
    const todayAppointments = appointments.filter(
      apt => apt.appointment_date === new Date().toISOString().split('T')[0]
    );
    
    const activeAppointments = appointments.filter(
      apt => apt.status === 'booked' || apt.status === 'in_queue' || apt.status === 'consulting'
    );

    const pendingPrescriptions = prescriptions.filter(
      presc => presc.pharmacy_status !== 'dispensed'
    );

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="medical-icon">
                <Calendar />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Today's Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{todayAppointments.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="medical-icon">
                <Clock />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active Appointments</p>
                <p className="text-2xl font-bold text-teal-600">{activeAppointments.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="medical-icon">
                <FileText />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Pending Prescriptions</p>
                <p className="text-2xl font-bold text-orange-600">{pendingPrescriptions.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="medical-icon">
                <Activity />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Visits</p>
                <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Queue Status */}
        {activeAppointments.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Current Queue Status</h3>
            <div className="space-y-4">
              {activeAppointments.map(appointment => {
                const status = queueStatus[appointment.id];
                return (
                  <div key={appointment.id} className="flex items-center justify-between p-4 bg-teal-50 rounded-lg">
                    <div>
                      <p className="font-medium">{appointment.doctor_name}</p>
                      <p className="text-sm text-gray-600">{appointment.department_name}</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="queue-number text-3xl">
                        #{appointment.token_number}
                      </div>
                      {status && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">Queue Position: {status.queue_position}</p>
                          <p className="text-sm text-gray-600">Wait Time: ~{status.estimated_wait_time} min</p>
                          <p className="text-sm text-teal-600">Current Token: #{status.current_token}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Appointments */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Appointments</h3>
          {appointments.slice(0, 5).length > 0 ? (
            <div className="space-y-3">
              {appointments.slice(0, 5).map(appointment => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{appointment.doctor_name}</p>
                    <p className="text-sm text-gray-600">{appointment.department_name}</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(appointment.status)}
                    <p className="text-sm text-gray-600 mt-1">Token #{appointment.token_number}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No appointments yet</p>
          )}
        </div>
      </div>
    );
  };

  const renderAppointments = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
        <button
          onClick={() => setActiveTab('book')}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Book Appointment
        </button>
      </div>

      {appointments.length > 0 ? (
        <div className="space-y-4">
          {appointments.map(appointment => {
            const status = queueStatus[appointment.id];
            return (
              <div key={appointment.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Stethoscope className="w-5 h-5 text-teal-600 mr-2" />
                      <h3 className="text-lg font-semibold">{appointment.doctor_name}</h3>
                    </div>
                    <p className="text-gray-600 mb-1">{appointment.department_name}</p>
                    <p className="text-gray-600 mb-2">
                      {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
                    </p>
                    {appointment.symptoms && (
                      <p className="text-sm text-gray-700"><strong>Symptoms:</strong> {appointment.symptoms}</p>
                    )}
                    {appointment.doctor_notes && (
                      <p className="text-sm text-gray-700 mt-2"><strong>Doctor's Notes:</strong> {appointment.doctor_notes}</p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="mb-2">
                      {getStatusBadge(appointment.status)}
                    </div>
                    <div className="text-2xl font-bold text-teal-600 mb-2">
                      #{appointment.token_number}
                    </div>
                    {status && appointment.status === 'booked' && (
                      <div className="text-sm text-gray-600">
                        <p>Position: {status.queue_position}</p>
                        <p>Wait: ~{status.estimated_wait_time} min</p>
                        <p className="text-teal-600">Current: #{status.current_token}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">No appointments scheduled</p>
          <button
            onClick={() => setActiveTab('book')}
            className="btn-primary"
          >
            Book Your First Appointment
          </button>
        </div>
      )}
    </div>
  );

  const renderBookAppointment = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Book New Appointment</h2>
      
      <div className="card max-w-2xl">
        <form onSubmit={handleBookAppointment} className="space-y-6">
          <div>
            <label className="form-label">Department</label>
            <select
              value={bookingForm.department_id}
              onChange={(e) => {
                setBookingForm({ ...bookingForm, department_id: e.target.value, doctor_id: '' });
                if (e.target.value) {
                  loadDoctors(e.target.value);
                } else {
                  setDoctors([]);
                }
              }}
              className="form-input"
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Doctor</label>
            <select
              value={bookingForm.doctor_id}
              onChange={(e) => setBookingForm({ ...bookingForm, doctor_id: e.target.value })}
              className="form-input"
              required
              disabled={!doctors.length}
            >
              <option value="">Select Doctor</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.doctor_name} - {doctor.specialization || 'General'}
                  {doctor.consultation_fee > 0 && ` (₹${doctor.consultation_fee})`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Appointment Date</label>
              <input
                type="date"
                value={bookingForm.appointment_date}
                onChange={(e) => setBookingForm({ ...bookingForm, appointment_date: e.target.value })}
                className="form-input"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="form-label">Preferred Time</label>
              <input
                type="time"
                value={bookingForm.appointment_time}
                onChange={(e) => setBookingForm({ ...bookingForm, appointment_time: e.target.value })}
                className="form-input"
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Priority</label>
            <select
              value={bookingForm.priority}
              onChange={(e) => setBookingForm({ ...bookingForm, priority: e.target.value })}
              className="form-input"
            >
              <option value="normal">Normal</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label className="form-label">Symptoms / Reason for Visit</label>
            <textarea
              value={bookingForm.symptoms}
              onChange={(e) => setBookingForm({ ...bookingForm, symptoms: e.target.value })}
              className="form-input"
              rows="4"
              placeholder="Describe your symptoms or reason for the visit..."
              required
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center"
            >
              {loading ? (
                <div className="loading-spinner mr-2"></div>
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Booking...' : 'Book Appointment'}
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderPrescriptions = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Prescriptions</h2>

      {prescriptions.length > 0 ? (
        <div className="space-y-4">
          {prescriptions.map(prescription => (
            <div key={prescription.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{prescription.doctor_name}</h3>
                  <p className="text-gray-600">{formatDate(prescription.created_at)}</p>
                </div>
                <div className="text-right">
                  {getPrescriptionStatusBadge(prescription.pharmacy_status)}
                  {prescription.pickup_token && (
                    <p className="text-sm text-gray-600 mt-1">
                      Pickup Token: <strong>{prescription.pickup_token}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Prescribed Medicines:</h4>
                <div className="space-y-2">
                  {prescription.prescription_data.map((medicine, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{medicine.name}</p>
                        <p className="text-sm text-gray-600">{medicine.dosage} - {medicine.frequency}</p>
                      </div>
                      <div className="text-sm text-gray-600">
                        Duration: {medicine.duration}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {prescription.pharmacy_notes && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Pharmacy Notes:</strong> {prescription.pharmacy_notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No prescriptions yet</p>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'book', label: 'Book Appointment', icon: Plus },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-hospital-user text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-teal-600">Hospital Information System</h1>
                <p className="text-xs text-gray-600">Patient Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
              </div>
              
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Logout"
              >
                <i className="fas fa-sign-out-alt text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-teal-100 text-teal-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'appointments' && renderAppointments()}
          {activeTab === 'book' && renderBookAppointment()}
          {activeTab === 'prescriptions' && renderPrescriptions()}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;