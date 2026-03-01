import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    full_name: '', phone: '', role: 'patient'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    setIsLoading(true);
    const { confirmPassword, ...registrationData } = formData;
    const result = await register(registrationData);
    if (result.success) {
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/'), 1500);
    } else {
      setError(result.error || 'Registration failed');
      setIsLoading(false);
    }
  };

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); setError(''); };

  const roles = [
    { value: 'patient', label: 'Patient', icon: 'P' },
    { value: 'doctor', label: 'Doctor', icon: 'D' },
    { value: 'pharmacy', label: 'Pharmacy', icon: 'Rx' },
  ];

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <h1>Create Account</h1>
          <p>Join the Queue-Free Healthcare System</p>
        </div>
        <div className="register-body">
          {error && <div className="alert alert-error"><span className="alert-icon">!</span> {error}</div>}
          {success && <div className="alert alert-success"><span className="alert-icon">v</span> {success}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Account Type</label>
              <div className="role-selector">
                {roles.map((r) => (
                  <span key={r.value}>
                    <input type="radio" id={
ole_ + r.value} name="role" value={r.value}
                      className="role-option" checked={formData.role === r.value} onChange={handleChange} />
                    <label htmlFor={
ole_ + r.value} className="role-label">
                      <span className="role-icon">{r.icon}</span>{r.label}
                    </label>
                  </span>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="full_name">Full Name</label>
                <input id="full_name" type="text" name="full_name" className="form-control"
                  placeholder="John Doe" value={formData.full_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input id="username" type="text" name="username" className="form-control"
                  placeholder="johndoe" value={formData.username} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input id="email" type="email" name="email" className="form-control"
                placeholder="john@example.com" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone (optional)</label>
              <input id="phone" type="tel" name="phone" className="form-control"
                placeholder="+1234567890" value={formData.phone} onChange={handleChange} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <input id="password" type={showPassword ? 'text' : 'password'} name="password"
                    className="form-control" placeholder="Min 8 chars" value={formData.password}
                    onChange={handleChange} required />
                  <button type="button" className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input id="confirmPassword" type="password" name="confirmPassword" className="form-control"
                  placeholder="Repeat password" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          <p style={{textAlign:'center',marginTop:'12px',fontSize:'13px',color:'#6b7280'}}>
            Already have an account? <Link to="/">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
