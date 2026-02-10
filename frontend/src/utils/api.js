import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  getProfile: () => api.get('/api/auth/profile'),
};

// Patient APIs
export const patientAPI = {
  getDepartments: () => api.get('/api/patient/departments'),
  getDoctors: (departmentId) => api.get(`/api/patient/doctors${departmentId ? `?department_id=${departmentId}` : ''}`),
  bookAppointment: (data) => api.post('/api/patient/book-appointment', data),
  getAppointments: () => api.get('/api/patient/appointments'),
  getQueueStatus: (appointmentId) => api.get(`/api/patient/queue-status/${appointmentId}`),
  getPrescriptions: () => api.get('/api/patient/prescriptions'),
};

// Doctor APIs
export const doctorAPI = {
  getProfile: () => api.get('/api/doctor/profile'),
  updateProfile: (data) => api.post('/api/doctor/profile', data),
  getAppointments: (date) => api.get(`/api/doctor/appointments${date ? `?date=${date}` : ''}`),
  getQueue: (date) => api.get(`/api/doctor/queue${date ? `?date=${date}` : ''}`),
  callNext: () => api.post('/api/doctor/call-next'),
  completeConsultation: (data) => api.post('/api/doctor/complete-consultation', data),
  getDailySummary: (date) => api.get(`/api/doctor/daily-summary${date ? `?date=${date}` : ''}`),
};

// Pharmacy APIs
export const pharmacyAPI = {
  getPrescriptions: (status) => api.get(`/api/pharmacy/prescriptions${status ? `?status=${status}` : ''}`),
  updatePrescriptionStatus: (prescriptionId, data) => 
    api.put(`/api/pharmacy/prescription/${prescriptionId}/update-status`, data),
  getMedicines: () => api.get('/api/pharmacy/medicines'),
  addMedicine: (data) => api.post('/api/pharmacy/medicines', data),
  getLowStock: () => api.get('/api/pharmacy/low-stock'),
};

// Utility APIs
export const utilAPI = {
  initializeDB: () => api.post('/api/initialize-db'),
  getStats: () => api.get('/api/stats'),
};

export default api;