import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Token management utilities
const TokenManager = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  removeToken: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
  },
  getUserData: () => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },
  getUserRole: () => localStorage.getItem('userRole'),
  isAuthenticated: () => {
    const token = TokenManager.getToken();
    if (!token) return false;
    
    try {
      // Basic token format validation
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }
};

// Request interceptor to add auth token and handle common headers
api.interceptors.request.use(
  (config) => {
    const token = TokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for debugging
    config.headers['X-Request-Time'] = new Date().toISOString();
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for comprehensive error handling
api.interceptors.response.use(
  (response) => {
    // Handle consistent API response format
    if (response.data && typeof response.data === 'object') {
      // If API uses {success, message, data} format
      if ('success' in response.data) {
        if (!response.data.success) {
          throw new Error(response.data.message || 'API request failed');
        }
        return response;
      }
    }
    return response;
  },
  (error) => {
    const { response, request, message } = error;
    
    // Network error (no response)
    if (!response && request) {
      console.error('Network error:', message);
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Server responded with error status
    if (response) {
      const { status, data } = response;
      
      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          console.warn('Authentication failed - redirecting to login');
          TokenManager.removeToken();
          
          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login?expired=true';
          }
          
          throw new Error('Your session has expired. Please log in again.');
          
        case 403:
          // Forbidden - insufficient permissions
          console.error('Access denied:', data);
          throw new Error(data?.message || 'You do not have permission to perform this action.');
          
        case 404:
          console.error('Resource not found:', data);
          throw new Error(data?.message || 'The requested resource was not found.');
          
        case 409:
          // Conflict - duplicate data or business logic violation
          console.error('Conflict error:', data);
          throw new Error(data?.message || 'A conflict occurred. Please check your data and try again.');
          
        case 422:
          // Validation error
          console.error('Validation error:', data);
          throw new Error(data?.message || 'Please check your input and try again.');
          
        case 429:
          // Rate limiting
          console.error('Rate limited:', data);
          throw new Error('Too many requests. Please wait a moment and try again.');
          
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          console.error('Server error:', status, data);
          throw new Error('Server error. Please try again later or contact support.');
          
        default:
          console.error('Unknown error:', status, data);
          const errorMessage = data?.message || data?.error || 'An unexpected error occurred.';
          throw new Error(errorMessage);
      }
    }
    
    // Fallback error
    throw new Error(message || 'An unexpected error occurred.');
  }
);

// Enhanced API methods with better error handling
const handleApiCall = async (apiCall) => {
  try {
    const response = await apiCall;
    return response.data;
  } catch (error) {
    console.error('API call failed:', error.message);
    throw error;
  }
};

// Authentication APIs
export const authAPI = {
  login: (credentials) => handleApiCall(api.post('/api/auth/login', credentials)),
  register: (userData) => handleApiCall(api.post('/api/auth/register', userData)),
  logout: () => handleApiCall(api.post('/api/auth/logout')),
  getProfile: () => handleApiCall(api.get('/api/auth/profile')),
  verifyToken: () => handleApiCall(api.get('/api/auth/verify')),
};

// Export token manager and auth API
export { TokenManager };

// Patient APIs
export const patientAPI = {
  getProfile: () => handleApiCall(api.get('/api/auth/profile')),
  verifyToken: () => handleApiCall(api.get('/api/auth/verify')),
  getQueueStatus: (appointmentId) => handleApiCall(api.get(`/api/patient/queue-status/${appointmentId}`)),
  getPrescriptions: () => handleApiCall(api.get('/api/patient/prescriptions')),
  getDepartments: () => handleApiCall(api.get('/api/patient/departments')),
  getDoctors: (departmentId = '') => handleApiCall(api.get(`/api/patient/doctors${departmentId ? `?department_id=${departmentId}` : ''}`)),
  bookAppointment: (appointmentData) => handleApiCall(api.post('/api/patient/book-appointment', appointmentData)),
  getAppointments: () => handleApiCall(api.get('/api/patient/appointments')),
  cancelAppointment: (appointmentId) => handleApiCall(api.post(`/api/appointments/${appointmentId}/cancel`)),
};

// Doctor APIs
export const doctorAPI = {
  getProfile: () => handleApiCall(api.get('/api/doctor/profile')),
  updateProfile: (data) => handleApiCall(api.post('/api/doctor/profile', data)),
  getAppointments: (date) => handleApiCall(api.get(`/api/doctor/appointments${date ? `?date=${date}` : ''}`)),
  getQueue: (date) => handleApiCall(api.get(`/api/doctor/queue${date ? `?date=${date}` : ''}`)),
  callNext: () => handleApiCall(api.post('/api/doctor/call-next')),
  completeConsultation: (data) => handleApiCall(api.post('/api/doctor/complete-consultation', data)),
  getDailySummary: (date) => handleApiCall(api.get(`/api/doctor/daily-summary${date ? `?date=${date}` : ''}`)),
};

// Pharmacy APIs
export const pharmacyAPI = {
  getPrescriptions: (status) => handleApiCall(api.get(`/api/pharmacy/prescriptions${status ? `?status=${status}` : ''}`)),
  updatePrescriptionStatus: (prescriptionId, data) => 
    handleApiCall(api.put(`/api/pharmacy/prescription/${prescriptionId}/update-status`, data)),
  getMedicines: () => handleApiCall(api.get('/api/pharmacy/medicines')),
  addMedicine: (data) => handleApiCall(api.post('/api/pharmacy/medicines', data)),
  getLowStock: () => handleApiCall(api.get('/api/pharmacy/low-stock')),
};

// Utility APIs
export const utilAPI = {
  initializeDB: () => handleApiCall(api.post('/api/initialize-db')),
  getStats: () => handleApiCall(api.get('/api/stats')),
};

// Default export - main api instance
export default api;