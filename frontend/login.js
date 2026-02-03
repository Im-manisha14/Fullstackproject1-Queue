// Hospital Login System
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.querySelector('.login-btn');

    // Handle form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });

// Hospital Login System
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.querySelector('.login-btn');

    // API Base URL
    const API_BASE = 'http://127.0.0.1:5000/api';

    // Handle form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });

    // Handle login process
    function handleLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        // Basic validation
        if (!username || !password) {
            showError('Please fill in all fields');
            return;
        }

        // Show loading state
        showLoading(true);

        // Make API call to backend
        authenticateUser(username, password);
    }

    // Authenticate user with backend API
    async function authenticateUser(username, password) {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store the token
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('user_role', data.user.role);
                localStorage.setItem('user_id', data.user.id);
                localStorage.setItem('user_name', data.user.full_name);

                // Show success message
                showSuccess('Login successful! Redirecting...');
                
                setTimeout(() => {
                    // Redirect based on user role
                    redirectUser(data.user.role);
                }, 1500);
            } else {
                // Show error message from server
                showError(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Unable to connect to server. Please check if the backend is running.');
        } finally {
            showLoading(false);
        }
            }, 1000);
        } else {
            // Failed login
            showError('Invalid username or password');
            showLoading(false);
        }
    }

    // Redirect user based on role
    function redirectUser(role) {
        switch(role) {
            case 'admin':
                window.location.href = 'index.html'; // Main dashboard for admin
                break;
            case 'doctor':
                window.location.href = 'index.html'; // Main dashboard with doctor view
                break;
            case 'patient':
                window.location.href = 'index.html'; // Main dashboard with patient view
                break;
            case 'pharmacy':
                window.location.href = 'index.html'; // Main dashboard with pharmacy view
                break;
            default:
                window.location.href = 'index.html';
        }
    }

    // Show loading state
    function showLoading(isLoading) {
        if (isLoading) {
            loginBtn.classList.add('loading');
            loginBtn.disabled = true;
            loginBtn.textContent = 'LOGGING IN...';
        } else {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
            loginBtn.textContent = 'LOGIN';
        }
    }

    // Show error message
    function showError(message) {
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alert = document.createElement('div');
        alert.className = 'alert alert-error';
        alert.innerHTML = `
            <span class="alert-icon">⚠</span>
            <span class="alert-message">${message}</span>
        `;
        
        loginForm.insertBefore(alert, loginForm.firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 4000);

        // Add error styles to inputs
        usernameInput.classList.add('error');
        passwordInput.classList.add('error');
        
        setTimeout(() => {
            usernameInput.classList.remove('error');
            passwordInput.classList.remove('error');
        }, 3000);
    }

    // Show success message
    function showSuccess(message) {
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.innerHTML = `
            <span class="alert-icon">✓</span>
            <span class="alert-message">${message}</span>
        `;
        
        loginForm.insertBefore(alert, loginForm.firstChild);
    }

    // Handle "Remember Me" functionality
    const rememberCheckbox = document.querySelector('input[name="remember"]');
    const savedUsername = localStorage.getItem('rememberedUsername');
    
    if (savedUsername) {
        usernameInput.value = savedUsername;
        rememberCheckbox.checked = true;
    }

    rememberCheckbox.addEventListener('change', function() {
        if (this.checked && usernameInput.value) {
            localStorage.setItem('rememberedUsername', usernameInput.value);
        } else {
            localStorage.removeItem('rememberedUsername');
        }
    });

    // Handle "Forgot Password" link
    document.querySelector('.forgot-password').addEventListener('click', function(e) {
        e.preventDefault();
        showForgotPasswordModal();
    });

    // Show forgot password modal
    function showForgotPasswordModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Reset Password</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Please contact your system administrator to reset your password.</p>
                    <div class="contact-info">
                        <p><strong>IT Support:</strong> support@hospital.com</p>
                        <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-modal-close">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal handlers
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // Add dynamic styles for alerts and modal
    const dynamicStyles = `
        <style>
            .alert {
                padding: 12px 16px;
                border-radius: 6px;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                animation: slideIn 0.3s ease-out;
            }
            
            .alert-error {
                background: #fee;
                border: 1px solid #fcc;
                color: #c33;
            }
            
            .alert-success {
                background: #efe;
                border: 1px solid #cfc;
                color: #3c3;
            }
            
            .alert-icon {
                margin-right: 8px;
                font-weight: bold;
            }
            
            .form-group input.error {
                border-color: #e74c3c !important;
                box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1) !important;
            }
            
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                animation: fadeIn 0.3s ease-out;
            }
            
            .modal-content {
                background: white;
                border-radius: 10px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease-out;
            }
            
            .modal-header {
                padding: 20px 24px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .modal-header h3 {
                color: #2c3e50;
                font-size: 1.2rem;
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #95a5a6;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            }
            
            .modal-body {
                padding: 20px 24px;
            }
            
            .contact-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                margin-top: 15px;
            }
            
            .contact-info p {
                margin: 5px 0;
                color: #2c3e50;
            }
            
            .modal-footer {
                padding: 0 24px 20px;
                text-align: right;
            }
            
            .btn-modal-close {
                background: #20b2aa;
                color: white;
                border: none;
                padding: 8px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
            }
            
            @keyframes slideIn {
                from { transform: translateX(-100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', dynamicStyles);

    // Input validation and formatting
    usernameInput.addEventListener('input', function() {
        this.value = this.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    });

    // Enhanced keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !loginBtn.disabled) {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    console.log('Hospital Login System initialized');
});