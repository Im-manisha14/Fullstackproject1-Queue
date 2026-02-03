// Secure Login Component with Role-Based Authentication
const SecureLogin = ({ onLogin }) => {
    const API_BASE_URL = 'http://localhost:5000/api';
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'patient'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showRegister, setShowRegister] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email.toLowerCase().trim(),
                    password: formData.password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store authentication data securely
                localStorage.setItem('auth_token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token_expires', Date.now() + (data.expires_in * 1000));
                
                // Call parent component's login handler
                onLogin(data.user);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Network error. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="secure-login">
            <div className="login-container">
                <div className="login-header">
                    <div className="hospital-logo">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 14C20.49 12.54 22 10.79 22 8.5C22 5.42 19.58 3 16.5 3C14.24 3 12.39 4.44 12 6.34C11.61 4.44 9.76 3 7.5 3C4.42 3 2 5.42 2 8.5C2 10.79 3.51 12.54 5 14L12 21L19 14Z" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 5.5V15.5" stroke="currentColor" strokeWidth="2"/>
                            <path d="M8.5 10.5H15.5" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                    </div>
                    <h1>Healthcare Management System</h1>
                    <p className="subtitle">Secure Role-Based Access Portal</p>
                </div>

                {!showRegister ? (
                    <form onSubmit={handleSubmit} className="login-form">
                        <h2>Login to Your Account</h2>
                        
                        {error && (
                            <div className="error-message">
                                <span>⚠️ {error}</span>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                placeholder="Enter your email"
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                placeholder="Enter your password"
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="login-btn"
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>

                        <div className="login-footer">
                            <p>Don't have an account?</p>
                            <button
                                type="button"
                                onClick={() => setShowRegister(true)}
                                className="link-btn"
                            >
                                Register Here
                            </button>
                        </div>

                        <div className="security-notice">
                            <small>
                                🔒 This is a secure healthcare portal. All access is logged and monitored.
                            </small>
                        </div>
                    </form>
                ) : (
                    <RegisterForm 
                        onBack={() => setShowRegister(false)}
                        onSuccess={() => setShowRegister(false)}
                    />
                )}
            </div>
        </div>
    );
};

// Registration Component
const RegisterForm = ({ onBack, onSuccess }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'patient',
        full_name: '',
        phone: '',
        date_of_birth: '',
        gender: '',
        address: '',
        emergency_contact: '',
        // Doctor-specific fields
        specialization: '',
        license_number: '',
        department_id: '',
        consultation_fee: ''
    });
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Load departments for doctor registration
    useEffect(() => {
        if (formData.role === 'doctor') {
            fetchDepartments();
        }
    }, [formData.role]);

    const fetchDepartments = async () => {
        try {
            // This is a public endpoint for registration
            const response = await fetch(`${API_BASE_URL}/departments`);
            if (response.ok) {
                const data = await response.json();
                setDepartments(data);
            }
        } catch (err) {
            console.error('Error fetching departments:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            setIsLoading(false);
            return;
        }

        try {
            const registrationData = {
                email: formData.email.toLowerCase().trim(),
                password: formData.password,
                role: formData.role,
                full_name: formData.full_name.trim(),
                phone: formData.phone.trim()
            };

            // Add role-specific data
            if (formData.role === 'patient') {
                registrationData.date_of_birth = formData.date_of_birth;
                registrationData.gender = formData.gender;
                registrationData.address = formData.address;
                registrationData.emergency_contact = formData.emergency_contact;
            } else if (formData.role === 'doctor') {
                registrationData.specialization = formData.specialization;
                registrationData.license_number = formData.license_number;
                registrationData.department_id = formData.department_id;
                registrationData.consultation_fee = parseFloat(formData.consultation_fee) || 0;
            }

            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message);
                setTimeout(() => {
                    onSuccess();
                }, 2000);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('Network error. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="register-form">
            <h2>Create New Account</h2>
            
            {error && <div className="error-message">⚠️ {error}</div>}
            {success && <div className="success-message">✅ {success}</div>}

            {/* Role Selection */}
            <div className="form-group">
                <label htmlFor="role">Account Type</label>
                <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="pharmacy">Pharmacy Staff</option>
                </select>
                {formData.role !== 'patient' && (
                    <small className="role-notice">
                        ⚠️ Doctor and Pharmacy accounts require admin verification
                    </small>
                )}
            </div>

            {/* Basic Information */}
            <div className="form-group">
                <label htmlFor="full_name">Full Name</label>
                <input
                    type="text"
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    placeholder="Enter your full name"
                />
            </div>

            <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="Enter your email"
                />
            </div>

            <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                />
            </div>

            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="Enter password (min 8 characters)"
                />
            </div>

            <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    placeholder="Confirm your password"
                />
            </div>

            {/* Patient-specific fields */}
            {formData.role === 'patient' && (
                <>
                    <div className="form-group">
                        <label htmlFor="date_of_birth">Date of Birth</label>
                        <input
                            type="date"
                            id="date_of_birth"
                            value={formData.date_of_birth}
                            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="gender">Gender</label>
                        <select
                            id="gender"
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="emergency_contact">Emergency Contact</label>
                        <input
                            type="tel"
                            id="emergency_contact"
                            value={formData.emergency_contact}
                            onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                            placeholder="Emergency contact number"
                        />
                    </div>
                </>
            )}

            {/* Doctor-specific fields */}
            {formData.role === 'doctor' && (
                <>
                    <div className="form-group">
                        <label htmlFor="license_number">Medical License Number</label>
                        <input
                            type="text"
                            id="license_number"
                            value={formData.license_number}
                            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                            required
                            placeholder="Enter your medical license number"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="specialization">Specialization</label>
                        <input
                            type="text"
                            id="specialization"
                            value={formData.specialization}
                            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                            placeholder="e.g., Cardiology, Pediatrics"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="department_id">Department</label>
                        <select
                            id="department_id"
                            value={formData.department_id}
                            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                        >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="consultation_fee">Consultation Fee ($)</label>
                        <input
                            type="number"
                            id="consultation_fee"
                            value={formData.consultation_fee}
                            onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                            placeholder="Enter consultation fee"
                            min="0"
                            step="0.01"
                        />
                    </div>
                </>
            )}

            <div className="form-actions">
                <button
                    type="button"
                    onClick={onBack}
                    className="back-btn"
                >
                    Back to Login
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="register-btn"
                >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
            </div>
        </form>
    );
};