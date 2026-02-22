import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doctorAPI, ensureArray } from '../utils/api';
import socketService from '../utils/socket';
import toast from 'react-hot-toast';
import {
  Users,
  Calendar,
  Play,
  CheckCircle,
  LogOut
} from 'lucide-react';
import Button from '../components/common/Button';
import InputField from '../components/common/InputField';
import Card from '../components/common/Card';

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
      toast.success(`Patient called: Token ${data.token_number}`);
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
      // toast.error('Failed to load profile');
    }
  };

  const loadQueue = async () => {
    try {
      // Pass user.id to get queue for specific doctor
      if (user?.id) {
        const response = await doctorAPI.getQueue(user.id);
        setQueue(ensureArray(response.data, 'queue', 'appointments'));
      }
    } catch (error) {
      console.error('Failed to load queue', error);
      // toast.error('Failed to load queue');
    }
  };

  // Helper to sync consultation state with queue status
  useEffect(() => {
    if (queue.length > 0) {
      const activeConsultation = queue.find(appt => appt.status === 'consulting');
      if (activeConsultation && !consultationForm.appointment_id) {
        setConsultationForm(prev => ({
          ...prev,
          appointment_id: activeConsultation.id
        }));
      }
    }
  }, [queue, consultationForm.appointment_id]);

  const loadAppointments = async () => {
    try {
      // Reuse getQueue for now as appointments list is similar
      if (user?.id) {
        const response = await doctorAPI.getQueue(user.id);
        setAppointments(ensureArray(response.data, 'queue', 'appointments'));
      }
    } catch (error) {
      // toast.error('Failed to load appointments');
    }
  };

  const handleCallNext = async () => {
    try {
      setLoading(true);
      const response = await doctorAPI.callNext();
      toast.success('Next patient called');

      // Set up consultation form for the called patient
      setConsultationForm({
        appointment_id: response.data.current_patient.id, // Ensure correct mapping
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
    if (!medicineForm.name) {
      toast.error('Please enter a medicine name');
      return;
    }

    setConsultationForm(prev => ({
      ...prev,
      prescription_data: [...prev.prescription_data, { ...medicineForm }]
    }));

    // Reset medicine form
    setMedicineForm({
      name: '',
      dosage: '',
      frequency: '',
      duration: ''
    });
    toast.success('Medicine added to prescription');
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

      // 1. Create prescription if medicines exist
      if (consultationForm.prescription_data.length > 0) {
        await doctorAPI.createPrescription({
          appointment_id: consultationForm.appointment_id,
          medicines: consultationForm.prescription_data,
          notes: consultationForm.doctor_notes
        });
        toast.success('Prescription created');
      }

      // 2. Complete consultation / update status
      await doctorAPI.updateAppointmentStatus(consultationForm.appointment_id, 'completed');

      toast.success('Consultation completed');

      // Reset form
      setConsultationForm({
        appointment_id: '',
        doctor_notes: '',
        prescription_data: []
      });

      await Promise.all([loadQueue(), loadAppointments()]);

    } catch (error) {
      console.error(error);
      toast.error('Failed to complete consultation');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      booked: 'bg-blue-100 text-blue-800',
      in_queue: 'bg-yellow-100 text-yellow-800',
      consulting: 'bg-teal-100 text-teal-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
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
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Patient Queue</h2>
          <div className="flex items-center space-x-4">
            <InputField
              type="date"
              name="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="!w-auto"
            />
            <Button
              onClick={handleCallNext}
              disabled={loading || waitingQueue.length === 0}
              variant="primary"
              icon={Play}
            >
              Call Next Patient
            </Button>
          </div>
        </div>

        {/* Currently Consulting */}
        {consultingPatient && (
          <Card className="border-l-4 border-orange-500 bg-orange-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-orange-700">Currently Consulting</h3>
              <div>
                <p className="text-sm font-medium text-teal-600 mb-1">Current Token</p>
                <div className="text-4xl font-extrabold text-teal-700">
                  {consultingPatient.token_number}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-lg">{consultingPatient.patient_name}</p>
                <p className="text-sm text-gray-600">
                  Appointment: {formatTime(consultingPatient.appointment_time)}
                </p>
                <div className="mt-2 text-gray-700 bg-white p-3 rounded-lg border border-orange-100">
                  <strong className="block text-xs uppercase text-gray-500 mb-1">Symptoms</strong>
                  {consultingPatient.symptoms}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Complete Consultation Form */}
        {consultingPatient && (
          <Card>
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
                  <InputField
                    placeholder="Medicine name"
                    value={medicineForm.name}
                    onChange={(e) => setMedicineForm(prev => ({ ...prev, name: e.target.value }))}
                    name="medicine"
                  />
                  <InputField
                    placeholder="Dosage"
                    value={medicineForm.dosage}
                    onChange={(e) => setMedicineForm(prev => ({ ...prev, dosage: e.target.value }))}
                    name="dosage"
                  />
                  <InputField
                    placeholder="Frequency"
                    value={medicineForm.frequency}
                    onChange={(e) => setMedicineForm(prev => ({ ...prev, frequency: e.target.value }))}
                    name="frequency"
                  />
                  <InputField
                    placeholder="Duration"
                    value={medicineForm.duration}
                    onChange={(e) => setMedicineForm(prev => ({ ...prev, duration: e.target.value }))}
                    name="duration"
                  />
                </div>
                <Button
                  type="button"
                  onClick={addMedicineToPrescription}
                  variant="secondary"
                  size="small"
                >
                  Add Medicine
                </Button>
              </div>

              {/* Prescription Preview */}
              {consultationForm.prescription_data.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold mb-2">Prescription Preview:</h4>
                  <div className="space-y-2">
                    {consultationForm.prescription_data.map((medicine, index) => (
                      <div key={index} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                        <div>
                          <span className="font-medium text-teal-700">{medicine.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {medicine.dosage} • {medicine.frequency} • {medicine.duration}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedicineFromPrescription(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <Button
                  type="submit"
                  disabled={loading}
                  variant="primary"
                  icon={CheckCircle}
                  isLoading={loading}
                >
                  Complete Consultation
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Waiting Queue */}
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">
            Waiting Queue
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-sm">
              {waitingQueue.length}
            </span>
          </h3>

          {waitingQueue.length > 0 ? (
            <div className="space-y-3">
              {waitingQueue.map(appointment => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                  <div>
                    <div className="flex items-center">
                      <p className="font-medium text-lg text-gray-900">{appointment.patient_name}</p>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="text-sm text-gray-600">{formatTime(appointment.appointment_time)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900 border-2 border-dashed border-teal-200 w-12 h-12 rounded-lg flex items-center justify-center bg-teal-50">
                      {appointment.token_number}
                    </div>
                    <div className="mt-1">
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No patients waiting in queue</p>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderAppointments = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">All Appointments</h2>
        <InputField
          type="date"
          name="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="!w-auto"
        />
      </div>

      {appointments.length > 0 ? (
        <div className="grid gap-4">
          {appointments.map(appointment => (
            <Card key={appointment.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{appointment.patient_name}</h3>
                  <p className="text-sm text-gray-600">
                    {formatTime(appointment.appointment_time)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Symptoms:</strong> {appointment.symptoms}
                  </p>
                  {appointment.doctor_notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                      <strong>Notes:</strong> {appointment.doctor_notes}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-teal-600 mb-2">
                    #{appointment.token_number}
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>
              </div>
            </Card>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
                <i className="fas fa-hospital-user text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">Hospital Information System</h1>
                <p className="text-xs text-teal-600 font-medium">Doctor Portal</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">
                  {profile?.specialization || 'Doctor'} • {profile?.department || 'General'}
                </p>
              </div>

              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8 overflow-x-auto">
          <nav className="flex space-x-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                    ? 'bg-teal-50 text-teal-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
        <div className="animate-in fade-in duration-500">
          {activeTab === 'queue' && renderQueue()}
          {activeTab === 'appointments' && renderAppointments()}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;