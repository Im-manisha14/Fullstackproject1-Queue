import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, UserCircle, Lock, Stethoscope, Heart, Pill } from 'lucide-react';
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

  const demoCredentials = [
    { role: 'Patient', username: 'patient1', password: 'password', icon: UserCircle, color: 'bg-blue-500' },
    { role: 'Doctor', username: 'doctor1', password: 'password', icon: Stethoscope, color: 'bg-green-500' },
    { role: 'Pharmacy', username: 'pharmacy1', password: 'password', icon: Pill, color: 'bg-purple-500' }
  ];

  const fillDemoCredentials = (username, password) => {
    setFormData({ username, password });
    toast.success('Demo credentials loaded');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="flex flex-col lg:flex-row min-h-[700px]">
          
          {/* Left Side - Branding */}
          <div className="lg:w-1/2 bg-gradient-to-br from-teal-600 via-blue-600 to-cyan-700 p-10 flex flex-col justify-center text-white relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-white opacity-5 rounded-full -translate-y-36 translate-x-36"></div>
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-white opacity-5 rounded-full translate-y-28 -translate-x-28"></div>
            <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white opacity-3 rounded-full -translate-x-16 -translate-y-16"></div>
            
            <div className="relative z-10">
              <div className="flex items-center mb-10">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mr-4 backdrop-blur-sm">
                  <Heart className="h-10 w-10" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">MediCare</h1>
                  <p className="text-cyan-100 text-lg font-medium">Digital Healthcare Platform</p>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="w-14 h-14 bg-white bg-opacity-15 rounded-xl flex items-center justify-center mr-5 backdrop-blur-sm">
                    <span className="text-3xl">⚡</span>
                  </div>
                  <div className="pt-2">
                    <h3 className="font-semibold text-xl mb-1">Zero Wait Time</h3>
                    <p className="text-cyan-100 leading-relaxed">Advanced queue management with real-time notifications and token-based appointments</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-14 h-14 bg-white bg-opacity-15 rounded-xl flex items-center justify-center mr-5 backdrop-blur-sm">
                    <span className="text-3xl">🛡️</span>
                  </div>
                  <div className="pt-2">
                    <h3 className="font-semibold text-xl mb-1">HIPAA Compliant</h3>
                    <p className="text-cyan-100 leading-relaxed">Enterprise-grade security with encrypted data and role-based access control</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-14 h-14 bg-white bg-opacity-15 rounded-xl flex items-center justify-center mr-5 backdrop-blur-sm">
                    <span className="text-3xl">📊</span>
                  </div>
                  <div className="pt-2">
                    <h3 className="font-semibold text-xl mb-1">Complete Workflow</h3>
                    <p className="text-cyan-100 leading-relaxed">Seamless integration from appointment to prescription with digital workflows</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white border-opacity-20">
                <p className="text-cyan-100 text-sm">
                  Trusted by healthcare professionals worldwide
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="lg:w-1/2 p-10 flex flex-col justify-center bg-gradient-to-br from-white to-gray-50">
            <div className="max-w-md mx-auto w-full">
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Stethoscope className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-3">Welcome Back</h2>
                <p className="text-gray-600 text-lg">Access your healthcare dashboard</p>
              </div>

              {/* Demo Account Buttons */}
              <div className="mb-8">
                <p className="text-sm font-medium text-gray-700 mb-4">Quick Demo Access:</p>
                <div className="grid grid-cols-3 gap-3">
                  {demoCredentials.map((demo) => {
                    const Icon = demo.icon;
                    return (
                      <button
                        key={demo.role}
                        onClick={() => fillDemoCredentials(demo.username, demo.password)}
                        className={`${demo.color} text-white p-4 rounded-xl hover:scale-105 transition-all duration-200 shadow-lg flex flex-col items-center text-sm font-medium`}
                      >
                        <Icon className="h-6 w-6 mb-2" />
                        {demo.role}
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Username
                  </label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-gray-800 font-medium"
                      placeholder="Enter your username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-12 pr-14 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-gray-800 font-medium"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-teal-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                      Signing In...
                    </div>
                  ) : (
                    'Sign In to Dashboard'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p>Secured with 256-bit SSL encryption</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;