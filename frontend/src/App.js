import React, { useState, useContext } from 'react';
import './App.css';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import LoadingSpinner from './components/LoadingSpinner';

const App = () => {
  return (
    <div className="App">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </div>
  );
};

const AppContent = () => {
  const { user, logout, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
        <p>Loading Healthcare System...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Render appropriate dashboard based on user role
  switch (user.role) {
    case 'patient':
      return <PatientDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'pharmacy':
      return <PharmacyDashboard />;
    default:
      return (
        <div className="error-container">
          <h2>Invalid User Role</h2>
          <p>Your account role is not recognized. Please contact support.</p>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      );
  }
};

export default App;