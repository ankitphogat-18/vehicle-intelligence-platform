// frontend/src/pages/VehicleSearchPage.jsx
import React, { useState, useEffect } from 'react';

function VehicleSearchPage() {
  const [plate, setPlate] = useState(''); 
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!plate) return;
    try {
      const res = await fetch(`/api/vehicles/${plate.trim().toUpperCase()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setData(json.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setData(null);
    }
  };

  return (
    <div className="page vehicle-search">
      <h2>Vehicle Search (Phase 4)</h2>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Enter plate (e.g., DL01AB1234)"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          className="input-primary"
        />
        <button type="submit" className="btn-primary">Search</button>
      </form>
      {error && <div className="alert error">{error}</div>}
      {data && (
        <div className="vehicle-details">
          <h3>Plate: {data.plate}</h3>
          <section>
            <h4>Sightings (chronological)</h4>
            <table className="tbl-sightings">
              <thead>
                <tr>
                  <th>Camera</th>
                  <th>Timestamp</th>
                  <th>Direction</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {data.sightings.map((s) => (
                  <tr key={s._id}>
                    <td>{s.cameraId}</td>
                    <td>{new Date(s.timestamp).toLocaleString()}</td>
                    <td>{s.direction}</td>
                    <td>{(s.plateConfidence * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h4>Trajectory</h4>
            <table className="tbl-trajectory">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Camera</th>
                  <th>Timestamp</th>
                  <th>Travel Time (s)</th>
                </tr>
              </thead>
              <tbody>
                {data.trajectory.map((t, idx) => (
                  <tr key={t.sightingId}>
                    <td>{idx + 1}</td>
                    <td>{t.cameraName || t.cameraId}</td>
                    <td>{new Date(t.timestamp).toLocaleString()}</td>
                    <td>{t.travelTimeFromPrev !== null ? t.travelTimeFromPrev.toFixed(0) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h4>Detected Anomalies</h4>
            {data.anomalies.length === 0 && <p>No anomalies detected.</p>}
            {data.anomalies.map((a, i) => (
              <div key={i} className="alert warning">
                <strong>{a.type}</strong>: {a.description}
                <br />Confidence: {(a.confidence * 100).toFixed(0)}%
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

export default VehicleSearchPage;

