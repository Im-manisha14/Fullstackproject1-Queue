import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001',
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
    // Only log non-polling requests to keep console clean
    const isPolling = config.url?.includes('/api/doctor/queue') || config.url?.includes('/api/doctor/daily-summary');
    if (!isPolling) {
      console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
let _loggingOut = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isNetworkError = !error.response;
    if (!isNetworkError) {
      // Suppress noise for polling endpoints
      const isPolling = error.config?.url?.includes('/queue-status') || error.config?.url?.includes('/api/doctor/queue');
      if (!isPolling) {
        console.error('[API Error]', error.response?.status, error.message);
      }
    }

    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Only force-logout for actual auth endpoints, not data polling
      const isAuthEndpoint = url.includes('/api/patient/') || url.includes('/api/doctor/') || url.includes('/api/pharmacy/');
      const isPublicEndpoint = url.includes('/api/hospitals') || url.includes('/api/departments') || url.includes('/api/doctors');

      if (isAuthEndpoint && !isPublicEndpoint && !_loggingOut) {
        const token = localStorage.getItem('token');
        // Only logout if no token at all, or if this is a login/profile endpoint
        if (!token || url.includes('/api/auth/login') || url.includes('/api/auth/profile')) {
          _loggingOut = true;
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/' && window.location.pathname !== '/register') {
            setTimeout(() => {
              _loggingOut = false;
              window.location.href = '/';
            }, 1000);
          } else {
            _loggingOut = false;
          }
        }
      }
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
  getProfile: () => api.get('/api/auth/profile'),
  validateToken: () => api.get('/api/auth/validate'),
};

// Patient APIs
export const patientAPI = {
  getHospitals: () => api.get('/api/hospitals'),
  getDepartments: (hospitalId) => api.get(`/api/departments${hospitalId ? `?hospital_id=${hospitalId}` : ''}`),
  getDoctors: (departmentId) => api.get(`/api/doctors${departmentId ? `?department_id=${departmentId}` : ''}`),
  bookAppointment: (data) => api.post('/api/patient/book-appointment', data),
  getAppointments: () => api.get('/api/patient/appointments'),
  getQueueStatus: (appointmentId) => api.get(`/api/patient/queue-status/${appointmentId}`),
  getPrescriptions: () => api.get('/api/patient/prescriptions'),
};

// Doctor APIs
export const doctorAPI = {
  getProfile: () => api.get('/api/doctor/profile'),
  updateProfile: (data) => api.post('/api/doctor/profile', data),
  getQueue: () => api.get('/api/doctor/queue'),                                          // uses JWT — no user.id needed
  callNext: () => api.post('/api/doctor/call-next'),                                     // uses the correct doctor endpoint
  completeConsultation: (data) => api.post('/api/doctor/complete-consultation', data),   // handles prescription + status in one call
  createPrescription: (data) => api.post('/api/prescriptions', data),                    // standalone prescription creation
  getDailySummary: (date) => api.get(`/api/doctor/daily-summary?date=${date || new Date().toISOString().slice(0,10)}`),
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