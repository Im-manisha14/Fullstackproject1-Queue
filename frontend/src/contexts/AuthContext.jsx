import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { authAPI } from '../utils/api';

// Create the context
const AuthContext = createContext();

// Custom hook to use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Verify token is still valid
        fetchProfile();
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        logout();
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      
      const response = await authAPI.getProfile();
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // Only logout if it's specifically an auth failure (401)
      // Other errors might be network issues that should not clear auth
      if (error.response?.status === 401) {
        console.warn('Token expired or invalid, logging out');
        logout();
      } else {
        // For other errors, just use the stored user data
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (parseError) {
            console.error('Error parsing stored user:', parseError);
            logout();
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authAPI.login(credentials);
      const { access_token, user: userData } = response.data;

      // Store token and set user
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Login failed. Please check your credentials.';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.register(userData);
      return { success: true, message: 'Registration successful! Please log in.' };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
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