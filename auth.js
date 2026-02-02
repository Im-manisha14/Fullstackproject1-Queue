// Authentication Utilities
class AuthService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('token');
        this.userRole = localStorage.getItem('userRole');
    }

    async login(username, password) {
        try {
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                this.userRole = data.role;
                localStorage.setItem('token', this.token);
                localStorage.setItem('userRole', this.userRole);
                localStorage.setItem('userId', data.user_id);
                localStorage.setItem('username', data.username);
                return { success: true, role: this.userRole };
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            
            if (response.ok) {
                return { success: true, message: 'Registration successful' };
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    logout() {
        this.token = null;
        this.userRole = null;
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
    }

    isAuthenticated() {
        return !!this.token;
    }

    getUserRole() {
        return this.userRole;
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    async apiCall(endpoint, method = 'GET', body = null) {
        try {
            const config = {
                method,
                headers: this.getAuthHeaders()
            };

            if (body) {
                config.body = JSON.stringify(body);
            }

            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    window.location.reload();
                }
                throw new Error(data.message || 'API call failed');
            }

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

const authService = new AuthService();