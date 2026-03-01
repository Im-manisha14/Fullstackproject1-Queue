import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './DoctorSelect.css';

const DoctorSelect = () => {
  const [doctors, setDoctors] = useState([]);
  const [grouped, setGrouped] = useState({});
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
        const list = Array.isArray(res.data) ? res.data : (res.data?.doctors || []);
        setDoctors(list);

        // Group by hospital
        const grp = {};
        list.forEach(d => {
          const hosp = d.hospital_name || 'Other';
          if (!grp[hosp]) grp[hosp] = [];
          grp[hosp].push(d);
        });
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
          <div className="ds-logo"></div>
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
        <input
          className="ds-search"
          type="text"
          placeholder="Search doctor name, department or hospital..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {error && <div className="ds-error">{error}</div>}

      {loading ? (
        <div className="ds-loading">Loading doctors...</div>
      ) : filtered !== null ? (
        /* Search results */
        <div className="ds-section">
          <div className="ds-section-title">Search Results ({filtered.length})</div>
          <div className="ds-grid">
            {filtered.map(d => <DoctorCard key={d.user_id || d.id} doctor={d} onSelect={handleSelect} loggingIn={loggingIn} initials={initials} />)}
          </div>
          {filtered.length === 0 && <div className="ds-empty">No doctors found</div>}
        </div>
      ) : (
        /* Grouped by hospital */
        Object.entries(grouped).map(([hospital, docs]) => (
          <div className="ds-section" key={hospital}>
            <div className="ds-section-title">{hospital} <span className="ds-count">{docs.length} doctors</span></div>
            <div className="ds-grid">
              {docs.map(d => (
                <DoctorCard key={d.user_id || d.id} doctor={d} onSelect={handleSelect} loggingIn={loggingIn} initials={initials} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const DoctorCard = ({ doctor, onSelect, loggingIn, initials }) => {
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
        {doctor.consultation_fee && (
          <div className="ds-card-fee">₹{doctor.consultation_fee}</div>
        )}
      </div>
      {busy && <div className="ds-card-spinner" />}
    </button>
  );
};

export default DoctorSelect;
