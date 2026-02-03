// Healthcare Management System - React without JSX
const { useState, useEffect } = React;
const { createRoot } = ReactDOM;

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Utility functions
const getAuthToken = () => localStorage.getItem('auth_token');
const getCurrentUser = () => JSON.parse(localStorage.getItem('user') || 'null');

// Simple Login Component
const SimpleLogin = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password: password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('auth_token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onLogin(data.user);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Network error. Please check your connection.');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return React.createElement('div', { className: 'login-container' },
        React.createElement('div', { className: 'login-form' },
            React.createElement('h2', null, 'Healthcare Login'),
            error && React.createElement('div', { className: 'error' }, error),
            React.createElement('form', { onSubmit: handleSubmit },
                React.createElement('div', { className: 'form-group' },
                    React.createElement('input', {
                        type: 'email',
                        placeholder: 'Email',
                        value: email,
                        onChange: (e) => setEmail(e.target.value),
                        required: true,
                        disabled: loading
                    })
                ),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('input', {
                        type: 'password',
                        placeholder: 'Password',
                        value: password,
                        onChange: (e) => setPassword(e.target.value),
                        required: true,
                        disabled: loading
                    })
                ),
                React.createElement('button', {
                    type: 'submit',
                    disabled: loading,
                    className: 'btn btn-primary'
                }, loading ? 'Logging in...' : 'Login')
            )
        )
    );
};

// Simple Dashboard Component
const SimpleDashboard = ({ user, onLogout }) => {
    return React.createElement('div', { className: 'dashboard' },
        React.createElement('div', { className: 'dashboard-header' },
            React.createElement('h1', null, 'Healthcare Dashboard'),
            React.createElement('div', { className: 'user-info' },
                React.createElement('span', null, `Welcome, ${user.full_name} (${user.role})`),
                React.createElement('button', {
                    onClick: onLogout,
                    className: 'btn btn-secondary'
                }, 'Logout')
            )
        ),
        React.createElement('div', { className: 'dashboard-content' },
            React.createElement('div', { className: 'card' },
                React.createElement('h3', null, 'Dashboard'),
                React.createElement('p', null, `You are logged in as a ${user.role}.`),
                React.createElement('p', null, 'This is a simplified version of the healthcare management system.')
            )
        )
    );
};

// Main App Component
const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getAuthToken();
        const savedUser = getCurrentUser();
        
        if (token && savedUser) {
            setUser(savedUser);
        }
        
        setLoading(false);
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (loading) {
        return React.createElement('div', { className: 'loading-container' },
            React.createElement('div', { className: 'loading-spinner' }),
            React.createElement('p', null, 'Loading Healthcare Management System...')
        );
    }

    if (!user) {
        return React.createElement(SimpleLogin, { onLogin: handleLogin });
    }

    return React.createElement(SimpleDashboard, { user: user, onLogout: handleLogout });
};

// Render the app
console.log('Starting app render...');
const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(React.createElement(App));
    console.log('App rendered successfully');
} else {
    console.error('Container element with id "app" not found');
}