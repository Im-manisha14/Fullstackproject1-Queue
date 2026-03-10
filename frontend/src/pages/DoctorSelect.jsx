import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './DoctorSelect.css';

const DoctorSelect = () => {
  const [doctors, setDoctors] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [todayDoctors, setTodayDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(null); // doctor id being logged in
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/'); return; }
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await api.get('/api/doctors');
        let list = Array.isArray(res.data) ? res.data : (res.data?.doctors || []);
        // Remove duplicate doctors by user_id or id
        const seen = new Set();
        list = list.filter(d => {
          const key = d.user_id || d.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        // list is already sorted by backend (appointments_today desc)
        setDoctors(list);

        // Group: today's booked doctors first, then rest by hospital
        const today = [];
        const grp = {};
        list.forEach(d => {
          if ((d.appointments_today || 0) > 0) {
            today.push(d);
          } else {
            const hosp = d.hospital_name || 'Other';
            if (!grp[hosp]) grp[hosp] = [];
            grp[hosp].push(d);
          }
        });
        setTodayDoctors(today);
        setGrouped(grp);
      } catch {
        setError('Could not load doctors. Please login again.');
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, [navigate]);

  const handleSelect = async (doctor) => {
    const email = doctor.email;
    if (!email) { setError('No login found for this doctor.'); return; }
    setLoggingIn(doctor.user_id || doctor.id);
    setError('');
    try {
      await login({ email, password: 'password123' });
      navigate('/doctor/dashboard');
    } catch {
      setError(`Could not switch to ${doctor.full_name}. Please try again.`);
      setLoggingIn(null);
    }
  };

  const handleFullLogout = () => {
    logout();
    navigate('/');
  };

  const initials = (name) =>
    (name || '').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const filtered = search.trim()
    ? doctors.filter(d =>
        d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.department_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.hospital_name?.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <div className="ds-page">
      {/* Header */}
      <div className="ds-header">
        <div className="ds-header-left">
          <div className="ds-logo-mark">Q</div>
          <div>
            <h1>QueueFree</h1>
            <p>Select your name to begin consultation</p>
          </div>
        </div>
        <button className="ds-logout-btn" onClick={handleFullLogout}>
          Exit &amp; Logout
        </button>
      </div>

      {/* Search */}
      <div className="ds-search-wrap">
        <span className="ds-search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input
          className="ds-search"
          type="text"
          placeholder="Search doctor, department or hospital..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {error && <div className="ds-error">{error}</div>}

      {loading ? (
        <div className="ds-loading">Loading doctors...</div>
      ) : filtered !== null ? (
        <div className="ds-section">
          <div className="ds-section-title">Search Results <span className="ds-count">{filtered.length} found</span></div>
          <div className="ds-grid">
            {filtered.map(d => <DoctorCard key={d.user_id || d.id} doctor={d} onSelect={handleSelect} loggingIn={loggingIn} initials={initials} showTodayBadge={(d.appointments_today||0)>0} />)}
          </div>
          {filtered.length === 0 && <div className="ds-empty">No doctors found</div>}
        </div>
      ) : (
        <>
          {/* Today's Active Doctors — prominent section */}
          {todayDoctors.length > 0 && (
            <div className="ds-today-section">
              <div className="ds-today-header">
                <span className="ds-today-title">Today's Active Doctors</span>
                <span className="ds-today-pill">{todayDoctors.length} with appointments today</span>
              </div>
              <div className="ds-today-grid">
                {todayDoctors.map(d => (
                  <TodayDoctorCard key={d.user_id || d.id} doctor={d} onSelect={handleSelect} loggingIn={loggingIn} initials={initials} />
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {todayDoctors.length > 0 && Object.keys(grouped).length > 0 && (
            <hr className="ds-divider" />
          )}

          {/* Rest grouped by hospital */}
          {Object.entries(grouped).map(([hospital, docs]) => (
            <div className="ds-section" key={hospital}>
              <div className="ds-section-title">{hospital} <span className="ds-count">{docs.length} doctors</span></div>
              <div className="ds-grid">
                {docs.map(d => (
                  <DoctorCard key={d.user_id || d.id} doctor={d} onSelect={handleSelect} loggingIn={loggingIn} initials={initials} />
                ))}
              </div>
            </div>
          ))}
          {todayDoctors.length === 0 && Object.keys(grouped).length === 0 && (
            <div className="ds-empty">No doctors found</div>
          )}
        </>
      )}
    </div>
  );
};

const TodayDoctorCard = ({ doctor, onSelect, loggingIn, initials }) => {
  const busy = loggingIn === (doctor.user_id || doctor.id);
  return (
    <button
      className={`ds-today-card${busy ? ' loading' : ''}`}
      onClick={() => onSelect(doctor)}
      disabled={!!loggingIn}
    >
      <div className="ds-today-avatar">{initials(doctor.full_name)}</div>
      <div className="ds-today-info">
        <div className="ds-today-name">{doctor.full_name}</div>
        <div className="ds-today-dept">{doctor.department_name}{doctor.hospital_name ? ` · ${doctor.hospital_name}` : ''}</div>
        <div className="ds-today-meta">
          <span className="ds-today-badge">● {doctor.appointments_today} appt{doctor.appointments_today !== 1 ? 's' : ''} today</span>
          {doctor.consultation_fee && <span className="ds-today-fee">₹{doctor.consultation_fee}</span>}
        </div>
      </div>
      <span className="ds-today-arrow">›</span>
      {busy && <div className="ds-card-spinner" />}
    </button>
  );
};

const DoctorCard = ({ doctor, onSelect, loggingIn, initials, showTodayBadge }) => {
  const busy = loggingIn === (doctor.user_id || doctor.id);
  return (
    <button
      className={`ds-card${busy ? ' loading' : ''}`}
      onClick={() => onSelect(doctor)}
      disabled={!!loggingIn}
    >
      <div className="ds-avatar">{initials(doctor.full_name)}</div>
      <div className="ds-card-info">
        <div className="ds-card-name">{doctor.full_name}</div>
        <div className="ds-card-dept">{doctor.department_name}</div>
        {showTodayBadge && (
          <div className="ds-today-badge">● {doctor.appointments_today} appt{doctor.appointments_today !== 1 ? 's' : ''} today</div>
        )}
        {doctor.consultation_fee && (
          <div className="ds-card-fee">₹{doctor.consultation_fee}</div>
        )}
      </div>
      {busy && <div className="ds-card-spinner" />}
    </button>
  );
};

export default DoctorSelect;
