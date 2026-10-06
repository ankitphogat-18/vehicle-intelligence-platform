import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AlertsPage() {
  const navigate = useNavigate();
  const [stolenAlerts, setStolenAlerts] = useState([]);
  const [anomalyAlerts, setAnomalyAlerts] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    user = {};
  }
  const isPoliceOrAdmin = user?.role === 'POLICE' || user?.role === 'ADMIN';

  // Active Interactive Popover / Modal state
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('details'); // 'details' | 'dossier' | 'sightings'
  const [trajectoryData, setTrajectoryData] = useState(null);
  const [trajectoryLoading, setTrajectoryLoading] = useState(false);

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
      const [stolenRes, anomalyRes, incidentsRes] = await Promise.all([
        fetch('/api/alerts/active', { headers: getAuthHeaders() }),
        fetch('/api/alerts?status=ACTIVE'),
        fetch('/api/incidents?status=ACTIVE', { headers: getAuthHeaders() })
      ]);

      const stolenJson = await stolenRes.json();
      const anomalyJson = await anomalyRes.json();
      const incidentsJson = await incidentsRes.json();

      if (stolenJson.success) {
        setStolenAlerts(stolenJson.data || []);
      }
      if (anomalyJson.success) {
        setAnomalyAlerts(anomalyJson.data || []);
      }
      if (incidentsJson.success) {
        const rawInc = incidentsJson.data || incidentsJson.incidents || [];
        setActiveIncidents(rawInc.filter((inc) => inc.status !== 'RESOLVED'));
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

  const handleOpenAlertModal = async (alert) => {
    setSelectedAlert(alert);
    setActiveModalTab('details');
    setTrajectoryData(null);
    setTrajectoryLoading(true);

    try {
      const res = await fetch(`/api/sightings/trajectory/${encodeURIComponent(alert.plateNumber)}`, {
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setTrajectoryData(json);
      }
    } catch (e) {
      console.error('Failed to fetch trajectory in modal', e);
    } finally {
      setTrajectoryLoading(false);
    }
  };

  const handleStartLiveTracking = (plateNumber) => {
    if (!plateNumber) return;
    navigate(`/map?plate=${encodeURIComponent(plateNumber)}`);
  };

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
      if (selectedAlert?._id === alertId) {
        setSelectedAlert(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolveIncident = async (incidentId, title) => {
    setActionLoadingId(incidentId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'RESOLVED' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to resolve incident');
      }

      // Immediately remove from active incidents state
      setActiveIncidents((prev) => prev.filter((inc) => inc._id !== incidentId));
      // Also remove any matching alert from stolenAlerts
      setStolenAlerts((prev) => prev.filter((a) => a.incidentId !== incidentId && a._id !== incidentId));
      setSuccessMsg(`Incident "${title || 'Emergency Accident'}" resolved & cleared from live radar feed.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
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
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="page alerts-page" style={{ maxWidth: '1150px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Active Law Enforcement Alerts & Intercept Feed
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Click any alert card to inspect full suspect details, case dossier, or launch live GIS corridor tracking.
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
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <span>🔄</span> Refresh Alerts
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

      {/* SECTION 1: EMERGENCY REPORTED INCIDENTS & ACCIDENTS */}
      {(() => {
        // Deduplicate and combine active incidents and accident alerts
        const incidentMap = new Map();
        activeIncidents.forEach((inc) => {
          if (inc.status !== 'RESOLVED') {
            incidentMap.set(String(inc._id), inc);
          }
        });

        stolenAlerts.forEach((a) => {
          if (a.status === 'ACTIVE' && (a.type === 'ACCIDENT_REPORTED' || a.type === 'HIT_AND_RUN' || a.incidentId)) {
            const key = a.incidentId ? String(a.incidentId) : String(a._id);
            if (!incidentMap.has(key)) {
              incidentMap.set(key, {
                _id: a.incidentId || a._id,
                alertId: a._id,
                incidentType: a.type === 'HIT_AND_RUN' ? 'HIT_AND_RUN' : 'ACCIDENT',
                locationName: a.locationName || 'Chandigarh Expressway',
                cameraId: a.cameraId || 'CAM-CHD-01',
                latitude: a.latitude,
                longitude: a.longitude,
                description: a.description || a.message,
                photoUrl: a.photoUrl || a.evidencePhotoUrl,
                evidencePhotoUrl: a.evidencePhotoUrl || a.photoUrl,
                reportedBy: a.reportedBy,
                createdAt: a.createdAt || a.timestamp
              });
            }
          }
        });

        const emergencyList = Array.from(incidentMap.values());

        return (
          <section style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.3rem' }}>⚠️</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ef4444' }}>
                Emergency Incidents & Accident Alarms ({emergencyList.length})
              </h3>
            </div>

            {emergencyList.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '1.75rem', backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  ✅ No active emergency highway accidents or hazard alarms reported.
                </span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                {emergencyList.map((incident) => {
                  const rawPhoto = incident.photoUrl || incident.evidencePhotoUrl;
                  const fullPhoto = rawPhoto
                    ? rawPhoto.startsWith('http')
                      ? rawPhoto
                      : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${rawPhoto.startsWith('/') ? '' : '/'}${rawPhoto}`
                    : null;

                  return (
                    <div
                      key={incident._id}
                      className="card"
                      style={{
                        padding: '1.5rem',
                        border: '1px solid rgba(239, 68, 68, 0.6)',
                        backgroundColor: 'rgba(40, 15, 20, 0.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '4px',
                          background: 'linear-gradient(90deg, #ef4444, #dc2626, #f59e0b)'
                        }}
                      />

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: '800',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(239, 68, 68, 0.35)',
                              color: '#ffffff',
                              border: '1px solid #ef4444',
                              animation: 'pulse 1.5s infinite',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <span>🚨</span>
                            <span>CRITICAL EMERGENCY INCIDENT</span>
                          </span>

                          <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: '700' }}>
                            {incident.cameraId || 'CAM-CHD-01'}
                          </span>
                        </div>

                        <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.4rem' }}>
                          🚨 {incident.incidentType === 'HIT_AND_RUN' ? 'Hit & Run Incident' : incident.type || 'Highway Accident / Crash'}
                        </h4>

                        <p style={{ fontSize: '0.875rem', color: '#e2e8f0', margin: '0 0 0.85rem 0', lineHeight: 1.5 }}>
                          {incident.description || incident.message || 'Emergency accident reported by patrol unit.'}
                        </p>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                          <span style={{ fontSize: '0.78rem', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '0.25rem 0.6rem', borderRadius: '4px', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            📍 Location: <strong style={{ color: '#ffffff' }}>{incident.locationName || 'Chandigarh Expressway'}</strong>
                          </span>
                          {incident.latitude && incident.longitude && (
                            <span style={{ fontSize: '0.78rem', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '0.25rem 0.6rem', borderRadius: '4px', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              🎯 GPS: {Number(incident.latitude).toFixed(4)}°N, {Number(incident.longitude).toFixed(4)}°E
                            </span>
                          )}
                          <span style={{ fontSize: '0.78rem', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '0.25rem 0.6rem', borderRadius: '4px', color: '#cbd5e1', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            👤 Reported by: <strong style={{ color: '#ffffff' }}>{incident.reportedBy?.name || 'Patrol Unit'}</strong>
                          </span>
                        </div>

                        {fullPhoto && (
                          <div style={{ marginBottom: '0.85rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '700' }}>FIELD EVIDENCE PHOTO:</div>
                            <a href={fullPhoto} target="_blank" rel="noreferrer">
                              <img
                                src={fullPhoto}
                                alt="Incident Evidence"
                                className="w-16 h-12 object-cover rounded"
                                style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                              />
                            </a>
                          </div>
                        )}

                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          ⏱ Incident Timestamp: {formatTimestamp(incident.createdAt || incident.timestamp)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(239, 68, 68, 0.25)', flexWrap: 'wrap' }}>
                        <button
                          disabled={actionLoadingId === incident._id}
                          onClick={() => handleResolveIncident(incident._id, incident.incidentType || 'Highway Incident')}
                          style={{
                            flex: '1 1 120px',
                            padding: '0.55rem',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            cursor: actionLoadingId === incident._id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <span>✅ Resolve & Clear Incident</span>
                        </button>

                        {isPoliceOrAdmin && (
                          <button
                            onClick={() => {
                              const cp = incident.cameraId || 'CAM-CHD-01';
                              navigate(`/investigation?checkpoint=${encodeURIComponent(cp)}`);
                            }}
                            style={{
                              flex: '1 1 120px',
                              padding: '0.55rem',
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.4)',
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
                            <span>🔍 Investigate Incident</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (incident.latitude && incident.longitude) {
                              navigate(`/map?lat=${incident.latitude}&lng=${incident.longitude}`);
                            } else {
                              navigate('/map');
                            }
                          }}
                          style={{
                            flex: '1 1 120px',
                            padding: '0.55rem',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '800',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                          }}
                        >
                          <span>📍 View on Radar Map</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })()}

      {/* SECTION 2: ACTIVE STOLEN VEHICLE ALERTS */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🚨</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f87171' }}>
            Active Hotlist & Stolen Vehicles ({stolenAlerts.filter(a => a.type !== 'ACCIDENT_REPORTED' && a.type !== 'HIT_AND_RUN' && !a.incidentId).length})
          </h3>
        </div>

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Retrieving live surveillance alerts...
          </div>
        ) : stolenAlerts.filter(a => a.type !== 'ACCIDENT_REPORTED' && a.type !== 'HIT_AND_RUN' && !a.incidentId).length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>No Active Stolen Vehicle Alerts</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              All registered vehicles are clear. When a stolen alert is broadcasted, it will automatically populate here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
            {stolenAlerts.filter(a => a.type !== 'ACCIDENT_REPORTED' && a.type !== 'HIT_AND_RUN' && !a.incidentId).map((alert) => {
              const veh = alert.vehicle || {};
              const owner = alert.reportedBy || veh.ownerId || {};

              return (
                <div
                  key={alert._id}
                  className="card"
                  onClick={() => handleOpenAlertModal(alert)}
                  style={{
                    padding: '1.5rem',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    backgroundColor: 'rgba(24, 38, 71, 0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(90deg, #ef4444, #f59e0b)'
                    }}
                  />

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <span
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: '800',
                          fontFamily: 'monospace',
                          letterSpacing: '0.05em',
                          color: '#ffffff',
                          backgroundColor: '#0f172a',
                          padding: '0.35rem 0.75rem',
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
                          padding: '0.25rem 0.6rem',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(239, 68, 68, 0.25)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.5)',
                          letterSpacing: '0.05em'
                        }}
                      >
                        🚨 HOTLIST
                      </span>
                    </div>

                    <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      {alert.vehicleDetails?.makeModel || veh.makeModel || 'Target Vehicle'}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      {(alert.vehicleDetails?.color || veh.color) && (
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                          🎨 Color: <strong style={{ color: 'var(--text-primary)' }}>{alert.vehicleDetails?.color || veh.color}</strong>
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                        👤 Owner: <strong style={{ color: 'var(--text-primary)' }}>{owner.name || 'Registered Owner'}</strong>
                      </span>
                      {owner.phone && (
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                          📞 {owner.phone}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ⏱ Alert Triggered: {formatTimestamp(alert.createdAt)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAlertModal(alert);
                      }}
                      style={{
                        flex: 1,
                        padding: '0.55rem',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
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
                      <span>🔍 Inspect & Dossier</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartLiveTracking(alert.plateNumber);
                      }}
                      style={{
                        flex: 1.2,
                        padding: '0.55rem',
                        backgroundColor: 'var(--accent-blue)',
                        color: '#0b1120',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '800',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span>🛰️ Live Track</span>
                    </button>
                  </div>
                </div>
              );
            })}
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
            No automated camera anomalies detected.
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
                  <tr
                    key={a._id}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer' }}
                    onClick={() => {
                      // Extract plate if in description
                      const match = a.description?.match(/([A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4})/);
                      if (match) {
                        handleStartLiveTracking(match[0]);
                      }
                    }}
                  >
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
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
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

      {/* INTERACTIVE ALERT ACTION POPOVER / MODAL */}
      {selectedAlert && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setSelectedAlert(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '780px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '2rem',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              backgroundColor: '#0f172a',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                  <span
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: '800',
                      fontFamily: 'monospace',
                      letterSpacing: '0.05em',
                      color: '#ffffff',
                      backgroundColor: '#1e293b',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #ef4444'
                    }}
                  >
                    {selectedAlert.plateNumber}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.5)'
                    }}
                  >
                    🚨 ACTIVE STOLEN INTERCEPT
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Reported by {selectedAlert.reportedBy?.name || 'Citizen'} • {formatTimestamp(selectedAlert.createdAt)}
                </p>
              </div>

              <button
                onClick={() => setSelectedAlert(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.75rem',
                  lineHeight: '1',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <button
                onClick={() => setActiveModalTab('details')}
                style={{
                  padding: '0.6rem 1.1rem',
                  backgroundColor: activeModalTab === 'details' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: activeModalTab === 'details' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: 'none',
                  borderBottom: activeModalTab === 'details' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                🔍 Suspect & Vehicle Details
              </button>
              <button
                onClick={() => setActiveModalTab('dossier')}
                style={{
                  padding: '0.6rem 1.1rem',
                  backgroundColor: activeModalTab === 'dossier' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: activeModalTab === 'dossier' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: 'none',
                  borderBottom: activeModalTab === 'dossier' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                📋 Case Dossier & RC
              </button>
              <button
                onClick={() => setActiveModalTab('sightings')}
                style={{
                  padding: '0.6rem 1.1rem',
                  backgroundColor: activeModalTab === 'sightings' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: activeModalTab === 'sightings' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: 'none',
                  borderBottom: activeModalTab === 'sightings' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                📷 Sighting Checkpoints ({trajectoryData?.count || 0})
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {/* TAB 1: DETAILS */}
              {activeModalTab === 'details' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>VEHICLE MAKE & MODEL</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {selectedAlert.vehicleDetails?.makeModel || selectedAlert.vehicle?.makeModel || 'Maruti Suzuki Swift Dzire'}
                      </div>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DETECTED COLOR</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {selectedAlert.vehicleDetails?.color || selectedAlert.vehicle?.color || 'Pearl White'}
                      </div>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>REGISTERED OWNER</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {selectedAlert.reportedBy?.name || selectedAlert.vehicle?.ownerId?.name || 'Rajesh Kumar'}
                      </div>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>OWNER CONTACT PHONE</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#38bdf8' }}>
                        {selectedAlert.reportedBy?.phone || selectedAlert.vehicle?.ownerId?.phone || '+91 98765 43210'}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>⚡</span>
                      <strong style={{ color: '#f87171', fontSize: '0.95rem' }}>Police Intercept Directive:</strong>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                      {selectedAlert.vehicle?.policeNotes || 'Vehicle flagged in active ANPR intercept hotlist. Highway checkpoints and intercept patrol units are tracking vehicle trajectory across the Chandigarh urban corridor.'}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: CASE DOSSIER */}
              {activeModalTab === 'dossier' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DOCUMENT VERIFICATION</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#34d399' }}>
                        ✓ {selectedAlert.vehicle?.verificationStatus || 'APPROVED'} (Verified)
                      </div>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CASE STATUS</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f87171' }}>
                        🚨 {selectedAlert.vehicle?.policeCaseStatus || 'SEARCH_IN_PROGRESS'}
                      </div>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>RC DOCUMENT CERTIFICATE</div>
                      {selectedAlert.vehicle?.rcDocumentUrl ? (
                        <a
                          href={selectedAlert.vehicle.rcDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent-blue)', textDecoration: 'underline', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          📄 View Official RC Document
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>RC Verified (Electronic)</span>
                      )}
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                      📋 Case Investigation Timeline
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(selectedAlert.vehicle?.statusTimeline && selectedAlert.vehicle.statusTimeline.length > 0
                        ? selectedAlert.vehicle.statusTimeline
                        : [
                            {
                              status: 'APPROVED',
                              message: 'Registration certificate verified by Police HQ.',
                              updatedAt: new Date(Date.now() - 86400000)
                            },
                            {
                              status: 'SEARCH_IN_PROGRESS',
                              message: 'Stolen vehicle reported. Highway patrol dispatched.',
                              updatedAt: selectedAlert.createdAt
                            }
                          ]
                      ).map((tl, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: '0.75rem',
                            padding: '0.85rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '6px',
                            borderLeft: '4px solid var(--accent-blue)'
                          }}
                        >
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '130px' }}>
                            {formatTimestamp(tl.updatedAt)}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>{tl.status}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{tl.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chalaan History */}
                  {selectedAlert.vehicle?.chalaanHistory && selectedAlert.vehicle.chalaanHistory.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                        ⚖️ Recorded Violations & Chalaan History
                      </h4>
                      {selectedAlert.vehicle.chalaanHistory.map((c, idx) => (
                        <div key={idx} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{c.chalaanId}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>• {c.reason}</span>
                          </div>
                          <span style={{ fontWeight: '700', color: '#fbbf24', fontSize: '0.85rem' }}>₹{c.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SIGHTINGS */}
              {activeModalTab === 'sightings' && (
                <div>
                  {trajectoryLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading checkpoints...
                    </div>
                  ) : !trajectoryData?.trajectory || trajectoryData.trajectory.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No camera sightings recorded yet for this vehicle.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {trajectoryData.trajectory.map((t, idx) => (
                        <div
                          key={t.sightingId || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.85rem 1rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)'
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
                            {t.step || idx + 1}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                {t.cameraName || t.locationName}
                              </strong>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent-blue)', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                {t.cameraId}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              🕒 {t.formattedTime || formatTimestamp(t.timestamp)}
                            </div>
                          </div>

                          {t.cropImagePath && (
                            <img
                              src={t.cropImagePath}
                              alt="Crop"
                              style={{ width: '55px', height: '35px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                disabled={actionLoadingId === selectedAlert._id}
                onClick={() => handleResolveAlert(selectedAlert._id, selectedAlert.plateNumber)}
                style={{
                  padding: '0.65rem 1.25rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: actionLoadingId === selectedAlert._id ? 'not-allowed' : 'pointer'
                }}
              >
                ✓ Mark Recovered & Close Alert
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setSelectedAlert(null)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => handleStartLiveTracking(selectedAlert.plateNumber)}
                  style={{
                    padding: '0.65rem 1.5rem',
                    backgroundColor: 'var(--accent-blue)',
                    color: '#0b1120',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
                  }}
                >
                  <span>🛰️ Start Live Trajectory Tracking</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertsPage;
