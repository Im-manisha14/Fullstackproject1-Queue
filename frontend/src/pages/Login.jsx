import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(formData);
    setIsLoading(false);

    if (result.success) {
      const role = result.user?.role;
      if (role === 'patient') navigate('/patient/dashboard');
      else if (role === 'doctor') navigate('/doctor/dashboard');
      else if (role === 'pharmacy') navigate('/pharmacy/dashboard');
      else navigate('/');
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const demoAccounts = [
    { role: 'Patient', email: 'patient@test.com', password: 'password123', icon: 'P' },
    { role: 'Doctor',  email: 'doctor@example.com',  password: 'password123',  icon: 'D' },
    { role: 'Pharmacy',email: 'pharmacy@test.com',password: 'password123',icon: 'Rx' },
  ];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4 5V11C4 16.55 7.84 21.74 12 22C16.16 21.74 20 16.55 20 11V5L12 2Z" 
                    stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" 
                    strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="15.5" cy="7.5" r="1.5" fill="currentColor"/>
              <path d="M14.5 8.5L13 10" stroke="currentColor" strokeWidth="1" 
                    strokeLinecap="round"/>
            </svg>
          </div>
          <h1>Healthcare Portal</h1>
          <p>Secure Access • Queue-Free System</p>
        </div>

        <div className="auth-body">
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">!</span>
              {error}
            </div>
          )}

          {/* Demo quick-fill */}
          <div className="demo-section">
            <h4>Quick Demo Login</h4>
            <div className="demo-grid">
              {demoAccounts.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  className="demo-btn"
                  onClick={() => setFormData({ email: d.email, password: d.password })}
                >
                  <span className="demo-btn-icon">{d.icon}</span>
                  {d.role}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">@</span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">*</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? 'hide' : 'show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isLoading}
            >
              {isLoading ? (
                <><span className="loading-spinner"></span> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;