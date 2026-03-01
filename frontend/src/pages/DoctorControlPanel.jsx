import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doctorAPI } from '../utils/api';
import { 
  Users, Clock, CheckCircle, AlertTriangle, User, 
  Phone, FileText, Timer, ChevronRight, Stethoscope,
  Calendar, Activity, Bell, LogOut, CircleDot
} from 'lucide-react';
import './DoctorControlPanel.css';

/* ═══════════════════════════════════════════════════════════════════════════════
   💊 MEDICINES DATABASE & SYMPTOM MAP
═══════════════════════════════════════════════════════════════════════════════ */
const MEDICINES_DB = [
  { name: 'Paracetamol 500mg',  dosage: '1 tablet',  frequency: 'Three times daily',          duration: '3 days'  },
  { name: 'Dolo 650mg',         dosage: '1 tablet',  frequency: 'Three times daily',          duration: '3 days'  },
  { name: 'Crocin 500mg',       dosage: '1 tablet',  frequency: 'Twice daily',                duration: '3 days'  },
  { name: 'Ibuprofen 400mg',    dosage: '1 tablet',  frequency: 'Three times daily with food',duration: '5 days'  },
  { name: 'Combiflam',          dosage: '1 tablet',  frequency: 'Twice daily',                duration: '5 days'  },
  { name: 'Cetirizine 10mg',    dosage: '1 tablet',  frequency: 'Once daily at night',        duration: '5 days'  },
  { name: 'Montair LC',         dosage: '1 tablet',  frequency: 'Once daily at night',        duration: '10 days' },
  { name: 'Azithromycin 500mg', dosage: '1 tablet',  frequency: 'Once daily',                 duration: '5 days'  },
  { name: 'Amoxicillin 250mg',  dosage: '1 capsule', frequency: 'Three times daily',          duration: '7 days'  },
  { name: 'Norflox TZ',         dosage: '1 tablet',  frequency: 'Twice daily',                duration: '5 days'  },
  { name: 'Omeprazole 20mg',    dosage: '1 capsule', frequency: 'Twice daily before meal',    duration: '14 days' },
  { name: 'Pantoprazole 40mg',  dosage: '1 tablet',  frequency: 'Once daily morning',         duration: '7 days'  },
  { name: 'Atorvastatin 10mg',  dosage: '1 tablet',  frequency: 'Once daily at bedtime',      duration: '30 days' },
  { name: 'Metformin 500mg',    dosage: '1 tablet',  frequency: 'Twice daily with meals',     duration: '30 days' },
  { name: 'Amlodipine 5mg',     dosage: '1 tablet',  frequency: 'Once daily morning',         duration: '30 days' },
];

const SYMPTOM_MAP = [
  { keywords: ['fever','temperature','chills','hot'],                        meds: ['Paracetamol 500mg','Dolo 650mg','Crocin 500mg'] },
  { keywords: ['cold','sneez','runny nose','nasal congestion'],              meds: ['Cetirizine 10mg','Montair LC'] },
  { keywords: ['cough','bronch'],                                            meds: ['Azithromycin 500mg','Cetirizine 10mg'] },
  { keywords: ['allerg','itching','rash','hives','skin'],                    meds: ['Cetirizine 10mg','Montair LC'] },
  { keywords: ['headache','migraine','head pain'],                           meds: ['Paracetamol 500mg','Ibuprofen 400mg'] },
  { keywords: ['body pain','joint pain','muscle pain','back pain','ache'],   meds: ['Combiflam','Ibuprofen 400mg'] },
  { keywords: ['stomach','gastric','acidity','acid reflux','heartburn','ulcer','indigestion'], meds: ['Omeprazole 20mg','Pantoprazole 40mg'] },
  { keywords: ['diarrhea','loose stool','dysentery','loose motion'],         meds: ['Norflox TZ','Omeprazole 20mg'] },
  { keywords: ['vomiting','nausea'],                                         meds: ['Omeprazole 20mg','Pantoprazole 40mg'] },
  { keywords: ['throat','tonsil','pharyn','sore throat'],                    meds: ['Azithromycin 500mg','Paracetamol 500mg'] },
  { keywords: ['infection','bacterial','antibiotic','pus','abscess'],        meds: ['Azithromycin 500mg','Amoxicillin 250mg'] },
  { keywords: ['urinary','urine','uti','burning urination'],                 meds: ['Norflox TZ'] },
  { keywords: ['diabetes','sugar','hyperglycemia','blood sugar'],            meds: ['Metformin 500mg'] },
  { keywords: ['blood pressure','hypertension','bp high'],                   meds: ['Amlodipine 5mg'] },
  { keywords: ['cholesterol','lipid','triglyceride'],                        meds: ['Atorvastatin 10mg'] },
  { keywords: ['chest pain','angina','cardiac','heart'],                     meds: ['Amlodipine 5mg','Atorvastatin 10mg'] },
  { keywords: ['wound','injury','sprain','fracture','swelling'],             meds: ['Combiflam','Ibuprofen 400mg'] },
  { keywords: ['pain'],                                                       meds: ['Paracetamol 500mg','Ibuprofen 400mg'] },
];

