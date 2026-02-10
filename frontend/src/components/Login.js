import React, { useState } from 'react';

const API_BASE = 'http://localhost:5000/api';

const Login = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState('patient');
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts = {
    patient: { username: 'patient1', password: 'password' },
    doctor: { username: 'doctor1', password: 'password' },
    pharmacy: { username: 'pharmacy1', password: 'password' }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.user, data.access_token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role) => {
    const demoAccount = demoAccounts[role];
    setFormData(demoAccount);
    setActiveTab(role);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="hospital-icon">🏥</div>
          <h1>Hospital Information System</h1>
          <p>Streamlined Healthcare Management</p>
        </div>

        {/* Features */}
        <div className="features">
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <div>
              <h3>Queue-Free Experience</h3>
              <p>Skip the wait with real-time appointment management</p>
            </div>
          </div>
          
          <div className="feature">
            <span className="feature-icon">💊</span>
            <div>
              <h3>Digital Prescriptions</h3>
              <p>Seamless prescription workflow to pharmacy</p>
            </div>
          </div>
          
          <div className="feature">
            <span className="feature-icon">🔄</span>
            <div>
              <h3>Real-time Updates</h3>
              <p>Live status updates for all appointments</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="login-form-section">
          <h2>Hospital Information System</h2>
          <p>Access your secure medical dashboard</p>

          {/* Demo Account Tabs */}
          <div className="demo-tabs">
            <h3>Demo Accounts:</h3>
            <div className="tabs">
              {Object.keys(demoAccounts).map(role => (
                <button
                  key={role}
                  className={`tab ${activeTab === role ? 'active' : ''}`}
                  onClick={() => handleDemoLogin(role)}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>👤 Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                placeholder="Enter your username"
              />
            </div>

            <div className="form-group">
              <label>🔒 Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;