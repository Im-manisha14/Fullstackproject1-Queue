import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { patientAPI, ensureArray } from '../utils/api';
import socketService from '../utils/socket';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  Plus,
  Activity,
  Stethoscope,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import Button from '../components/common/Button';
import InputField from '../components/common/InputField';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const PatientDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true); // Initial load is true
  const [queueStatus, setQueueStatus] = useState({});
  const [actionLoading, setActionLoading] = useState(false); // For specific actions like booking
  const [bookingResult, setBookingResult] = useState(null); // To store successful booking data for confirmation

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
      toast.success(`Appointment booked! Token ${data.token_number}`);
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
      const data = ensureArray(response.data, 'appointments');
      setAppointments(data);

      // Load queue status for active appointments
      const activeAppointments = data.filter(
        apt => apt.status === 'booked' || apt.status === 'in_queue'
      );

      for (const apt of activeAppointments) {
        loadQueueStatus(apt.id);
      }
    } catch (error) {
      console.error('Failed to load appointments', error);
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
      setPrescriptions(ensureArray(response.data, 'prescriptions'));
    } catch (error) {
      console.error('Failed to load prescriptions', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await patientAPI.getDepartments();
      const data = ensureArray(response.data, 'departments');
      if (data.length > 0) {
        setDepartments(data);
      } else {
        throw new Error('Empty departments');
      }
    } catch (error) {
      console.error('Failed to load departments', error);
      // Fallback
      setDepartments([
        { id: 'Cardiology', name: 'Cardiology' },
        { id: 'Dermatology', name: 'Dermatology' },
        { id: 'General', name: 'General Medicine' }
      ]);
    }
  };

  const loadDoctors = async (departmentId = '') => {
    try {
      const response = await patientAPI.getDoctors(departmentId);
      setDoctors(ensureArray(response.data, 'doctors'));
    } catch (error) {
      console.error('Failed to load doctors', error);
      toast.error('Failed to load doctors');
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();

    try {
      setActionLoading(true);
      const response = await patientAPI.bookAppointment(bookingForm);

      // Extract data for confirmation
      // Backend returns { success: true, data: { appointment_id, queue_token, ... } }
      const bookingData = response.data?.data || response.data;

      // Get doctor name from current doctors list
      const selectedDoctor = doctors.find(d => d.id == bookingForm.doctor_id);

      setBookingResult({
        doctor_name: selectedDoctor?.doctor_name || 'Doctor',
        specialization: selectedDoctor?.specialization || 'Specialist',
        date: bookingForm.appointment_date,
        time: formatTime(bookingForm.appointment_time),
        token_number: bookingData.queue_token || bookingData.token_number
      });

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
      toast.success('Appointment booked successfully');

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to book appointment';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
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

  const getPrescriptionStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-teal-100 text-teal-800',
      dispensed: 'bg-teal-100 text-teal-800'
    };

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
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
    if (loading) return <LoadingSkeleton type="card" count={2} />;

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
      <div className="space-y-8 animate-in fade-in duration-500">
        <h2 className="text-xl font-bold text-gray-900 px-1">Dashboard Overview</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Today's Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{todayAppointments.length}</p>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-teal-50 text-teal-600">
                <Clock className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Appointments</p>
                <p className="text-2xl font-bold text-teal-600">{activeAppointments.length}</p>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-50 text-orange-600">
                <FileText className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Prescriptions</p>
                <p className="text-2xl font-bold text-orange-600">{pendingPrescriptions.length}</p>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                <Activity className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Visits</p>
                <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Active Queue Status */}
        {activeAppointments.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 border-l-4 border-teal-500 pl-3">Live Queue Status</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeAppointments.map(appointment => {
                const status = queueStatus[appointment.id];
                return (
                  <Card key={appointment.id} className="border-t-4 border-t-teal-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-gray-900">{appointment.doctor_name}</p>
                        <p className="text-sm text-gray-500">{appointment.department_name}</p>
                      </div>
                      <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full font-medium">Active</span>
                    </div>

                    <div className="text-center py-4 bg-teal-50 rounded-lg mb-4">
                      <p className="text-sm text-teal-600 mb-1">Your Token</p>
                      <p className="text-4xl font-bold text-teal-700">{appointment.token_number}</p>
                    </div>

                    {status ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">Currently Serving:</span>
                          <span className="font-bold text-gray-900">Token {status.current_token}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">People Ahead:</span>
                          <span className="font-bold text-gray-900">{Math.max(0, appointment.token_number - status.current_token)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-blue-50 text-blue-800 rounded">
                          <span>Est. Wait Time:</span>
                          <span className="font-bold">~{status.estimated_wait_time} mins</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-gray-500 text-sm">Loading queue status...</div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Appointments */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
          <Card className="overflow-hidden">
            {appointments.slice(0, 5).length > 0 ? (
              <div className="divide-y divide-gray-100">
                {appointments.slice(0, 5).map(appointment => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Stethoscope className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{appointment.doctor_name}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(appointment.appointment_date)} • {formatTime(appointment.appointment_time)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Recent Appointments"
                description="Your appointment history will appear here once you book your first visit."
                actionButton={
                  <Button size="small" variant="primary" onClick={() => setActiveTab('book')}>
                    Book Now
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      </div>
    );
  };

  const renderAppointments = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
          <p className="text-gray-500 text-sm">View and manage all your scheduled visits</p>
        </div>
        <Button
          onClick={() => setActiveTab('book')}
          variant="primary"
          icon={Plus}
        >
          Book New
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton type="card" count={3} />
      ) : appointments.length > 0 ? (
        <div className="grid gap-4">
          {appointments.map(appointment => {
            const status = queueStatus[appointment.id];
            return (
              <Card key={appointment.id} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{appointment.doctor_name}</h3>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="text-gray-600 font-medium">{appointment.department_name}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {formatDate(appointment.appointment_date)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        {formatTime(appointment.appointment_time)}
                      </div>
                    </div>

                    {appointment.symptoms && (
                      <p className="text-sm bg-gray-50 p-2 rounded text-gray-700 inline-block">
                        <strong>Symptoms:</strong> {appointment.symptoms}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end min-w-[140px]">
                    <div className="mb-2">
                      {getStatusBadge(appointment.status)}
                    </div>
                    <div className="text-center bg-teal-50 px-4 py-2 rounded-lg border border-teal-100 w-full">
                      <p className="text-xs text-teal-600 uppercase font-bold">Token</p>
                      <p className="text-2xl font-extrabold text-teal-700">{appointment.token_number}</p>
                    </div>
                  </div>
                </div>

                {appointment.doctor_notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-blue-800 mb-1">Doctor's Notes</p>
                        <p className="text-sm text-blue-900">{appointment.doctor_notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No Appointments Found"
          description="You haven't booked any appointments yet. Start by booking a consultation with our doctors."
          icon={Calendar}
          actionButton={
            <Button variant="primary" onClick={() => setActiveTab('book')}>
              Book Your First Appointment
            </Button>
          }
        />
      )}
    </div>
  );

  const renderBookAppointment = () => {
    if (bookingResult) {
      return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
          <Card className="overflow-hidden border-none shadow-xl ring-1 ring-gray-100">
            <div className="bg-teal-600 p-8 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Appointment Confirmed</h2>
              <p className="text-teal-50 opacity-90">Your appointment has been successfully scheduled.</p>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Appointment Details</h3>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div className="text-gray-500 font-medium whitespace-nowrap">Doctor</div>
                  <div className="text-gray-900 font-semibold">{bookingResult.doctor_name}</div>

                  <div className="text-gray-500 font-medium whitespace-nowrap">Specialization</div>
                  <div className="text-gray-900 font-semibold">{bookingResult.specialization}</div>

                  <div className="text-gray-500 font-medium whitespace-nowrap">Date</div>
                  <div className="text-gray-900 font-semibold">{formatDate(bookingResult.date)}</div>

                  <div className="text-gray-500 font-medium whitespace-nowrap">Time</div>
                  <div className="text-gray-900 font-semibold">{bookingResult.time}</div>
                </div>
              </div>

              <div className="bg-teal-50 rounded-2xl p-6 text-center border border-teal-100">
                <p className="text-teal-600 font-bold uppercase tracking-wider text-xs mb-1">Queue Token</p>
                <p className="text-6xl font-black text-teal-700 tracking-tighter">{bookingResult.token_number}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Important Information</h3>
                <ul className="space-y-3">
                  <li className="flex items-start text-sm text-gray-600">
                    <div className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center mr-3 mt-0.5 shrink-0">
                      <div className="w-1.5 h-1.5 bg-teal-600 rounded-full" />
                    </div>
                    You have been added to the consultation queue.
                  </li>
                  <li className="flex items-start text-sm text-gray-600">
                    <div className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center mr-3 mt-0.5 shrink-0">
                      <div className="w-1.5 h-1.5 bg-teal-600 rounded-full" />
                    </div>
                    Please arrive at least 10 minutes before your scheduled time to avoid delays.
                  </li>
                  <li className="flex items-start text-sm text-gray-600">
                    <div className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center mr-3 mt-0.5 shrink-0">
                      <div className="w-1.5 h-1.5 bg-teal-600 rounded-full" />
                    </div>
                    You can monitor your queue status in real time through your dashboard.
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed italic">
                  A confirmation email has been sent to your registered email address. For appointment modifications or assistance, please contact the hospital reception.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    setBookingResult(null);
                    setActiveTab('appointments');
                  }}
                  variant="primary"
                  className="flex-1 justify-center py-3"
                >
                  View My Appointments
                </Button>
                <Button
                  onClick={() => {
                    setBookingResult(null);
                    setActiveTab('overview');
                  }}
                  variant="secondary"
                  className="flex-1 justify-center py-3"
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Book New Appointment</h2>
          <p className="text-gray-500">Fill in the details below to schedule your consultation</p>
        </div>

        <Card className="shadow-lg border-t-4 border-t-teal-500">
          <form onSubmit={handleBookAppointment} className="space-y-6 p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label block text-sm font-medium text-gray-700 mb-1">Department</label>
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
                  className="form-input w-full rounded-lg border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                <select
                  value={bookingForm.doctor_id}
                  onChange={(e) => setBookingForm({ ...bookingForm, doctor_id: e.target.value })}
                  className="form-input w-full rounded-lg border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  required
                  disabled={!doctors.length}
                >
                  <option value="">{doctors.length ? 'Select Doctor' : 'Select Department First'}</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.doctor_name} - {doctor.specialization || 'General'}
                      {doctor.consultation_fee > 0 && ` (₹${doctor.consultation_fee})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Appointment Date"
                type="date"
                value={bookingForm.appointment_date}
                onChange={(e) => setBookingForm({ ...bookingForm, appointment_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
                name="appointment_date"
              />

              <InputField
                label="Preferred Time"
                type="time"
                value={bookingForm.appointment_time}
                onChange={(e) => setBookingForm({ ...bookingForm, appointment_time: e.target.value })}
                required
                name="appointment_time"
              />
            </div>

            <div>
              <label className="form-label block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer rounded-lg border p-4 flex items-center justify-center transition-all ${bookingForm.priority === 'normal' ? 'border-teal-500 bg-teal-50 text-teal-700 font-medium' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="priority"
                    value="normal"
                    checked={bookingForm.priority === 'normal'}
                    onChange={() => setBookingForm({ ...bookingForm, priority: 'normal' })}
                    className="hidden"
                  />
                  Normal Visit
                </label>
                <label className={`cursor-pointer rounded-lg border p-4 flex items-center justify-center transition-all ${bookingForm.priority === 'emergency' ? 'border-red-500 bg-red-50 text-red-700 font-medium' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="priority"
                    value="emergency"
                    checked={bookingForm.priority === 'emergency'}
                    onChange={() => setBookingForm({ ...bookingForm, priority: 'emergency' })}
                    className="hidden"
                  />
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Emergency
                </label>
              </div>
            </div>

            <div>
              <label className="form-label block text-sm font-medium text-gray-700 mb-1">Symptoms / Reason</label>
              <textarea
                value={bookingForm.symptoms}
                onChange={(e) => setBookingForm({ ...bookingForm, symptoms: e.target.value })}
                className="form-input w-full rounded-lg border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                rows="3"
                placeholder="Briefly describe your symptoms..."
                required
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                variant="primary"
                icon={Calendar}
                isLoading={actionLoading}
                className="flex-1 justify-center py-3 text-base shadow-lg hover:shadow-xl transition-all"
              >
                {actionLoading ? 'Booking Appointment...' : 'Confirm Appointment'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveTab('appointments')}
                className="px-8"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  };

  const renderPrescriptions = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Prescriptions</h2>
          <p className="text-gray-500 text-sm">Digital records of your medications</p>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton type="card" count={2} />
      ) : prescriptions.length > 0 ? (
        <div className="grid gap-4">
          {prescriptions.map(prescription => (
            <Card key={prescription.id} className="hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{prescription.doctor_name}</h3>
                    <p className="text-sm text-gray-500">{formatDate(prescription.created_at)}</p>
                  </div>
                </div>
                <div className="text-right mt-2 sm:mt-0">
                  {getPrescriptionStatusBadge(prescription.pharmacy_status)}
                  {prescription.pickup_token && (
                    <div className="mt-2 text-right">
                      <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Pickup Token</span>
                      <p className="text-xl font-extrabold text-teal-600">{prescription.pickup_token}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-5">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-gray-400" />
                  Prescribed Medicines
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ensureArray(
                    Array.isArray(prescription.prescription_data)
                      ? prescription.prescription_data
                      : (prescription.prescription_data?.medicines || prescription.prescription_data),
                    'medicines'
                  ).map((medicine, index) => (
                    <div key={index} className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                      <p className="font-bold text-gray-800">{medicine.name}</p>
                      <div className="flex justify-between mt-2 text-sm">
                        <span className="text-gray-600">{medicine.dosage} • {medicine.frequency}</span>
                        <span className="font-medium text-teal-600">{medicine.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {prescription.pharmacy_notes && (
                <div className="mt-4 flex items-start p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-yellow-800 text-sm">Pharmacy Note:</span>
                    <p className="text-sm text-yellow-900 mt-1">{prescription.pharmacy_notes}</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Prescriptions Found"
          description="Any prescriptions issued by doctors will appear here digitally."
          icon={FileText}
        />
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
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center mr-3 shadow-md shadow-teal-200">
                <i className="fas fa-hospital-user text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Hospital Information System</h1>
                <p className="text-xs text-teal-600 font-bold uppercase tracking-wide">Professional Patient Portal</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                <div className="flex items-center justify-end">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                  <p className="text-xs text-gray-500 font-medium capitalize">{user?.role}</p>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
        <div className="mb-8 overflow-x-auto hide-scrollbar">
          <nav className="flex space-x-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="min-h-[60vh]">
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