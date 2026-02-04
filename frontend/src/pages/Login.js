import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
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

  // Demo credentials for testing
  const demoCredentials = [
    { role: 'Patient', username: 'patient_demo', password: 'demo123' },
    { role: 'Doctor', username: 'doctor_demo', password: 'demo123' },
    { role: 'Pharmacy', username: 'pharmacy_demo', password: 'demo123' }
  ];

  const fillDemoCredentials = (username, password) => {
    setFormData({ username, password });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Medical Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 to-teal-800 items-center justify-center p-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600/90 to-teal-800/90"></div>
        <div className="max-w-md text-white relative z-10">
          <div className="flex items-center mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mr-4 backdrop-blur-sm border border-white/30">
              <i className="fas fa-hospital-user text-2xl"></i>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Hospital Information System</h1>
              <p className="text-teal-200">Streamlined Healthcare Management</p>
            </div>
          </div>
          
          <div className="space-y-6 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center mr-4 mt-1">
                <i className="fas fa-stethoscope text-white"></i>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Queue-Free Experience</h3>
                <p className="text-teal-200">Skip the wait with real-time appointment management</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center mr-4 mt-1">
                <i className="fas fa-prescription text-white"></i>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Digital Prescriptions</h3>
                <p className="text-teal-200">Seamless prescription workflow to pharmacy</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center mr-4 mt-1">
                <i className="fas fa-clock text-white"></i>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Real-time Updates</h3>
                <p className="text-teal-200">Live status updates for all appointments</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-hospital-user text-white text-xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-teal-600">Hospital Information System</h1>
            </div>
            <p className="text-gray-600">Streamlined Healthcare Management</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Hospital Information System</h2>
            <p className="text-gray-600 mb-8">Access your secure medical dashboard</p>

            {/* Demo Credentials */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-3">Demo Accounts:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {demoCredentials.map((demo, index) => (
                  <button
                    key={index}
                    onClick={() => fillDemoCredentials(demo.username, demo.password)}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-md transition-colors"
                  >
                    {demo.role}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="form-label">
                  <User className="w-4 h-4 inline mr-2" />
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="loading-spinner mr-2"></div>
                ) : null}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-teal-600 hover:text-teal-700 font-semibold">
                  Sign up here
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-gray-500">
            <p>© 2026 Hospital Information System. Streamlined healthcare management.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;