import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Pill, Clipboard, Check, AlertCircle } from 'lucide-react';

const PharmacyDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('queue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Live Queue State
  const [liveQueue, setLiveQueue] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Records State
  const [records, setRecords] = useState([]);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPages, setRecordsPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Inventory State
  const [medicines, setMedicines] = useState([]);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  
  // Polling interval ref
  const pollIntervalRef = useRef(null);
  
  // Load live queue on mount and set up polling
  useEffect(() => {
    if (activeTab === 'queue') {
      loadLiveQueue();
      pollIntervalRef.current = setInterval(() => {
        loadLiveQueue();
      }, 5000); // Poll every 5 seconds
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeTab]);
  
  // Load records when filters change
  useEffect(() => {
    if (activeTab === 'records') {
      loadRecords();
    }
  }, [recordsPage, statusFilter, activeTab]);
  
  // Load inventory when tab changes
  useEffect(() => {
    if (activeTab === 'inventory') {
      loadInventory();
    }
  }, [activeTab]);
  
  // Load live queue (today's active prescriptions)
  const loadLiveQueue = async () => {
    try {
      const response = await api.get('/api/pharmacy/prescriptions/today');
      setLiveQueue(response.data);
      setLastUpdate(Date.now());
    } catch (err) {
      console.error('Failed to load live queue:', err);
    }
  };
  
  // Load prescription records with pagination
  const loadRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: recordsPage,
        limit: 20,
        status: statusFilter
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const response = await api.get(`/api/pharmacy/prescriptions?${params}`);
      setRecords(response.data.prescriptions);
      setRecordsTotal(response.data.total);
      setRecordsPages(response.data.pages);
      setLoading(false);
    } catch (err) {
      setError('Failed to load records');
      setLoading(false);
    }
  };
  
  // Load medicine inventory
  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/pharmacy/medicines');
      setMedicines(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load inventory');
      setLoading(false);
    }
  };
  
  // Update prescription status
  const updatePrescriptionStatus = async (prescriptionId, newStatus) => {
    try {
      setLoading(true);
      await api.put(`/api/pharmacy/prescriptions/${prescriptionId}/status`, {
        status: newStatus
      });
      setSuccess(`Prescription ${newStatus} successfully`);
      setTimeout(() => setSuccess(''), 3000);
      
      // Reload queue
      await loadLiveQueue();
      
      // Clear selection if dispensed or cancelled
      if (newStatus === 'dispensed' || newStatus === 'cancelled') {
        setSelectedPrescription(null);
      } else {
        // Reload selected prescription details
        const response = await api.get(`/api/pharmacy/prescriptions/${prescriptionId}`);
        setSelectedPrescription(response.data);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
      setTimeout(() => setError(''), 3000);
      setLoading(false);
    }
  };
  
  // Update medicine
  const updateMedicine = async (medicineId, data) => {
    try {
      setLoading(true);
      await api.put(`/api/pharmacy/medicines/${medicineId}`, data);
      setSuccess('Medicine updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      setShowMedicineModal(false);
      setEditingMedicine(null);
      await loadInventory();
      setLoading(false);
    } catch (err) {
      setError('Failed to update medicine');
      setTimeout(() => setError(''), 3000);
      setLoading(false);
    }
  };
  
  // Select prescription for detailed view
  const selectPrescription = async (prescriptionId) => {
    try {
      const response = await api.get(`/api/pharmacy/prescriptions/${prescriptionId}`);
      setSelectedPrescription(response.data);
    } catch (err) {
      setError('Failed to load prescription details');
      setTimeout(() => setError(''), 3000);
    }
  };
  
  // Status badge component
  const statusBadge = (status) => {
    const badges = {
      pending: <span className="badge badge-blue">NEW</span>,
      preparing: <span className="badge badge-orange">PREPARING</span>,
      ready: <span className="badge badge-green">READY</span>,
      dispensed: <span className="badge" style={{background:'#6b7280',color:'white'}}>DISPENSED</span>,
      cancelled: <span className="badge badge-red">CANCELLED</span>
    };
    return badges[status] || <span className="badge">{status}</span>;
  };
  
  // Stock status badge
  const stockStatusBadge = (medicine) => {
    if (medicine.stock_quantity < 10) {
      return <span className="badge badge-red">CRITICAL</span>;
    } else if (medicine.stock_quantity < 50) {
      return <span className="badge badge-orange">LOW STOCK</span>;
    }
    return <span className="badge badge-green">AVAILABLE</span>;
  };
  
  // Get time ago
  const getTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };
  
  // Get next action button for prescription
  const getActionButton = (prescription) => {
    if (prescription.pharmacy_status === 'pending') {
      return (
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => updatePrescriptionStatus(prescription.id, 'preparing')}
          disabled={loading}
        >
          Start Preparing
        </button>
      );
    } else if (prescription.pharmacy_status === 'preparing') {
      return (
        <button 
          className="btn btn-success btn-sm"
          onClick={() => updatePrescriptionStatus(prescription.id, 'ready')}
          disabled={loading}
        >
          Mark Ready
        </button>
      );
    } else if (prescription.pharmacy_status === 'ready') {
      return (
        <button 
          className="btn btn-primary btn-sm"
          onClick={() => updatePrescriptionStatus(prescription.id, 'dispensed')}
          disabled={loading}
        >
          Dispense
        </button>
      );
    } else if (prescription.pharmacy_status === 'dispensed') {
      return <button className="btn btn-sm" disabled style={{opacity:0.5}}>Completed</button>;
    }
    return null;
  };
  
  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="ph-header" style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{fontSize: '22px', fontWeight: '700', marginBottom: '4px'}}>
            Pharmacy Portal
          </h2>
          <div style={{fontSize: '13px', color: 'var(--text-muted)'}}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          {activeTab === 'queue' && (
            <div style={{
              background: 'rgba(82,183,136,0.1)',
              padding: '8px 12px',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#52B788',
                animation: 'pulse 2s infinite'
              }}></div>
              <span style={{fontSize: '12px', fontWeight: '600', color: '#52B788'}}>
                LIVE
              </span>
              <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>
                {getTimeAgo(lastUpdate)}
              </span>
            </div>
          )}
          <span className="badge badge-blue" style={{fontSize:'13px',padding:'6px 12px'}}>
            {liveQueue.length} Active
          </span>
        </div>
      </div>
      
      {/* Alerts */}
      {error && (
        <div className="alert alert-error" style={{marginBottom:'16px'}}>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{marginBottom:'16px'}}>
          {success}
        </div>
      )}
      
      {/* Tabs */}
      <div className="tabs" style={{marginBottom:'24px'}}>
        <button 
          className={'tab-btn' + (activeTab === 'queue' ? ' active' : '')} 
          onClick={() => setActiveTab('queue')}
        >
          Live Queue
        </button>
        <button 
          className={'tab-btn' + (activeTab === 'records' ? ' active' : '')} 
          onClick={() => setActiveTab('records')}
        >
          Records
        </button>
        <button 
          className={'tab-btn' + (activeTab === 'inventory' ? ' active' : '')} 
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
      </div>
      
      {/* LIVE QUEUE TAB */}
      {activeTab === 'queue' && (
        <div className={`ph-queue-wrap${selectedPrescription ? ' has-detail' : ''}`}>
          {/* Prescriptions Table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Active Prescriptions</span>
            </div>
            <div className="table-wrapper">
              {liveQueue.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Patient</th>
                      <th className="ph-doctor-col">Doctor</th>
                      <th className="ph-time-col">Time</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveQueue.map(prescription => (
                      <tr 
                        key={prescription.id}
                        onClick={() => selectPrescription(prescription.id)}
                        style={{
                          cursor: 'pointer',
                          background: selectedPrescription?.id === prescription.id ? 'rgba(91,124,153,0.05)' : 'white'
                        }}
                      >
                        <td>
                          <strong style={{fontFamily:'monospace',fontSize:'15px'}}>
                            #{prescription.token_number || prescription.pickup_token}
                          </strong>
                        </td>
                        <td>{prescription.patient_name}</td>
                        <td className="ph-doctor-col">{prescription.doctor_name}</td>
                        <td className="ph-time-col" style={{fontSize:'12px',color:'var(--text-muted)'}}>
                          {formatDate(prescription.created_at)}
                        </td>
                        <td>{statusBadge(prescription.pharmacy_status)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {getActionButton(prescription)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <Pill size={40} className="empty-state-icon" style={{color: 'var(--text-muted)', marginBottom: '10px'}} />
                  <p>No active prescriptions</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Selected Prescription Detail */}
          {selectedPrescription && (
            <div className="card ph-detail-panel" style={{position:'sticky',top:'20px',maxHeight:'calc(100vh - 100px)',overflowY:'auto'}}>
              <div className="card-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span className="card-title">Prescription Details</span>
                <button 
                  className="btn btn-sm"
                  onClick={() => setSelectedPrescription(null)}
                  style={{padding:'4px 8px'}}
                >
                  ✕
                </button>
              </div>
              <div className="card-body">
                <div style={{marginBottom:'16px'}}>
                  <div style={{fontSize:'11px',color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'4px'}}>
                    Token Number
                  </div>
                  <div style={{fontSize:'24px',fontWeight:'800',fontFamily:'monospace',color:'var(--primary)'}}>
                    #{selectedPrescription.token_number || selectedPrescription.pickup_token}
                  </div>
                </div>
                
                <div style={{marginBottom:'16px'}}>
                  <div style={{fontSize:'12px',fontWeight:'600',marginBottom:'8px'}}>Patient</div>
                  <div>{selectedPrescription.patient_name}</div>
                </div>
                
                <div style={{marginBottom:'16px'}}>
                  <div style={{fontSize:'12px',fontWeight:'600',marginBottom:'8px'}}>Doctor</div>
                  <div>{selectedPrescription.doctor_name}</div>
                </div>
                
                <div style={{marginBottom:'16px'}}>
                  <div style={{fontSize:'12px',fontWeight:'600',marginBottom:'8px'}}>Status</div>
                  {statusBadge(selectedPrescription.pharmacy_status)}
                </div>
                
                <div style={{marginBottom:'16px'}}>
                  <div style={{fontSize:'12px',fontWeight:'600',marginBottom:'8px'}}>Medicines</div>
                  <ul style={{listStyle:'none',padding:0,margin:0}}>
                    {selectedPrescription.prescription_data?.map((med, i) => (
                      <li key={i} style={{
                        background:'rgba(91,124,153,0.05)',
                        padding:'10px 12px',
                        borderRadius:'var(--radius)',
                        marginBottom:'8px'
                      }}>
                        <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'4px'}}>
                          {med.name}
                        </div>
                        <div style={{fontSize:'12px',color:'var(--text-muted)'}}>
                          {med.dosage} • {med.frequency} • {med.duration}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {selectedPrescription.pharmacy_notes && (
                  <div style={{marginBottom:'16px'}}>
                    <div style={{fontSize:'12px',fontWeight:'600',marginBottom:'8px'}}>Notes</div>
                    <div style={{
                      background:'white',
                      padding:'10px 12px',
                      borderRadius:'var(--radius)',
                      border:'1px solid var(--border)',
                      fontSize:'13px'
                    }}>
                      {selectedPrescription.pharmacy_notes}
                    </div>
                  </div>
                )}
                
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {selectedPrescription.pharmacy_status !== 'dispensed' && selectedPrescription.pharmacy_status !== 'cancelled' && (
                    <>
                      {getActionButton(selectedPrescription)}
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => updatePrescriptionStatus(selectedPrescription.id, 'cancelled')}
                        disabled={loading}
                      >
                        Cancel Prescription
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* RECORDS TAB */}
      {activeTab === 'records' && (
        <div>
          {/* Filters */}
          <div className="card" style={{marginBottom:'20px'}}>
            <div className="card-body">
              <div className="form-row ph-filter-row">
                <div className="form-group">
                  <label>Search</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Patient name or token..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    className="form-control"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="dispensed">Dispensed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>From Date</label>
                  <input 
                    type="date"
                    className="form-control"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>To Date</label>
                  <input 
                    type="date"
                    className="form-control"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div style={{display:'flex',alignItems:'flex-end'}}>
                  <button 
                    className="btn btn-primary"
                    onClick={loadRecords}
                    disabled={loading}
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Records Table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Prescription Records</span>
              <div style={{fontSize:'13px',color:'var(--text-muted)'}}>
                {recordsTotal} total records
              </div>
            </div>
            <div className="table-wrapper">
              {records.length > 0 ? (
                <>
                  <table>
                    <thead>
                      <tr>
                        <th className="ph-id-col">ID</th>
                        <th>Token</th>
                        <th>Patient</th>
                        <th className="ph-records-doctor-col">Doctor</th>
                        <th className="ph-date-col">Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(record => (
                        <tr key={record.id}>
                          <td className="ph-id-col"><strong>#{record.id}</strong></td>
                          <td style={{fontFamily:'monospace'}}>
                            {record.token_number || record.pickup_token}
                          </td>
                          <td>{record.patient_name}</td>
                          <td className="ph-records-doctor-col">{record.doctor_name}</td>
                          <td className="ph-date-col" style={{fontSize:'12px'}}>{formatDate(record.created_at)}</td>
                          <td>{statusBadge(record.pharmacy_status)}</td>
                          <td>
                            <button 
                              className="btn btn-outline btn-xs"
                              onClick={() => {
                                selectPrescription(record.id);
                                setActiveTab('queue');
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  {recordsPages > 1 && (
                    <div style={{
                      display:'flex',
                      justifyContent:'center',
                      alignItems:'center',
                      gap:'8px',
                      padding:'16px'
                    }}>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => setRecordsPage(p => Math.max(1, p - 1))}
                        disabled={recordsPage === 1}
                      >
                        Previous
                      </button>
                      <span style={{fontSize:'13px',color:'var(--text-muted)'}}>
                        Page {recordsPage} of {recordsPages}
                      </span>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => setRecordsPage(p => Math.min(recordsPages, p + 1))}
                        disabled={recordsPage === recordsPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <Clipboard size={40} className="empty-state-icon" style={{color: 'var(--text-muted)', marginBottom: '10px'}} />
                  <p>No records found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Medicine Inventory</span>
          </div>
          <div className="table-wrapper">
            {medicines.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Medicine Name</th>
                    <th className="ph-cat-col">Category</th>
                    <th className="ph-batch-col">Batch #</th>
                    <th className="ph-expiry-col">Expiry Date</th>
                    <th>Stock</th>
                    <th className="ph-price-col">Price</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map(medicine => (
                    <tr key={medicine.id}>
                      <td>
                        <div style={{fontWeight:'600'}}>{medicine.name}</div>
                        {medicine.generic_name && (
                          <div style={{fontSize:'11px',color:'var(--text-muted)'}}>
                            {medicine.generic_name}
                          </div>
                        )}
                      </td>
                      <td className="ph-cat-col">{medicine.category || '—'}</td>
                      <td className="ph-batch-col" style={{fontFamily:'monospace',fontSize:'12px'}}>
                        {medicine.batch_number || '—'}
                      </td>
                      <td className="ph-expiry-col" style={{fontSize:'12px'}}>
                        {medicine.expiry_date ? new Date(medicine.expiry_date).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <strong style={{fontSize:'15px'}}>{medicine.stock_quantity}</strong>
                      </td>
                      <td className="ph-price-col">₹{medicine.price_per_unit?.toFixed(2)}</td>
                      <td>{stockStatusBadge(medicine)}</td>
                      <td>
                        <button 
                          className="btn btn-outline btn-xs"
                          onClick={() => {
                            setEditingMedicine(medicine);
                            setShowMedicineModal(true);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <Pill size={40} className="empty-state-icon" style={{color: 'var(--text-muted)', marginBottom: '10px'}} />
                <p>No medicines in inventory</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Medicine Edit Modal */}
      {showMedicineModal && editingMedicine && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{fontSize: '18px', fontWeight: '700'}}>Update Medicine</h3>
              <button 
                onClick={() => {
                  setShowMedicineModal(false);
                  setEditingMedicine(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{padding: '24px'}}>
              <form onSubmit={(e) => {
                e.preventDefault();
                updateMedicine(editingMedicine.id, editingMedicine);
              }}>
                <div className="form-row ph-modal-form-row">
                  <div className="form-group">
                    <label>Stock Quantity</label>
                    <input 
                      type="number"
                      className="form-control"
                      value={editingMedicine.stock_quantity}
                      onChange={(e) => setEditingMedicine({...editingMedicine, stock_quantity: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Price Per Unit</label>
                    <input 
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={editingMedicine.price_per_unit}
                      onChange={(e) => setEditingMedicine({...editingMedicine, price_per_unit: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row ph-modal-form-row">
                  <div className="form-group">
                    <label>Batch Number</label>
                    <input 
                      type="text"
                      className="form-control"
                      value={editingMedicine.batch_number || ''}
                      onChange={(e) => setEditingMedicine({...editingMedicine, batch_number: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input 
                      type="date"
                      className="form-control"
                      value={editingMedicine.expiry_date ? editingMedicine.expiry_date.split('T')[0] : ''}
                      onChange={(e) => setEditingMedicine({...editingMedicine, expiry_date: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <input 
                      type="checkbox"
                      checked={editingMedicine.is_available}
                      onChange={(e) => setEditingMedicine({...editingMedicine, is_available: e.target.checked})}
                    />
                    <span>Medicine is available</span>
                  </label>
                </div>
                
                <div style={{display:'flex',gap:'12px',marginTop:'24px'}}>
                  <button type="submit" className="btn btn-primary" style={{flex:1}} disabled={loading}>
                    {loading ? 'Updating...' : 'Update Medicine'}
                  </button>
                  <button 
                    type="button"
                    className="btn btn-outline"
                    style={{flex:1}}
                    onClick={() => {
                      setShowMedicineModal(false);
                      setEditingMedicine(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyDashboard;
