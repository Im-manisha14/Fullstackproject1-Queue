import axios from 'axios';

// Base URL for backend
const API_URL = 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/login', { email, password, name: "User", role: "patient" }); // name/role ignored by backend login
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
    }
};

export const patientService = {
    getDoctors: async () => {
        const response = await api.get('/doctors');
        return response.data; // expecting array of doctors
    },

    bookAppointment: async (doctorId) => {
        // Hardcoded user_id=1 in backend for now
        const response = await api.post('/appointments', { doctor_id: doctorId });
        return response.data;
    }
};

export const doctorService = {
    getQueue: async () => {
        const response = await api.get('/queue');
        return response.data;
    }
};

export const pharmacyService = {
    getPrescriptions: async () => {
        const response = await api.get('/prescriptions');
        return response.data;
    }
};

export default api;
