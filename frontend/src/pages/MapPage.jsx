import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CHANDIGARH_CENTER = [30.7333, 76.7794];
const DEFAULT_ZOOM = 13;

function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { plate: routePlate } = useParams();
  const navigate = useNavigate();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const cameraLayerRef = useRef(null);
  const trajectoryLayerRef = useRef(null);

  const initialPlate = routePlate || searchParams.get('plate') || '';
  const [inputPlate, setInputPlate] = useState(initialPlate);
  const [activePlate, setActivePlate] = useState(initialPlate);

  const [cameras, setCameras] = useState([]);
  const [trajectoryData, setTrajectoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quick suggestion plates
  const samplePlates = [
    { plate: 'RJ47CA3205', label: '🚨 RJ47CA3205 (Stolen)', isStolen: true },
    { plate: 'DL01AB1234', label: '🚗 DL01AB1234', isStolen: false },
    { plate: 'HR26DQ5678', label: '🚙 HR26DQ5678', isStolen: false }
  ];

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: CHANDIGARH_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true
      });

      // Standard OpenStreetMap Tile Layer (No API key required + Dark CSS Filter)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Render Red-Zone Shaded Perimeter Polygon (Civil Secretariat / High Court VIP Zone)
      const restrictedZoneCoords = [
        [30.7550, 76.8000],
        [30.7550, 76.8120],
        [30.7450, 76.8120],
        [30.7450, 76.8000]
      ];

      const restrictedPolygon = L.polygon(restrictedZoneCoords, {
        color: '#ef4444',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#b91c1c',
        fillOpacity: 0.25
      }).addTo(map);

      restrictedPolygon.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="background: #ef4444; color: #fff; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px;">
              RESTRICTED HIGH-SECURITY ZONE
            </span>
          </div>
          <div style="font-weight: 700; font-size: 12px; color: #0f172a; margin-top: 2px;">
            Chandigarh Civil Secretariat & High Court Perimeter
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4;">
            Automated ANPR triggers high-priority <strong>RESTRICTED_ZONE_BREACH</strong> alarms upon entry of flagged or unauthorized vehicles.
          </div>
        </div>
      `);

      cameraLayerRef.current = L.layerGroup().addTo(map);
      trajectoryLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Fetch Cameras & Render Camera Checkpoints
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const res = await fetch('/api/cameras');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCameras(json.data);
        }
      } catch (err) {
        console.error('Failed to load cameras:', err);
      }
    };
    fetchCameras();
  }, []);

  // 3. Render Cameras on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const cameraLayer = cameraLayerRef.current;
    if (!map || !cameraLayer || cameras.length === 0) return;

    cameraLayer.clearLayers();

    cameras.forEach((cam) => {
      if (!cam.latitude || !cam.longitude) return;

      const isMobileUnit = cam.cameraId === 'MOBILE_PATROL_LIVE' || cam.cameraId.includes('MOBILE');

      const camIcon = L.divIcon({
        className: 'custom-cam-icon',
        html: `
          <div style="
            width: ${isMobileUnit ? '34px' : '28px'};
            height: ${isMobileUnit ? '34px' : '28px'};
            background: ${isMobileUnit ? '#10b981' : 'rgba(15, 23, 42, 0.9)'};
            border: 2px solid ${isMobileUnit ? '#ffffff' : '#38bdf8'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 ${isMobileUnit ? '16px #10b981' : '10px rgba(56, 189, 248, 0.6)'};
            font-size: ${isMobileUnit ? '16px' : '13px'};
            animation: ${isMobileUnit ? 'pulse 1.5s infinite' : 'none'};
          ">
            ${isMobileUnit ? '📱' : '📹'}
          </div>
        `,
        iconSize: [isMobileUnit ? 34 : 28, isMobileUnit ? 34 : 28],
        iconAnchor: [isMobileUnit ? 17 : 14, isMobileUnit ? 17 : 14]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: camIcon });

      marker.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; min-width: 190px; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 11px; background: ${isMobileUnit ? '#059669' : '#0284c7'}; color: #fff; padding: 2px 6px; border-radius: 4px;">
              ${cam.cameraId}
            </span>
            <span style="font-size: 10px; font-weight: 700; color: #16a34a;">● ${cam.status || 'ONLINE'}</span>
          </div>
          <div style="font-weight: 700; font-size: 13px; margin-top: 4px; color: #0f172a;">
            ${cam.name || cam.locationName}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Sector: ${cam.sector || (isMobileUnit ? 'Live Field Patrol' : 'Chandigarh')}</div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">📍 GPS: ${cam.latitude.toFixed(4)}°N, ${cam.longitude.toFixed(4)}°E</div>
        </div>
      `);

      cameraLayer.addLayer(marker);
    });
  }, [cameras]);

  // 4. Fetch Trajectory when activePlate changes
  const fetchTrajectory = async (plate) => {
    if (!plate || !plate.trim()) return;
    const cleanPlate = plate.trim().toUpperCase();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/sightings/trajectory/${encodeURIComponent(cleanPlate)}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || json.error || 'Failed to fetch trajectory');
      }

      setTrajectoryData(json);

      if (!json.trajectory || json.trajectory.length === 0) {
        setError(`No camera sightings found for license plate: ${cleanPlate}`);
      }
    } catch (err) {
      setError(err.message);
      setTrajectoryData(null);
    } finally {
      setLoading(false);
    }
  };

  // Sync with URL params
  useEffect(() => {
    const p = routePlate || searchParams.get('plate');
    if (p && p.trim()) {
      const formatted = p.trim().toUpperCase();
      setInputPlate(formatted);
      setActivePlate(formatted);
      fetchTrajectory(formatted);
    }
  }, [routePlate, searchParams]);

  // 5. Draw Trajectory on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const trajectoryLayer = trajectoryLayerRef.current;
    if (!map || !trajectoryLayer) return;

    trajectoryLayer.clearLayers();

    if (!trajectoryData || !trajectoryData.trajectory || trajectoryData.trajectory.length === 0) {
      return;
    }

    const points = trajectoryData.trajectory.filter((p) => p.latitude && p.longitude);

    if (points.length === 0) return;

    const latLngs = points.map((p) => [p.latitude, p.longitude]);

    // Draw animated / styled dashed polyline in red/amber
    const polyline = L.polyline(latLngs, {
      color: '#ef4444',
      weight: 4,
      opacity: 0.9,
      dashArray: '8, 8',
      lineCap: 'round',
      lineJoin: 'round'
    });

    trajectoryLayer.addLayer(polyline);

    // Draw Glow Background Polyline
    const glowPolyline = L.polyline(latLngs, {
      color: '#f87171',
      weight: 8,
      opacity: 0.35
    });
    trajectoryLayer.addLayer(glowPolyline);

    // Render numbered markers at each sighting checkpoint
    points.forEach((pt, idx) => {
      const pointNum = pt.step || idx + 1;
      const isFirst = idx === 0;
      const isLast = idx === points.length - 1;

      const markerColor = isLast ? '#ef4444' : isFirst ? '#10b981' : '#f59e0b';

      const customIcon = L.divIcon({
        className: 'custom-trajectory-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 32px;
              height: 32px;
              background-color: ${markerColor};
              color: #0b1120;
              border-radius: 50%;
              border: 3px solid #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              font-family: monospace;
              box-shadow: 0 0 14px ${markerColor};
            ">
              ${pointNum}
            </div>
            ${
              isLast
                ? `<div style="
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    width: 12px;
                    height: 12px;
                    background: #ef4444;
                    border: 2px solid #fff;
                    border-radius: 50%;
                    animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                  "></div>`
                : ''
            }
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([pt.latitude, pt.longitude], { icon: customIcon });

      const popupContent = `
        <div style="color: #0f172a; font-family: sans-serif; min-width: 220px; padding: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="background: ${markerColor}; color: #0b1120; font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 4px;">
              POINT #${pointNum} ${isLast ? '(LATEST INTERCEPT)' : isFirst ? '(ENTRY)' : ''}
            </span>
            <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #0284c7;">${pt.cameraId}</span>
          </div>

          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
            ${pt.cameraName || pt.locationName}
          </div>

          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            🕒 <strong>${pt.formattedTime}</strong>
          </div>

          <div style="background: #f1f5f9; padding: 6px 8px; border-radius: 6px; font-size: 11px; margin-bottom: 6px;">
            <div>🚘 Model: <strong>${pt.vehicleModel || 'Standard Sedan'}</strong></div>
            <div>🎨 Color: <strong>${pt.vehicleColor || 'White'}</strong></div>
            <div>🔢 Plate OCR: <strong style="font-family: monospace; color: #0284c7;">${pt.plateNumber}</strong></div>
            <div>⚡ Confidence: <strong>${(pt.confidence * 100).toFixed(1)}%</strong></div>
          </div>

          ${
            pt.cropImagePath
              ? `<div style="text-align: center; margin-top: 6px;">
                  <img src="${pt.cropImagePath}" alt="Crop Preview" style="width: 100%; height: 75px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;" />
                </div>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupContent);
      trajectoryLayer.addLayer(marker);
    });

    // Auto fit bounds
    if (latLngs.length > 0) {
      map.fitBounds(polyline.getBounds(), { padding: [60, 60] });
    }
  }, [trajectoryData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!inputPlate.trim()) return;
    const clean = inputPlate.trim().toUpperCase();
    setActivePlate(clean);
    setSearchParams({ plate: clean });
    fetchTrajectory(clean);
  };

  const handleSelectSamplePlate = (plate) => {
    setInputPlate(plate);
    setActivePlate(plate);
    setSearchParams({ plate });
    fetchTrajectory(plate);
  };

  return (
    <div className="page map-page" style={{ maxWidth: '1350px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header & Search Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🗺️</span>
              <span>Chandigarh Urban Corridor GIS Trajectory Radar</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Tracking chronological vehicle movements across 8 Master CCTV ANPR checkpoints in Chandigarh.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', minWidth: '320px' }}>
            <input
              type="text"
              placeholder="Search Plate (e.g. RJ47CA3205)..."
              value={inputPlate}
              onChange={(e) => setInputPlate(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                padding: '0.55rem 0.85rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontWeight: '700',
                fontSize: '0.9rem'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.55rem 1.25rem',
                backgroundColor: 'var(--accent-blue)',
                color: '#0b1120',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Searching...' : '🛰️ Track Route'}
            </button>
          </form>
        </div>

        {/* Quick Suggestion Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quick Select:</span>
          {samplePlates.map((item) => (
            <button
              key={item.plate}
              onClick={() => handleSelectSamplePlate(item.plate)}
              style={{
                padding: '0.25rem 0.65rem',
                backgroundColor: activePlate === item.plate ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                color: activePlate === item.plate ? '#0b1120' : 'var(--text-secondary)',
                border: activePlate === item.plate ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '0.65rem 1rem',
            borderRadius: '6px',
            marginBottom: '0.75rem',
            fontSize: '0.85rem'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Main Map + Sighting Trajectory Layout */}
      <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>
        {/* LEAFLET MAP CONTAINER */}
        <div
          style={{
            flex: 1,
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            position: 'relative'
          }}
        >
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Map Status Badge Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 500,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(4px)',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            <span>8 Master Checkpoints Active</span>
          </div>
        </div>

        {/* TRAJECTORY SUMMARY SIDEBAR */}
        <div
          className="card"
          style={{
            width: '380px',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.25rem',
            overflowY: 'auto',
            border: '1px solid var(--border-color)'
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Trajectory Timeline</span>
            {activePlate && (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  backgroundColor: '#0f172a',
                  color: 'var(--accent-blue)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)'
                }}
              >
                {activePlate}
              </span>
            )}
          </h3>

          {!trajectoryData?.trajectory || trajectoryData.trajectory.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📍</div>
              <div style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No Vehicle Trajectory Selected</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Search for a plate above or click an active alert to plot the vehicle route.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              {/* Vehicle Profile Summary */}
              {trajectoryData.vehicle && (
                <div
                  style={{
                    padding: '0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    marginBottom: '0.5rem'
                  }}
                >
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {trajectoryData.vehicle.makeModel}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    🎨 Color: <strong>{trajectoryData.vehicle.color}</strong> • Owner: <strong>{trajectoryData.vehicle.ownerId?.name || 'Registered Owner'}</strong>
                  </div>
                  {trajectoryData.vehicle.isStolen && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#f87171', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>🚨</span> ACTIVE STOLEN VEHICLE ALERT
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                CHRONOLOGICAL CHECKPOINTS ({trajectoryData.trajectory.length}):
              </div>

              {/* Step by Step Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {trajectoryData.trajectory.map((t, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === trajectoryData.trajectory.length - 1;
                  const badgeBg = isLast ? '#ef4444' : isFirst ? '#10b981' : 'var(--accent-blue)';

                  return (
                    <div
                      key={t.sightingId || idx}
                      style={{
                        padding: '0.75rem 0.85rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'center'
                      }}
                    >
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: badgeBg,
                          color: '#0b1120',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}
                      >
                        {t.step || idx + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.825rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.cameraName || t.locationName}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          🕒 {t.formattedTime}
                        </div>
                      </div>

                      {t.cropImagePath && (
                        <img
                          src={t.cropImagePath}
                          alt="Plate"
                          style={{ width: '45px', height: '30px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)', flexShrink: 0 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapPage;
