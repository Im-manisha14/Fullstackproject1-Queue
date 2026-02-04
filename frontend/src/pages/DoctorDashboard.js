import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doctorAPI } from '../utils/api';
import socketService from '../utils/socket';
import toast from 'react-hot-toast';
import { 
  Users, 
  Calendar,
  Play,
  CheckCircle
} from 'lucide-react';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Consultation form
  const [consultationForm, setConsultationForm] = useState({
    appointment_id: '',
    doctor_notes: '',
    prescription_data: []
  });

  // Medicine form for prescription
  const [medicineForm, setMedicineForm] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: ''
  });

  useEffect(() => {
    loadInitialData();
    setupSocketListeners();

    return () => {
      socketService.off('patient_called');
    };
  }, [selectedDate]);

  const setupSocketListeners = () => {
    socketService.on('patient_called', (data) => {
      toast.success(`Patient called: Token #${data.token_number}`);
      loadQueue();
    });
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProfile(),
        loadQueue(),
        loadAppointments()
      ]);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await doctorAPI.getProfile();
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadQueue = async () => {
    try {
      const response = await doctorAPI.getQueue(selectedDate);
      setQueue(response.data);
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await doctorAPI.getAppointments(selectedDate);
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  };

  const handleCallNext = async () => {
    try {
      setLoading(true);
      const response = await doctorAPI.callNext();
      toast.success('Next patient called');
      
      // Set up consultation form for the called patient
      setConsultationForm({
        appointment_id: response.data.appointment.id,
        doctor_notes: '',
        prescription_data: []
      });
      
      await loadQueue();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'No patients in queue';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addMedicineToPrescription = () => {
    if (medicineForm.name && medicineForm.dosage) {
      setConsultationForm(prev => ({
        ...prev,
        prescription_data: [...prev.prescription_data, { ...medicineForm }]
      }));
      
      setMedicineForm({
        name: '',
        dosage: '',
        frequency: '',
        duration: ''
      });
    }
  };

  const removeMedicineFromPrescription = (index) => {
    setConsultationForm(prev => ({
      ...prev,
      prescription_data: prev.prescription_data.filter((_, i) => i !== index)
    }));
  };

  const handleCompleteConsultation = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await doctorAPI.completeConsultation(consultationForm);
      toast.success('Consultation completed successfully');
      
      // Reset form
      setConsultationForm({
        appointment_id: '',
        doctor_notes: '',
        prescription_data: []
      });
      
      await Promise.all([loadQueue(), loadAppointments()]);
      
    } catch (error) {
      toast.error('Failed to complete consultation');
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

  const formatTime = (timeString) => {
    return new Date(`2000-01-01 ${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderQueue = () => {
    const consultingPatient = queue.find(apt => apt.status === 'consulting');
    const waitingQueue = queue.filter(apt => apt.status === 'booked');
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Patient Queue</h2>
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
            />
            <button
              onClick={handleCallNext}
              disabled={loading || waitingQueue.length === 0}
              className="btn-primary flex items-center"
            >
              <Play className="w-4 h-4 mr-2" />
              Call Next Patient
            </button>
          </div>
        </div>

        {/* Currently Consulting */}
        {consultingPatient && (
          <div className="card border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-orange-700">Currently Consulting</h3>
              <div className="text-3xl font-bold text-orange-600">
                #{consultingPatient.token_number}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium">{consultingPatient.patient_name}</p>
                <p className="text-sm text-gray-600">
                  Appointment: {formatTime(consultingPatient.appointment_time)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Symptoms:</strong> {consultingPatient.symptoms}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Complete Consultation Form */}
        {consultingPatient && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Complete Consultation</h3>
            <form onSubmit={handleCompleteConsultation} className="space-y-4">
              <div>
                <label className="form-label">Doctor's Notes</label>
                <textarea
                  value={consultationForm.doctor_notes}
                  onChange={(e) => setConsultationForm(prev => ({ ...prev, doctor_notes: e.target.value }))}
                  className="form-input"
                  rows="3"
                  placeholder="Enter consultation notes..."
                />
              </div>

              {/* Prescription Builder */}
              <div>
                <label className="form-label">Add Prescription</label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Medicine name"
                    value={medicineForm.name}
                    onChange={(e) => setMedicineForm(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Dosage"
                    value={medicineForm.dosage}
                    onChange={(e) => setMedicineForm(prev => ({ ...prev, dosage: e.target.value }))}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Frequency"
                    value={medicineForm.frequency}
                    onChange={(e) => setMedicineForm(prev => ({ ...prev, frequency: e.target.value }))}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Duration"
                    value={medicineForm.duration}
                    onChange={(e) => setMedicineForm(prev => ({ ...prev, duration: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <button
                  type="button"
                  onClick={addMedicineToPrescription}
                  className="btn-secondary text-sm"
                >
                  Add Medicine
                </button>
              </div>

              {/* Prescription Preview */}
              {consultationForm.prescription_data.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Prescription Preview:</h4>
                  <div className="space-y-2">
                    {consultationForm.prescription_data.map((medicine, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{medicine.name}</span> - 
                          <span className="text-sm ml-1">{medicine.dosage}, {medicine.frequency}, {medicine.duration}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedicineFromPrescription(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center"
                >
                  {loading ? (
                    <div className="loading-spinner mr-2"></div>
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Complete Consultation
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Waiting Queue */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Waiting Queue ({waitingQueue.length})</h3>
          
          {waitingQueue.length > 0 ? (
            <div className="space-y-3">
              {waitingQueue.map(appointment => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{appointment.patient_name}</p>
                    <p className="text-sm text-gray-600">
                      Appointment: {formatTime(appointment.appointment_time)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Symptoms:</strong> {appointment.symptoms}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-teal-600">
                      #{appointment.token_number}
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No patients in queue</p>
          )}
        </div>
      </div>
    );
  };

  const renderAppointments = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">All Appointments</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="form-input"
        />
      </div>

      {appointments.length > 0 ? (
        <div className="grid gap-4">
          {appointments.map(appointment => (
            <div key={appointment.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{appointment.patient_name}</h3>
                  <p className="text-sm text-gray-600">
                    {formatTime(appointment.appointment_time)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Symptoms:</strong> {appointment.symptoms}
                  </p>
                  {appointment.doctor_notes && (
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Notes:</strong> {appointment.doctor_notes}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-teal-600 mb-2">
                    #{appointment.token_number}
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No appointments for this date</p>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'queue', label: 'Queue Management', icon: Users },
    { id: 'appointments', label: 'All Appointments', icon: Calendar }
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
                <p className="text-xs text-gray-600">Doctor Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-600">
                  {profile?.specialization || 'Doctor'} • {profile?.department || 'General'}
                </p>
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
          {activeTab === 'queue' && renderQueue()}
          {activeTab === 'appointments' && renderAppointments()}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;