function getSuggestedMedicines(symptoms) {
  if (!symptoms) return [];
  const lower = symptoms.toLowerCase();
  const nameSet = new Set();
  const result = [];
  for (const entry of SYMPTOM_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) {
      for (const name of entry.meds) {
        if (!nameSet.has(name)) {
          nameSet.add(name);
          const med = MEDICINES_DB.find(m => m.name === name);
          if (med) result.push(med);
        }
      }
    }
  }
  return result;
}

const DoctorControlPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  /* ═══════════════════════════════════════════════════════════════════════════════
     🏥 STATE MANAGEMENT - HOSPITAL CONTROL SYSTEM
  ═══════════════════════════════════════════════════════════════════════════════ */
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState({});
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultingPatient, setConsultingPatient] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [consultTime, setConsultTime] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const [rxForm, setRxForm] = useState({
    appointment_id: '',
    doctor_notes: '',
    prescription_data: []
  });
  const [medForm, setMedForm] = useState({ 
    name: '', dosage: '', frequency: '', duration: '' 
  });
  const [showRx, setShowRx] = useState(false);
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  
  const prevQueueRef = useRef([]);
  const medInputRef = useRef(null);
  const timerRef = useRef(null);

  /* ═══════════════════════════════════════════════════════════════════════════════
     🏥 UTILITY FUNCTIONS - DATA PROCESSING
  ═══════════════════════════════════════════════════════════════════════════════ */
  const ensureArray = (data, ...keys) => {
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return Array.isArray(data) ? data : [];
  };

  const initials = name => 
    (name || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'DR';

  const getUrgencyLevel = (patient) => {
    if (!patient?.symptoms) return 'normal';
    const symptoms = patient.symptoms.toLowerCase();
    if (symptoms.includes('chest pain') || symptoms.includes('difficulty breathing') || 
        symptoms.includes('severe') || symptoms.includes('emergency')) return 'urgent';
    if (symptoms.includes('pain') || symptoms.includes('fever') || 
        symptoms.includes('urgent')) return 'priority';
    return 'normal';
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    try {
      // Handle plain HH:MM or HH:MM:SS from the DB
      const hmMatch = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
      if (hmMatch) {
        let h = parseInt(hmMatch[1], 10);
        const m = hmMatch[2];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
      }
      // Fallback: full datetime string
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch {
      return timeStr;
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'booked':
      case 'in_queue':
        return 'WAITING';
      case 'consulting':
        return 'IN CONSULTATION';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'WAITING';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'booked':
      case 'in_queue':
        return 'status-waiting';
      case 'consulting':
        return 'status-consulting';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-waiting';
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════════
     🏥 DATA LOADING - HOSPITAL OPERATIONS
  ═══════════════════════════════════════════════════════════════════════════════ */
  const loadProfile = useCallback(async () => {
    try {
      const response = await doctorAPI.getProfile();
      setProfile(response.data);
    } catch (error) {
      console.error('Profile load failed:', error);
    }
  }, []);

  const loadQueue = useCallback(async (showLoading = true) => {
    try {
      const response = await doctorAPI.getQueue();
      const raw = response.data;
      const list = Array.isArray(raw) ? raw : ensureArray(raw, 'queue', 'appointments');
      
      // Process and sort queue by hospital priority
      // Use backend priority field first (set by triage), fall back to symptom-based detection
      const processedQueue = list.map(patient => ({
        ...patient,
        urgency: patient.priority || getUrgencyLevel(patient),
        display_time: formatTime(patient.appointment_time)
      }));

      // Hospital sorting: Consulting → Urgent → Priority → Normal → Completed
      const sortedQueue = processedQueue.sort((a, b) => {
        if (a.status === 'consulting') return -1;
        if (b.status === 'consulting') return 1;
        if (a.status === 'completed') return 1;
        if (b.status === 'completed') return -1;
        
        const priorityOrder = { 'urgent': 0, 'priority': 1, 'normal': 2 };
        if (a.urgency !== b.urgency) {
          return priorityOrder[a.urgency] - priorityOrder[b.urgency];
        }
        
        return (a.token_number || 0) - (b.token_number || 0);
      });

      prevQueueRef.current = sortedQueue;
      setQueue(sortedQueue);
      setLastUpdated(Date.now());
      setIsOnline(true);
      setError('');

      // Auto-select consulting patient for workflow
      const consulting = sortedQueue.find(a => a.status === 'consulting');
      if (consulting) {
        setConsultingPatient(consulting);
        setSelectedPatient(consulting);
        setRxForm(prev => prev.appointment_id ? prev : { 
          ...prev, 
          appointment_id: consulting.id 
        });
      } else {
        setConsultingPatient(null);
      }

      calculateMetrics(sortedQueue);
      
    } catch (error) {
      console.error('Queue load failed:', error);
      setError('Failed to load queue data');
      setIsOnline(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const response = await doctorAPI.getDailySummary();
      setSummary(response.data || {});
    } catch (error) {
      console.error('Summary load failed:', error);
    }
  }, []);

  const calculateMetrics = (queueData) => {
    const waiting = queueData.filter(p => p.status === 'booked' || p.status === 'in_queue');
    const consulting = queueData.filter(p => p.status === 'consulting');
    const completed = queueData.filter(p => p.status === 'completed');
    const urgent = queueData.filter(p => p.urgency === 'urgent' && p.status !== 'completed');
    
    setSummary(prev => ({
      ...prev,
      waiting_count: waiting.length,
      consulting_count: consulting.length,
      completed_count: completed.length,
      total_count: queueData.length,
      urgent_count: urgent.length
    }));
  };

  /* ═══════════════════════════════════════════════════════════════════════════════
     🏥 HOSPITAL ACTIONS - PATIENT MANAGEMENT
  ═══════════════════════════════════════════════════════════════════════════════ */
  const handleCallNext = async () => {
    setMsg(''); 
    setError('');
    
    try {
      const response = await doctorAPI.callNext();
      const called = response.data?.appointment || response.data?.current_patient;
      
      if (called) {
        setRxForm({ 
          appointment_id: called.id, 
          doctor_notes: '', 
          prescription_data: [] 
        });
        setSelectedPatient(called);
        setConsultingPatient(called);
        setMsg('Patient called successfully - Ready for consultation');
        await Promise.all([loadQueue(), loadSummary()]);
      }
      
    } catch (e) {
      setError(e.response?.data?.message || 'No patients waiting in queue');
    }
  };

  const handleCompleteConsultation = async () => {
    if (!consultingPatient) return;
    
    try {
      const data = {
        appointment_id: consultingPatient.id,
        doctor_notes: rxForm.doctor_notes || '',
        prescription_data: rxForm.prescription_data || []
      };
      
      await doctorAPI.completeConsultation(data);
      setMsg('Consultation completed successfully');
      setConsultingPatient(null);
      setSelectedPatient(null);
      setShowRx(false);
      setRxForm({ appointment_id: '', doctor_notes: '', prescription_data: [] });
      
      await Promise.all([loadQueue(), loadSummary()]);
    } catch (error) {
      setError('Failed to complete consultation: ' + (error.response?.data?.message || error.message));
    }
  };

  const addMedicine = () => {
    if (!medForm.name.trim()) return;
    
    const medicine = {
      name: medForm.name.trim(),
      dosage: medForm.dosage.trim() || '1 tablet',
      frequency: medForm.frequency.trim() || 'Once daily',
      duration: medForm.duration.trim() || '7 days'
    };
    
    setRxForm(prev => ({
      ...prev,
      prescription_data: [...prev.prescription_data, medicine]
    }));
    
    setMedForm({ name: '', dosage: '', frequency: '', duration: '' });
  };

  /* ═══════════════════════════════════════════════════════════════════════════════
     🏥 LIFECYCLE & TIMERS
  ═══════════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const initializeSystem = async () => {
      setLoading(true);
      await Promise.all([loadProfile(), loadQueue(), loadSummary()]);
      setLoading(false);
    };
    
    initializeSystem();
  }, [loadProfile, loadQueue, loadSummary]);

  // Live polling system
  useEffect(() => {
    const interval = setInterval(() => {
      loadQueue(false);
      loadSummary();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [loadQueue, loadSummary]);

  // Consultation timer
  useEffect(() => {
    if (consultingPatient) {
      timerRef.current = setInterval(() => {
        setConsultTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setConsultTime(0);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [consultingPatient]);

  // Auto-clear messages
  useEffect(() => {
    if (msg || error) {
      const timer = setTimeout(() => {
        setMsg('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [msg, error]);

  /* ═══════════════════════════════════════════════════════════════════════════════
     🏥 RENDER - PRODUCTION HOSPITAL CONTROL PANEL
  ═══════════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="doctor-control-panel">
      {loading && (
        <div className="dcp-loading-overlay">
          <div className="dcp-loading-spinner"></div>
          <span>Loading Hospital System...</span>
        </div>
      )}
      
      {/* ═══════════════════════════════════════════════════════════════════════════════
           🏥 PRODUCTION HEADER - HOSPITAL CONTROL PANEL
      ═══════════════════════════════════════════════════════════════════════════════ */}
      <header className="dcp-header">
        <div className="dcp-header-content">
          <div className="dcp-doctor-identity">
            <div className="dcp-doctor-avatar">
              {initials(profile?.full_name || user?.name || 'Doctor')}
            </div>
            <div className="dcp-doctor-info">
              <h1 className="dcp-doctor-name">{profile?.full_name || user?.name || 'Doctor Portal'}</h1>
              <p className="dcp-doctor-specialty">{profile?.specialty || 'General Medicine'}</p>
            </div>
          </div>
          
          <div className="dcp-header-controls">
            <div className="dcp-date-display">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
            
            <div className="dcp-live-indicator">
              <div className="dcp-live-dot"></div>
              <span>LIVE</span>
            </div>
            
            <button className="dcp-logout-btn" onClick={() => navigate('/doctor/select')}>
              <LogOut size={18} />
              <span>Switch Doctor</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════════════
           🏥 MAIN CONTENT - 40/60 SPLIT LAYOUT
      ═══════════════════════════════════════════════════════════════════════════════ */}
      <main className="dcp-main-content">
        
        {/* Messages */}
        {msg && <div className="dcp-message dcp-message-success">{msg}</div>}
        {error && <div className="dcp-message dcp-message-error">{error}</div>}

        <div className="dcp-content-grid">
          
          {/* ═══════════════════════════════════════════════════════════════════════════════
               🏥 LEFT PANEL (40%) - LIVE QUEUE TABLE
          ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="dcp-queue-panel">
            <div className="dcp-panel-header">
              <h2>Live Queue</h2>
              <div className="dcp-queue-stats">
                <span className="dcp-stat waiting">{summary.waiting_count || 0} Waiting</span>
                <span className="dcp-stat consulting">{summary.consulting_count || 0} In Consultation</span>
                <span className="dcp-stat completed">{summary.completed_count || 0} Completed</span>
              </div>
            </div>

            <div className="dcp-queue-table-container">
              <table className="dcp-queue-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Patient</th>
                    <th className="visit-cell">Visit</th>
                    <th className="urgency-cell">Urgency</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="dcp-queue-empty">
                        No patients in queue
                      </td>
                    </tr>
                  ) : (
                    queue.map((patient) => (
                      <tr
                        key={patient.id}
                        className={`dcp-queue-row ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <td className="token-cell">
                          <span className="token-number">#{patient.token_number || '—'}</span>
                        </td>
                        <td className="patient-cell">
                          <div className="patient-info">
                            <span className="patient-name">{patient.patient_name || 'Unknown Patient'}</span>
                            <span className="patient-time">{patient.display_time}</span>
                          </div>
                        </td>
                        <td className="visit-cell">
                          <span className="visit-type">{patient.visit_type || 'Regular'}</span>
                        </td>
                        <td className="urgency-cell">
                          <div className={`urgency-indicator urgency-${patient.urgency}`}>
                            <CircleDot size={12} />
                            <span>{patient.urgency.toUpperCase()}</span>
                          </div>
                        </td>
                        <td className="status-cell">
                          <span className={`status-badge ${getStatusClass(patient.status)}`}>
                            {getStatusDisplay(patient.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Call Next Patient Button */}
            <div className="dcp-queue-actions">
              <button
                className="dcp-call-next-btn"
                onClick={handleCallNext}
                disabled={!queue.some(p => p.status === 'booked' || p.status === 'in_queue')}
              >
                <Phone size={18} />
                <span>Call Next Patient</span>
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════════
               🏥 RIGHT PANEL (60%) - CONSULTATION PANEL
          ═══════════════════════════════════════════════════════════════════════════════ */}
          <div className="dcp-consultation-panel">
            {!selectedPatient ? (
              /* STATE 1: NO PATIENT SELECTED */
              <div className="dcp-consultation-empty">
                <Stethoscope size={48} />
                <h3>Select a patient from queue</h3>
                <p>Choose a patient to view details and manage consultation</p>
              </div>
            ) : selectedPatient.status === 'consulting' ? (
              /* STATE 3: DURING CONSULTATION */
              <div className="dcp-consultation-active">
                <div className="dcp-consultation-header">
                  <h3>Active Consultation</h3>
                  <div className="dcp-consultation-timer">
                    <Timer size={16} />
                    <span>{formatTimer(consultTime)}</span>
                  </div>
                </div>

                <div className="dcp-patient-summary">
                  <div className="dcp-patient-header">
                    <div className="dcp-patient-avatar">
                      {initials(selectedPatient.patient_name)}
                    </div>
                    <div className="dcp-patient-main">
                      <h4>{selectedPatient.patient_name}</h4>
                      <div className="dcp-patient-meta">
                        <span>Token #{selectedPatient.token_number}</span>
                        <span>•</span>
                        <span>{selectedPatient.display_time}</span>
                      </div>
                    </div>
                  </div>

                  {selectedPatient.symptoms && (
                    <div className="dcp-symptoms-section">
                      <h5>Chief Complaint</h5>
                      <p>{selectedPatient.symptoms}</p>
                    </div>
                  )}
                </div>

                <div className="dcp-consultation-actions">
                  <button
                    className="dcp-complete-btn"
                    onClick={handleCompleteConsultation}
                  >
                    <CheckCircle size={18} />
                    <span>Mark Completed</span>
                  </button>
                  
                  <button
                    className="dcp-prescription-btn"
                    onClick={() => setShowRx(!showRx)}
                  >
                    <FileText size={18} />
                    <span>{showRx ? 'Hide' : 'Add'} Prescription</span>
                  </button>
                </div>

                {/* Prescription Form */}
                {showRx && (
                  <div className="dcp-prescription-section">
                    <h4>Prescription</h4>
                    
                    <textarea
                      className="dcp-notes-input"
                      placeholder="Doctor's notes and observations..."
                      value={rxForm.doctor_notes}
                      onChange={e => setRxForm(prev => ({...prev, doctor_notes: e.target.value}))}
                      rows={3}
                    />

                    {/* ── Medicine Form ── */}
                    <div className="dcp-medicine-form">
                      {(() => {
                        const symptoms = consultingPatient?.symptoms || selectedPatient?.symptoms;
                        const suggested = getSuggestedMedicines(symptoms);
                        const suggestedNames = new Set(suggested.map(m => m.name));
                        const others = MEDICINES_DB.filter(m => !suggestedNames.has(m.name));
                        return (
                          <select
                            value={medForm.name}
                            className="dcp-med-select dcp-med-name-select"
                            onChange={e => {
                              const picked = MEDICINES_DB.find(m => m.name === e.target.value);
                              if (picked) {
                                setMedForm({ name: picked.name, dosage: picked.dosage, frequency: picked.frequency, duration: picked.duration });
                              } else {
                                setMedForm(prev => ({ ...prev, name: e.target.value }));
                              }
                            }}
                          >
                            <option value="">— Select Medicine —</option>
                            {suggested.length > 0 && (
                              <optgroup label={`✦ Suggested for symptoms`}>
                                {suggested.map(m => (
                                  <option key={m.name} value={m.name}>
                                    {m.name}  ({m.dosage})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="All Medicines">
                              {others.map(m => (
                                <option key={m.name} value={m.name}>
                                  {m.name}  ({m.dosage})
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        );
                      })()}
                      <select
                        value={medForm.dosage}
                        onChange={e => setMedForm(prev => ({...prev, dosage: e.target.value}))}
                        className="dcp-med-select"
                      >
                        <option value="">Dosage</option>
                        <option>½ tablet</option>
                        <option>1 tablet</option>
                        <option>2 tablets</option>
                        <option>1 capsule</option>
                        <option>2 capsules</option>
                        <option>1 teaspoon (5ml)</option>
                        <option>2 teaspoons (10ml)</option>
                        <option>1 injection</option>
                        <option>1 drop (eye/ear)</option>
                        <option>2 drops (eye/ear)</option>
                        <option>Apply topically</option>
                      </select>
                      <select
                        value={medForm.frequency}
                        onChange={e => setMedForm(prev => ({...prev, frequency: e.target.value}))}
                        className="dcp-med-select"
                      >
                        <option value="">Frequency</option>
                        <option>Once daily morning</option>
                        <option>Once daily at night</option>
                        <option>Twice daily</option>
                        <option>Three times daily</option>
                        <option>Four times daily</option>
                        <option>Every 6 hours</option>
                        <option>Every 8 hours</option>
                        <option>Every 12 hours</option>
                        <option>Once daily before meal</option>
                        <option>Twice daily before meal</option>
                        <option>Three times daily with food</option>
                        <option>Twice daily with meals</option>
                        <option>Once daily at bedtime</option>
                        <option>As needed (SOS)</option>
                      </select>
                      <select
                        value={medForm.duration}
                        onChange={e => setMedForm(prev => ({...prev, duration: e.target.value}))}
                        className="dcp-med-select"
                      >
                        <option value="">Duration</option>
                        <option>1 day</option>
                        <option>2 days</option>
                        <option>3 days</option>
                        <option>5 days</option>
                        <option>7 days</option>
                        <option>10 days</option>
                        <option>14 days</option>
                        <option>1 month</option>
                        <option>2 months</option>
                        <option>3 months</option>
                        <option>Ongoing</option>
                      </select>
                      <button type="button" onClick={addMedicine}>
                        Add Medicine
                      </button>
                    </div>

                    {rxForm.prescription_data.length > 0 && (
                      <div className="dcp-medicine-list">
                        <h5>Prescribed Medicines ({rxForm.prescription_data.length})</h5>
                        {rxForm.prescription_data.map((med, idx) => (
                          <div key={idx} className="dcp-medicine-item">
                            <div className="dcp-med-info">
                              <strong>{med.name}</strong>
                              <span>{med.dosage} · {med.frequency} · {med.duration}</span>
                            </div>
                            <button
                              type="button"
                              className="dcp-med-remove"
                              onClick={() => setRxForm(prev => ({
                                ...prev,
                                prescription_data: prev.prescription_data.filter((_, i) => i !== idx)
                              }))}
                              title="Remove"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* STATE 2: PATIENT SELECTED (BEFORE START) */
              <div className="dcp-consultation-ready">
                <h3>Patient Details</h3>

                <div className="dcp-patient-summary">
                  <div className="dcp-patient-header">
                    <div className="dcp-patient-avatar">
                      {initials(selectedPatient.patient_name)}
                    </div>
                    <div className="dcp-patient-main">
                      <h4>{selectedPatient.patient_name}</h4>
                      <div className="dcp-patient-meta">
                        <span>Token #{selectedPatient.token_number}</span>
                        <span>•</span>
                        <span>{selectedPatient.display_time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="dcp-patient-details-grid">
                    <div className="dcp-detail-item">
                      <span className="label">Age</span>
                      <span className="value">{selectedPatient.age || 'N/A'}</span>
                    </div>
                    <div className="dcp-detail-item">
                      <span className="label">Contact</span>
                      <span className="value">{selectedPatient.contact || 'N/A'}</span>
                    </div>
                    <div className="dcp-detail-item">
                      <span className="label">Visit Type</span>
                      <span className="value">{selectedPatient.visit_type || 'Regular'}</span>
                    </div>
                    <div className="dcp-detail-item">
                      <span className="label">Past Visits</span>
                      <span className="value">{selectedPatient.past_visits || '0'}</span>
                    </div>
                  </div>

                  {selectedPatient.symptoms && (
                    <div className="dcp-symptoms-section">
                      <h5>Symptoms</h5>
                      <p>{selectedPatient.symptoms}</p>
                    </div>
                  )}
                </div>

                {selectedPatient.status !== 'completed' && (
                  <div className="dcp-consultation-actions">
                    <button
                      className="dcp-start-consultation-btn"
                      onClick={handleCallNext}
                    >
                      <Timer size={18} />
                      <span>Start Consultation</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorControlPanel;