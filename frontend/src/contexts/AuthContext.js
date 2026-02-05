import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Create the context
const AuthContext = createContext();

// Custom hook to use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any existing token to force login
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await api.post('/api/auth/login', credentials);

      console.log('Login response:', response);
      console.log('Response data:', response.data);

      // Check if response has the expected structure
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format from server');
      }

      const { access_token, user: userData } = response.data.data;

      if (!access_token || !userData) {
        throw new Error('Missing access token or user data');
      }

      console.log('User data:', userData);
      console.log('User role:', userData.role);

      // Store token and set user
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);

      toast.success(`Welcome back, ${userData.full_name}!`);

      // Role-based routing
      console.log('Navigating based on role:', userData.role);
      switch (userData.role) {
        case 'patient':
          navigate('/dashboard/patient');
          break;
        case 'doctor':
          navigate('/dashboard/doctor');
          break;
        case 'pharmacy':
          navigate('/dashboard/pharmacy');
          break;
        default:
          navigate('/dashboard');
          break;
      }

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Login failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      await api.post('/api/auth/register', userData);
      toast.success('Registration successful! Please log in.');
      navigate('/login');
      return { success: true, message: 'Registration successful! Please log in.' };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isPatient: user?.role === 'patient',
    isDoctor: user?.role === 'doctor',
    isPharmacy: user?.role === 'pharmacy'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the context as well for compatibility
export { AuthContext };