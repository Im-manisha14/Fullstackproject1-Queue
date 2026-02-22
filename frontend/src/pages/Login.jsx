import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import Button from '../components/common/Button';
import InputField from '../components/common/InputField';
import Card from '../components/common/Card';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(formData);
    // Stop local loading spinner and navigate on success
    setIsLoading(false);

    if (result.success) {
      const userRole = result.user?.role;
      if (userRole === 'patient') navigate('/patient/dashboard');
      else if (userRole === 'doctor') navigate('/doctor/dashboard');
      else if (userRole === 'pharmacy') navigate('/pharmacy/dashboard');
      else navigate('/');
      return;
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Demo credentials for quick testing - keys match backend seed_db.py
  const demoCredentials = [
    { role: 'Patient', email: 'patient@example.com', password: 'password' },
    { role: 'Doctor', email: 'doctor@example.com', password: 'password' },
    { role: 'Pharmacy', email: 'pharmacy@example.com', password: 'password' }
  ];

  const fillDemoCredentials = (email, password) => {
    setFormData({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="p-10 shadow-xl border-t-4 border-t-teal-600">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                <i className="fas fa-hospital-user text-white text-3xl"></i>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome Back</h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to the Hospital Information System
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-100">
            <h4 className="font-semibold text-teal-800 mb-3 text-xs uppercase tracking-wider text-center">Quick Login (Demo)</h4>
            <div className="grid grid-cols-3 gap-2">
              {demoCredentials.map((demo, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => fillDemoCredentials(demo.email, demo.password)}
                  className="flex flex-col items-center justify-center p-2 rounded hover:bg-teal-100 transition-colors duration-150"
                >
                  <span className="text-xs font-medium text-teal-700">{demo.role}</span>
                </button>
              ))}
            </div>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <InputField
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                icon={User}
                required
                className="transition-all duration-200 focus-within:transform focus-within:-translate-y-1"
              />

              <div className="relative">
                <InputField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  icon={Lock}
                  required
                  className="transition-all duration-200 focus-within:transform focus-within:-translate-y-1"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-gray-400 hover:text-teal-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
                isLoading={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-teal-600 hover:text-teal-500 hover:underline transition-all">
                Register here
              </Link>
            </p>
          </div>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500 opacity-75">
            © 2026 Hospital Information System. Secure & Encrypted.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
