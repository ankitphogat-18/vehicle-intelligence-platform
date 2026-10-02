import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "leaflet/dist/leaflet.css"; // kept for possible CSS but not needed without react-leaflet

function MapPage() {
  const { plate } = useParams(); // /map/:plate
  const [trajectory, setTrajectory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!plate) return;
    const fetchTrajectory = async () => {
      try {
        const res = await fetch(`/api/vehicles/${plate}/trajectory`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed");
        setTrajectory(json.data || []);
        setError(null);
      } catch (err) {
        setError(err.message);
        setTrajectory([]);
      }
    };
    fetchTrajectory();
  }, [plate]);

  // Build a simple OSM embed URL centered on the first point (if any)
  const first = trajectory[0];
  const osmUrl = first
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${first.longitude - 0.01},${first.latitude - 0.01},${first.longitude + 0.01},${first.latitude + 0.01}&layer=mapnik&marker=${first.latitude},${first.longitude}`
    : null;

  return (
    <div className="page map-page">
      <h2>Vehicle Trajectory Map {plate && `for ${plate}`}</h2>
      {error && <div className="alert error">{error}</div>}
      {trajectory.length > 0 ? (
        <>
          {/* Simple OSM iframe showing the first location */}
          {osmUrl && (
            <iframe
              width="100%"
              height="500"
              frameBorder="0"
              scrolling="no"
              src={osmUrl}
              style={{ border: "1px solid var(--border-color)" }}
            ></iframe>
          )}
          <h3>Trajectory Points</h3>
          <ul>
            {trajectory.map((t, idx) => (
              <li key={t.sightingId || idx}>
                <strong>Step {idx + 1}</strong>: Camera {t.cameraId},
                Lat {t.latitude}, Lng {t.longitude}, Time {new Date(t.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>No trajectory data available.</p>
      )}
    </div>
  );
}

export default MapPage;
