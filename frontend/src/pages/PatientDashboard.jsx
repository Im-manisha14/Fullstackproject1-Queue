import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { patientAPI, ensureArray } from '../utils/api';
import { Check, Clipboard, Pill } from 'lucide-react';

const PatientDashboard = () => {
  const { user, logout } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [liveQueue, setLiveQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookMsg, setBookMsg] = useState('');
  const [bookError, setBookError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  // ref so the polling interval always sees the currently selected appointment
  // without being a useEffect dependency (which would reset selection)
  const activeApptRef = useRef(null);
  const [displayName, setDisplayName] = useState('');
  const [bookingForm, setBookingForm] = useState({
    hospital_id: '', doctor_id: '', appointment_date: new Date().toISOString().split('T')[0], appointment_time: '', department_id: '', patient_name: '', symptoms: ''
  });

  const loadData = useCallback(async () => {
    try {
      console.log('Loading patient dashboard data...');
      console.log('User:', user);
      console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      // First load appointments, prescriptions, and hospitals
      const [apptRes, presRes, hospitalsRes] = await Promise.all([
        patientAPI.getAppointments(),
        patientAPI.getPrescriptions(),
        patientAPI.getHospitals()
      ]);
      
      const appts = ensureArray(apptRes.data, 'appointments');
      const presc = ensureArray(presRes.data, 'prescriptions');
      const hosps = ensureArray(hospitalsRes.data, 'hospitals');
      
      setAppointments(appts);
      setPrescriptions(presc);
      setHospitals(hosps);
      
      // Load departments for all hospitals
      if (hosps.length > 0) {
        const allDepartments = [];
        for (const hospital of hosps) {
          try {
            const deptRes = await patientAPI.getDepartments(hospital.id);
            const depts = ensureArray(deptRes.data, 'departments');
            depts.forEach(dept => {
              dept.hospital_name = hospital.name; // Add hospital name for display
            });
            allDepartments.push(...depts);
          } catch (err) {
            console.error(`Failed to load departments for hospital ${hospital.name}:`, err);
          }
        }
        setDepartments(allDepartments);
      }
      
      const today = new Date().toISOString().split('T')[0];
      const activeList = appts
        .filter(a => ['booked', 'in_queue', 'in_consultation'].includes(a.status) && a.appointment_date >= today)
        .sort((a, b) => {
          const aToday = a.appointment_date === today ? 0 : 1;
          const bToday = b.appointment_date === today ? 0 : 1;
          if (aToday !== bToday) return aToday - bToday;
          return new Date(a.appointment_date) - new Date(b.appointment_date);
        });
      setActiveAppointments(activeList);
      const active = activeList[0] || null;
      setActiveAppointment(active);
      activeApptRef.current = active;
      setSelectedIdx(0);
      if (active) {
        try {
          const qRes = await patientAPI.getQueueStatus(active.id);
          setLiveQueue(qRes.data);
        } catch (err) {
          console.error('Failed to load queue status:', err);
        }
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Run loadData once on mount only
  useEffect(() => { loadData(); }, [loadData]);

  // Polling interval — uses ref so it never causes re-mount when user switches tabs
  useEffect(() => {
    const interval = setInterval(() => {
      const appt = activeApptRef.current;
      if (appt) {
        setIsRefreshing(true);
        patientAPI.getQueueStatus(appt.id)
          .then(r => {
            setLiveQueue(r.data);
            setLastUpdate(new Date());
            setIsRefreshing(false);
          })
          .catch(() => setIsRefreshing(false));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []); // mount/unmount only — ref keeps it current

  // Live wait timer — counts up from when the appointment was booked, updates every 1 minute
  const [waitElapsed, setWaitElapsed] = useState(0);
  useEffect(() => {
    if (!activeAppointment?.created_at) { setWaitElapsed(0); return; }
    const bookedAt = new Date(activeAppointment.created_at);
    const tick = () => setWaitElapsed(Math.floor((Date.now() - bookedAt.getTime()) / 60000));
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [activeAppointment?.created_at]);

  const loadDoctors = async (departmentId) => {
    try {
      const res = await patientAPI.getDoctors(departmentId);
      setDoctors(ensureArray(res.data, 'doctors'));
    } catch (e) { setDoctors([]); }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookMsg(''); setBookError('');
    try {
      await patientAPI.bookAppointment(bookingForm);
      if (bookingForm.patient_name.trim()) setDisplayName(bookingForm.patient_name.trim());
      setBookMsg('Appointment booked successfully!');
      setShowBookingForm(false);
      setBookingForm({ hospital_id: '', department_id: '', doctor_id: '', appointment_date: new Date().toISOString().split('T')[0], appointment_time: '', patient_name: '', symptoms: '' });
      await loadData();
    } catch (err) {
      setBookError(err.response?.data?.message || err.response?.data?.error || 'Booking failed');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const formatTime = (t) => t ? new Date('2000-01-01T' + t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
  const getTimeAgo = () => {
    const seconds = Math.floor((new Date() - lastUpdate) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  const statusBadge = (s) => {
    const map = { 
      booked: 'badge-blue', 
      in_queue: 'badge-warning',
      consulting: 'badge-success',
      in_consultation: 'badge-success', 
      completed: 'badge-gray', 
      cancelled: 'badge-red',
      expired: 'badge-red',
    };
    const labels = {
      booked: 'Confirmed',
      in_queue: 'In Queue',
      consulting: 'Consulting',
      in_consultation: 'Consulting',
      completed: 'Completed',
      cancelled: 'Cancelled',
      expired: 'Expired',
    };
    return <span className={'badge ' + (map[s] || 'badge-gray')}>{labels[s] || s}</span>;
  };

  const getQueuePosition = () => {
    if (!activeAppointment || !liveQueue) return null;
    const ahead = Math.max(0, (liveQueue.queue_position ?? 1) - 1);
    if (ahead === 0) return { text: 'Your Turn Next!', color: '#52B788', pulse: true };
    if (ahead <= 2) return { text: `${ahead} patient${ahead > 1 ? 's' : ''} ahead`, color: '#D97706', pulse: false };
    return { text: `${ahead} patients ahead`, color: '#5B7C99', pulse: false };
  };

  if (loading) return (
    <div className="loading-page">
      <div className="loading-spinner dark"></div>
      <p>Loading your dashboard...</p>
    </div>
  );

  const queuePosition = getQueuePosition();

  return (
    <div>
      {/* Header */}
      <div className="dash-header">
        {displayName && <h2>{displayName}</h2>}
        <p style={{fontSize:'13px',color:'var(--text-muted)',fontWeight:'400'}}>Real-Time Queue Tracking</p>
      </div>

      {/* Alerts */}
      {bookMsg && <div className="alert alert-success"><Check size={16} className="alert-icon" /> {bookMsg}</div>}
      {bookError && <div className="alert alert-error"><span className="alert-icon">!</span> {bookError}</div>}

      {/* Appointment tabs — shown when patient has multiple active bookings */}
      {activeAppointments.length > 1 && (
        <div className="lq-appt-tabs">
          {activeAppointments.map((appt, idx) => {
            const initials = (appt.doctor_name || '').replace('Dr. ', '').split(' ').slice(0, 2).map(w => w[0]).join('');
            return (
              <button
                key={appt.id}
                className={`lq-appt-tab${selectedIdx === idx ? ' active' : ''}`}
                onClick={() => {
                  setSelectedIdx(idx);
                  setActiveAppointment(appt);
                  activeApptRef.current = appt;  // keep ref in sync
                  setLiveQueue(null);
                  patientAPI.getQueueStatus(appt.id)
                    .then(r => setLiveQueue(r.data))
                    .catch(() => {});
                }}
              >
                <span className="lq-tab-avatar">{initials}</span>
                <div className="lq-tab-info">
                  <div className="lq-tab-name">{appt.doctor_name}</div>
                  <div className="lq-tab-date">{formatDate(appt.appointment_date)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Live Queue Status ── */}
      {activeAppointment ? (() => {
        const isToday = activeAppointment.appointment_date === new Date().toISOString().split('T')[0];
        const initials = (activeAppointment.doctor_name || '')
          .replace('Dr. ', '').split(' ').slice(0, 2).map(w => w[0]).join('');
        return (
          <div className="lq-card">

            {/* Top bar */}
            <div className="lq-topbar">
              <div className="lq-live-pill">
                <div className={`lq-dot${isToday && !isRefreshing ? ' pulsing' : ''}`} style={isToday ? {} : {background:'#9ca3af'}} />
                <span className="lq-live-label" style={isToday ? {} : {color:'#6b7280'}}>{isToday ? 'Live' : 'Upcoming'}</span>
                {isToday && <span className="lq-time-ago">{getTimeAgo()}</span>}
              </div>
              {statusBadge(activeAppointment.status)}
            </div>

            {/* Doctor row */}
            <div className="lq-doctor-row">
              <div className="lq-avatar">{initials}</div>
              <div className="lq-doctor-info">
                <div className="lq-doctor-name">{activeAppointment.doctor_name}</div>
                {activeAppointment.doctor_specialization && (
                  <div className="lq-doctor-spec">{activeAppointment.doctor_specialization}</div>
                )}
                <div className="lq-doctor-meta">
                  <span className="lq-meta-chip">📅 {formatDate(activeAppointment.appointment_date)}</span>
                  <span className="lq-meta-chip">🕙 {formatTime(activeAppointment.appointment_time)}</span>
                  {activeAppointment.hospital_name && (
                    <span className="lq-meta-chip">🏥 {activeAppointment.hospital_name}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="lq-stats-row">
              <div className="lq-sc">
                <div className="lq-sc-label">Your Token</div>
                <div className="lq-sc-value token-highlight">{activeAppointment.token_number}</div>
              </div>
              <div className="lq-sc">
                <div className="lq-sc-label">Ahead in Queue</div>
                <div className="lq-sc-value">{liveQueue ? Math.max(0, (liveQueue.queue_position ?? 1) - 1) : '—'}</div>
              </div>
              <div className="lq-sc">
                <div className="lq-sc-label">Wait Time</div>
                <div className="lq-sc-value green">
                  {waitElapsed < 1
                    ? 'Just now'
                    : waitElapsed < 60
                      ? `${waitElapsed} min`
                      : `${Math.floor(waitElapsed / 60)}h ${waitElapsed % 60}m`}
                </div>
              </div>
            </div>

            {/* Queue Progress Bar */}
            {liveQueue && activeAppointment.token_number > 0 && (() => {
              const total = activeAppointment.token_number;
              const current = liveQueue.current_token ?? 0;
              const pct = Math.min(100, Math.round((current / total) * 100));
              return (
                <div style={{padding:'12px 20px 4px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text-muted)',marginBottom:'6px'}}>
                    <span>Queue Progress</span>
                    <span>Token {current} of {total} reached</span>
                  </div>
                  <div style={{background:'#e5e7eb',borderRadius:'99px',height:'8px',overflow:'hidden'}}>
                    <div style={{
                      height:'100%',
                      width:`${pct}%`,
                      borderRadius:'99px',
                      background: pct >= 90 ? '#22c55e' : pct >= 60 ? '#f59e0b' : 'var(--primary)',
                      transition:'width 0.6s ease'
                    }}/>
                  </div>
                </div>
              );
            })()}

            {/* Position bar */}
            {queuePosition && (
              <div
                className={`lq-position-bar${queuePosition.pulse ? ' pulse-bar' : ''}`}
                style={{ borderLeftColor: queuePosition.color }}
              >
                <span className="lq-pos-icon">⏱</span>
                <div>
                  <div className="lq-pos-main" style={{ color: queuePosition.color }}>
                    {queuePosition.text}
                  </div>
                  <div className="lq-pos-sub">
                    {queuePosition.pulse ? 'Please proceed to the consultation room' : 'Estimated based on current queue · updates every 5s'}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })() : (
        <div className="lq-empty">
          <div className="lq-empty-icon">📅</div>
          <h3>No Active Appointment</h3>
          <p>Book an appointment to start tracking your queue position in real-time</p>
          <button className="btn btn-primary" onClick={() => setShowBookingForm(true)}>
            Book Appointment
          </button>
        </div>
      )}

      {/* Booking Form - Minimal & Focused */}
      {showBookingForm && (
        <div className="card mb-4">
          <div className="card-header">
            <span className="card-title">Book Appointment</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBookingForm(false)}>✕</button>
          </div>
          <div className="card-body">
            <form onSubmit={handleBookAppointment}>
              <div className="form-group">
                <label>Patient Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter patient full name"
                  value={bookingForm.patient_name}
                  onChange={e => setBookingForm({...bookingForm, patient_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Hospital *</label>
                  <select className="form-control" value={bookingForm.hospital_id}
                    onChange={e => { 
                      setBookingForm({...bookingForm, hospital_id: e.target.value, department_id: '', doctor_id: ''});
                    }} required>
                    <option value="">Select Hospital</option>
                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Department *</label>
                  <select className="form-control" value={bookingForm.department_id}
                    onChange={e => { 
                      setBookingForm({...bookingForm, department_id: e.target.value, doctor_id: ''}); 
                      loadDoctors(e.target.value); 
                    }} required>
                    <option value="">Select Department</option>
                    {departments
                      .filter(d => !bookingForm.hospital_id || d.hospital_id === bookingForm.hospital_id)
                      .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={bookingForm.appointment_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setBookingForm({...bookingForm, appointment_date: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Time (optional)</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={bookingForm.appointment_time}
                    onChange={e => setBookingForm({...bookingForm, appointment_time: e.target.value})} 
                  />
                </div>
              </div>

              {doctors.length > 0 && (
                <div className="form-group">
                  <label>Select Doctor *</label>
                  <div className="doctors-grid">
                    {doctors.map(doc => (
                      <div 
                        key={doc.id}
                        className={'doctor-card' + (bookingForm.doctor_id == doc.id ? ' selected' : '')}
                        onClick={() => setBookingForm({...bookingForm, doctor_id: doc.id})}
                      >
                        <div className="doctor-name">{doc.full_name || doc.doctor_name}</div>
                        <div className="doctor-spec">{doc.specialization}</div>
                        <div className="doctor-fee">₹ {doc.consultation_fee}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Symptoms / Reason for Visit *</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Describe your symptoms or reason for visit..."
                  value={bookingForm.symptoms}
                  onChange={e => setBookingForm({...bookingForm, symptoms: e.target.value})}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={!bookingForm.doctor_id}>
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* My Appointments & Prescriptions */}
      <div className="content-grid-2">
        {/* Appointments */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">My Appointments</span>
            {!showBookingForm && (
              <button className="btn btn-outline btn-sm" onClick={() => setShowBookingForm(true)}>
                + Book
              </button>
            )}
          </div>
          <div className="table-wrapper">
            {appointments.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Token</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments
                    .filter(apt => {
                      const today = new Date().toISOString().split('T')[0];
                      // Always show active/upcoming appointments regardless of date
                      if (['booked', 'in_queue', 'in_consultation', 'consulting'].includes(apt.status)) return true;
                      // For completed/cancelled/expired: only show today or future dates (hide past days)
                      return apt.appointment_date >= today;
                    })
                    .slice(0, 10)
                    .map(apt => (
                    <tr key={apt.id}>
                      <td>
                        <div style={{fontWeight:'600',fontSize:'14px'}}>{apt.doctor_name}</div>
                        <div style={{fontSize:'12px',color:'var(--text-muted)'}}>{apt.doctor_specialization}</div>
                      </td>
                      <td style={{fontSize:'13px'}}>{formatDate(apt.appointment_date)}</td>
                      <td>
                        <span style={{fontWeight:'700',fontFamily:'monospace',fontSize:'14px'}}>
                          #{apt.token_number}
                        </span>
                      </td>
                      <td>{statusBadge(apt.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{padding:'40px',textAlign:'center'}}>
                <Clipboard size={36} style={{opacity: '0.2', marginBottom: '12px', color: 'var(--text-muted)'}} />
                <p style={{fontSize:'14px',color:'var(--text-muted)'}}>No appointments yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Prescriptions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Prescriptions</span>
          </div>
          <div className="table-wrapper">
            {prescriptions.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Pickup Token</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.slice(0, 10).map(p => (
                    <tr key={p.id}>
                      <td style={{fontSize:'14px',fontWeight:'500'}}>{p.doctor_name}</td>
                      <td style={{fontSize:'13px'}}>{formatDate(p.created_at)}</td>
                      <td>
                        <span style={{fontWeight:'700',fontFamily:'monospace',fontSize:'14px'}}>
                          {p.pickup_token || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={'badge ' + (
                          p.dispensed_at ? 'badge-success' : 
                          p.pharmacy_status === 'ready' ? 'badge-warning' : 
                          'badge-blue'
                        )}>
                          {p.pharmacy_status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{padding:'40px',textAlign:'center'}}>
                <Pill size={36} style={{opacity: '0.2', marginBottom: '12px', color: 'var(--text-muted)'}} />
                <p style={{fontSize:'14px',color:'var(--text-muted)'}}>No prescriptions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
