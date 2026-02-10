import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const PharmacyDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [statusFilter]);

  const getToken = () => localStorage.getItem('token');

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPrescriptions(),
        loadMedicines()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrescriptions = async () => {
    try {
      const url = statusFilter === 'all' 
        ? `${API_BASE}/pharmacy/prescriptions`
        : `${API_BASE}/pharmacy/prescriptions?status=${statusFilter}`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const data = await response.json();
      setPrescriptions(data);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    }
  };

  const loadMedicines = async () => {
    try {
      const response = await fetch(`${API_BASE}/pharmacy/medicines`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const data = await response.json();
      setMedicines(data);
    } catch (error) {
      console.error('Error loading medicines:', error);
    }
  };

  const updatePrescriptionStatus = async (prescriptionId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/pharmacy/update-prescription-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          prescription_id: prescriptionId,
          status: newStatus
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Prescription status updated to ${newStatus}`);
        loadPrescriptions();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      preparing: 'status-preparing',
      ready: 'status-ready',
      dispensed: 'status-dispensed'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status] || ''}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const renderPrescriptions = () => (
    <div className="dashboard-content">
      <div className="prescriptions-header">
        <h2>Prescription Management</h2>
        
        <div className="filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="dispensed">Dispensed</option>
          </select>
        </div>
      </div>

      <div className="prescription-stats">
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div>
            <h3>{prescriptions.filter(p => p.status === 'pending').length}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div>
            <h3>{prescriptions.filter(p => p.status === 'preparing').length}</h3>
            <p>Preparing</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div>
            <h3>{prescriptions.filter(p => p.status === 'ready').length}</h3>
            <p>Ready</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div>
            <h3>{prescriptions.filter(p => p.status === 'dispensed').length}</h3>
            <p>Dispensed</p>
          </div>
        </div>
      </div>

      <div className="prescriptions-list">
        {prescriptions.length === 0 ? (
          <div className="empty-state">
            <p>No prescriptions found for the selected filter.</p>
          </div>
        ) : (
          prescriptions.map(prescription => (
            <div key={prescription.id} className="prescription-card">
              <div className="prescription-header">
                <div className="patient-info">
                  <h3>{prescription.patient_name}</h3>
                  <p>Doctor: {prescription.doctor_name}</p>
                  <p>Date: {prescription.created_at}</p>
                </div>
                {getStatusBadge(prescription.status)}
              </div>

              <div className="prescription-details">
                <div className="medicine-info">
                  <h4>{prescription.medicine_name}</h4>
                  <div className="medicine-details">
                    <span>Dosage: {prescription.dosage}</span>
                    <span>Frequency: {prescription.frequency}</span>
                    <span>Duration: {prescription.duration}</span>
                  </div>
                  {prescription.instructions && (
                    <p className="instructions">Instructions: {prescription.instructions}</p>
                  )}
                </div>

                {prescription.status !== 'dispensed' && (
                  <div className="action-buttons">
                    {prescription.status === 'pending' && (
                      <button
                        className="action-button preparing"
                        onClick={() => updatePrescriptionStatus(prescription.id, 'preparing')}
                      >
                        Start Preparing
                      </button>
                    )}
                    
                    {prescription.status === 'preparing' && (
                      <button
                        className="action-button ready"
                        onClick={() => updatePrescriptionStatus(prescription.id, 'ready')}
                      >
                        Mark Ready
                      </button>
                    )}
                    
                    {prescription.status === 'ready' && (
                      <button
                        className="action-button dispensed"
                        onClick={() => updatePrescriptionStatus(prescription.id, 'dispensed')}
                      >
                        Mark Dispensed
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="dashboard-content">
      <h2>Medicine Inventory</h2>
      
      <div className="inventory-stats">
        <div className="stat-card">
          <div className="stat-icon">💊</div>
          <div>
            <h3>{medicines.length}</h3>
            <p>Total Medicines</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div>
            <h3>{medicines.filter(m => m.stock_quantity <= m.minimum_stock).length}</h3>
            <p>Low Stock</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div>
            <h3>{medicines.reduce((total, m) => total + m.stock_quantity, 0)}</h3>
            <p>Total Stock</p>
          </div>
        </div>
      </div>

      <div className="medicines-list">
        {medicines.length === 0 ? (
          <div className="empty-state">
            <p>No medicines found in inventory.</p>
          </div>
        ) : (
          <div className="medicines-table">
            <div className="table-header">
              <div>Medicine</div>
              <div>Generic Name</div>
              <div>Category</div>
              <div>Stock</div>
              <div>Price</div>
              <div>Status</div>
            </div>
            
            {medicines.map(medicine => (
              <div key={medicine.id} className="table-row">
                <div className="medicine-name">
                  <strong>{medicine.name}</strong>
                </div>
                <div>{medicine.generic_name}</div>
                <div>{medicine.category}</div>
                <div className={medicine.stock_quantity <= medicine.minimum_stock ? 'low-stock' : ''}>
                  {medicine.stock_quantity}
                </div>
                <div>₹{medicine.unit_price}</div>
                <div>
                  {medicine.stock_quantity <= medicine.minimum_stock ? (
                    <span className="status-badge status-warning">Low Stock</span>
                  ) : (
                    <span className="status-badge status-available">Available</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="hospital-icon">💊</div>
          <div>
            <h1>Pharmacy Dashboard</h1>
            <p>Welcome, {user.full_name}</p>
          </div>
        </div>
        
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </header>

      <nav className="dashboard-nav">
        <button
          className={`nav-item ${activeTab === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          📋 Prescriptions
        </button>
        <button
          className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Inventory
        </button>
      </nav>

      <main className="dashboard-main">
        {activeTab === 'prescriptions' && renderPrescriptions()}
        {activeTab === 'inventory' && renderInventory()}
      </main>
    </div>
  );
};

export default PharmacyDashboard;