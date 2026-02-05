import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(formData);
    
    if (result.success) {
      // Navigation will be handled automatically by App.js
    } else {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="hospital-login-page">
      {/* Top Header with HOSPITAL LOGIN */}
      <div className="hospital-top-header">
        <div className="hospital-title-section">
          <h1 className="main-hospital-title">HOSPITAL</h1>
          <span className="main-login-subtitle">LOGIN</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="hospital-content-wrapper">
        <div className="hospital-inner-container">
          
          {/* Left Side - White Login Form */}
          <div className="hospital-left-section">
            <div className="login-form-card">
              
              {/* Hospital Branding */}
              <div className="form-header">
                <h2 className="form-hospital-title">HOSPITAL</h2>
                <p className="form-subtitle">Management System</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="login-form">
                <div className="input-group">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Username"
                    required
                  />
                </div>

                <div className="input-group">
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="login-submit-btn"
                >
                  {isLoading ? (
                    <div className="login-loading">
                      <div className="login-spinner"></div>
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    'Login'
                  )}
                </button>
              </form>

              {/* Footer Links */}
              <div className="form-footer">
                <button type="button" className="form-link">Forgot Password?</button>
                <span className="form-divider">|</span>
                <Link to="/register" className="form-link">Register</Link>
              </div>
            </div>
          </div>

          {/* Right Side - Clean Medical Area */}
          <div className="hospital-right-section">
            {/* Hospital Badge */}
            <div className="floating-hospital-badge">
              <span className="badge-label">HOSPITAL</span>
            </div>

            {/* Professional Healthcare Quotes */}
            <div className="healthcare-quotes-section">
              <div className="quote-item">
                <h3 className="quote-title">Skip the Wait</h3>
                <p className="quote-text">Experience healthcare without the queues. Book, arrive, and get treated instantly.</p>
              </div>
              
              <div className="quote-item">
                <h3 className="quote-title">Smart Scheduling</h3>
                <p className="quote-text">Advanced appointment management that respects your time and optimizes your care.</p>
              </div>
              
              <div className="quote-item">
                <h3 className="quote-title">Patient-Centered Care</h3>
                <p className="quote-text">"Healthcare should be about healing, not waiting. Our queue-free system puts patients first."</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;