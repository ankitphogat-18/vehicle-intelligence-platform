import React, { useState, useEffect } from 'react';

function CitizenDashboard({ initialTab = 'list' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'list' or 'register'
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // File upload state for RC Document
  const [rcFile, setRcFile] = useState(null);
  const [rcFileName, setRcFileName] = useState('');

  // Confirmation modal state for reporting stolen
  const [confirmVehicle, setConfirmVehicle] = useState(null);

  const [formData, setFormData] = useState({
    plateNumber: '',
    makeModel: '',
    color: ''
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`
    };
  };

  const fetchMyVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vehicles/my-vehicles', {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to load vehicles');
      }
      setVehicles(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyVehicles();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
    setFormSuccess(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRcFile(file);
      setRcFileName(file.name);
    } else {
      setRcFile(null);
      setRcFileName('');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setFormSuccess(null);

    try {
      const submitData = new FormData();
      submitData.append('plateNumber', formData.plateNumber.trim());
      submitData.append('makeModel', formData.makeModel.trim());
      submitData.append('color', formData.color.trim());

      if (rcFile) {
        submitData.append('rcDocument', rcFile);
      }

      const res = await fetch('/api/vehicles/register', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: submitData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to register vehicle');
      }

      setFormSuccess(`Vehicle ${formData.plateNumber.toUpperCase()} registered & RC document submitted for police verification!`);
      setFormData({
        plateNumber: '',
        makeModel: '',
        color: ''
      });
      setRcFile(null);
      setRcFileName('');
      fetchMyVehicles();
      setTimeout(() => {
        setActiveTab('list');
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmReportStolen = async () => {
    if (!confirmVehicle) return;
    const vehicleId = confirmVehicle._id;
    const plateNumber = confirmVehicle.plateNumber;
    setConfirmVehicle(null);
    setActionLoadingId(vehicleId);
    setError(null);
    setFormSuccess(null);

    try {
      const res = await fetch('/api/alerts/stolen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ vehicleId })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to report stolen vehicle');
      }

      setFormSuccess(`🚨 Alert broadcasted! Vehicle ${plateNumber} marked as STOLEN. Law enforcement patrol alerted.`);
      fetchMyVehicles();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkRecovered = async (vehicle) => {
    setActionLoadingId(vehicle._id);
    setError(null);
    setFormSuccess(null);

    try {
      const alertsRes = await fetch('/api/alerts/active', {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });
      const alertsData = await alertsRes.json();
      const matchingAlert = alertsData.data?.find((a) => a.plateNumber === vehicle.plateNumber);

      if (matchingAlert) {
        await fetch(`/api/alerts/${matchingAlert._id}/resolve`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        });
      }

      setFormSuccess(`Vehicle ${vehicle.plateNumber} marked as RECOVERED.`);
      fetchMyVehicles();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getTimelineBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'Approved', color: '#34d399', icon: '✓', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'REJECTED':
        return { label: 'Rejected', color: '#f87171', icon: '✕', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'SEARCH_IN_PROGRESS':
      case 'PATROL_ALERTED':
        return { label: 'Police Alert Active', color: '#ef4444', icon: '🚨', bg: 'rgba(239, 68, 68, 0.2)' };
      case 'VEHICLE_FOUND':
        return { label: 'Vehicle Recovered', color: '#38bdf8', icon: '🏆', bg: 'rgba(56, 189, 248, 0.15)' };
      case 'PENDING':
      case 'VERIFICATION_UNDER_REVIEW':
      default:
        return { label: 'Under Review', color: '#fbbf24', icon: '⏳', bg: 'rgba(245, 158, 11, 0.15)' };
    }
  };

  return (
    <div className="page citizen-dashboard" style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Citizen Vehicle Portal
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage registered vehicles, submit official RC documents, and track real-time police case updates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'list' ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === 'list' ? '#0b1120' : 'var(--text-secondary)'
            }}
          >
            🚗 My Vehicles ({vehicles.length})
          </button>
          <button
            onClick={() => setActiveTab('register')}
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'register' ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === 'register' ? '#0b1120' : 'var(--text-secondary)'
            }}
          >
            ➕ Register Vehicle
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.9rem'
          }}
        >
          {error}
        </div>
      )}

      {formSuccess && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.9rem'
          }}
        >
          {formSuccess}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmVehicle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem', textAlign: 'center' }}>🚨</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', textAlign: 'center', marginBottom: '0.75rem', color: '#f87171' }}>
              Confirm Stolen Vehicle Report
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Are you sure you want to report vehicle <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{confirmVehicle.plateNumber}</strong> as stolen?
              This will immediately broadcast a high-priority alert across all highway CCTV checkpoint cameras.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleConfirmReportStolen}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Yes, Broadcast Stolen Alert
              </button>
              <button
                onClick={() => setConfirmVehicle(null)}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER VEHICLE TAB */}
      {activeTab === 'register' ? (
        <div className="card" style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            Register New Vehicle
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Submit vehicle registration details and upload your official RC (Registration Certificate) document for verification.
          </p>

          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                License Plate Number *
              </label>
              <input
                type="text"
                name="plateNumber"
                value={formData.plateNumber}
                onChange={handleInputChange}
                required
                placeholder="e.g. DL01AB1234 or HR26DQ5678"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  textTransform: 'uppercase'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Make & Model *
              </label>
              <input
                type="text"
                name="makeModel"
                value={formData.makeModel}
                onChange={handleInputChange}
                required
                placeholder="e.g. Hyundai Creta SX, Honda City, Maruti Swift"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Vehicle Color
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                placeholder="e.g. Polar White, Metallic Silver, Phantom Black"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Official RC Document File Upload Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                Upload RC Document Proof (.pdf, .png, .jpg, .jpeg)
              </label>
              <div
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-secondary)',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('rcFileInput').click()}
              >
                <input
                  id="rcFileInput"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>📄</div>
                {rcFileName ? (
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '0.9rem' }}>
                      {rcFileName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.2rem' }}>
                      ✓ File selected and ready for upload ({((rcFile?.size || 0) / 1024).toFixed(1)} KB)
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                      Click to Browse or Drag & Drop RC Document
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Accepted formats: PDF, PNG, JPG, JPEG (Max 20MB)
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={formLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'var(--accent-blue)',
                  color: '#0b1120',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  cursor: formLoading ? 'not-allowed' : 'pointer',
                  opacity: formLoading ? 0.7 : 1
                }}
              >
                {formLoading ? 'Submitting Registration...' : 'Submit for Police Verification'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* MY VEHICLES LIST TAB */
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Loading your vehicles...
            </div>
          ) : vehicles.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚘</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                No Vehicles Registered Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                You have not registered any vehicles under your citizen account. Register your vehicle to enable automatic tracking and stolen vehicle broadcast.
              </p>
              <button
                onClick={() => setActiveTab('register')}
                style={{
                  padding: '0.65rem 1.25rem',
                  backgroundColor: 'var(--accent-blue)',
                  color: '#0b1120',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                ➕ Register Your First Vehicle
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {vehicles.map((v) => {
                const isApproved = v.verificationStatus === 'APPROVED' || v.isVerified;
                const isPending = v.verificationStatus === 'PENDING' && !v.isVerified;
                const isRejected = v.verificationStatus === 'REJECTED';

                return (
                  <div
                    key={v._id}
                    className="card"
                    style={{
                      padding: '1.75rem',
                      border: v.isStolen
                        ? '1px solid rgba(239, 68, 68, 0.6)'
                        : isApproved
                        ? '1px solid rgba(16, 185, 129, 0.35)'
                        : '1px solid var(--border-color)',
                      boxShadow: v.isStolen ? '0 0 20px rgba(239, 68, 68, 0.15)' : undefined
                    }}
                  >
                    {/* Vehicle Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: '800',
                            letterSpacing: '0.05em',
                            color: '#f8fafc',
                            backgroundColor: '#0f172a',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #334155',
                            fontFamily: 'monospace'
                          }}
                        >
                          {v.plateNumber}
                        </span>

                        <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {v.makeModel}
                        </span>

                        {v.color && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            • {v.color}
                          </span>
                        )}
                      </div>

                      {/* Verification Status Badges */}
                      <div>
                        {v.isStolen ? (
                          <span
                            style={{
                              fontSize: '0.775rem',
                              fontWeight: '800',
                              padding: '0.3rem 0.75rem',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(239, 68, 68, 0.25)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.6)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <span>🚨</span>
                            <span>REPORTED STOLEN</span>
                          </span>
                        ) : isApproved ? (
                          <span
                            style={{
                              fontSize: '0.775rem',
                              fontWeight: '700',
                              padding: '0.3rem 0.75rem',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <span>✓</span>
                            <span>Verified Vehicle</span>
                          </span>
                        ) : isRejected ? (
                          <span
                            style={{
                              fontSize: '0.775rem',
                              fontWeight: '700',
                              padding: '0.3rem 0.75rem',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <span>✕</span>
                            <span>Registration Rejected</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.775rem',
                              fontWeight: '700',
                              padding: '0.3rem 0.75rem',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(245, 158, 11, 0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <span>⏳</span>
                            <span>Under Verification</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Document Proof Section */}
                    {(v.rcDocumentUrl || v.rcDocPath) && (() => {
                      const rawPath = v.rcDocumentUrl || v.rcDocPath;
                      const fullDoc = rawPath.startsWith('http')
                        ? rawPath
                        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
                      return (
                        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Official RC Proof:</span>
                          <a
                            href={fullDoc}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--accent-blue)',
                              textDecoration: 'none',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              backgroundColor: 'rgba(56, 189, 248, 0.08)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(56, 189, 248, 0.2)'
                            }}
                          >
                            <span>📄 View Uploaded RC Document</span>
                            <span>↗</span>
                          </a>
                        </div>
                      );
                    })()}

                    {/* LATEST POLICE OFFICER NOTES & CASE FORUM */}
                    <div
                      style={{
                        backgroundColor: '#070f20',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: '10px',
                        padding: '1rem',
                        marginBottom: '1.25rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Law Enforcement / Cyber Cell Updates
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: 0, lineHeight: 1.5 }}>
                        {v.policeNotes || 'Documents submitted. Pending verification by the Cyber Cell.'}
                      </p>
                    </div>

                    {/* CASE TIMELINE FORUM COMPONENT */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Case Timeline & Progress Log
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(59, 130, 246, 0.3)' }}>
                        {(v.statusTimeline && v.statusTimeline.length > 0 ? v.statusTimeline : [
                          {
                            status: isApproved ? 'APPROVED' : 'PENDING',
                            message: isApproved ? 'Vehicle verified and approved.' : 'Documents submitted for verification.',
                            updatedAt: v.createdAt || new Date()
                          }
                        ]).map((step, sIdx) => {
                          const badge = getTimelineBadge(step.status);
                          return (
                            <div key={sIdx} style={{ position: 'relative', paddingLeft: '1.25rem' }}>
                              {/* Timeline Dot */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '-0.7rem',
                                  top: '0.2rem',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: badge.color,
                                  boxShadow: `0 0 8px ${badge.color}`
                                }}
                              />
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span
                                    style={{
                                      fontSize: '0.725rem',
                                      fontWeight: '700',
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '4px',
                                      backgroundColor: badge.bg,
                                      color: badge.color
                                    }}
                                  >
                                    {badge.icon} {badge.label}
                                  </span>
                                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f1f5f9' }}>
                                    {step.message}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                  {formatDateTime(step.updatedAt)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      {v.isStolen ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <button
                            disabled={actionLoadingId === v._id}
                            onClick={() => handleMarkRecovered(v)}
                            style={{
                              padding: '0.6rem 1.25rem',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              borderRadius: '6px',
                              fontWeight: '700',
                              fontSize: '0.875rem',
                              cursor: actionLoadingId === v._id ? 'not-allowed' : 'pointer'
                            }}
                          >
                            ✓ Mark as Recovered
                          </button>
                          <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: '600' }}>
                            🚨 Highway camera ANPR interception active
                          </span>
                        </div>
                      ) : isApproved ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <button
                            disabled={actionLoadingId === v._id}
                            onClick={() => setConfirmVehicle(v)}
                            style={{
                              padding: '0.6rem 1.25rem',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '6px',
                              fontWeight: '700',
                              fontSize: '0.875rem',
                              cursor: actionLoadingId === v._id ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; }}
                          >
                            🚨 Report as Stolen
                          </button>
                          <span style={{ fontSize: '0.8rem', color: '#34d399' }}>
                            ✓ Verified & Ready for Fast-Track Recovery
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <button
                            disabled
                            style={{
                              padding: '0.6rem 1.25rem',
                              backgroundColor: 'rgba(100, 116, 139, 0.15)',
                              color: 'var(--text-muted)',
                              border: '1px solid rgba(100, 116, 139, 0.25)',
                              borderRadius: '6px',
                              fontWeight: '600',
                              fontSize: '0.875rem',
                              cursor: 'not-allowed'
                            }}
                          >
                            🚨 Report as Stolen
                          </button>
                          <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: '600' }}>
                            🔒 Stolen reporting unlocked once verified by police
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CitizenDashboard;
