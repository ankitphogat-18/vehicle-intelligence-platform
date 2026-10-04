import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CHANDIGARH_CHECKPOINTS = [
  { id: '', label: 'Corridor Wide (All 8 Checkpoints)' },
  { id: 'CAM-CHD-01', label: 'CAM-CHD-01: Tribune Chowk (Sector 29/31)' },
  { id: 'CAM-CHD-02', label: 'CAM-CHD-02: Sector 17 Plaza Radial Junction' },
  { id: 'CAM-CHD-03', label: 'CAM-CHD-03: ISBT Sector 43 Chowk' },
  { id: 'CAM-CHD-04', label: 'CAM-CHD-04: Transport Chowk (Madhya Marg)' },
  { id: 'CAM-CHD-05', label: 'CAM-CHD-05: Housing Board Chowk (Panchkula Border)' },
  { id: 'CAM-CHD-06', label: 'CAM-CHD-06: PGI / Panjab University Chowk' },
  { id: 'CAM-CHD-07', label: 'CAM-CHD-07: IT Park Entry Junction' },
  { id: 'CAM-CHD-08', label: 'CAM-CHD-08: Zirakpur-Airport Road Barrier' }
];

function InvestigationHubPage() {
  const navigate = useNavigate();

  // Filters State
  const [checkpoint, setCheckpoint] = useState('');
  const [timeWindow, setTimeWindow] = useState('24h'); // '1h' | '4h' | 'today' | '24h' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [suspectColor, setSuspectColor] = useState('');
  const [suspectModel, setSuspectModel] = useState('');
  const [targetPlate, setTargetPlate] = useState('');

  // Investigation Results State
  const [activeTab, setActiveTab] = useState('suspects'); // 'exact' | 'suspects' | 'all'
  const [results, setResults] = useState({
    exactMatches: [],
    visualSuspects: [],
    allSightings: [],
    count: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Owner Dossier Modal State
  const [selectedDossier, setSelectedDossier] = useState(null);

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
    if (suspectColor.trim()) params.append('suspectColor', suspectColor.trim());
    if (suspectModel.trim()) params.append('suspectModel', suspectModel.trim());
    if (targetPlate.trim()) params.append('plateNumber', targetPlate.trim().toUpperCase());

    try {
      const res = await fetch(`/api/investigations/corridor-search?${params.toString()}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || json.error || 'Failed to execute corridor investigation scan');
      }

      setResults({
        exactMatches: json.exactMatches || [],
        visualSuspects: json.visualSuspects || [],
        allSightings: json.allSightings || [],
        count: json.count || 0
      });

      // Auto switch tab if no visual suspects but exact matches exist
      if (json.visualSuspects?.length === 0 && json.exactMatches?.length > 0) {
        setActiveTab('exact');
      }
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

  return (
    <div className="page investigation-page" style={{ maxWidth: '1250px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔍</span>
          <span>Forensic Corridor & Plate-Swap Investigation Hub</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Automated VAHAN cross-referencing to detect cloned number plates, physical vehicle mismatches, and suspect corridor sightings.
        </p>
      </div>

      {/* FILTER BAR / CORRIDOR INCIDENT CONTROLS */}
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
          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Corridor Incident & Forensic Filters</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Checkpoint Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: '700' }}>
              CHECKPOINT / JUNCTION
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

          {/* Suspect Color */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: '700' }}>
              SUSPECT COLOR (VISUAL)
            </label>
            <input
              type="text"
              placeholder="e.g. White, Silver, Red..."
              value={suspectColor}
              onChange={(e) => setSuspectColor(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Suspect Model */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: '700' }}>
              SUSPECT MODEL / TYPE (VISUAL)
            </label>
            <input
              type="text"
              placeholder="e.g. Celerio, Alto, Swift, SUV..."
              value={suspectModel}
              onChange={(e) => setSuspectModel(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Target Plate */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: '700' }}>
              TARGET NUMBER PLATE (OPTIONAL)
            </label>
            <input
              type="text"
              placeholder="e.g. RJ47CA3205"
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
              setSuspectColor('');
              setSuspectModel('');
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
            <span>{loading ? 'Scanning Corridor...' : '⚡ Run Forensic Corridor Scan'}</span>
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

      {/* INVESTIGATION TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setActiveTab('suspects')}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: activeTab === 'suspects' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
            color: activeTab === 'suspects' ? '#f87171' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'suspects' ? '2px solid #ef4444' : '2px solid transparent',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>🕵️ Plate-Swap / Visual Model Suspects</span>
          <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '800' }}>
            {results.visualSuspects.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('exact')}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: activeTab === 'exact' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'exact' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'exact' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>🎯 Exact Plate Matches</span>
          <span style={{ backgroundColor: 'var(--accent-blue)', color: '#0b1120', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '800' }}>
            {results.exactMatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: activeTab === 'all' ? 'rgba(100, 116, 139, 0.15)' : 'transparent',
            color: activeTab === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'all' ? '2px solid var(--text-primary)' : '2px solid transparent',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>📋 All Corridor Sightings</span>
          <span style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '800' }}>
            {results.allSightings.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Processing checkpoint feeds and cross-referencing VAHAN registration database...
        </div>
      ) : activeTab === 'suspects' ? (
        /* TAB 2: PLATE-SWAP & VISUAL SUSPECTS */
        <div>
          {results.visualSuspects.length === 0 ? (
            <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                No Plate-Swap or Visual Discrepancies Detected
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                All camera detections in this time window match their official registered vehicle makes, models, and colors.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {results.visualSuspects.map((s, idx) => (
                <div
                  key={s.sightingId || idx}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    border: s.isPlateSwapSuspect ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid var(--border-color)',
                    backgroundColor: s.isPlateSwapSuspect ? 'rgba(30, 20, 30, 0.85)' : 'var(--bg-secondary)',
                    boxShadow: s.isPlateSwapSuspect ? '0 0 16px rgba(239, 68, 68, 0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        onClick={() => setSelectedDossier(s)}
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: '800',
                          fontFamily: 'monospace',
                          letterSpacing: '0.05em',
                          color: '#ffffff',
                          backgroundColor: '#0f172a',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #ef4444',
                          cursor: 'pointer'
                        }}
                      >
                        {s.plateNumber}
                      </span>

                      {s.isPlateSwapSuspect && (
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
                          ⚠️ LIKELY PLATE SWAP / CLONED REGISTRATION
                        </span>
                      )}

                      {s.isStolen && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', padding: '0.25rem 0.6rem', borderRadius: '9999px', backgroundColor: '#ef4444', color: '#fff' }}>
                          🚨 STOLEN
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setSelectedDossier(s)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        📋 Owner Dossier
                      </button>
                      <button
                        onClick={() => handleTrackRoute(s.plateNumber)}
                        style={{
                          padding: '0.45rem 1rem',
                          backgroundColor: 'var(--accent-blue)',
                          color: '#0b1120',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <span>🛰️ Track Route</span>
                      </button>
                    </div>
                  </div>

                  {/* Discrepancy Breakdown Box */}
                  {s.isPlateSwapSuspect && (
                    <div
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        marginBottom: '1rem',
                        color: '#fca5a5',
                        fontSize: '0.85rem',
                        lineHeight: '1.5'
                      }}
                    >
                      <div style={{ fontWeight: '700', color: '#f87171', marginBottom: '0.2rem' }}>
                        ⚡ Forensic Discrepancy Analysis:
                      </div>
                      {s.discrepancyNote}
                    </div>
                  )}

                  {/* Registered vs Detected Comparison Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>OFFICIAL VAHAN REGISTRATION</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                        {s.registeredModel}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Color: <strong style={{ color: 'var(--text-primary)' }}>{s.registeredColor}</strong> • Owner: <strong style={{ color: 'var(--text-primary)' }}>{s.owner?.name || 'Unregistered'}</strong>
                      </div>
                    </div>

                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>AI CAMERA SENSORS DETECTED</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#38bdf8', marginTop: '0.2rem' }}>
                        {s.detectedModel}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Color: <strong style={{ color: 'var(--text-primary)' }}>{s.detectedColor}</strong> • Checkpoint: <strong style={{ color: 'var(--text-primary)' }}>{s.cameraName}</strong>
                      </div>
                    </div>

                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>DETECTION TIMESTAMP</div>
                        <div style={{ fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: '600', marginTop: '0.2rem' }}>
                          🕒 {s.formattedTime}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.15rem' }}>
                          ANPR Confidence: {(s.confidence * 100).toFixed(1)}%
                        </div>
                      </div>

                      {s.cropImagePath && (
                        <img
                          src={s.cropImagePath}
                          alt="Plate Crop"
                          style={{ width: '60px', height: '38px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'exact' ? (
        /* TAB 1: EXACT MATCHES */
        <div className="card" style={{ overflowX: 'auto', padding: '0.5rem' }}>
          {results.exactMatches.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No exact plate matches found for the specified search criteria.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Plate Number</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Checkpoint & Sector</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Sighting Time</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Vehicle Details</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Owner Info</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.exactMatches.map((s, idx) => (
                  <tr key={s.sightingId || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        onClick={() => setSelectedDossier(s)}
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          color: '#fff',
                          backgroundColor: '#0f172a',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          border: s.isStolen ? '1px solid #ef4444' : '1px solid var(--border-color)',
                          cursor: 'pointer'
                        }}
                      >
                        {s.plateNumber}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{s.cameraName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.sector}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{s.formattedTime}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{s.registeredModel || s.detectedModel}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Color: {s.registeredColor || s.detectedColor}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{s.owner?.name || 'Unregistered'}</div>
                      {s.owner?.phone && <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{s.owner.phone}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
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
                          Dossier
                        </button>
                        <button
                          onClick={() => handleTrackRoute(s.plateNumber)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: 'var(--accent-blue)',
                            color: '#0b1120',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          🛰️ Track
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* TAB 3: ALL SIGHTINGS */
        <div className="card" style={{ overflowX: 'auto', padding: '0.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Plate</th>
                <th style={{ padding: '0.75rem 1rem' }}>Checkpoint</th>
                <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1rem' }}>Detected Vehicle</th>
                <th style={{ padding: '0.75rem 1rem' }}>Registered Vehicle</th>
                <th style={{ padding: '0.75rem 1rem' }}>Fraud Flag</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.allSightings.map((s, idx) => (
                <tr key={s.sightingId || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      onClick={() => setSelectedDossier(s)}
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: '700',
                        color: 'var(--accent-blue)',
                        cursor: 'pointer'
                      }}
                    >
                      {s.plateNumber}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.cameraName}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{s.formattedTime}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.detectedColor} {s.detectedModel}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.registeredColor} {s.registeredModel}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {s.isPlateSwapSuspect ? (
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>
                        PLATE SWAP
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#34d399' }}>✓ MATCH</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleTrackRoute(s.plateNumber)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: 'var(--accent-blue)',
                        color: '#0b1120',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      🛰️ Track
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            zIndex: 1000,
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LICENSE PLATE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--accent-blue)', marginTop: '0.2rem' }}>
                  {selectedDossier.plateNumber}
                </div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REGISTERED OWNER</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedDossier.owner?.name || 'Unregistered / Unknown'}
                </div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CONTACT PHONE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#38bdf8', marginTop: '0.2rem' }}>
                  {selectedDossier.owner?.phone || '+91 98765 43210'}
                </div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CONTACT EMAIL</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {selectedDossier.owner?.email || 'N/A'}
                </div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REGISTERED MAKE & MODEL</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedDossier.registeredModel}
                </div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REGISTERED COLOR</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedDossier.registeredColor}
                </div>
              </div>
            </div>

            {selectedDossier.rcDocumentUrl && (
              <div style={{ padding: '0.85rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  📄 Registration Certificate (RC) Document
                </span>
                <a
                  href={selectedDossier.rcDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-blue)', fontWeight: '700', fontSize: '0.85rem', textDecoration: 'underline' }}
                >
                  Download / View PDF
                </a>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setSelectedDossier(null)}
                style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const plate = selectedDossier.plateNumber;
                  setSelectedDossier(null);
                  handleTrackRoute(plate);
                }}
                style={{ padding: '0.5rem 1.25rem', backgroundColor: 'var(--accent-blue)', color: '#0b1120', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                🛰️ Start Live Trajectory Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvestigationHubPage;
