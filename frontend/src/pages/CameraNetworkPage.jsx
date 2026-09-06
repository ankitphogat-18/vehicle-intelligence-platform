import React, { useState, useEffect } from 'react';

function CameraNetworkPage() {
  const [cameras, setCameras] = useState([]);
  const [stats, setStats] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [plateFilter, setPlateFilter] = useState('');

  // Modal State
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [cameraDetections, setCameraDetections] = useState([]);
  const [loadingCamDetections, setLoadingCamDetections] = useState(false);

  // Fetch all cameras
  const fetchCameras = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cameras');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setCameras(json.data);
        setStats(json.stats);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load cameras:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent simulated detections
  const fetchDetections = async () => {
    try {
      const res = await fetch('/api/detections?limit=30');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setDetections(json.data);
      }
    } catch (err) {
      console.error('Failed to load detections:', err);
    }
  };

  useEffect(() => {
    fetchCameras();
    fetchDetections();
  }, []);

  // Fetch detections for selected camera modal
  const handleOpenModal = async (cam) => {
    setSelectedCamera(cam);
    try {
      setLoadingCamDetections(true);
      const res = await fetch(`/api/detections?cameraId=${cam.cameraId}&limit=10`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCameraDetections(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch camera specific detections:', err);
    } finally {
      setLoadingCamDetections(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedCamera(null);
    setCameraDetections([]);
  };

  // Filtered cameras list
  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cam.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cam.junction.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cam.cameraId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || cam.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || cam.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Filtered detections stream
  const filteredDetections = detections.filter((det) => {
    if (!plateFilter) return true;
    return (
      det.plateNumber.toLowerCase().includes(plateFilter.toLowerCase()) ||
      det.cameraId.toLowerCase().includes(plateFilter.toLowerCase()) ||
      det.vehicleType.toLowerCase().includes(plateFilter.toLowerCase())
    );
  });

  const formatCameraType = (type) => {
    switch (type) {
      case 'ANPR':
        return 'ANPR / LPR';
      case 'SPEED_ENFORCEMENT':
        return 'Speed Enforcement';
      case 'TOLL_CHECKPOINT':
        return 'Toll / Checkpoint';
      case 'CCTV_FIXED':
        return 'Fixed CCTV';
      case 'TRAFFIC':
        return 'Traffic Flow';
      case 'PTZ':
        return 'PTZ Dome';
      default:
        return type;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Simulated Camera Network & Feeds
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Phase 2: Multi-source authorized surveillance infrastructure (Software-only simulation).
          </p>
        </div>
        <button
          onClick={() => {
            fetchCameras();
            fetchDetections();
          }}
          className="btn-primary"
        >
          🔄 Refresh Network
        </button>
      </div>

      {/* Network Overview Stats */}
      <div className="grid-4">
        <div className="stat-box">
          <div className="stat-label">Total Registered Cameras</div>
          <div className="stat-value">{stats ? stats.total : cameras.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Online Feeds</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
            {stats ? stats.online : cameras.filter((c) => c.status === 'ONLINE').length}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Offline / Maintenance</div>
          <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>
            {stats ? stats.offline + stats.maintenance : cameras.filter((c) => c.status !== 'ONLINE').length}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Simulated Detections Logged</div>
          <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
            {detections.length}
          </div>
        </div>
      </div>

      {/* Camera Type Breakdown Bar */}
      {stats?.byType && (
        <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              FEED DISTRIBUTION:
            </span>
            <span className="badge badge-blue">ANPR: {stats.byType.ANPR || 0}</span>
            <span className="badge badge-green">Speed: {stats.byType.SPEED_ENFORCEMENT || 0}</span>
            <span className="badge badge-amber">Toll: {stats.byType.TOLL_CHECKPOINT || 0}</span>
            <span className="badge badge-gray">CCTV: {stats.byType.CCTV_FIXED || 0}</span>
            <span className="badge badge-gray">Traffic: {stats.byType.TRAFFIC || 0}</span>
            <span className="badge badge-gray">PTZ: {stats.byType.PTZ || 0}</span>
          </div>
        </div>
      )}

      {/* Camera Filter Controls */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <input
              type="text"
              placeholder="🔍 Search camera ID, name, junction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          <div style={{ width: '200px' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-select"
            >
              <option value="ALL">All Camera Types</option>
              <option value="ANPR">ANPR / LPR</option>
              <option value="SPEED_ENFORCEMENT">Speed Enforcement</option>
              <option value="TOLL_CHECKPOINT">Toll / Checkpoint</option>
              <option value="CCTV_FIXED">Fixed CCTV</option>
              <option value="TRAFFIC">Traffic Flow</option>
              <option value="PTZ">PTZ Dome</option>
            </select>
          </div>
          <div style={{ width: '160px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
          {(searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="btn-secondary"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="card" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>
          <p>⚠️ Error loading camera data: {error}</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            Make sure MongoDB is running and run <code>npm run seed</code> in the <code>backend/</code> directory.
          </p>
        </div>
      )}

      {/* Cameras Grid */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            Registered City Surveillance Feeds ({filteredCameras.length})
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing authorized sources
          </span>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Loading camera network...</p>
        ) : filteredCameras.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>
            No cameras match the current filter criteria. Run <code>npm run seed</code> to populate demo data.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Camera ID</th>
                  <th>Name & Junction</th>
                  <th>Type</th>
                  <th>Coordinates</th>
                  <th>Direction</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCameras.map((cam) => (
                  <tr key={cam._id || cam.cameraId}>
                    <td>
                      <span className="code-pill">{cam.cameraId}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cam.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {cam.location} • {cam.junction}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-blue">{formatCameraType(cam.type)}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {cam.latitude?.toFixed(4)}, {cam.longitude?.toFixed(4)}
                    </td>
                    <td>
                      <span className="badge badge-gray">{cam.direction}</span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          cam.status === 'ONLINE' ? 'status-pill-green' : 'status-pill-red'
                        }`}
                      >
                        <span
                          className={`status-dot ${cam.status === 'ONLINE' ? 'online' : 'offline'}`}
                        ></span>
                        {cam.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenModal(cam)}
                        className="btn-table-action"
                      >
                        Inspect & Feed
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Observation Stream Section */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>
              Simulated Observation Stream (Development Feed)
            </h2>
            <p className="card-desc" style={{ margin: '0.25rem 0 0 0' }}>
              Chronological vehicle detections logged across cameras (Used for trajectory reconstruction).
            </p>
          </div>
          <div style={{ width: '240px' }}>
            <input
              type="text"
              placeholder="Filter by plate (e.g. DL01AB1234)..."
              value={plateFilter}
              onChange={(e) => setPlateFilter(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        {filteredDetections.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>
            No simulated observations logged. Run <code>npm run seed</code> in backend to populate test records.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Camera</th>
                  <th>Vehicle Plate</th>
                  <th>Class & Color</th>
                  <th>Direction</th>
                  <th>Speed</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetections.map((det) => (
                  <tr key={det._id || `${det.cameraId}-${det.timestamp}`}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(det.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td>
                      <span className="code-pill">{det.cameraId}</span>
                    </td>
                    <td>
                      <span className="plate-badge">{det.plateNumber}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{det.vehicleColor}</span> {det.vehicleType}
                    </td>
                    <td>
                      <span className="badge badge-gray">{det.direction}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {det.speed ? `${det.speed} km/h` : '—'}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background:
                            det.plateConfidence >= 0.9
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                          color:
                            det.plateConfidence >= 0.9 ? 'var(--accent-green)' : 'var(--accent-amber)'
                        }}
                      >
                        {(det.plateConfidence * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Camera Inspector & Simulated Feed Modal */}
      {selectedCamera && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Camera Telemetry: {selectedCamera.name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Identifier: {selectedCamera.cameraId} • Type: {formatCameraType(selectedCamera.type)}
                </span>
              </div>
              <button onClick={handleCloseModal} className="btn-close">
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Simulated Feed Viewport */}
              <div className="feed-viewport">
                <div className="feed-osd-top">
                  <span>● LIVE SIMULATION: {selectedCamera.cameraId}</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="feed-placeholder-center">
                  <div className="feed-reticle"></div>
                  <p style={{ fontWeight: 600, color: 'var(--accent-blue)', marginTop: '0.75rem' }}>
                    SIMULATED SURVEILLANCE FEED ACTIVE
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Source: {selectedCamera.sourceType} • Stream ID: {selectedCamera.streamUrl || 'sim_feed_main'}
                  </p>
                </div>
                <div className="feed-osd-bottom">
                  <span>RES: 1080P HD (MOCK)</span>
                  <span>DIR: {selectedCamera.direction}</span>
                  <span>STATUS: {selectedCamera.status}</span>
                </div>
              </div>

              {/* Feed Notice */}
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--accent-blue)',
                  marginBottom: '1.25rem'
                }}
              >
                ℹ️ <strong>Software Prototype Note:</strong> This feed is a software-only simulation representing an authorized city CCTV/ANPR stream. Prerecorded sample video and AI/OCR frame processors will attach here in subsequent phases.
              </div>

              {/* Camera Metadata Grid */}
              <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-box">
                  <div className="stat-label">Geographic Coordinates</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem' }}>
                    Lat: {selectedCamera.latitude}, Lng: {selectedCamera.longitude}
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Junction / Sector Area</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem' }}>
                    {selectedCamera.junction}
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Coverage Direction</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem' }}>
                    {selectedCamera.direction}
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Operational Status</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: selectedCamera.status === 'ONLINE' ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                    {selectedCamera.status}
                  </div>
                </div>
              </div>

              {/* Recent Detections for This Camera */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                Recent Simulated Detections at {selectedCamera.cameraId}
              </h4>
              {loadingCamDetections ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading detections for this camera...</p>
              ) : cameraDetections.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No recent sightings recorded at this camera in demo dataset.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Plate Number</th>
                        <th>Vehicle Type</th>
                        <th>Color</th>
                        <th>Speed</th>
                        <th>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cameraDetections.map((det) => (
                        <tr key={det._id || det.timestamp}>
                          <td style={{ fontSize: '0.8rem' }}>
                            {new Date(det.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td>
                            <span className="plate-badge">{det.plateNumber}</span>
                          </td>
                          <td>{det.vehicleType}</td>
                          <td>{det.vehicleColor}</td>
                          <td>{det.speed ? `${det.speed} km/h` : '—'}</td>
                          <td>{(det.plateConfidence * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={handleCloseModal} className="btn-secondary">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CameraNetworkPage;

