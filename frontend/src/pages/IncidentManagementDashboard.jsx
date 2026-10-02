import React, { useState, useEffect } from 'react';

function IncidentManagementDashboard({ defaultView = 'all' }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Scanner state
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [suspectsData, setSuspectsData] = useState(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState(null);

  // Form state
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const toDatetimeLocal = (date) => {
    const pad = (num) => String(num).padStart(2, '0');
    const YYYY = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const DD = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
  };

  const [formData, setFormData] = useState({
    incidentType: 'HIT_AND_RUN',
    locationName: 'KMP Expressway Km 20',
    cameraId: 'CAM-001',
    incidentStartTime: toDatetimeLocal(oneHourAgo),
    incidentEndTime: toDatetimeLocal(now),
    description: ''
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/incidents/all', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to load incidents');
      }
      setIncidents(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
    setFormSuccess(null);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setFormSuccess(null);

    try {
      const res = await fetch('/api/incidents/report', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to report incident');
      }

      setFormSuccess(`Incident logged successfully at ${data.incident.locationName}!`);
      setFormData({
        incidentType: 'HIT_AND_RUN',
        locationName: 'KMP Expressway Km 20',
        cameraId: 'CAM-001',
        incidentStartTime: toDatetimeLocal(oneHourAgo),
        incidentEndTime: toDatetimeLocal(now),
        description: ''
      });
      fetchIncidents();
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleScanSuspects = async (incident) => {
    setSelectedIncident(incident);
    setScannerLoading(true);
    setScannerError(null);
    setSuspectsData(null);

    try {
      const res = await fetch(`/api/incidents/${incident._id}/suspects`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to scan suspect vehicles');
      }
      setSuspectsData(data);
    } catch (err) {
      setScannerError(err.message);
    } finally {
      setScannerLoading(false);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatTimeOnly = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page incident-dashboard" style={{ maxWidth: '1150px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Expressway Incident Forensic & Suspect Scanner
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Forensic analysis for hit-and-runs, crashes, and automated suspect vehicle corridor cross-referencing.
          </p>
        </div>

        <button
          onClick={fetchIncidents}
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
          🔄 Refresh Incidents ({incidents.length})
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

      {/* SECTION A: REPORT EXPRESSWAY INCIDENT */}
      <section className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '1.3rem' }}>📝</span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Report Expressway Incident
          </h3>
        </div>

        <form onSubmit={handleReportSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Incident Type *
            </label>
            <select
              name="incidentType"
              value={formData.incidentType}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            >
              <option value="HIT_AND_RUN">🚨 HIT_AND_RUN (Suspect Fled Scene)</option>
              <option value="ACCIDENT">💥 ACCIDENT (Major Collision / Crash)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Camera Checkpoint Name *
            </label>
            <input
              type="text"
              name="locationName"
              value={formData.locationName}
              onChange={handleInputChange}
              required
              placeholder="e.g. KMP Expressway Km 20 or Sohna Toll Plaza"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Camera ID (Checkpoint Code) *
            </label>
            <input
              type="text"
              name="cameraId"
              value={formData.cameraId}
              onChange={handleInputChange}
              required
              placeholder="e.g. CAM-001 or CAM_02"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Incident Window Start *
            </label>
            <input
              type="datetime-local"
              name="incidentStartTime"
              value={formData.incidentStartTime}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Incident Window End *
            </label>
            <input
              type="datetime-local"
              name="incidentEndTime"
              value={formData.incidentEndTime}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Forensic Notes & Incident Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={2}
              placeholder="e.g. Silver SUV struck pedestrian vehicle near mile marker 20 and fled inbound towards Toll Plaza..."
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
            <button
              type="submit"
              disabled={formLoading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--accent-blue)',
                color: '#0b1120',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: formLoading ? 'not-allowed' : 'pointer',
                opacity: formLoading ? 0.7 : 1
              }}
            >
              {formLoading ? 'Logging Incident...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </section>

      {/* SECTION B: INCIDENT FORENSIC & SUSPECT SCANNER */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🔍</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Incident Forensic & Suspect Scanner
          </h3>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading logged incidents...
          </div>
        ) : incidents.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛡️</div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '0.35rem' }}>No Incidents Logged Yet</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Use the form above to log an expressway accident or hit-and-run to scan for suspect vehicles.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {incidents.map((inc) => {
              const isSelected = selectedIncident?._id === inc._id;
              const isHitAndRun = inc.incidentType === 'HIT_AND_RUN';

              return (
                <div
                  key={inc._id}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: isSelected ? '1px solid var(--accent-blue)' : undefined,
                    boxShadow: isSelected ? '0 0 15px rgba(56, 189, 248, 0.2)' : undefined
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '9999px',
                          backgroundColor: isHitAndRun ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: isHitAndRun ? '#f87171' : '#fbbf24',
                          border: `1px solid ${isHitAndRun ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`
                        }}
                      >
                        {inc.incidentType}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          backgroundColor: '#0f172a',
                          color: 'var(--accent-blue)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {inc.cameraId}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      {inc.locationName}
                    </h4>

                    <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      🕒 Window: <strong style={{ color: 'var(--text-primary)' }}>{formatDateTime(inc.incidentStartTime)}</strong> to{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{formatTimeOnly(inc.incidentEndTime)}</strong>
                    </div>

                    {inc.description && (
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                        "{inc.description}"
                      </p>
                    )}

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Filed by: {inc.reportedBy?.name || 'Officer'}
                    </div>
                  </div>

                  <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => handleScanSuspects(inc)}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        backgroundColor: isSelected ? 'var(--accent-cyan)' : 'var(--accent-blue)',
                        color: '#0b1120',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span>🔍 Scan Suspect Vehicles</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SUSPECT VEHICLES RESULTS TABLE & SUMMARY */}
        {selectedIncident && (
          <div className="card" style={{ padding: '1.75rem', border: '1px solid var(--accent-blue)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Forensic Camera Scan Results: {selectedIncident.locationName} ({selectedIncident.cameraId})
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Cross-referencing all vehicle detections logged during the incident window.
                </p>
              </div>

              <button
                onClick={() => setSelectedIncident(null)}
                style={{
                  padding: '0.35rem 0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Close Scanner
              </button>
            </div>

            {scannerLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Scanning surveillance feeds and vehicle records in the accident zone...
              </div>
            ) : scannerError ? (
              <div style={{ color: '#f87171', padding: '1rem', textAlign: 'center' }}>
                {scannerError}
              </div>
            ) : suspectsData ? (
              <div>
                {/* Summary Banner */}
                <div
                  style={{
                    backgroundColor: suspectsData.suspectCount > 0 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    border: `1px solid ${suspectsData.suspectCount > 0 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                    color: suspectsData.suspectCount > 0 ? 'var(--accent-blue)' : '#fbbf24',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span>📊</span>
                  <span>
                    Found {suspectsData.suspectCount} vehicle{suspectsData.suspectCount !== 1 ? 's' : ''} in the accident zone
                    between {formatTimeOnly(selectedIncident.incidentStartTime)} and {formatTimeOnly(selectedIncident.incidentEndTime)}.
                  </span>
                </div>

                {suspectsData.suspectCount === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No vehicle sightings logged by camera {selectedIncident.cameraId} during this precise timeframe.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>#</th>
                          <th style={{ padding: '0.75rem 1rem' }}>License Plate</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Camera Checkpoint</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Exact Timestamp</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Vehicle Specs / Speed</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Image Snapshot Preview</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suspectsData.suspects.map((s, index) => (
                          <tr
                            key={s._id || index}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                            }}
                          >
                            <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                              {index + 1}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: '800',
                                  fontSize: '0.95rem',
                                  color: '#f8fafc',
                                  backgroundColor: '#0f172a',
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: '4px',
                                  border: '1px solid #334155'
                                }}
                              >
                                {s.plateNumber}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                {s.locationName || selectedIncident.locationName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                                {s.cameraId}
                              </div>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                              {formatDateTime(s.timestamp)}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                                {s.vehicleType || 'Vehicle'} {s.vehicleColor ? `(${s.vehicleColor})` : ''}
                              </div>
                              {s.speed && (
                                <div style={{ fontSize: '0.75rem', color: s.speed > 80 ? '#f87171' : 'var(--text-muted)' }}>
                                  Speed: {s.speed} km/h
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                              {s.cropImagePath ? (
                                <img
                                  src={s.cropImagePath}
                                  alt={s.plateNumber}
                                  style={{
                                    width: '70px',
                                    height: '45px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    display: 'inline-block'
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.3rem 0.6rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-muted)',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)'
                                  }}
                                >
                                  📷 Snapshot Logged
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

export default IncidentManagementDashboard;
