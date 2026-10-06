import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const CHANDIGARH_CHECKPOINTS = [
  { id: '', label: 'Corridor Wide (All 8 Master Checkpoints)' },
  { id: 'CAM-CHD-01', label: 'CAM-CHD-01: Tribune Chowk (Sector 29/31)' },
  { id: 'CAM-CHD-02', label: 'CAM-CHD-02: Sector 17 Plaza Radial Junction' },
  { id: 'CAM-CHD-03', label: 'CAM-CHD-03: ISBT Sector 43 Main Terminal' },
  { id: 'CAM-CHD-04', label: 'CAM-CHD-04: Madhya Marg (Sector 26 Transport Chowk)' },
  { id: 'CAM-CHD-05', label: 'CAM-CHD-05: IT Park Entry Corridor (Kishangarh)' },
  { id: 'CAM-CHD-06', label: 'CAM-CHD-06: Sukhna Lake Radial Boulevard' },
  { id: 'CAM-CHD-07', label: 'CAM-CHD-07: Secretariat / High Court Perimeter (VIP Zone)' },
  { id: 'CAM-CHD-08', label: 'CAM-CHD-08: Zirakpur-Chandigarh Border (Sector 31)' }
];

function InvestigationHubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    user = {};
  }
  const isIncidentTeam = user?.role === 'INCIDENT_MANAGEMENT';

  // Filters State
  const [checkpoint, setCheckpoint] = useState(searchParams.get('checkpoint') || '');
  const [timeWindow, setTimeWindow] = useState('24h'); // '1h' | '4h' | 'today' | '24h' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [targetPlate, setTargetPlate] = useState(searchParams.get('plate') || '');

  // Investigation Results State
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Snapshot Full View & Owner Dossier Modal State
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);

  const calculateTimeRange = () => {
    const now = new Date();
    let start = new Date(now.getTime() - 24 * 3600000);
    let end = now;

    if (timeWindow === '1h') {
      start = new Date(now.getTime() - 3600000);
    } else if (timeWindow === '4h') {
      start = new Date(now.getTime() - 4 * 3600000);
    } else if (timeWindow === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (timeWindow === 'custom') {
      if (customStart) start = new Date(customStart);
      if (customEnd) end = new Date(customEnd);
    }

    return {
      startTime: start.toISOString(),
      endTime: end.toISOString()
    };
  };

  const executeCorridorSearch = async () => {
    setLoading(true);
    setError(null);

    const { startTime, endTime } = calculateTimeRange();

    const params = new URLSearchParams();
    if (checkpoint) params.append('locationName', checkpoint);
    params.append('startTime', startTime);
    params.append('endTime', endTime);
    if (targetPlate.trim()) params.append('plateNumber', targetPlate.trim().toUpperCase());

    try {
      const res = await fetch(`/api/investigations/corridor-search?${params.toString()}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || json.error || 'Failed to execute corridor investigation scan');
      }

      setSightings(json.sightings || json.allSightings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeCorridorSearch();
  }, []);

  const handleTrackRoute = (plateNumber) => {
    if (!plateNumber) return;
    navigate(`/map?plate=${encodeURIComponent(plateNumber)}`);
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'Just now';
    const d = new Date(isoString);
    return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${d.toLocaleDateString()}`;
  };

  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const backendBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    return `${backendBase}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  if (isIncidentTeam) {
    return (
      <div className="page" style={{ maxWidth: '700px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Access Restricted: Police & Investigation Authority Only
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Corridor vehicle surveillance, ANPR plate search, and trajectory forensic tracking are restricted to Police Headquarters and Traffic Enforcement personnel.
          </p>
          <button
            onClick={() => navigate('/incidents')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--accent-blue)',
              color: '#0b1120',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            ← Return to Incident Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page investigation-page" style={{ maxWidth: '1250px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔍</span>
          <span>Spatio-Temporal Corridor Sighting Audit & Investigation Hub</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Real CCTV camera image logs cross-referenced with the official VAHAN registry. Inspect visual snapshots and launch GIS trajectory tracking.
        </p>
      </div>

      {/* FILTER BAR / CORRIDOR CONTROLS */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.1rem' }}>⚙️</span>
          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Corridor Search & Audit Filters</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Checkpoint Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: '700' }}>
              CHECKPOINT / CCTV JUNCTION
            </label>
            <select
              value={checkpoint}
              onChange={(e) => setCheckpoint(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            >
              {CHANDIGARH_CHECKPOINTS.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Window Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: '700' }}>
              TIME WINDOW
            </label>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            >
              <option value="1h">Last 1 Hour</option>
              <option value="4h">Last 4 Hours</option>
              <option value="today">Today (Since Midnight)</option>
              <option value="24h">Last 24 Hours</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Target Plate */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: '700' }}>
              SEARCH LICENSE PLATE
            </label>
            <input
              type="text"
              placeholder="e.g. RJ47CA3205 or DL01AB..."
              value={targetPlate}
              onChange={(e) => setTargetPlate(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}
            />
          </div>
        </div>

        {/* Custom Date Pickers if active */}
        {timeWindow === 'custom' && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>START TIME</label>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ padding: '0.45rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>END TIME</label>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ padding: '0.45rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            onClick={() => {
              setCheckpoint('');
              setTimeWindow('24h');
              setTargetPlate('');
            }}
            style={{
              padding: '0.55rem 1rem',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
          <button
            onClick={executeCorridorSearch}
            disabled={loading}
            style={{
              padding: '0.55rem 1.5rem',
              backgroundColor: 'var(--accent-blue)',
              color: '#0b1120',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.25)'
            }}
          >
            <span>{loading ? 'Scanning Corridor Feeds...' : '⚡ Audit Corridor Sightings'}</span>
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
          ⚠️ {error}
        </div>
      )}

      {/* SIGHTING AUDIT TABLE */}
      <div className="card" style={{ padding: '0.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Corridor Sightings Log ({sightings.length} Sightings Audited)
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time multi-camera audit feed
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading corridor camera snapshots and registry records...
          </div>
        ) : sightings.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
            <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              No Camera Sightings Found
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              No vehicle movements recorded in this checkpoint and time window.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Camera Snapshot</th>
                <th style={{ padding: '0.85rem 1rem' }}>Plate Number</th>
                <th style={{ padding: '0.85rem 1rem' }}>Checkpoint / Location</th>
                <th style={{ padding: '0.85rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.85rem 1rem' }}>Direction / Movement</th>
                <th style={{ padding: '0.85rem 1rem' }}>Registered Owner / Model (VAHAN)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sightings.map((s, idx) => {
                const imgPath = s.cropImagePath || s.snapshotUrl;
                const fullImg = getFullImageUrl(imgPath);

                return (
                  <tr
                    key={s.sightingId || idx}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      backgroundColor: s.isStolen ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    {/* 1. Camera Snapshot */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {imgPath ? (
                        <img
                          src={fullImg}
                          alt={`Sighting ${s.plateNumber}`}
                          onClick={() => setZoomedImage({ src: fullImg, plate: s.plateNumber, camera: s.cameraName })}
                          style={{
                            width: '64px',
                            height: '44px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'block',
                            transition: 'transform 0.15s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                          title="Click to zoom snapshot"
                        />
                      ) : (
                        <div
                          style={{
                            width: '64px',
                            height: '44px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px dashed var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            color: 'var(--text-muted)'
                          }}
                        >
                          <span>📷</span>
                          <span>No Frame</span>
                        </div>
                      )}
                    </td>

                    {/* 2. Plate Number */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          onClick={() => setSelectedDossier(s)}
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            fontSize: '0.95rem',
                            color: '#ffffff',
                            backgroundColor: '#0f172a',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '4px',
                            border: s.isStolen ? '1px solid #ef4444' : '1px solid #334155',
                            cursor: 'pointer'
                          }}
                        >
                          {s.plateNumber}
                        </span>
                        {s.isStolen && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: '800',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '9999px',
                              backgroundColor: '#ef4444',
                              color: '#fff'
                            }}
                          >
                            STOLEN
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Conf: {(s.confidence * 100).toFixed(0)}%
                      </div>
                    </td>

                    {/* 3. Checkpoint / Location */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {s.cameraName || s.locationName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {s.sector || 'Corridor Checkpoint'} • <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{s.cameraId}</span>
                      </div>
                    </td>

                    {/* 4. Timestamp */}
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {s.formattedTime || formatTimestamp(s.timestamp)}
                      </div>
                    </td>

                    {/* 5. Direction / Movement */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          backgroundColor: s.direction === 'OUTBOUND' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: s.direction === 'OUTBOUND' ? '#fbbf24' : 'var(--accent-blue)',
                          border: `1px solid ${s.direction === 'OUTBOUND' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                        }}
                      >
                        {s.direction || 'INBOUND'}
                      </span>
                    </td>

                    {/* 6. Registered Owner / Model (Official VAHAN) */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {s.isRegistered ? (
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                            {s.registeredModel} {s.registeredColor !== 'N/A' && `(${s.registeredColor})`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Owner: <strong style={{ color: 'var(--text-secondary)' }}>{s.owner?.name || 'Registered Owner'}</strong>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          Unregistered in VAHAN
                        </div>
                      )}
                    </td>

                    {/* 7. Actions */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => setSelectedDossier(s)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          📋 Dossier
                        </button>
                        <button
                          onClick={() => handleTrackRoute(s.plateNumber)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            backgroundColor: 'var(--accent-blue)',
                            color: '#0b1120',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <span>🛰️ Track Route</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* SNAPSHOT ZOOM MODAL */}
      {zoomedImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2500,
            padding: '1.5rem'
          }}
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '800px',
              width: '100%',
              backgroundColor: '#0f172a',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Camera Sighting Snapshot: <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{zoomedImage.plate}</span>
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Location: {zoomedImage.camera}
                </div>
              </div>
              <button
                onClick={() => setZoomedImage(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', maxHeight: '65vh' }}>
              <img
                src={zoomedImage.src}
                alt="Zoomed Camera Snapshot"
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* OWNER DOSSIER MODAL */}
      {selectedDossier && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
          }}
          onClick={() => setSelectedDossier(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '650px',
              width: '100%',
              padding: '1.75rem',
              backgroundColor: '#0f172a',
              border: '1px solid var(--border-color)',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Registered Owner & Vehicle Dossier
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  State Transport Authority (VAHAN) Master Registry Record
                </p>
              </div>
              <button
                onClick={() => setSelectedDossier(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  color: '#fff',
                  backgroundColor: '#1e293b',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: selectedDossier.isStolen ? '1px solid #ef4444' : '1px solid var(--border-color)'
                }}
              >
                {selectedDossier.plateNumber}
              </span>
              {selectedDossier.isStolen && (
                <span style={{ fontSize: '0.8rem', fontWeight: '800', padding: '0.3rem 0.75rem', borderRadius: '9999px', backgroundColor: 'rgba(239, 68, 68, 0.25)', color: '#f87171', border: '1px solid #ef4444' }}>
                  🚨 ACTIVE STOLEN VEHICLE
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REGISTERED MAKE & MODEL</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedDossier.registeredModel}
                </div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OFFICIAL COLOR</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedDossier.registeredColor}
                </div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REGISTERED OWNER</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedDossier.owner?.name || 'Unregistered in VAHAN'}
                </div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CONTACT TELEPHONE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--accent-blue)', marginTop: '0.2rem' }}>
                  {selectedDossier.owner?.phone || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setSelectedDossier(null)}
                style={{ padding: '0.55rem 1.2rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const plate = selectedDossier.plateNumber;
                  setSelectedDossier(null);
                  handleTrackRoute(plate);
                }}
                style={{ padding: '0.55rem 1.4rem', backgroundColor: 'var(--accent-blue)', color: '#0b1120', border: 'none', borderRadius: '6px', fontWeight: '800', cursor: 'pointer' }}
              >
                🛰️ Track Trajectory on Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvestigationHubPage;
