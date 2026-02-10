import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to their appropriate dashboard if they try to access unauthorized route
        switch (user.role) {
            case 'patient': return <Navigate to="/patient/dashboard" replace />;
            case 'doctor': return <Navigate to="/doctor/dashboard" replace />;
            case 'pharmacy': return <Navigate to="/pharmacy/dashboard" replace />;
            default: return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
