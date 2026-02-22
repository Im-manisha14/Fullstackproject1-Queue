import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import PatientDashboard from './pages/PatientDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import PharmacyDashboard from './pages/PharmacyDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import Register from './pages/Register'

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      children: [
        { index: true, element: <Login /> },
        { path: 'register', element: <Register /> },
        {
          path: 'patient/dashboard',
          element: (
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientDashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: 'doctor/dashboard',
          element: (
            <ProtectedRoute allowedRoles={["doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: 'pharmacy/dashboard',
          element: (
            <ProtectedRoute allowedRoles={["pharmacy"]}>
              <PharmacyDashboard />
            </ProtectedRoute>
          ),
        },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
