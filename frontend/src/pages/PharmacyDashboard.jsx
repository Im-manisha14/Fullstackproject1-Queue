import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Pill, ClipboardList, Package, ChevronRight, X, RefreshCw, Plus } from 'lucide-react';
import './PharmacyDashboard.css';

const PharmacyDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('queue');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Live Queue
  const [liveQueue, setLiveQueue] = useState([]);
  const [selectedPx, setSelectedPx] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Records
  const [records, setRecords] = useState([]);
  const [recPage, setRecPage] = useState(1);
  const [recTotal, setRecTotal] = useState(0);
  const [recPages, setRecPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Inventory
  const [medicines, setMedicines] = useState([]);
  const [editingMed, setEditingMed] = useState(null);
  const [showMedModal, setShowMedModal] = useState(false);
  const [isAddMed, setIsAddMed] = useState(false);

  const pollRef = useRef(null);
  const BLANK_MED = { name:'', generic_name:'', category:'', strength:'', form:'',
    batch_number:'', price_per_unit:0, stock_quantity:0, reorder_level:10,
    expiry_date:'', manufacturer:'', is_available:true };

  /* ── Polling ── */
  useEffect(() => {
    if (activeTab === 'queue') {
      loadLiveQueue();
      pollRef.current = setInterval(loadLiveQueue, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'records') loadRecords();
  }, [recPage, statusFilter, activeTab]);

  useEffect(() => {
    if (activeTab === 'inventory') loadInventory();
  }, [activeTab]);

  /* ── API ── */
  const loadLiveQueue = async () => {
    try {
      const r = await api.get('/api/pharmacy/prescriptions/today');
      setLiveQueue(r.data);
      setLastUpdate(Date.now());
    } catch {}
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const p = new URLSearchParams({ page: recPage, limit: 20, status: statusFilter });
      if (searchQuery) p.append('search', searchQuery);
      if (dateFrom) p.append('date_from', dateFrom);
      if (dateTo) p.append('date_to', dateTo);
      const r = await api.get(`/api/pharmacy/prescriptions?${p}`);
      setRecords(r.data.prescriptions || []);
      setRecTotal(r.data.total || 0);
      setRecPages(r.data.pages || 0);
    } catch { setError('Failed to load records'); }
    finally { setLoading(false); }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      const r = await api.get('/api/pharmacy/medicines');
      setMedicines(r.data);
    } catch { setError('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      setActionLoading(true);
      await api.put(`/api/pharmacy/prescriptions/${id}/status`, { status });
      showSuccess(`Marked as ${status}`);
      await loadLiveQueue();
      if (status === 'dispensed' || status === 'cancelled') {
        setSelectedPx(null);
      } else {
        const r = await api.get(`/api/pharmacy/prescriptions/${id}`);
        setSelectedPx(r.data);
      }
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to update';
      const issues = e.response?.data?.stock_issues;
      setError(issues ? `${msg}: ${issues.join('; ')}` : msg);
      setTimeout(() => setError(''), 5000);
    } finally { setActionLoading(false); }
  };

  const saveMedicine = async (data) => {
    try {
      setActionLoading(true);
      if (isAddMed) {
        await api.post('/api/pharmacy/medicines', data);
        showSuccess('Medicine added to inventory');
      } else {
        await api.put(`/api/pharmacy/medicines/${data.id}`, data);
        showSuccess('Medicine updated');
      }
      setShowMedModal(false);
      setEditingMed(null);
      await loadInventory();
    } catch { setError('Failed to save medicine'); setTimeout(() => setError(''), 3000); }
    finally { setActionLoading(false); }
  };

  const selectPx = async (id) => {
    try {
      const r = await api.get(`/api/pharmacy/prescriptions/${id}`);
      setSelectedPx(r.data);
    } catch { setError('Failed to load prescription'); setTimeout(() => setError(''), 3000); }
  };

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  /* ── Helpers ── */
  const timeAgo = (ts) => {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return 'Just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
      + ' ' + new Date(d).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  };

  const fmtTime = (t) => {
    if (!t) return '—';
    const m = String(t).match(/^(\d{1,2}):(\d{2})/);
    if (!m) return t;
    let h = parseInt(m[1], 10);
    const min = m[2], ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${min} ${ap}`;
  };

  const phBadge = (status) => {
    const map = {
      pending:   <span className="ph-badge ph-badge-pending">● New</span>,
      preparing: <span className="ph-badge ph-badge-preparing">⟳ Preparing</span>,
      ready:     <span className="ph-badge ph-badge-ready">✓ Ready</span>,
      dispensed: <span className="ph-badge ph-badge-dispensed">Dispensed</span>,
      cancelled: <span className="ph-badge ph-badge-cancelled">Cancelled</span>,
    };
    return map[status] || <span className="ph-badge ph-badge-dispensed">{status}</span>;
  };

  const actionBtn = (px, compact = false) => {
    const s = px.pharmacy_status;
    const sz = compact ? 'ph-btn ph-btn-sm' : 'ph-btn ph-btn-full';
    if (s === 'pending')   return <button className={`${sz} ph-btn-amber`}   onClick={e => { e.stopPropagation(); updateStatus(px.id, 'preparing'); }} disabled={actionLoading}>Start Preparing</button>;
    if (s === 'preparing') return <button className={`${sz} ph-btn-green`}   onClick={e => { e.stopPropagation(); updateStatus(px.id, 'ready'); }}    disabled={actionLoading}>Mark Ready</button>;
    if (s === 'ready')     return <button className={`${sz} ph-btn-primary`} onClick={e => { e.stopPropagation(); updateStatus(px.id, 'dispensed'); }} disabled={actionLoading}>Dispense ✓</button>;
    if (s === 'dispensed') return <span style={{fontSize:'12px',color:'#6B7280'}}>✓ Done</span>;
    return null;
  };

  const stockClass = (qty) => qty < 10 ? 'critical' : qty < 50 ? 'low' : 'ok';
  const stockPct   = (qty, reorder) => Math.min(100, Math.round((qty / Math.max(reorder * 3, 100)) * 100));

  /* ── Stats ── */
  const stats = {
    pending:   liveQueue.filter(p => p.pharmacy_status === 'pending').length,
    preparing: liveQueue.filter(p => p.pharmacy_status === 'preparing').length,
    ready:     liveQueue.filter(p => p.pharmacy_status === 'ready').length,
    total:     liveQueue.length,
  };

  return (
    <div className="ph-root">
      {/* ══════════════════════ HEADER ══════════════════════ */}
      <div className="ph-hdr">
        <div className="ph-hdr-left">
          <h2>💊 Pharmacy Portal</h2>
          <div className="ph-hdr-date">
            {new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
        </div>
        <div className="ph-hdr-right">
          {activeTab === 'queue' && (
            <div className="ph-live-dot">
              <div className="ph-live-pulse"></div>
              LIVE · {timeAgo(lastUpdate)}
            </div>
          )}
          <span className="ph-stat-pill blue">{stats.pending} Pending</span>
          <span className="ph-stat-pill amber">{stats.preparing} Preparing</span>
          <span className="ph-stat-pill green">{stats.ready} Ready</span>
        </div>
      </div>

      <div style={{padding: '0 0 32px'}}>
        {/* Alerts */}
        {error   && <div className="ph-alert ph-alert-error"   style={{marginBottom:'16px'}}>⚠ {error}</div>}
        {success && <div className="ph-alert ph-alert-success" style={{marginBottom:'16px'}}>✓ {success}</div>}

        {/* Stats Row (queue tab) */}
        {activeTab === 'queue' && (
          <div className="ph-stats-row" style={{marginBottom:'20px'}}>
            <div className="ph-stat-card">
              <div className="ph-stat-icon blue"><Pill size={18}/></div>
              <div>
                <div className="ph-stat-num">{stats.pending}</div>
                <div className="ph-stat-lbl">Pending</div>
              </div>
            </div>
            <div className="ph-stat-card">
              <div className="ph-stat-icon amber">⟳</div>
              <div>
                <div className="ph-stat-num">{stats.preparing}</div>
                <div className="ph-stat-lbl">Preparing</div>
              </div>
            </div>
            <div className="ph-stat-card">
              <div className="ph-stat-icon green">✓</div>
              <div>
                <div className="ph-stat-num">{stats.ready}</div>
                <div className="ph-stat-lbl">Ready</div>
              </div>
            </div>
            <div className="ph-stat-card">
              <div className="ph-stat-icon teal"><Package size={18}/></div>
              <div>
                <div className="ph-stat-num">{stats.total}</div>
                <div className="ph-stat-lbl">Active Today</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="ph-tabs">
          <button className={`ph-tab${activeTab==='queue' ? ' active' : ''}`}     onClick={() => setActiveTab('queue')}>
            <Pill size={13} style={{marginRight:'5px',verticalAlign:'middle'}}/>Live Queue
          </button>
          <button className={`ph-tab${activeTab==='records' ? ' active' : ''}`}   onClick={() => setActiveTab('records')}>
            <ClipboardList size={13} style={{marginRight:'5px',verticalAlign:'middle'}}/>Records
          </button>
          <button className={`ph-tab${activeTab==='inventory' ? ' active' : ''}`} onClick={() => setActiveTab('inventory')}>
            <Package size={13} style={{marginRight:'5px',verticalAlign:'middle'}}/>Inventory
          </button>
        </div>

        {/* ══════════════════════ LIVE QUEUE TAB ══════════════════════ */}
        {activeTab === 'queue' && (
          <div className={`ph-queue-layout${selectedPx ? ' with-detail' : ''}`}>

            {/* Left: Prescriptions list */}
            <div className="ph-card">
              <div className="ph-card-hdr">
                <span className="ph-card-title">Active Prescriptions</span>
                <button className="ph-btn ph-btn-ghost ph-btn-xs" onClick={loadLiveQueue} title="Refresh">
                  <RefreshCw size={12}/>
                </button>
              </div>
              <div className="ph-table-wrap">
                {liveQueue.length > 0 ? (
                  <table className="ph-table">
                    <thead>
                      <tr>
                        <th>Token</th>
                        <th>Patient</th>
                        <th className="ph-col-hide-md">Doctor</th>
                        <th className="ph-col-hide-sm">Time</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveQueue.map(px => (
                        <tr
                          key={px.id}
                          onClick={() => selectPx(px.id)}
                          className={selectedPx?.id === px.id ? 'ph-row-selected' : ''}
                        >
                          <td><span className="ph-token">#{px.token_number || px.pickup_token || '—'}</span></td>
                          <td style={{fontWeight:'600'}}>{px.patient_name}</td>
                          <td className="ph-col-hide-md" style={{color:'var(--ph-text-muted)',fontSize:'12px'}}>{px.doctor_name}</td>
                          <td className="ph-col-hide-sm" style={{fontSize:'12px',color:'var(--ph-text-muted)'}}>{fmtTime(px.appointment_time)}</td>
                          <td>{phBadge(px.pharmacy_status)}</td>
                          <td>{actionBtn(px, true)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="ph-empty">
                    <div className="ph-empty-icon"><Pill size={26}/></div>
                    <h4>No active prescriptions</h4>
                    <p>Prescriptions appear here once a doctor completes a consultation</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Detail panel */}
            {selectedPx && (
              <div className="ph-card ph-detail">
                <div className="ph-card-hdr">
                  <span className="ph-card-title">Prescription Detail</span>
                  <button className="ph-close-btn" onClick={() => setSelectedPx(null)}><X size={14}/></button>
                </div>
                <div style={{padding:'16px'}}>

                  <div className="ph-detail-section">
                    <div className="ph-detail-label">Token</div>
                    <div className="ph-token-big">#{selectedPx.token_number || selectedPx.pickup_token || '—'}</div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
                    <div className="ph-detail-section" style={{margin:0}}>
                      <div className="ph-detail-label">Patient</div>
                      <div className="ph-detail-value">{selectedPx.patient_name}</div>
                    </div>
                    <div className="ph-detail-section" style={{margin:0}}>
                      <div className="ph-detail-label">Doctor</div>
                      <div className="ph-detail-value" style={{fontSize:'13px'}}>{selectedPx.doctor_name}</div>
                    </div>
                  </div>

                  <div className="ph-detail-section">
                    <div className="ph-detail-label">Status</div>
                    <div>{phBadge(selectedPx.pharmacy_status)}</div>
                  </div>

                  <div className="ph-detail-section">
                    <div className="ph-detail-label">Medicines ({(selectedPx.prescription_data?.medicines || []).length})</div>
                    {(selectedPx.prescription_data?.medicines || []).map((m, i) => (
                      <div key={i} className="ph-med-item">
                        <div className="ph-med-name">
                          {m.name}
                          {m.quantity && <span className="ph-med-qty">×{m.quantity}</span>}
                        </div>
                        <div className="ph-med-detail">{m.dosage} · {m.frequency} · {m.duration}</div>
                      </div>
                    ))}
                    {(selectedPx.prescription_data?.medicines || []).length === 0 && (
                      <div style={{fontSize:'12px',color:'var(--ph-text-muted)'}}>No medicines listed</div>
                    )}
                  </div>

                  {selectedPx.prescription_data?.notes && (
                    <div className="ph-detail-section">
                      <div className="ph-detail-label">Doctor's Notes</div>
                      <div className="ph-notes-box">{selectedPx.prescription_data.notes}</div>
                    </div>
                  )}

                  {selectedPx.pharmacy_notes && (
                    <div className="ph-detail-section">
                      <div className="ph-detail-label">Pharmacy Notes</div>
                      <div className="ph-notes-box">{selectedPx.pharmacy_notes}</div>
                    </div>
                  )}

                  {selectedPx.pharmacy_status !== 'dispensed' && selectedPx.pharmacy_status !== 'cancelled' && (
                    <div className="ph-detail-actions">
                      {actionBtn(selectedPx)}
                      <button
                        className="ph-btn ph-btn-danger ph-btn-full"
                        onClick={() => updateStatus(selectedPx.id, 'cancelled')}
                        disabled={actionLoading}
                      >
                        Cancel Prescription
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════ RECORDS TAB ══════════════════════ */}
        {activeTab === 'records' && (
          <div>
            <div className="ph-card" style={{marginBottom:'16px'}}>
              <div className="ph-filter-bar">
                <div className="ph-filter-group">
                  <span className="ph-filter-label">Search</span>
                  <input className="ph-input" placeholder="Patient name or token…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key==='Enter' && (setRecPage(1), loadRecords())}/>
                </div>
                <div className="ph-filter-group">
                  <span className="ph-filter-label">Status</span>
                  <select className="ph-input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setRecPage(1); }}>
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="dispensed">Dispensed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="ph-filter-group">
                  <span className="ph-filter-label">From</span>
                  <input type="date" className="ph-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
                </div>
                <div className="ph-filter-group">
                  <span className="ph-filter-label">To</span>
                  <input type="date" className="ph-input" value={dateTo} onChange={e => setDateTo(e.target.value)}/>
                </div>
                <div className="ph-filter-group">
                  <span className="ph-filter-label">&nbsp;</span>
                  <button className="ph-btn ph-btn-primary" onClick={() => { setRecPage(1); loadRecords(); }} disabled={loading}>Search</button>
                </div>
              </div>
            </div>

            <div className="ph-card">
              <div className="ph-card-hdr">
                <span className="ph-card-title">Prescription Records</span>
                <span className="ph-card-meta">{recTotal} total</span>
              </div>
              <div className="ph-table-wrap">
                {loading ? (
                  <div className="ph-spinner"><div className="ph-spinner-ring"></div></div>
                ) : records.length > 0 ? (
                  <table className="ph-table">
                    <thead>
                      <tr>
                        <th className="ph-col-hide-md">#</th>
                        <th>Token</th>
                        <th>Patient</th>
                        <th className="ph-col-hide-md">Doctor</th>
                        <th className="ph-col-hide-sm">Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id} className="ph-row-static">
                          <td className="ph-col-hide-md" style={{fontWeight:'700',color:'var(--ph-text-muted)',fontSize:'12px'}}>#{r.id}</td>
                          <td><span className="ph-token">#{r.token_number || r.pickup_token || '—'}</span></td>
                          <td style={{fontWeight:'600'}}>{r.patient_name}</td>
                          <td className="ph-col-hide-md" style={{fontSize:'12px',color:'var(--ph-text-muted)'}}>{r.doctor_name}</td>
                          <td className="ph-col-hide-sm" style={{fontSize:'11px',color:'var(--ph-text-muted)'}}>{fmtDate(r.created_at)}</td>
                          <td>{phBadge(r.pharmacy_status)}</td>
                          <td>
                            <button className="ph-btn ph-btn-ghost ph-btn-xs" onClick={() => { selectPx(r.id); setActiveTab('queue'); }}>
                              View <ChevronRight size={11}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="ph-empty">
                    <div className="ph-empty-icon"><ClipboardList size={26}/></div>
                    <h4>No records found</h4>
                    <p>Try adjusting your filters</p>
                  </div>
                )}
              </div>
              {recPages > 1 && (
                <div className="ph-pagination">
                  <button className="ph-btn ph-btn-ghost ph-btn-sm" onClick={() => setRecPage(p => Math.max(1, p-1))} disabled={recPage===1}>← Prev</button>
                  <span>Page {recPage} of {recPages}</span>
                  <button className="ph-btn ph-btn-ghost ph-btn-sm" onClick={() => setRecPage(p => Math.min(recPages, p+1))} disabled={recPage===recPages}>Next →</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════ INVENTORY TAB ══════════════════════ */}
        {activeTab === 'inventory' && (
          <div className="ph-card">
            <div className="ph-card-hdr">
              <span className="ph-card-title">Medicine Inventory</span>
              <button className="ph-btn ph-btn-primary ph-btn-sm" onClick={() => { setEditingMed({...BLANK_MED}); setIsAddMed(true); setShowMedModal(true); }}>
                <Plus size={13}/> Add Medicine
              </button>
            </div>
            <div className="ph-table-wrap">
              {loading ? (
                <div className="ph-spinner"><div className="ph-spinner-ring"></div></div>
              ) : medicines.length > 0 ? (
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th className="ph-col-hide-md">Category</th>
                      <th className="ph-col-hide-md">Batch</th>
                      <th className="ph-col-hide-sm">Expiry</th>
                      <th>Stock</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map(m => {
                      const sc = stockClass(m.stock_quantity);
                      const pct = stockPct(m.stock_quantity, m.reorder_level);
                      return (
                        <tr key={m.id} className="ph-row-static">
                          <td>
                            <div style={{fontWeight:'700',fontSize:'13px'}}>{m.name}</div>
                            {m.generic_name && <div style={{fontSize:'11px',color:'var(--ph-text-muted)'}}>{m.generic_name}</div>}
                          </td>
                          <td className="ph-col-hide-md" style={{fontSize:'12px',color:'var(--ph-text-muted)'}}>{m.category || '—'}</td>
                          <td className="ph-col-hide-md" style={{fontFamily:'monospace',fontSize:'11px',color:'var(--ph-text-muted)'}}>{m.batch_number || '—'}</td>
                          <td className="ph-col-hide-sm" style={{fontSize:'12px'}}>{m.expiry_date ? new Date(m.expiry_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}</td>
                          <td>
                            <div className="ph-stock-bar-wrap">
                              <div>
                                <span className={`ph-stock-num ${sc}`}>{m.stock_quantity}</span>
                              </div>
                              <div className="ph-stock-bar">
                                <div className={`ph-stock-fill ${sc}`} style={{width:`${pct}%`}}></div>
                              </div>
                            </div>
                          </td>
                          <td style={{fontWeight:'600'}}>₹{(m.price_per_unit||0).toFixed(2)}</td>
                          <td>
                            {sc === 'critical' && <span className="ph-badge ph-badge-cancelled">Critical</span>}
                            {sc === 'low' && <span className="ph-badge ph-badge-preparing">Low</span>}
                            {sc === 'ok' && <span className="ph-badge ph-badge-ready">OK</span>}
                          </td>
                          <td>
                            <button className="ph-btn ph-btn-ghost ph-btn-xs" onClick={() => { setEditingMed({...m}); setIsAddMed(false); setShowMedModal(true); }}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="ph-empty">
                  <div className="ph-empty-icon"><Package size={26}/></div>
                  <h4>No medicines in inventory</h4>
                  <p>Click "Add Medicine" to add stock</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════ MEDICINE MODAL ══════════════════════ */}
      {showMedModal && editingMed && (
        <div className="ph-modal-backdrop" onClick={e => { if (e.target===e.currentTarget){ setShowMedModal(false); setEditingMed(null); }}}>
          <div className="ph-modal">
            <div className="ph-modal-hdr">
              <h3>{isAddMed ? 'Add New Medicine' : 'Update Medicine'}</h3>
              <button className="ph-modal-close" onClick={() => { setShowMedModal(false); setEditingMed(null); }}><X size={16}/></button>
            </div>
            <div className="ph-modal-body">
              <form onSubmit={e => { e.preventDefault(); saveMedicine(editingMed); }}>
                <div className="ph-form-grid">
                  <div className="ph-form-group ph-form-full">
                    <label className="ph-form-label">Medicine Name *</label>
                    <input className="ph-input" required value={editingMed.name} onChange={e => setEditingMed({...editingMed, name: e.target.value})} placeholder="e.g. Paracetamol 500mg"/>
                  </div>
                  <div className="ph-form-group">
                    <label className="ph-form-label">Generic Name</label>
                    <input className="ph-input" value={editingMed.generic_name||''} onChange={e => setEditingMed({...editingMed, generic_name: e.target.value})}/>
                  </div>
                  <div className="ph-form-group">
                    <label className="ph-form-label">Category</label>
                    <input className="ph-input" value={editingMed.category||''} onChange={e => setEditingMed({...editingMed, category: e.target.value})} placeholder="e.g. Analgesic"/>
                  </div>
                  <div className="ph-form-group">
                    <label className="ph-form-label">Stock Quantity *</label>
                    <input type="number" min="0" className="ph-input" required value={editingMed.stock_quantity} onChange={e => setEditingMed({...editingMed, stock_quantity: parseInt(e.target.value)||0})}/>
                  </div>
                  <div className="ph-form-group">
                    <label className="ph-form-label">Reorder Level</label>
                    <input type="number" min="0" className="ph-input" value={editingMed.reorder_level} onChange={e => setEditingMed({...editingMed, reorder_level: parseInt(e.target.value)||0})}/>
                  </div>
                  <div className="ph-form-group">
                    <label className="ph-form-label">Price Per Unit (₹)</label>
                    <input type="number" step="0.01" min="0" className="ph-input" value={editingMed.price_per_unit} onChange={e => setEditingMed({...editingMed, price_per_unit: parseFloat(e.target.value)||0})}/>
                  </div>
                  <div className="ph-form-group">
                    <label className="ph-form-label">Batch Number</label>
                    <input className="ph-input" value={editingMed.batch_number||''} onChange={e => setEditingMed({...editingMed, batch_number: e.target.value})}/>
                  </div>
                  <div className="ph-form-group">
                    <label className="ph-form-label">Expiry Date</label>
                    <input type="date" className="ph-input" value={editingMed.expiry_date ? String(editingMed.expiry_date).split('T')[0] : ''} onChange={e => setEditingMed({...editingMed, expiry_date: e.target.value})}/>
                  </div>
                  <div className="ph-form-group ph-form-full">
                    <label className="ph-form-label">Manufacturer</label>
                    <input className="ph-input" value={editingMed.manufacturer||''} onChange={e => setEditingMed({...editingMed, manufacturer: e.target.value})}/>
                  </div>
                  {!isAddMed && (
                    <div className="ph-form-group ph-form-full" style={{marginTop:'4px'}}>
                      <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}}>
                        <input type="checkbox" checked={editingMed.is_available} onChange={e => setEditingMed({...editingMed, is_available: e.target.checked})}/>
                        <span style={{fontSize:'13px',fontWeight:'600'}}>Medicine is available</span>
                      </label>
                    </div>
                  )}
                </div>
                <div className="ph-modal-footer">
                  <button type="submit" className="ph-btn ph-btn-primary" style={{flex:1}} disabled={actionLoading}>
                    {actionLoading ? 'Saving…' : isAddMed ? 'Add Medicine' : 'Update Medicine'}
                  </button>
                  <button type="button" className="ph-btn ph-btn-ghost" style={{flex:1}} onClick={() => { setShowMedModal(false); setEditingMed(null); }}>
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
