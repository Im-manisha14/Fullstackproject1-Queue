import React, { useState, useEffect } from 'react';
import { authAPI, TokenManager } from '../utils/api';
import { Building2, Zap, Shield, BarChart3, User } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState('patient');
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  const demoAccounts = {
    patient: { username: 'patient1', password: 'password' },
    doctor: { username: 'doctor1', password: 'password' },
    pharmacy: { username: 'pharmacy1', password: 'password' }
  };

  useEffect(() => {
    // Check if user was redirected due to session expiry
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
      setSessionExpired(true);
      setError('Your session has expired. Please log in again.');
    }
    
    // Clear any existing tokens
    TokenManager.removeToken();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSessionExpired(false);

    try {
      const response = await authAPI.login(formData);
      
      // Handle new consistent API response format
      const { success, data, message } = response;
      
      if (success && data) {
        const { access_token, user } = data;
        
        // Store authentication data
        TokenManager.setToken(access_token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userRole', user.role);
        
        // Call parent login handler
        onLogin(user, access_token);
      } else {
        throw new Error(message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role) => {
    const demoAccount = demoAccounts[role];
    setFormData(demoAccount);
    setActiveTab(role);
    setError('');
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="hospital-icon"><Building2 size={24} /></div>
          <h1>Hospital Information System</h1>
          <p>Streamlined Healthcare Management</p>
        </div>

        {/* Features */}
        <div className="features">
          <div className="feature">
            <span className="feature-icon"><Zap size={20} /></span>
            <div>
              <h3>Queue-Free Experience</h3>
              <p>Skip the wait with real-time appointment management</p>
            </div>
          </div>
          
          <div className="feature">
            <span className="feature-icon"><Shield size={20} /></span>
            <div>
              <h3>Digital Prescriptions</h3>
              <p>Seamless prescription workflow to pharmacy</p>
            </div>
          </div>
          
          <div className="feature">
            <span className="feature-icon"><BarChart3 size={20} /></span>
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
              <label><User size={16} style={{ marginRight: '8px', display: 'inline' }} /> Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                placeholder="Enter your username"
              />
            </div>

            <div className="form-group">
              <label>� Password</label>
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