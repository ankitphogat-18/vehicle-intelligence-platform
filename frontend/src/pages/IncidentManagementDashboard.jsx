import React, { useState, useEffect, useRef } from 'react';

function IncidentManagementDashboard({ initialTab = 'feed' }) {
  const [activeTab, setActiveTab] = useState(initialTab === 'report' ? 'report' : 'feed'); // 'feed' or 'report'
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Field Evidence Photo state
  const [evidencePhoto, setEvidencePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Geolocation state
  const [gpsLocation, setGpsLocation] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    status: 'ACQUIRING', // 'ACQUIRING', 'LOCKED', 'DENIED', 'FALLBACK'
    errorMsg: null
  });

  // Suspect Vehicle Scanner state
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [suspectsData, setSuspectsData] = useState(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState(null);

  // Form State
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

  const livePhotoInputRef = useRef(null);
  const devicePhotoInputRef = useRef(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`
    };
  };

  // Acquire Geolocation
  const acquireGeolocation = () => {
    if (!navigator.geolocation) {
      setGpsLocation({
        lat: 28.4595,
        lng: 77.0266,
        accuracy: 50,
        status: 'FALLBACK',
        errorMsg: 'Geolocation not supported by browser. Using default highway GPS coordinates.'
      });
      return;
    }

    setGpsLocation((prev) => ({ ...prev, status: 'ACQUIRING', errorMsg: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 10),
          status: 'LOCKED',
          errorMsg: null
        });
      },
      (err) => {
        console.warn('GPS location access denied or unavailable:', err.message);
        setGpsLocation({
          lat: 28.4595,
          lng: 77.0266,
          accuracy: 100,
          status: 'FALLBACK',
          errorMsg: 'GPS access denied/timed out. Defaulted to expressway sector coordinates.'
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
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
    acquireGeolocation();
  }, []);

  useEffect(() => {
    if (initialTab === 'report') {
      setActiveTab('report');
    } else if (initialTab === 'feed') {
      setActiveTab('feed');
    }
  }, [initialTab]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
    setFormSuccess(null);
  };

  const handlePhotoSelect = (file) => {
    if (file) {
      setEvidencePhoto(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    }
  };

  const handleClearPhoto = () => {
    setEvidencePhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    if (livePhotoInputRef.current) livePhotoInputRef.current.value = '';
    if (devicePhotoInputRef.current) devicePhotoInputRef.current.value = '';
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setFormSuccess(null);

    try {
      const submitData = new FormData();
      submitData.append('incidentType', formData.incidentType);
      submitData.append('locationName', formData.locationName.trim());
      submitData.append('cameraId', formData.cameraId.trim().toUpperCase());
      submitData.append('incidentStartTime', formData.incidentStartTime);
      submitData.append('incidentEndTime', formData.incidentEndTime);
      submitData.append('description', formData.description.trim());

      if (gpsLocation.lat && gpsLocation.lng) {
        submitData.append('latitude', String(gpsLocation.lat));
        submitData.append('longitude', String(gpsLocation.lng));
      }

      if (evidencePhoto) {
        submitData.append('photo', evidencePhoto);
      }

      const res = await fetch('/api/incidents/report', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: submitData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to report incident');
      }

      setFormSuccess(`Incident logged successfully at ${data.incident.locationName}! Coordinates saved: ${gpsLocation.lat ? `${gpsLocation.lat.toFixed(4)}°N, ${gpsLocation.lng.toFixed(4)}°E` : 'Pending'}`);
      handleClearPhoto();
      setFormData({
        incidentType: 'HIT_AND_RUN',
        locationName: 'KMP Expressway Km 20',
        cameraId: 'CAM-001',
        incidentStartTime: toDatetimeLocal(oneHourAgo),
        incidentEndTime: toDatetimeLocal(now),
        description: ''
      });
      fetchIncidents();
      setTimeout(() => {
        setActiveTab('feed');
      }, 1200);
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
    <div className="page incident-dashboard" style={{ maxWidth: '1150px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Expressway Incident Command & Forensics
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Highway hazard tracking, geotagged evidence capture, and automated suspect vehicle corridor scanning.
          </p>
        </div>

        {/* Clean Top Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('feed')}
            style={{
              padding: '0.5rem 1.15rem',
              fontSize: '0.875rem',
              fontWeight: '700',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'feed' ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === 'feed' ? '#0b1120' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s'
            }}
          >
            <span>🚨</span>
            <span>Active Incident Feed ({incidents.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('report');
              acquireGeolocation();
            }}
            style={{
              padding: '0.5rem 1.15rem',
              fontSize: '0.875rem',
              fontWeight: '700',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'report' ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === 'report' ? '#0b1120' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s'
            }}
          >
            <span>📝</span>
            <span>Report Incident</span>
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

      {/* TAB 1: ACTIVE INCIDENT FEED */}
      {activeTab === 'feed' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Highway Incident Feed & Forensic Cases
              </h3>
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
              🔄 Refresh Feed
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
              Loading active highway incident stream...
            </div>
          ) : incidents.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛣️</div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.35rem' }}>No Active Incidents Logged</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Expressway sectors are clear of reported collisions and hit-and-runs.
              </p>
              <button
                onClick={() => setActiveTab('report')}
                style={{
                  padding: '0.6rem 1.25rem',
                  backgroundColor: 'var(--accent-blue)',
                  color: '#0b1120',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                ➕ Report New Highway Incident
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
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
                      border: isSelected
                        ? '1px solid var(--accent-blue)'
                        : isHitAndRun
                        ? '1px solid rgba(239, 68, 68, 0.4)'
                        : '1px solid var(--border-color)',
                      boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.25)' : undefined
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            backgroundColor: isHitAndRun ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: isHitAndRun ? '#f87171' : '#fbbf24',
                            border: `1px solid ${isHitAndRun ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`
                          }}
                        >
                          {isHitAndRun ? '🚨 HIT AND RUN' : '💥 ACCIDENT'}
                        </span>

                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            backgroundColor: '#0f172a',
                            color: 'var(--accent-blue)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            fontWeight: '700'
                          }}
                        >
                          {inc.cameraId}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                        {inc.locationName}
                      </h4>

                      {/* GPS Geotag Badge */}
                      {inc.latitude && inc.longitude && (
                        <div style={{ marginBottom: '0.6rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <span>📍</span>
                            <span>{inc.latitude.toFixed(5)}°N, {inc.longitude.toFixed(5)}°E</span>
                          </span>
                        </div>
                      )}

                      <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                        🕒 Window: <strong style={{ color: 'var(--text-primary)' }}>{formatDateTime(inc.incidentStartTime)}</strong> →{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{formatTimeOnly(inc.incidentEndTime)}</strong>
                      </div>

                      {inc.description && (
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontStyle: 'italic', lineHeight: 1.4 }}>
                          "{inc.description}"
                        </p>
                      )}

                      {/* Evidence Photo Preview */}
                      {(inc.evidencePhotoUrl || inc.photoUrl) && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: '600' }}>
                            📸 Field Evidence Photo:
                          </div>
                          <a href={inc.evidencePhotoUrl || inc.photoUrl} target="_blank" rel="noreferrer">
                            <img
                              src={inc.evidencePhotoUrl || inc.photoUrl}
                              alt="Incident Evidence"
                              style={{
                                width: '100%',
                                maxHeight: '140px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)'
                              }}
                            />
                          </a>
                        </div>
                      )}

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        Reported by: <span style={{ color: '#cbd5e1' }}>{inc.reportedBy?.name || 'Field Officer'}</span>
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
                          fontSize: '0.875rem',
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

          {/* SUSPECT VEHICLES SCANNER MODAL / RESULTS SECTION */}
          {selectedIncident && (
            <div
              className="card"
              style={{
                padding: '2rem',
                border: '1px solid var(--accent-blue)',
                boxShadow: '0 0 30px rgba(56, 189, 248, 0.15)',
                marginBottom: '2rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🔬</span>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                      Suspect Vehicle Scanner: {selectedIncident.locationName}
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Camera: <strong>{selectedIncident.cameraId}</strong> • Forensic Window: {formatDateTime(selectedIncident.incidentStartTime)} to {formatTimeOnly(selectedIncident.incidentEndTime)}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedIncident(null)}
                  style={{
                    padding: '0.45rem 1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Close Scanner
                </button>
              </div>

              {scannerLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#38bdf8' }}>
                  Scanning highway checkpoint optical feeds during incident window...
                </div>
              ) : scannerError ? (
                <div style={{ color: '#f87171', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: '6px' }}>
                  {scannerError}
                </div>
              ) : !suspectsData || suspectsData.suspects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No vehicles detected at checkpoint {selectedIncident.cameraId} during the specified incident window.
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#34d399', fontWeight: '600' }}>
                    <span>✓ Identified {suspectsData.suspects.length} Vehicle Sightings within incident corridor</span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>Sighting Time</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Plate Number</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Vehicle Type / Color</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Confidence</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Optical Crop</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suspectsData.suspects.map((s, idx) => (
                          <tr key={s._id || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                              {formatDateTime(s.timestamp)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: '800',
                                  fontSize: '0.95rem',
                                  backgroundColor: '#0f172a',
                                  color: '#f8fafc',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '4px',
                                  border: '1px solid #334155'
                                }}
                              >
                                {s.plateNumber}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                              {s.vehicleType || 'SEDAN'} {s.vehicleColor ? `(${s.vehicleColor})` : ''}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#34d399', fontWeight: '600' }}>
                              {s.confidence ? `${(s.confidence * 100).toFixed(1)}%` : '95%'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {s.cropImagePath ? (
                                <a href={s.cropImagePath} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: '600', fontSize: '0.8rem' }}>
                                  View Plate Crop ↗
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>CCTV Frame</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REPORT INCIDENT FORM */}
      {activeTab === 'report' && (
        <div className="card" style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Report Highway Incident & Field Evidence
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Log highway collisions, hit-and-runs, or roadside hazards with geotagged GPS and photographic evidence.
              </p>
            </div>
          </div>

          {/* GPS Geotag Status Banner */}
          <div
            style={{
              backgroundColor: '#070f20',
              border: gpsLocation.status === 'LOCKED' ? '1px solid #38bdf8' : '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '10px',
              padding: '0.9rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.25rem' }}>📍</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f8fafc', fontFamily: 'monospace' }}>
                  {gpsLocation.lat && gpsLocation.lng
                    ? `Geotagged: ${gpsLocation.lat.toFixed(5)}°N, ${gpsLocation.lng.toFixed(5)}°E`
                    : 'Acquiring GPS location...'}
                </div>
                <div style={{ fontSize: '0.75rem', color: gpsLocation.status === 'LOCKED' ? '#34d399' : '#fbbf24', marginTop: '0.15rem' }}>
                  {gpsLocation.status === 'LOCKED'
                    ? `✓ Accurate to ~${gpsLocation.accuracy}m (Hardware GPS Fixed)`
                    : gpsLocation.status === 'ACQUIRING'
                    ? 'Connecting to satellite / browser geolocation...'
                    : gpsLocation.errorMsg || 'GPS fallback coordinates assigned'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={acquireGeolocation}
              style={{
                padding: '0.35rem 0.75rem',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '6px',
                color: '#38bdf8',
                fontSize: '0.775rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh GPS
            </button>
          </div>

          <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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
                  Camera Checkpoint Code *
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
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Location / Landmark Description *
              </label>
              <input
                type="text"
                name="locationName"
                value={formData.locationName}
                onChange={handleInputChange}
                required
                placeholder="e.g. KMP Expressway Km 20 or Sohna Toll Plaza Inbound"
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Forensic Notes & Incident Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="e.g. Silver sedan collided with lane divider and fled eastbound towards toll plaza..."
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

            {/* Field Evidence Photo Action Buttons */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Geotagged Photographic Field Evidence
              </label>

              {/* Hidden file inputs */}
              <input
                ref={livePhotoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => e.target.files && handlePhotoSelect(e.target.files[0])}
                style={{ display: 'none' }}
              />
              <input
                ref={devicePhotoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && handlePhotoSelect(e.target.files[0])}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => livePhotoInputRef.current && livePhotoInputRef.current.click()}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: '8px',
                    color: '#38bdf8',
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>📷</span>
                  <span>Capture Live Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => devicePhotoInputRef.current && devicePhotoInputRef.current.click()}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>📁</span>
                  <span>Upload from Device</span>
                </button>
              </div>

              {/* Photo Preview Thumbnail */}
              {photoPreview && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={photoPreview}
                      alt="Field Evidence"
                      style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.85rem' }}>
                        {evidencePhoto?.name || 'field_evidence.jpg'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.15rem' }}>
                        ✓ Ready for geotagged attachment ({((evidencePhoto?.size || 0) / 1024).toFixed(1)} KB)
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    style={{
                      padding: '0.35rem 0.65rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
              <button
                type="submit"
                disabled={formLoading}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  backgroundColor: 'var(--accent-blue)',
                  color: '#0b1120',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  cursor: formLoading ? 'not-allowed' : 'pointer',
                  opacity: formLoading ? 0.7 : 1
                }}
              >
                {formLoading ? 'Logging Incident & Saving Geotag...' : 'Submit Incident Report'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                style={{
                  padding: '0.85rem 1.5rem',
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
      )}
    </div>
  );
}

export default IncidentManagementDashboard;
