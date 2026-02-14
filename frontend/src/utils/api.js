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

// Authentication APIs
export const authAPI = {
  // Backend: POST -> /api/login
  login: (credentials) => api.post('/api/login', credentials),
  // Backend: POST -> /api/register
  register: (userData) => api.post('/api/register', userData),
  // Missing in backend, stubbing for now
  getProfile: () => Promise.resolve({ data: JSON.parse(localStorage.getItem('user') || '{}') }),
};

// Patient APIs
export const patientAPI = {
  // Missing in backend, stubbing
  getDepartments: () => Promise.resolve({
    data: [
      { id: 'Cardiology', name: 'Cardiology' },
      { id: 'Dermatology', name: 'Dermatology' },
      { id: 'General', name: 'General Medicine' }
    ]
  }),
  // Backend: @router.get("/doctors") -> /api/doctors
  getDoctors: (departmentId) => api.get('/api/doctors'), // Backend returns all doctors
  // Backend: @router.post("/appointments") -> /api/appointments
  bookAppointment: (data) => api.post('/api/appointments', data),
  // Missing in backend (get patient's appointments), checking /api/appointments might need filter?
  // Current backend has no "my appointments" endpoint. 
  getAppointments: () => Promise.resolve({ data: [] }),
  // Missing
  getQueueStatus: (appointmentId) => Promise.resolve({ data: { queue_position: 1, estimated_wait_time: 15, current_token: 1 } }),
  // Missing
  getPrescriptions: () => Promise.resolve({ data: [] }),
};

// Doctor APIs
export const doctorAPI = {
  getProfile: () => Promise.resolve({ data: {} }),
  updateProfile: (data) => Promise.resolve({ data: {} }),
  // Backend: @router.get("/queue") -> /api/queue
  getQueue: (date) => api.get('/api/queue'),
  getAppointments: (date) => api.get('/api/queue'), // Reusing queue for now
  callNext: () => Promise.resolve({ data: {} }),
  completeConsultation: (data) => Promise.resolve({ data: {} }),
  getDailySummary: (date) => Promise.resolve({ data: {} }),
};

// Pharmacy APIs
export const pharmacyAPI = {
  // Backend: @router.get("/prescriptions") -> /api/prescriptions
  getPrescriptions: (status) => api.get('/api/prescriptions'),
  // Backend: @router.put("/appointments/{id}/status") -> /api/appointments/{id}/status
  // Note: Backend updates appointment status, not prescription status specifically?
  // Checking api.py: update_status updates Appointment.status. 
  // Pharmacy probably needs to update Prescription status. 
  // Prescriptions table exists. But no endpoint to update it?
  // Stubbing for now to prevent crash.
  updatePrescriptionStatus: (prescriptionId, data) => Promise.resolve({ data: {} }),
  getMedicines: () => Promise.resolve({ data: [] }),
  addMedicine: (data) => Promise.resolve({ data: {} }),
  getLowStock: () => Promise.resolve({ data: [] }),
};

// Utility APIs
export const utilAPI = {
  initializeDB: () => Promise.resolve({ data: {} }),
  getStats: () => Promise.resolve({ data: {} }),
};

export default api;