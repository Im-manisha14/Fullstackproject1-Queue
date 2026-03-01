import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isAuthPage = location.pathname === '/' || location.pathname === '/register';
    if (isAuthPage) return <Outlet />;

    return (
        <div className="app-container">
            <nav className="navbar">
                <div className="navbar-inner">
                    <Link to="/" className="navbar-brand">
                        <div className="navbar-brand-icon">Q</div>
                        <span>QueueFree</span>
                    </Link>
                    <div className="navbar-right">
                        {user && (
                            <span className="role-badge">{user.role} Portal</span>
                        )}
                        <button onClick={handleLogout} className="btn-logout">
                            &#x21b5; Logout
                        </button>
                    </div>
                </div>
            </nav>
            <main className="page-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
