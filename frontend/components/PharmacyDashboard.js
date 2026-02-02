// Pharmacy Dashboard Component
const PharmacyDashboard = ({ user }) => {
    const [prescriptions, setPrescriptions] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [activeTab, setActiveTab] = useState('prescriptions');
    const [selectedStatus, setSelectedStatus] = useState('sent_to_pharmacy');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadPharmacyData();
    }, [selectedStatus]);

    const loadPharmacyData = async () => {
        setIsLoading(true);
        try {
            // Load prescriptions
            const prescriptionsResponse = await apiCall(`/pharmacy/prescriptions?status=${selectedStatus}`);
            setPrescriptions(prescriptionsResponse);

            // Load inventory
            const inventoryResponse = await apiCall('/pharmacy/inventory');
            setInventory(inventoryResponse);
        } catch (err) {
            setError('Error loading pharmacy data');
            console.error('Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const updatePrescriptionStatus = async (prescriptionId, newStatus) => {
        try {
            await apiCall(`/pharmacy/prescriptions/${prescriptionId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            
            // Reload prescriptions
            loadPharmacyData();
        } catch (err) {
            setError('Error updating prescription status');
            console.error('Error:', err);
        }
    };

    const getLowStockItems = () => {
        return inventory.filter(item => item.low_stock);
    };

    if (isLoading) {
        return <div className="loading">Loading pharmacy dashboard...</div>;
    }

    return (
        <div className="pharmacy-dashboard">
            <div className="dashboard-header">
                <h1>Welcome, {user.full_name}</h1>
                <p className="user-role">Pharmacy Portal</p>
                <div className="quick-stats">
                    <div className="stat-card">
                        <h3>{prescriptions.length}</h3>
                        <p>Pending Prescriptions</p>
                    </div>
                    <div className="stat-card">
                        <h3>{inventory.length}</h3>
                        <p>Inventory Items</p>
                    </div>
                    <div className="stat-card alert">
                        <h3>{getLowStockItems().length}</h3>
                        <p>Low Stock Alerts</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-nav">
                <button
                    className={activeTab === 'prescriptions' ? 'nav-btn active' : 'nav-btn'}
                    onClick={() => setActiveTab('prescriptions')}
                >
                    Prescription Queue
                </button>
                <button
                    className={activeTab === 'inventory' ? 'nav-btn active' : 'nav-btn'}
                    onClick={() => setActiveTab('inventory')}
                >
                    Inventory Management
                </button>
                <button
                    className={activeTab === 'reports' ? 'nav-btn active' : 'nav-btn'}
                    onClick={() => setActiveTab('reports')}
                >
                    Reports
                </button>
            </div>

            <div className="dashboard-content">
                {error && <div className="error-message">{error}</div>}

                {activeTab === 'prescriptions' && (
                    <div className="prescriptions-section">
                        <div className="section-header">
                            <h2>Prescription Fulfillment Queue</h2>
                            <div className="status-filter">
                                <label htmlFor="statusFilter">Filter by Status:</label>
                                <select
                                    id="statusFilter"
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                >
                                    <option value="sent_to_pharmacy">New Prescriptions</option>
                                    <option value="processing">In Progress</option>
                                    <option value="ready_for_pickup">Ready for Pickup</option>
                                    <option value="dispensed">Dispensed</option>
                                </select>
                            </div>
                        </div>
                        
                        {prescriptions.length === 0 ? (
                            <div className="empty-state">
                                <p>No prescriptions with status: {selectedStatus.replace('_', ' ')}</p>
                            </div>
                        ) : (
                            <div className="prescriptions-queue">
                                {prescriptions.map(prescription => (
                                    <div key={prescription.id} className="prescription-card pharmacy-view">
                                        <div className="prescription-header">
                                            <div className="prescription-info">
                                                <h3>Patient: {prescription.patient_name}</h3>
                                                <p><strong>Phone:</strong> {prescription.patient_phone}</p>
                                                <p><strong>Prescribed by:</strong> Dr. {prescription.doctor_name}</p>
                                                <p><strong>Date:</strong> {new Date(prescription.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`status-badge ${prescription.status}`}>
                                                {prescription.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        
                                        <div className="medicines-list">
                                            <h4>Medicines to Dispense:</h4>
                                            {prescription.medicines.map((medicine, index) => (
                                                <div key={index} className="medicine-item pharmacy-item">
                                                    <div className="medicine-details">
                                                        <p><strong>{medicine.name}</strong></p>
                                                        <p>Dosage: {medicine.dosage}</p>
                                                        <p>Quantity: {medicine.quantity}</p>
                                                        <p>Frequency: {medicine.frequency}</p>
                                                        <p>Duration: {medicine.duration}</p>
                                                    </div>
                                                    <div className="stock-check">
                                                        {/* Check inventory status */}
                                                        <span className="stock-status available">✅ In Stock</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {prescription.notes && (
                                            <div className="prescription-notes">
                                                <p><strong>Doctor's Notes:</strong> {prescription.notes}</p>
                                            </div>
                                        )}

                                        <div className="prescription-actions">
                                            {prescription.status === 'sent_to_pharmacy' && (
                                                <button 
                                                    className="primary-btn"
                                                    onClick={() => updatePrescriptionStatus(prescription.id, 'processing')}
                                                >
                                                    Start Processing
                                                </button>
                                            )}
                                            {prescription.status === 'processing' && (
                                                <>
                                                    <button 
                                                        className="success-btn"
                                                        onClick={() => updatePrescriptionStatus(prescription.id, 'ready_for_pickup')}
                                                    >
                                                        Mark Ready for Pickup
                                                    </button>
                                                    <button 
                                                        className="danger-btn"
                                                        onClick={() => updatePrescriptionStatus(prescription.id, 'cancelled')}
                                                    >
                                                        Cancel (Out of Stock)
                                                    </button>
                                                </>
                                            )}
                                            {prescription.status === 'ready_for_pickup' && (
                                                <button 
                                                    className="success-btn"
                                                    onClick={() => updatePrescriptionStatus(prescription.id, 'dispensed')}
                                                >
                                                    Mark as Dispensed
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="inventory-section">
                        <div className="section-header">
                            <h2>Inventory Management</h2>
                            <button className="primary-btn">Add New Item</button>
                        </div>

                        {getLowStockItems().length > 0 && (
                            <div className="alert-section">
                                <h3>⚠️ Low Stock Alerts</h3>
                                <div className="low-stock-items">
                                    {getLowStockItems().map(item => (
                                        <div key={item.id} className="alert-item">
                                            <p><strong>{item.medicine_name}</strong></p>
                                            <p>Current Stock: <span className="low-stock-count">{item.quantity_in_stock}</span></p>
                                            <p>Minimum Required: {item.minimum_stock_alert}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="inventory-list">
                            <div className="inventory-header">
                                <h3>All Inventory Items</h3>
                                <div className="search-filter">
                                    <input type="text" placeholder="Search medicines..." />
                                </div>
                            </div>
                            
                            {inventory.length === 0 ? (
                                <div className="empty-state">
                                    <p>No inventory items found</p>
                                </div>
                            ) : (
                                <div className="inventory-grid">
                                    {inventory.map(item => (
                                        <div key={item.id} className={`inventory-card ${item.low_stock ? 'low-stock' : ''}`}>
                                            <div className="item-header">
                                                <h4>{item.medicine_name}</h4>
                                                {item.low_stock && <span className="low-stock-badge">Low Stock</span>}
                                            </div>
                                            <div className="item-details">
                                                <p><strong>Generic:</strong> {item.generic_name || 'N/A'}</p>
                                                <p><strong>Manufacturer:</strong> {item.manufacturer || 'N/A'}</p>
                                                <p><strong>Stock:</strong> {item.quantity_in_stock} units</p>
                                                <p><strong>Price:</strong> ${item.unit_price}</p>
                                                <p><strong>Min Alert:</strong> {item.minimum_stock_alert} units</p>
                                            </div>
                                            <div className="item-actions">
                                                <button className="secondary-btn">Update Stock</button>
                                                <button className="secondary-btn">Edit Details</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="reports-section">
                        <h2>Pharmacy Reports</h2>
                        <div className="reports-grid">
                            <div className="report-card">
                                <h3>Daily Dispensing Report</h3>
                                <p>View prescriptions dispensed today</p>
                                <button className="primary-btn">Generate Report</button>
                            </div>
                            <div className="report-card">
                                <h3>Inventory Valuation</h3>
                                <p>Current inventory value and analysis</p>
                                <button className="primary-btn">Generate Report</button>
                            </div>
                            <div className="report-card">
                                <h3>Low Stock Report</h3>
                                <p>Items requiring restocking</p>
                                <button className="primary-btn">Generate Report</button>
                            </div>
                            <div className="report-card">
                                <h3>Monthly Summary</h3>
                                <p>Monthly dispensing and inventory summary</p>
                                <button className="primary-btn">Generate Report</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};