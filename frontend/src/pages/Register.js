import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    role: 'patient'
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    console.log('Registration data being sent:', formData);
    setIsLoading(true);

    const { confirmPassword, ...registrationData } = formData;
    console.log('Filtered registration data:', registrationData);
    const result = await register(registrationData);
    
    if (!result.success) {
      console.error('Registration failed:', result.error);
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
      // Automatically sync username with email
      ...(name === 'email' && { username: value })
    });
  };

  const roles = [
    { value: 'patient', label: 'PATIENT', description: 'Book appointments and track queue status' },
    { value: 'doctor', label: 'DOCTOR', description: 'Manage consultations and create prescriptions' },
    { value: 'pharmacy', label: 'PHARMACY', description: 'Handle prescriptions and manage inventory' }
  ];

  return (
    <div className="hospital-login-page">
      <div className="hospital-content-wrapper">
        <div className="hospital-inner-container">
          {/* Left Side - Registration Form */}
          <div className="hospital-left-section register-section">
            <div className="login-form-card register-card">
              {/* Header */}
              <div className="form-header register-header">
                <h2 className="register-title">Create Your Account</h2>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="register-form">
                {/* Form Fields */}
                <div className="form-fields">
                  {/* Row 1: Name */}
                  <div className="input-group">
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Full Name"
                      required
                    />
                  </div>

                  {/* Row 2: Email */}
                  <div className="input-group">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Email Address"
                      required
                    />
                  </div>

                  {/* Row 3: Mobile Number */}
                  <div className="input-group">
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Mobile Number"
                      required
                    />
                  </div>

                  {/* Row 4: Username (hidden) */}
                  <input
                    type="hidden"
                    name="username"
                    value={formData.username || formData.email}
                    onChange={handleChange}
                  />

                  {/* Row 5: Password Fields */}
                  <div className="form-row">
                    <div className="input-group half">
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
                    <div className="input-group half">
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Confirm Password"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Role Selection */}
                <div className="account-type-section">
                  <h3 className="section-title">Role</h3>
                  <div className="role-cards-container">
                    {roles.map((role) => {
                      return (
                        <div
                          key={role.value}
                          className={`role-card ${formData.role === role.value ? 'selected' : ''}`}
                          onClick={() => setFormData({ ...formData, role: role.value })}
                        >
                          <span className="role-label">{role.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="register-submit-btn"
                >
                  {isLoading ? (
                    <div className="login-loading">
                      <div className="login-spinner"></div>
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    'CREATE ACCOUNT'
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="form-footer">
                <span>Already have an account?</span>
                <Link to="/login" className="form-link">Login here</Link>
              </div>
            </div>
          </div>

          {/* Right Side - Professional Healthcare Management */}
          <div className="hospital-right-section register-right">
            {/* Hospital Badge */}
            <div className="floating-hospital-badge register-badge">
              <span className="badge-label">HOSPITAL</span>
            </div>

            {/* Professional Healthcare Text */}
            <div className="healthcare-text-section">
              <h2 className="healthcare-title">PROFESSIONAL</h2>
              <h2 className="healthcare-title">HEALTHCARE</h2>
              <h2 className="healthcare-title">MANAGEMENT</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;