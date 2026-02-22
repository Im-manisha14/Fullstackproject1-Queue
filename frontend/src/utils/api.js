import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
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
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
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
    console.error('[API Error]', error.response?.status, error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // window.location.href = '/login'; // Optional: Redirect to login
    }
    return Promise.reject(error);
  }
);

// Helper: ensure data is always an array, handles nested keys
const ensureArray = (data, ...keys) => {
  if (Array.isArray(data)) return data;
  // Try common nested keys like { doctors: [...] }, { appointments: [...] }, etc.
  for (const key of keys) {
    if (data && Array.isArray(data[key])) return data[key];
  }
  // Fallback - check any array-valued key
  if (data && typeof data === 'object') {
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) return val;
    }
  }
  console.warn('[API] Expected array but got:', data);
  return [];
};

// Authentication APIs
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  getProfile: () => Promise.resolve({ data: JSON.parse(localStorage.getItem('user') || '{}') }),
};

// Patient APIs
export const patientAPI = {
  getDepartments: () => api.get('/api/departments'),
  getDoctors: (departmentId) => api.get(`/api/doctors${departmentId ? `?department_id=${departmentId}` : ''}`),
  bookAppointment: (data) => api.post('/api/appointments', data),
  getAppointments: () => api.get('/api/patient/appointments'),
  getQueueStatus: (appointmentId) => api.get(`/api/patient/queue-status/${appointmentId}`),
  getPrescriptions: () => api.get('/api/patient/prescriptions'),
};

// Doctor APIs
export const doctorAPI = {
  getProfile: () => api.get('/api/doctor/profile'),
  updateProfile: (data) => api.put('/api/doctor/profile', data),
  getQueue: (id) => api.get(`/api/queue/${id}`),
  callNext: () => api.post('/api/queue/next'),
  getDailySummary: (date) => api.get(`/api/doctor/daily-summary?date=${date}`),
  createPrescription: (data) => api.post('/api/prescriptions', data),
  // Add method to update appointment status (for completing consultation)
  updateAppointmentStatus: (id, status) => api.put(`/api/appointments/${id}`, { status }),
};

// Pharmacy APIs
export const pharmacyAPI = {
  getPrescriptions: (status) => api.get(`/api/pharmacy/prescriptions?status=${status || 'all'}`),
  updatePrescriptionStatus: (id, data) => api.put(`/api/pharmacy/prescriptions/${id}/status`, data),
  getMedicines: () => api.get('/api/pharmacy/medicines'),
  getLowStock: () => api.get('/api/pharmacy/low-stock'),
  getStats: () => api.get('/api/stats'),
};

// Utility APIs
export const utilAPI = {
  getStats: () => api.get('/api/stats'),
};

// Export the helper
export { ensureArray };

export default api;