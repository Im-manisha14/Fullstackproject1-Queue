import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pharmacyAPI, ensureArray } from '../utils/api';
import socketService from '../utils/socket';
import toast from 'react-hot-toast';
import {
  FileText,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  Activity,
  Search
} from 'lucide-react';
import Button from '../components/common/Button';
import InputField from '../components/common/InputField';
import Card from '../components/common/Card';

const PharmacyDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInitialData();
    setupSocketListeners();

    return () => {
      socketService.off('new_prescription');
    };
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const setupSocketListeners = () => {
    socketService.on('new_prescription', (data) => {
      toast.success(`New prescription received for ${data.patient_name}`);
      loadPrescriptions();
    });
  };

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadPrescriptions(),
        loadMedicines(),
        loadLowStock()
      ]);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const loadPrescriptions = async () => {
    try {
      const response = await pharmacyAPI.getPrescriptions(statusFilter === 'all' ? '' : statusFilter);
      setPrescriptions(ensureArray(response.data, 'prescriptions'));
    } catch (error) {
      // toast.error('Failed to load prescriptions');
    }
  };

  const loadMedicines = async () => {
    try {
      const response = await pharmacyAPI.getMedicines();
      setMedicines(ensureArray(response.data, 'medicines'));
    } catch (error) {
      // toast.error('Failed to load medicines');
    }
  };

  const loadLowStock = async () => {
    try {
      const response = await pharmacyAPI.getLowStock();
      setLowStock(ensureArray(response.data, 'medicines'));
    } catch (error) {
      // toast.error('Failed to load low stock');
    }
  };

  const updatePrescriptionStatus = async (prescriptionId, newStatus, notes = '') => {
    try {
      // API expects { status, pharmacy_notes } or similar
      await pharmacyAPI.updatePrescriptionStatus(prescriptionId, {
        status: newStatus,
        pharmacy_notes: notes
      });

      toast.success(`Prescription status updated to ${newStatus}`);
      await loadPrescriptions();
    } catch (error) {
      console.error('Failed to update status', error);
      toast.error('Failed to update prescription status');
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-teal-100 text-teal-800',
      dispensed: 'bg-teal-100 text-teal-800'
    };

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 border-yellow-500',
      preparing: 'bg-blue-100 border-blue-500',
      ready: 'bg-teal-100 border-teal-500',
      dispensed: 'bg-teal-100 border-teal-500'
    };
    return colors[status] || 'bg-gray-100 border-gray-500';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPrescriptions = prescriptions.filter(prescription =>
    prescription.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.pickup_token?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMedicines = medicines.filter(medicine =>
    medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.generic_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderPrescriptions = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Prescription Management</h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <InputField
            placeholder="Search prescriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
            className="w-full sm:w-64"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input w-full sm:w-auto"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="dispensed">Dispensed</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['pending', 'preparing', 'ready', 'dispensed'].map(status => {
          const count = prescriptions.filter(p => p.pharmacy_status === status).length;
          const Icon = {
            pending: Clock,
            preparing: Activity,
            ready: CheckCircle,
            dispensed: Package
          }[status];

          const colorClass = {
            pending: 'text-yellow-600 bg-yellow-100',
            preparing: 'text-blue-600 bg-blue-100',
            ready: 'text-teal-600 bg-teal-100',
            dispensed: 'text-teal-600 bg-teal-100'
          }[status];

          return (
            <Card key={status}>
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600 capitalize">{status}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Prescriptions List */}
      {filteredPrescriptions.length > 0 ? (
        <div className="space-y-4">
          {filteredPrescriptions.map(prescription => (
            <Card key={prescription.id} className={`border-l-4 ${getStatusColor(prescription.pharmacy_status).split(' ')[1]}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{prescription.patient_name}</h3>
                    {getStatusBadge(prescription.pharmacy_status)}
                  </div>
                  <p className="text-gray-600">Doctor: {prescription.doctor_name}</p>
                  <p className="text-gray-600">{formatDate(prescription.created_at)}</p>
                  {prescription.pickup_token && (
                    <p className="text-sm text-teal-600 font-medium mt-1">
                      Pickup Token: <strong>{prescription.pickup_token}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Prescription Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-3">Prescribed Medicines:</h4>
                <div className="space-y-2">
                  {Array.isArray(prescription.prescription_data) ? (
                    prescription.prescription_data.map((medicine, index) => (
                      <div key={index} className="flex justify-between items-start bg-white p-2 rounded shadow-sm">
                        <div>
                          <p className="font-medium">{medicine.name}</p>
                          <p className="text-sm text-gray-600">
                            {medicine.dosage} • {medicine.frequency} • {medicine.duration}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No prescription data available.</div>
                  )}
                </div>
              </div>

              {/* Pharmacy Notes */}
              {prescription.pharmacy_notes && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-800">
                    <strong>Pharmacy Notes:</strong> {prescription.pharmacy_notes}
                  </p>
                </div>
              )}

              {/* Status Update Buttons */}
              {prescription.pharmacy_status !== 'dispensed' && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  {prescription.pharmacy_status === 'pending' && (
                    <Button
                      onClick={() => updatePrescriptionStatus(prescription.id, 'preparing', 'Started preparing medicines')}
                      variant="secondary"
                      size="small"
                    >
                      Start Preparing
                    </Button>
                  )}

                  {prescription.pharmacy_status === 'preparing' && (
                    <Button
                      onClick={() => updatePrescriptionStatus(prescription.id, 'ready', 'Medicines are ready for pickup')}
                      variant="secondary"
                      size="small"
                    >
                      Mark Ready
                    </Button>
                  )}

                  {prescription.pharmacy_status === 'ready' && (
                    <Button
                      onClick={() => updatePrescriptionStatus(prescription.id, 'dispensed', 'Medicines dispensed to patient')}
                      variant="primary"
                      size="small"
                    >
                      Mark Dispensed
                    </Button>
                  )}

                  {/* Custom notes option */}
                  <button
                    onClick={() => {
                      const notes = prompt('Add custom notes:');
                      if (notes) {
                        updatePrescriptionStatus(prescription.id, prescription.pharmacy_status, notes);
                      }
                    }}
                    className="text-sm text-teal-600 hover:text-teal-800 font-medium px-3 py-1.5"
                  >
                    Add Notes
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No prescriptions found</p>
        </div>
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Medicine Inventory</h2>
        <InputField
          placeholder="Search medicines..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={Search}
        />
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <Card className="border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-red-800">Low Stock Alert</h3>
          </div>
          <div className="space-y-2">
            {lowStock.map(medicine => (
              <div key={medicine.id} className="flex justify-between items-center bg-white p-2 rounded border border-red-100">
                <span className="font-medium text-red-800">{medicine.name}</span>
                <span className="text-sm text-red-600 font-medium">
                  Stock: {medicine.stock_quantity} (Min: {medicine.reorder_level})
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Medicines Grid */}
      {filteredMedicines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMedicines.map(medicine => (
            <Card key={medicine.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg text-gray-900">{medicine.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${medicine.stock_quantity <= medicine.reorder_level
                  ? 'bg-red-100 text-red-800'
                  : 'bg-teal-100 text-teal-800'
                  }`}>
                  Stock: {medicine.stock_quantity}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                {medicine.generic_name && (
                  <p><strong>Generic:</strong> {medicine.generic_name}</p>
                )}
                <p><strong>Category:</strong> {medicine.category}</p>
                <p><strong>Strength:</strong> {medicine.strength}</p>
                <p><strong>Form:</strong> {medicine.form}</p>
                <p><strong>Price:</strong> ₹{medicine.price_per_unit}</p>
                {medicine.manufacturer && (
                  <p><strong>Manufacturer:</strong> {medicine.manufacturer}</p>
                )}
                {medicine.expiry_date && (
                  <p><strong>Expiry:</strong> {formatDate(medicine.expiry_date)}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No medicines found</p>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
    { id: 'inventory', label: 'Inventory', icon: Package }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
                <i className="fas fa-hospital-user text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Hospital Information System</h1>
                <p className="text-xs text-teal-600 font-medium">Pharmacy Portal</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>

              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <i className="fas fa-sign-out-alt text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8 overflow-x-auto">
          <nav className="flex space-x-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                    ? 'bg-teal-50 text-teal-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'prescriptions' && renderPrescriptions()}
          {activeTab === 'inventory' && renderInventory()}
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;