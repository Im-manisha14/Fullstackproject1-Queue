// Admin Dashboard Component
const AdminDashboard = ({ user }) => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedRole, setSelectedRole] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadAdminData();
    }, [selectedRole, selectedStatus]);

    const loadAdminData = async () => {
        setIsLoading(true);
        try {
            // Load pending users
            const pendingResponse = await apiCall('/admin/pending-users');
            setPendingUsers(pendingResponse);

            // Load all users with filters
            let endpoint = '/admin/users';
            const params = new URLSearchParams();
            if (selectedRole !== 'all') params.append('role', selectedRole);
            if (selectedStatus !== 'all') params.append('status', selectedStatus);
            if (params.toString()) endpoint += '?' + params.toString();

            const usersResponse = await apiCall(endpoint);
            setAllUsers(usersResponse);
        } catch (err) {
            setError('Error loading admin data');
            console.error('Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserVerification = async (userId, approve) => {
        try {
            await apiCall(`/admin/verify-user/${userId}`, {
                method: 'POST',
                body: JSON.stringify({ approve })
            });
            
            // Reload data
            loadAdminData();
            
            setError('');
        } catch (err) {
            setError(`Error ${approve ? 'approving' : 'rejecting'} user`);
            console.error('Error:', err);
        }
    };

    const getSystemStats = () => {
        const totalUsers = allUsers.length;
        const verifiedUsers = allUsers.filter(u => u.is_verified).length;
        const activeUsers = allUsers.filter(u => u.is_active).length;
        const doctorCount = allUsers.filter(u => u.role === 'doctor').length;
        const patientCount = allUsers.filter(u => u.role === 'patient').length;
        const pharmacyCount = allUsers.filter(u => u.role === 'pharmacy').length;

        return {
            totalUsers,
            verifiedUsers,
            activeUsers,
            doctorCount,
            patientCount,
            pharmacyCount
        };
    };

    if (isLoading) {
        return <div className="loading">Loading admin dashboard...</div>;
    }

    const stats = getSystemStats();

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1>Admin Control Panel</h1>
                <p className="user-role">System Administrator</p>
                
                {/* System Statistics */}
                <div className="admin-stats">
                    <div className="stat-group">
                        <h3>System Overview</h3>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h4>{stats.totalUsers}</h4>
                                <p>Total Users</p>
                            </div>
                            <div className="stat-card">
                                <h4>{stats.verifiedUsers}</h4>
                                <p>Verified Users</p>
                            </div>
                            <div className="stat-card">
                                <h4>{stats.activeUsers}</h4>
                                <p>Active Users</p>
                            </div>
                            <div className="stat-card alert">
                                <h4>{pendingUsers.length}</h4>
                                <p>Pending Verification</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="stat-group">
                        <h3>User Distribution</h3>
                        <div className="stats-grid">
                            <div className="stat-card patient">
                                <h4>{stats.patientCount}</h4>
                                <p>Patients</p>
                            </div>
                            <div className="stat-card doctor">
                                <h4>{stats.doctorCount}</h4>
                                <p>Doctors</p>
                            </div>
                            <div className="stat-card pharmacy">
                                <h4>{stats.pharmacyCount}</h4>
                                <p>Pharmacy Staff</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-nav">
                <button
                    className={activeTab === 'pending' ? 'nav-btn active' : 'nav-btn'}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Verification ({pendingUsers.length})
                </button>
                <button
                    className={activeTab === 'users' ? 'nav-btn active' : 'nav-btn'}
                    onClick={() => setActiveTab('users')}
                >
                    All Users ({allUsers.length})
                </button>
                <button
                    className={activeTab === 'system' ? 'nav-btn active' : 'nav-btn'}
                    onClick={() => setActiveTab('system')}
                >
                    System Management
                </button>
            </div>

            <div className="dashboard-content">
                {error && <div className="error-message">{error}</div>}

                {activeTab === 'pending' && (
                    <div className="pending-section">
                        <h2>User Verification Queue</h2>
                        
                        {pendingUsers.length === 0 ? (
                            <div className="empty-state">
                                <p>No users pending verification</p>
                            </div>
                        ) : (
                            <div className="pending-users-list">
                                {pendingUsers.map(pendingUser => (
                                    <div key={pendingUser.id} className="pending-user-card">
                                        <div className="user-info">
                                            <div className="user-header">
                                                <h3>{pendingUser.full_name}</h3>
                                                <span className={`role-badge ${pendingUser.role}`}>
                                                    {pendingUser.role.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="user-details">
                                                <p><strong>Email:</strong> {pendingUser.email}</p>
                                                <p><strong>Phone:</strong> {pendingUser.phone || 'Not provided'}</p>
                                                <p><strong>Registration Date:</strong> {new Date(pendingUser.created_at).toLocaleDateString()}</p>
                                                
                                                {pendingUser.role === 'doctor' && (
                                                    <>
                                                        <p><strong>Specialization:</strong> {pendingUser.specialization}</p>
                                                        <p><strong>License Number:</strong> {pendingUser.license_number}</p>
                                                        <p><strong>Department ID:</strong> {pendingUser.department_id}</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="verification-actions">
                                            <div className="action-buttons">
                                                <button 
                                                    className="success-btn"
                                                    onClick={() => handleUserVerification(pendingUser.id, true)}
                                                >
                                                    ✅ Approve & Activate
                                                </button>
                                                <button 
                                                    className="danger-btn"
                                                    onClick={() => handleUserVerification(pendingUser.id, false)}
                                                >
                                                    ❌ Reject Account
                                                </button>
                                            </div>
                                            <div className="verification-notes">
                                                <small>
                                                    Verify credentials before approval. 
                                                    {pendingUser.role === 'doctor' && ' Check medical license validity.'}
                                                    {pendingUser.role === 'pharmacy' && ' Verify pharmacy credentials.'}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="users-section">
                        <div className="section-header">
                            <h2>User Management</h2>
                            <div className="filters">
                                <select 
                                    value={selectedRole} 
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                >
                                    <option value="all">All Roles</option>
                                    <option value="patient">Patients</option>
                                    <option value="doctor">Doctors</option>
                                    <option value="pharmacy">Pharmacy</option>
                                    <option value="admin">Admins</option>
                                </select>
                                <select 
                                    value={selectedStatus} 
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="verified">Verified</option>
                                    <option value="unverified">Unverified</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="users-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Verified</th>
                                        <th>Last Login</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allUsers.map(userData => (
                                        <tr key={userData.id}>
                                            <td>{userData.full_name}</td>
                                            <td>{userData.email}</td>
                                            <td>
                                                <span className={`role-badge ${userData.role}`}>
                                                    {userData.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${userData.is_active ? 'active' : 'inactive'}`}>
                                                    {userData.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`verification-badge ${userData.is_verified ? 'verified' : 'unverified'}`}>
                                                    {userData.is_verified ? '✅' : '⏳'}
                                                </span>
                                            </td>
                                            <td>{userData.last_login ? new Date(userData.last_login).toLocaleDateString() : 'Never'}</td>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="small-btn">View</button>
                                                    <button className="small-btn">Edit</button>
                                                    {userData.role !== 'admin' && (
                                                        <button className="small-btn danger">Suspend</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="system-section">
                        <h2>System Management</h2>
                        
                        <div className="system-modules">
                            <div className="module-card">
                                <h3>Security Settings</h3>
                                <p>Configure authentication and access control settings</p>
                                <button className="primary-btn">Configure Security</button>
                            </div>
                            
                            <div className="module-card">
                                <h3>Department Management</h3>
                                <p>Manage hospital departments and specializations</p>
                                <button className="primary-btn">Manage Departments</button>
                            </div>
                            
                            <div className="module-card">
                                <h3>System Logs</h3>
                                <p>View system activity and security logs</p>
                                <button className="primary-btn">View Logs</button>
                            </div>
                            
                            <div className="module-card">
                                <h3>Backup & Recovery</h3>
                                <p>System backup and data recovery options</p>
                                <button className="primary-btn">Manage Backups</button>
                            </div>
                            
                            <div className="module-card">
                                <h3>Reports & Analytics</h3>
                                <p>Generate system reports and analytics</p>
                                <button className="primary-btn">Generate Reports</button>
                            </div>
                            
                            <div className="module-card alert">
                                <h3>Emergency Access</h3>
                                <p>Emergency access controls and overrides</p>
                                <button className="danger-btn">Emergency Controls</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};