import React, { useState, useEffect } from 'react';

function CitizenDashboard({ initialTab = 'list' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'list' or 'register'
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Confirmation modal state for reporting stolen
  const [confirmVehicle, setConfirmVehicle] = useState(null);

  const [formData, setFormData] = useState({
    plateNumber: '',
    makeModel: '',
    color: '',
    rcDocPath: ''
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  const fetchMyVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vehicles/my-vehicles', {
        headers: getAuthHeaders()
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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setFormSuccess(null);

    try {
      const res = await fetch('/api/vehicles/register', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          plateNumber: formData.plateNumber.trim(),
          makeModel: formData.makeModel.trim(),
          color: formData.color.trim(),
          rcDocPath: formData.rcDocPath.trim() || `https://doc.gov.in/rc/${formData.plateNumber.trim().toUpperCase()}`
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to register vehicle');
      }

      setFormSuccess(`Vehicle ${formData.plateNumber.toUpperCase()} submitted successfully for police review!`);
      setFormData({
        plateNumber: '',
        makeModel: '',
        color: '',
        rcDocPath: ''
      });
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
        headers: getAuthHeaders(),
        body: JSON.stringify({ vehicleId })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to report stolen vehicle');
      }

      setFormSuccess(`🚨 Alert broadcasted! Vehicle ${plateNumber} marked as STOLEN. Law enforcement notified.`);
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
      // Find alert or resolve directly
      const alertsRes = await fetch('/api/alerts/active', {
        headers: getAuthHeaders()
      });
      const alertsData = await alertsRes.json();
      const matchingAlert = alertsData.data?.find((a) => a.plateNumber === vehicle.plateNumber);

      if (matchingAlert) {
        await fetch(`/api/alerts/${matchingAlert._id}/resolve`, {
          method: 'PATCH',
          headers: getAuthHeaders()
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

  return (
    <div className="page citizen-dashboard" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Citizen Vehicle Portal
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage your registered vehicles, view verification status, and report stolen vehicles.
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
              This will immediately broadcast a city-wide law enforcement alert across all traffic cameras.
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

      {activeTab === 'register' ? (
        <div className="card" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Register New Vehicle
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Submit vehicle registration and RC document link for verification by the Police Department.
          </p>

          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
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
                placeholder="e.g. Hyundai Creta SX or Honda City"
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
                Color
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                placeholder="e.g. Polar White / Metallic Silver"
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
                RC Document Path or Link (Optional)
              </label>
              <input
                type="text"
                name="rcDocPath"
                value={formData.rcDocPath}
                onChange={handleInputChange}
                placeholder="https://transport.delhi.gov.in/rc/doc_preview.pdf"
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
                {formLoading ? 'Submitting Registration...' : 'Submit for Verification'}
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
                You have not registered any vehicles under your citizen account. Register your vehicle to enable automatic tracking and fast-track stolen vehicle recovery.
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {vehicles.map((v) => (
                <div
                  key={v._id}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: v.isStolen ? '1px solid rgba(239, 68, 68, 0.5)' : undefined,
                    boxShadow: v.isStolen ? '0 0 15px rgba(239, 68, 68, 0.15)' : undefined
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: '800',
                          letterSpacing: '0.05em',
                          color: '#f8fafc',
                          backgroundColor: '#0f172a',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          border: '1px solid #334155',
                          fontFamily: 'monospace'
                        }}
                      >
                        {v.plateNumber}
                      </span>

                      {v.isStolen ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.6)',
                            animation: 'pulse 2s infinite'
                          }}
                        >
                          🚨 REPORTED STOLEN
                        </span>
                      ) : v.isVerified ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.35)'
                          }}
                        >
                          ✓ VERIFIED
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.35)'
                          }}
                        >
                          ⏳ PENDING POLICE REVIEW
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {v.makeModel}
                    </div>
                    {v.color && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Color: <span style={{ color: 'var(--text-primary)' }}>{v.color}</span>
                      </div>
                    )}
                    {v.rcDocPath && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', wordBreak: 'break-all' }}>
                        RC Doc: <span style={{ color: 'var(--accent-blue)' }}>{v.rcDocPath}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    {v.isStolen ? (
                      <div>
                        <button
                          disabled={actionLoadingId === v._id}
                          onClick={() => handleMarkRecovered(v)}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: actionLoadingId === v._id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ✓ Mark as Recovered
                        </button>
                        <div style={{ fontSize: '0.75rem', color: '#f87171', textAlign: 'center', marginTop: '0.4rem' }}>
                          Active police alert broadcast in progress
                        </div>
                      </div>
                    ) : v.isVerified ? (
                      <button
                        disabled={actionLoadingId === v._id}
                        onClick={() => setConfirmVehicle(v)}
                        style={{
                          width: '100%',
                          padding: '0.6rem',
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          borderRadius: '6px',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          cursor: actionLoadingId === v._id ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; }}
                      >
                        🚨 Report Stolen
                      </button>
                    ) : (
                      <div>
                        <button
                          disabled
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            backgroundColor: 'rgba(100, 116, 139, 0.15)',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(100, 116, 139, 0.25)',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'not-allowed'
                          }}
                        >
                          🚨 Report Stolen
                        </button>
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', textAlign: 'center', marginTop: '0.4rem' }}>
                          🔒 Locked until police verification
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CitizenDashboard;
