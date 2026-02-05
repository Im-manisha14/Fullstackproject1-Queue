import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import './CleanComponents.css';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <div className="App">
      <Router>
        <AuthProvider>
          <AppContent />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </AuthProvider>
      </Router>
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
        <p>Loading Healthcare System...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={`/dashboard/${user?.role || 'patient'}`} />} />
      <Route path="/" element={!user ? <Navigate to="/login" /> : <Navigate to={`/dashboard/${user?.role || 'patient'}`} />} />
      
      {/* Role-specific dashboard routes */}
      <Route 
        path="/dashboard/patient" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/doctor" 
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/pharmacy" 
        element={
          <ProtectedRoute allowedRoles={['pharmacy']}>
            <PharmacyDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Generic dashboard route - redirects to role-specific route */}
      <Route 
        path="/dashboard" 
        element={
          user ? (
            <Navigate to={`/dashboard/${user.role}`} />
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      
      {/* Handle invalid routes */}
      <Route path="*" element={<Navigate to={user ? `/dashboard/${user.role}` : "/login"} />} />
    </Routes>
  );
};

export default App;