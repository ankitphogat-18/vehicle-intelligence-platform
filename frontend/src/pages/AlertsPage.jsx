import React, { useEffect, useState } from 'react';

function AlertsPage() {
  const [stolenAlerts, setStolenAlerts] = useState([]);
  const [anomalyAlerts, setAnomalyAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Trajectory modal state
  const [trajectoryModal, setTrajectoryModal] = useState(null); // { plateNumber, list: [], loading: boolean, error: string }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  const fetchAllAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stolenRes, anomalyRes] = await Promise.all([
        fetch('/api/alerts/active', { headers: getAuthHeaders() }),
        fetch('/api/alerts')
      ]);

      const stolenJson = await stolenRes.json();
      const anomalyJson = await anomalyRes.json();

      if (stolenJson.success) {
        setStolenAlerts(stolenJson.data || []);
      }
      if (anomalyJson.success) {
        setAnomalyAlerts(anomalyJson.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAlerts();
  }, []);

  const handleResolveAlert = async (alertId, plateNumber) => {
    setActionLoadingId(alertId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to resolve alert');
      }

      setStolenAlerts((prev) => prev.filter((a) => a._id !== alertId));
      setSuccessMsg(`Stolen alert for ${plateNumber} resolved & vehicle marked as recovered.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenTrajectory = async (plateNumber) => {
    setTrajectoryModal({ plateNumber, list: [], loading: true, error: null });
    try {
      const res = await fetch(`/api/alerts/${encodeURIComponent(plateNumber)}/trajectory`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to fetch trajectory');
      }
      setTrajectoryModal({
        plateNumber,
        list: data.trajectory || [],
        loading: false,
        error: null
      });
    } catch (err) {
      setTrajectoryModal({
        plateNumber,
        list: [],
        loading: false,
        error: err.message
      });
    }
  };

  const updateAnomalyStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Update failed');
      fetchAllAlerts();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'Just now';
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  return (
    <div className="page alerts-page" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Active Law Enforcement Alerts & Stolen Feed
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Real-time citizen stolen vehicle broadcasts and automated camera anomaly detections.
          </p>
        </div>

        <button
          onClick={fetchAllAlerts}
          style={{
            padding: '0.45rem 1rem',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          🔄 Refresh Feed
        </button>
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

      {successMsg && (
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
          {successMsg}
        </div>
      )}

      {/* SECTION 1: ACTIVE STOLEN VEHICLE ALERTS */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🚨</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f87171' }}>
            Broadcasted Stolen Vehicles ({stolenAlerts.length})
          </h3>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading active stolen vehicle alerts...
          </div>
        ) : stolenAlerts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>No Active Stolen Vehicle Alerts</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              All citizen-registered vehicles are accounted for. When a verified citizen reports a vehicle stolen, it will broadcast here in real-time.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {stolenAlerts.map((alert) => (
              <div
                key={alert._id}
                className="card"
                style={{
                  padding: '1.5rem',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  backgroundColor: 'rgba(24, 38, 71, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                    <span
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: '800',
                        fontFamily: 'monospace',
                        letterSpacing: '0.05em',
                        color: '#ffffff',
                        backgroundColor: '#0f172a',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        border: '1px solid #ef4444'
                      }}
                    >
                      {alert.plateNumber}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: '800',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(239, 68, 68, 0.25)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        letterSpacing: '0.05em'
                      }}
                    >
                      STOLEN
                    </span>
                  </div>

                  <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    {alert.vehicleDetails?.makeModel || 'Vehicle'}
                    {alert.vehicleDetails?.color && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                        • {alert.vehicleDetails.color}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    👤 Reported by: <strong style={{ color: 'var(--text-primary)' }}>{alert.reportedBy?.name || 'Citizen'}</strong>
                    {alert.reportedBy?.email && <span style={{ color: 'var(--text-muted)' }}> ({alert.reportedBy.email})</span>}
                  </div>

                  <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                    ⏱ Reported at: {formatTimestamp(alert.createdAt)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => handleOpenTrajectory(alert.plateNumber)}
                    style={{
                      flex: 1,
                      padding: '0.55rem',
                      backgroundColor: 'var(--accent-blue)',
                      color: '#0b1120',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>📍 View Sightings Trajectory</span>
                  </button>
                  <button
                    disabled={actionLoadingId === alert._id}
                    onClick={() => handleResolveAlert(alert._id, alert.plateNumber)}
                    style={{
                      padding: '0.55rem 0.85rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: actionLoadingId === alert._id ? 'not-allowed' : 'pointer',
                      opacity: actionLoadingId === alert._id ? 0.6 : 1
                    }}
                  >
                    Mark Recovered
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: AUTOMATED CAMERA ANOMALY DETECTIONS */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.3rem' }}>⚡</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Automated Camera Anomaly Detections ({anomalyAlerts.length})
          </h3>
        </div>

        {anomalyAlerts.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No automated anomalies detected.
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto', padding: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Anomaly Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {anomalyAlerts.map((a) => (
                  <tr key={a._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                      <span
                        style={{
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          color: 'var(--accent-blue)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}
                      >
                        {a.type}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{a.description}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          backgroundColor: a.status === 'Potential' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                          color: a.status === 'Potential' ? '#fbbf24' : 'var(--text-muted)'
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => updateAnomalyStatus(a._id, 'Under Review')}
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Review
                        </button>
                        <button
                          onClick={() => updateAnomalyStatus(a._id, 'Dismissed')}
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SIGHTINGS TRAJECTORY MODAL / DRAWER */}
      {trajectoryModal && (
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
          <div
            className="card"
            style={{
              maxWidth: '650px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.75rem',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Sightings Trajectory Feed
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Chronological surveillance camera detections for plate{' '}
                  <strong style={{ color: 'var(--accent-blue)', fontFamily: 'monospace' }}>{trajectoryModal.plateNumber}</strong>
                </p>
              </div>
              <button
                onClick={() => setTrajectoryModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {trajectoryModal.loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Retrieving chronological camera sightings...
                </div>
              ) : trajectoryModal.error ? (
                <div style={{ color: '#f87171', padding: '1rem', textAlign: 'center' }}>
                  {trajectoryModal.error}
                </div>
              ) : trajectoryModal.list.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                  <div style={{ fontWeight: '600' }}>No Camera Sightings Logged Yet</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Active camera network will automatically log sightings as soon as the vehicle crosses any ANPR junction.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {trajectoryModal.list.map((s, index) => (
                    <div
                      key={s._id || index}
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        padding: '1rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        alignItems: 'center'
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-blue)',
                          color: '#0b1120',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '0.85rem',
                          flexShrink: 0
                        }}
                      >
                        {index + 1}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            {s.locationName || `Camera Junction ${s.cameraId}`}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              color: 'var(--accent-blue)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px'
                            }}
                          >
                            {s.cameraId}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          🕒 {formatTimestamp(s.timestamp)}
                        </div>

                        {s.confidence && (
                          <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.15rem' }}>
                            ANPR Confidence: {(s.confidence * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>

                      {s.cropImagePath && (
                        <div style={{ flexShrink: 0 }}>
                          <img
                            src={s.cropImagePath}
                            alt="Crop Preview"
                            style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
              <button
                onClick={() => setTrajectoryModal(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Close Trajectory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertsPage;
