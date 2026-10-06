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
  const incidentLayerRef = useRef(null);
  const securityZoneLayerRef = useRef(null);

  const initialPlate = routePlate || searchParams.get('plate') || '';
  const [inputPlate, setInputPlate] = useState(initialPlate);
  const [activePlate, setActivePlate] = useState(initialPlate);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    user = {};
  }
  const isIncidentTeam = user?.role === 'INCIDENT_MANAGEMENT';

  const [cameras, setCameras] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [securityZones, setSecurityZones] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [trajectoryData, setTrajectoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Security Zone Modal State
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneModalTab, setZoneModalTab] = useState('list'); // 'list' | 'create'
  const [zoneActionLoading, setZoneActionLoading] = useState(false);
  const [zoneError, setZoneError] = useState(null);
  const [zoneSuccess, setZoneSuccess] = useState(null);
  const [newZoneForm, setNewZoneForm] = useState({
    name: '',
    reason: 'VVIP Motorcade & High-Security Protocol',
    level: 'LEVEL_2_EXCLUSION',
    cameraIds: ['CAM-CHD-07']
  });

  // Quick suggestion plates
  const samplePlates = [
    { plate: 'RJ47CA3205', label: '🚨 RJ47CA3205 (Stolen)', isStolen: true },
    { plate: 'DL01AB1234', label: '🚗 DL01AB1234', isStolen: false },
    { plate: 'HR26DQ5678', label: '🚙 HR26DQ5678', isStolen: false }
  ];

  // Helper Auth Headers
  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem('token');
      return {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      };
    } catch {
      return { 'Content-Type': 'application/json' };
    }
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      try {
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

        cameraLayerRef.current = L.layerGroup().addTo(map);
        incidentLayerRef.current = L.layerGroup().addTo(map);
        securityZoneLayerRef.current = L.layerGroup().addTo(map);
        trajectoryLayerRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;
      } catch (mapInitErr) {
        console.error('Error initializing Leaflet map:', mapInitErr);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Fetch Cameras, Incidents & Security Zones with safe fallbacks
  const fetchCameras = async () => {
    try {
      const res = await fetch('/api/cameras');
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        setCameras(json.data);
      } else {
        setCameras([]);
      }
    } catch (err) {
      console.error('Failed to load cameras:', err);
      setCameras([]);
    }
  };

  const fetchIncidents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/incidents?status=ACTIVE', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data || json.incidents)) {
        const list = json.data || json.incidents;
        setIncidents(list.filter((inc) => inc && inc.status !== 'RESOLVED'));
      } else {
        setIncidents([]);
      }
    } catch (err) {
      console.warn('Failed to load incidents for map overlay:', err);
      setIncidents([]);
    }
  };

  const fetchSecurityZones = async () => {
    try {
      const res = await fetch('/api/security-zones');
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data || json.zones)) {
        setSecurityZones(json.data || json.zones);
      } else {
        setSecurityZones([]);
      }
    } catch (err) {
      console.warn('Failed to load security zones:', err);
      setSecurityZones([]);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      const res = await fetch('/api/alerts/active', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        setActiveAlerts(json.data);
      } else {
        setActiveAlerts([]);
      }
    } catch (err) {
      console.warn('Failed to load active alerts:', err);
      setActiveAlerts([]);
    }
  };

  useEffect(() => {
    fetchCameras();
    fetchIncidents();
    fetchSecurityZones();
    fetchActiveAlerts();
  }, []);

  // Center on Lat/Lng if passed in query params
  useEffect(() => {
    const map = mapInstanceRef.current;
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    if (map && latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], 15, { animate: true });
      }
    }
  }, [searchParams]);

const MASTER_CHANDIGARH_CHECKPOINTS = [
  { id: 'CAM-CHD-01', name: 'Tribune Chowk (Sector 29/31)', sector: 'Sector 29/31' },
  { id: 'CAM-CHD-02', name: 'Sector 17 Plaza Radial Junction', sector: 'Sector 17' },
  { id: 'CAM-CHD-03', name: 'ISBT Sector 43 Main Terminal', sector: 'Sector 43' },
  { id: 'CAM-CHD-04', name: 'Madhya Marg Transport Chowk', sector: 'Sector 26' },
  { id: 'CAM-CHD-05', name: 'IT Park Entry Corridor', sector: 'Kishangarh' },
  { id: 'CAM-CHD-06', name: 'Sukhna Lake Radial Boulevard', sector: 'Sector 6' },
  { id: 'CAM-CHD-07', name: 'Secretariat / High Court (VIP Core)', sector: 'Sector 1' },
  { id: 'CAM-CHD-08', name: 'Zirakpur Border Highway Entry', sector: 'Sector 31' }
];

  // 3. Render Cameras on map with Security Zone Threat Styling
  useEffect(() => {
    const map = mapInstanceRef.current;
    const cameraLayer = cameraLayerRef.current;
    if (!map || !cameraLayer || !Array.isArray(cameras) || cameras.length === 0) return;

    cameraLayer.clearLayers();

    cameras.forEach((cam) => {
      if (!cam || typeof cam.latitude !== 'number' || typeof cam.longitude !== 'number' || isNaN(cam.latitude) || isNaN(cam.longitude)) return;

      const isMobileUnit = cam.cameraId === 'MOBILE_PATROL_LIVE' || (typeof cam.cameraId === 'string' && cam.cameraId.includes('MOBILE'));
      const activeZone = (Array.isArray(securityZones) ? securityZones : []).find(
        (z) => z && z.status === 'ACTIVE' && Array.isArray(z.cameraIds) && z.cameraIds.includes(cam.cameraId)
      );

      const effectiveLevel =
        cam.currentSecurityLevel || activeZone?.level || (cam.isRestricted ? 'LEVEL_2_EXCLUSION' : 'NORMAL');
      const isExclusion = effectiveLevel === 'LEVEL_2_EXCLUSION';
      const isBuffer = effectiveLevel === 'LEVEL_1_BUFFER';

      let bgColor = 'rgba(15, 23, 42, 0.9)';
      let borderColor = '#38bdf8';
      let icon = '📹';
      let glow = '0 0 10px rgba(56, 189, 248, 0.6)';
      let anim = 'none';

      if (isExclusion) {
        bgColor = '#ef4444';
        borderColor = '#ffffff';
        icon = '🚨';
        glow = '0 0 18px #ef4444';
        anim = 'pulse 1.2s infinite';
      } else if (isBuffer) {
        bgColor = '#f59e0b';
        borderColor = '#ffffff';
        icon = '🟡';
        glow = '0 0 16px #f59e0b';
      } else if (isMobileUnit) {
        bgColor = '#10b981';
        borderColor = '#ffffff';
        icon = '📱';
        glow = '0 0 16px #10b981';
        anim = 'pulse 1.5s infinite';
      }

      const camIcon = L.divIcon({
        className: 'custom-cam-icon',
        html: `
          <div style="
            width: ${isMobileUnit || isExclusion ? '34px' : '28px'};
            height: ${isMobileUnit || isExclusion ? '34px' : '28px'};
            background: ${bgColor};
            border: 2px solid ${borderColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: ${glow};
            font-size: ${isMobileUnit || isExclusion ? '16px' : '13px'};
            animation: ${anim};
          ">
            ${icon}
          </div>
        `,
        iconSize: [isMobileUnit || isExclusion ? 34 : 28, isMobileUnit || isExclusion ? 34 : 28],
        iconAnchor: [isMobileUnit || isExclusion ? 17 : 14, isMobileUnit || isExclusion ? 17 : 14]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon: camIcon });

      const levelHeader = isExclusion
        ? '<div style="background: #ef4444; color: #fff; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-bottom: 4px;">🔴 LEVEL-2 EXCLUSION ZONE</div>'
        : isBuffer
        ? '<div style="background: #f59e0b; color: #0b1120; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-bottom: 4px;">🟡 LEVEL-1 BUFFER RING</div>'
        : '';

      marker.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; min-width: 200px; padding: 4px;">
          ${levelHeader}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 11px; background: ${isExclusion ? '#b91c1c' : isBuffer ? '#d97706' : isMobileUnit ? '#059669' : '#0284c7'}; color: #fff; padding: 2px 6px; border-radius: 4px;">
              ${cam.cameraId}
            </span>
            <span style="font-size: 10px; font-weight: 700; color: #16a34a;">● ${cam.status || 'ONLINE'}</span>
          </div>
          <div style="font-weight: 700; font-size: 13px; margin-top: 4px; color: #0f172a;">
            ${cam.name || cam.locationName}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Sector: ${cam.sector || (isMobileUnit ? 'Live Field Patrol' : 'Chandigarh')}</div>
          ${activeZone ? `<div style="font-size: 10px; color: #ea580c; margin-top: 3px; font-weight: 600;">Enclosed in: ${activeZone.name}</div>` : ''}
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">📍 GPS: ${cam.latitude.toFixed(4)}°N, ${cam.longitude.toFixed(4)}°E</div>
        </div>
      `);

      cameraLayer.addLayer(marker);
    });
  }, [cameras, securityZones]);

  // 3b. Render Active Security Zones Dynamic Polygons on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const securityLayer = securityZoneLayerRef.current;
    if (!map || !securityLayer) return;

    securityLayer.clearLayers();

    const activeZones = Array.isArray(securityZones) ? securityZones.filter((z) => z && z.status === 'ACTIVE') : [];

    activeZones.forEach((zone) => {
      if (!zone || !Array.isArray(zone.coordinates) || zone.coordinates.length < 3) return;

      const validPoints = zone.coordinates.filter(
        (pt) => Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number' && !isNaN(pt[0]) && !isNaN(pt[1])
      );
      if (validPoints.length < 3) return;

      const isExclusion = zone.level === 'LEVEL_2_EXCLUSION';
      const zoneColor = isExclusion ? '#ef4444' : '#f59e0b';
      const fillColor = isExclusion ? '#b91c1c' : '#fbbf24';
      const fillOpacity = isExclusion ? 0.25 : 0.18;

      const polygon = L.polygon(validPoints, {
        color: zoneColor,
        weight: 2,
        dashArray: '6, 6',
        fillColor: fillColor,
        fillOpacity: fillOpacity
      });

      const levelBadge = isExclusion
        ? '🔴 LEVEL 2: EXCLUSION ZONE (ZERO TOLERANCE)'
        : '🟡 LEVEL 1: BUFFER WARNING RING';

      polygon.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; min-width: 230px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="background: ${zoneColor}; color: ${isExclusion ? '#fff' : '#0b1120'}; font-weight: 800; font-size: 10px; padding: 2px 7px; border-radius: 4px;">
              ${levelBadge}
            </span>
          </div>
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-top: 2px;">
            ${zone.name}
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4;">
            Mandate: <strong>${zone.reason || 'Security Protocol Enforcement'}</strong>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
            Enclosed Checkpoints: <strong>${(Array.isArray(zone.cameraIds) ? zone.cameraIds : []).join(', ') || 'Corridor Perimeter'}</strong>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
            Activated by: ${zone.activatedBy || 'Police Command HQ'}
          </div>
        </div>
      `);

      securityLayer.addLayer(polygon);
    });
  }, [securityZones]);

  // Render Incident Hazard Markers on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const incidentLayer = incidentLayerRef.current;
    if (!map || !incidentLayer || !Array.isArray(incidents) || incidents.length === 0) return;

    incidentLayer.clearLayers();

    const activeIncidents = incidents.filter((inc) => inc && inc.status !== 'RESOLVED');

    activeIncidents.forEach((inc) => {
      if (!inc || typeof inc.latitude !== 'number' || typeof inc.longitude !== 'number' || isNaN(inc.latitude) || isNaN(inc.longitude)) return;

      const hazardIcon = L.divIcon({
        className: 'custom-hazard-marker',
        html: `
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
            background: #dc2626;
            border: 2px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px #ef4444;
            font-size: 16px;
            animation: pulse 1.2s infinite;
          ">
            ⚠️
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: hazardIcon });

      const rawPhoto = inc.photoUrl || inc.evidencePhotoUrl;
      const fullPhoto = rawPhoto
        ? rawPhoto.startsWith('http')
          ? rawPhoto
          : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${rawPhoto.startsWith('/') ? '' : '/'}${rawPhoto}`
        : null;

      marker.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="background: #dc2626; color: #fff; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px;">
              🚨 ${inc.incidentType || 'ACCIDENT'}
            </span>
            <span style="font-size: 10px; color: #475569; font-weight: 600;">
              ${inc.cameraId || 'CAM-CHD-01'}
            </span>
          </div>

          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
            ${inc.locationName || 'Highway Checkpoint'}
          </div>

          <div style="font-size: 11px; color: #334155; margin-bottom: 6px; line-height: 1.4;">
            ${inc.description || 'Highway emergency accident reported.'}
          </div>

          ${
            fullPhoto
              ? `<div style="margin-top: 6px; text-align: center;">
                  <img src="${fullPhoto}" alt="Evidence" style="width: 100%; height: 85px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1;" />
                </div>`
              : ''
          }
          <div style="font-size: 10px; color: #64748b; margin-top: 6px;">
            📍 GPS: ${Number(inc.latitude).toFixed(4)}°N, ${Number(inc.longitude).toFixed(4)}°E
          </div>
        </div>
      `);

      incidentLayer.addLayer(marker);
    });
  }, [incidents]);

  // 4. Fetch Trajectory when activePlate changes (Police / Admin only)
  const fetchTrajectory = async (plate) => {
    if (isIncidentTeam) return;
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
    if (isIncidentTeam) return;
    const p = routePlate || searchParams.get('plate');
    if (p && p.trim()) {
      const formatted = p.trim().toUpperCase();
      setInputPlate(formatted);
      setActivePlate(formatted);
      fetchTrajectory(formatted);
    }
  }, [routePlate, searchParams, isIncidentTeam]);

  // 5. Draw Trajectory on Map (Disabled for Incident Team)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const trajectoryLayer = trajectoryLayerRef.current;
    if (!map || !trajectoryLayer) return;

    trajectoryLayer.clearLayers();

    if (isIncidentTeam) return;

    if (!trajectoryData || !Array.isArray(trajectoryData.trajectory) || trajectoryData.trajectory.length === 0) {
      return;
    }

    const points = trajectoryData.trajectory.filter(
      (p) => p && typeof p.latitude === 'number' && typeof p.longitude === 'number' && !isNaN(p.latitude) && !isNaN(p.longitude)
    );

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
    if (!inputPlate || !inputPlate.trim()) return;
    const clean = inputPlate.trim().toUpperCase();
    setActivePlate(clean);
    navigate(`/map?plate=${encodeURIComponent(clean)}`, { replace: true });
    fetchTrajectory(clean);
  };

  const handleSelectSamplePlate = (plate) => {
    if (!plate) return;
    const clean = plate.trim().toUpperCase();
    setInputPlate(clean);
    setActivePlate(clean);
    navigate(`/map?plate=${encodeURIComponent(clean)}`, { replace: true });
    fetchTrajectory(clean);
  };

  const handleActivateZone = async (e) => {
    e.preventDefault();
    if (!newZoneForm.name.trim()) {
      setZoneError('Zone name is required');
      return;
    }
    if (!newZoneForm.cameraIds || newZoneForm.cameraIds.length === 0) {
      setZoneError('Please select at least one camera checkpoint');
      return;
    }

    setZoneActionLoading(true);
    setZoneError(null);
    setZoneSuccess(null);

    try {
      const res = await fetch('/api/security-zones', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newZoneForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to activate security zone');
      }

      setZoneSuccess(`Security Zone "${data.zone?.name || newZoneForm.name}" activated at ${newZoneForm.level}!`);
      setNewZoneForm({
        name: '',
        reason: 'VVIP Motorcade & High-Security Protocol',
        level: 'LEVEL_2_EXCLUSION',
        cameraIds: ['CAM-CHD-07']
      });
      fetchSecurityZones();
      fetchCameras();
    } catch (err) {
      setZoneError(err.message);
    } finally {
      setZoneActionLoading(false);
    }
  };

  const handleDeactivateZone = async (zoneId, zoneName) => {
    setZoneActionLoading(true);
    setZoneError(null);
    setZoneSuccess(null);

    try {
      const res = await fetch(`/api/security-zones/${zoneId}/deactivate`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to deactivate security zone');
      }

      setZoneSuccess(`Zone "${zoneName || 'Security Zone'}" deactivated. Checkpoints restored to NORMAL.`);
      fetchSecurityZones();
      fetchCameras();
    } catch (err) {
      setZoneError(err.message);
    } finally {
      setZoneActionLoading(false);
    }
  };

  const toggleCheckpointSelection = (camId) => {
    setNewZoneForm((prev) => {
      const exists = prev.cameraIds.includes(camId);
      return {
        ...prev,
        cameraIds: exists
          ? prev.cameraIds.filter((id) => id !== camId)
          : [...prev.cameraIds, camId]
      };
    });
  };

  return (
    <div className="page map-page" style={{ maxWidth: '1350px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header & Search Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: isIncidentTeam ? '0' : '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🗺️</span>
              <span>{isIncidentTeam ? 'Chandigarh Expressway Incident & Hazard Radar' : 'Chandigarh Urban Corridor GIS Trajectory Radar'}</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {isIncidentTeam
                ? 'Real-time geographic tracking of emergency road incidents, hazard zones, and 8 Master CCTV checkpoints.'
                : 'Tracking chronological vehicle movements across 8 Master CCTV ANPR checkpoints in Chandigarh.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Manage Security Zones Button */}
            {!isIncidentTeam && (
              <button
                type="button"
                onClick={() => {
                  setZoneModalOpen(true);
                  setZoneError(null);
                  setZoneSuccess(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.95rem',
                  backgroundColor: securityZones.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)',
                  color: securityZones.length > 0 ? '#f87171' : 'var(--text-primary)',
                  border: securityZones.length > 0 ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <span>🛡️</span>
                <span>Manage Security Zones</span>
                {securityZones.length > 0 && (
                  <span
                    style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      borderRadius: '9999px',
                      padding: '0.1rem 0.45rem',
                      fontSize: '0.7rem',
                      fontWeight: '800'
                    }}
                  >
                    {securityZones.length} Active
                  </span>
                )}
              </button>
            )}

            {/* Search Form (POLICE / ADMIN ONLY) */}
            {!isIncidentTeam && (
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', minWidth: '300px' }}>
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
                    padding: '0.55rem 1.15rem',
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
            )}
          </div>
        </div>

        {/* Quick Suggestion Pills (POLICE / ADMIN ONLY) */}
        {!isIncidentTeam && (
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
        )}
      </div>

      {!isIncidentTeam && error && (
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

      {/* Main Map + Sighting Trajectory / Active Incidents Layout */}
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

        {/* SIDEBAR: ACTIVE ROAD INCIDENTS (INCIDENT_MANAGEMENT) OR TRAJECTORY TIMELINE (POLICE/ADMIN) */}
        {isIncidentTeam ? (
          <div
            className="card"
            style={{
              width: '390px',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.25rem',
              overflowY: 'auto',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>⚠️</span>
                <span>Active Road Incidents</span>
              </h3>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.15rem 0.5rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  borderRadius: '9999px',
                  border: '1px solid rgba(239, 68, 68, 0.4)'
                }}
              >
                {incidents.length} Reported
              </span>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Live geospatial feed of expressway hazards, collisions, and field patrol logs.
            </p>

            {incidents.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
                <div style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No Active Road Incidents</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Expressway corridor is clear. All reported hazards will display here with live GPS coordinates.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                {incidents.map((inc, idx) => {
                  const rawPhoto = inc.photoUrl || inc.evidencePhotoUrl;
                  const fullPhoto = rawPhoto
                    ? rawPhoto.startsWith('http')
                      ? rawPhoto
                      : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${rawPhoto.startsWith('/') ? '' : '/'}${rawPhoto}`
                    : null;

                  return (
                    <div
                      key={inc._id || idx}
                      style={{
                        padding: '0.85rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: inc.incidentType === 'HIT_AND_RUN' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                            color: inc.incidentType === 'HIT_AND_RUN' ? '#f87171' : '#fbbf24',
                            border: `1px solid ${inc.incidentType === 'HIT_AND_RUN' ? '#ef4444' : '#f59e0b'}`
                          }}
                        >
                          🚨 {inc.incidentType || 'ACCIDENT'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {inc.cameraId || 'CAM-CHD-01'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {inc.locationName || 'Chandigarh Expressway'}
                      </div>

                      {inc.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {inc.description}
                        </div>
                      )}

                      {inc.latitude && inc.longitude && (
                        <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '600' }}>
                          📍 GPS: {Number(inc.latitude).toFixed(4)}°N, {Number(inc.longitude).toFixed(4)}°E
                        </div>
                      )}

                      {fullPhoto && (
                        <div style={{ marginTop: '0.25rem' }}>
                          <a href={fullPhoto} target="_blank" rel="noreferrer">
                            <img
                              src={fullPhoto}
                              alt="Evidence"
                              style={{
                                width: '100%',
                                maxHeight: '110px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)'
                              }}
                            />
                          </a>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          🕒 {inc.createdAt ? new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </span>
                        {inc.latitude && inc.longitude && (
                          <button
                            onClick={() => {
                              if (mapInstanceRef.current) {
                                mapInstanceRef.current.setView([inc.latitude, inc.longitude], 16, { animate: true });
                              }
                            }}
                            style={{
                              padding: '0.3rem 0.65rem',
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.4)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            🎯 Focus on Map
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
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
        )}
      </div>

      {/* DYNAMIC SECURITY ZONE MANAGER MODAL */}
      {zoneModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '740px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
              borderRadius: '12px',
              padding: '1.75rem'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                    Dynamic High-Security Zone Controller
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>
                    Enforce Level-1 Buffer warnings or Level-2 Zero-Tolerance vehicle bans across Chandigarh checkpoints.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setZoneModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Notification messages */}
            {zoneSuccess && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                ✓ {zoneSuccess}
              </div>
            )}
            {zoneError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                ⚠️ {zoneError}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
              <button
                onClick={() => setZoneModalTab('list')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: zoneModalTab === 'list' ? 'var(--accent-blue)' : 'transparent',
                  color: zoneModalTab === 'list' ? '#0b1120' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Active Zones ({securityZones.length})
              </button>
              <button
                onClick={() => setZoneModalTab('create')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: zoneModalTab === 'create' ? 'var(--accent-blue)' : 'transparent',
                  color: zoneModalTab === 'create' ? '#0b1120' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                ➕ Declare New Zone
              </button>
            </div>

            {/* TAB 1: ACTIVE ZONES LIST */}
            {zoneModalTab === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {securityZones.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🟢</div>
                    <div style={{ fontWeight: '700', color: '#cbd5e1' }}>All Corridors in Normal Protocol</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      No high-security restriction zones are currently active. Click "Declare New Zone" to impose a buffer or vehicle exclusion ring.
                    </div>
                  </div>
                ) : (
                  securityZones.map((zone) => {
                    const isExclusion = zone.level === 'LEVEL_2_EXCLUSION';

                    return (
                      <div
                        key={zone._id}
                        style={{
                          padding: '1.1rem',
                          backgroundColor: '#1e293b',
                          borderRadius: '8px',
                          border: `1px solid ${isExclusion ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: isExclusion ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                                color: isExclusion ? '#f87171' : '#fbbf24',
                                border: `1px solid ${isExclusion ? '#ef4444' : '#f59e0b'}`
                              }}
                            >
                              {isExclusion ? '🔴 LEVEL 2: EXCLUSION' : '🟡 LEVEL 1: BUFFER RING'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              Activated: {zone.activatedAt ? new Date(zone.activatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                            </span>
                          </div>

                          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.25rem' }}>
                            {zone.name}
                          </div>

                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                            Mandate: <strong style={{ color: '#cbd5e1' }}>{zone.reason}</strong>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {(zone.cameraIds || []).map((cId) => (
                              <span
                                key={cId}
                                style={{
                                  fontSize: '0.72rem',
                                  fontFamily: 'monospace',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  backgroundColor: '#0f172a',
                                  color: '#38bdf8',
                                  border: '1px solid #334155'
                                }}
                              >
                                📹 {cId}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <button
                            disabled={zoneActionLoading}
                            onClick={() => handleDeactivateZone(zone._id, zone.name)}
                            style={{
                              padding: '0.55rem 1rem',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '6px',
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              cursor: zoneActionLoading ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <span>✕</span>
                            <span>Deactivate Zone</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: DECLARE NEW ZONE FORM */}
            {zoneModalTab === 'create' && (
              <form onSubmit={handleActivateZone} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                    Zone Name / Sector Perimeter *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Capitol Complex VIP Core, Sector 17 Festival Ring"
                    value={newZoneForm.name}
                    onChange={(e) => setNewZoneForm({ ...newZoneForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                    Restriction Threat Level *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div
                      onClick={() => setNewZoneForm({ ...newZoneForm, level: 'LEVEL_1_BUFFER' })}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: newZoneForm.level === 'LEVEL_1_BUFFER' ? 'rgba(245, 158, 11, 0.15)' : '#1e293b',
                        border: newZoneForm.level === 'LEVEL_1_BUFFER' ? '2px solid #f59e0b' : '1px solid #334155'
                      }}
                    >
                      <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#fbbf24', marginBottom: '0.2rem' }}>
                        🟡 Level 1: Buffer Warning Ring
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                        Early naka diversion warning upon approach. Allows situational traffic flow.
                      </div>
                    </div>

                    <div
                      onClick={() => setNewZoneForm({ ...newZoneForm, level: 'LEVEL_2_EXCLUSION' })}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: newZoneForm.level === 'LEVEL_2_EXCLUSION' ? 'rgba(239, 68, 68, 0.15)' : '#1e293b',
                        border: newZoneForm.level === 'LEVEL_2_EXCLUSION' ? '2px solid #ef4444' : '1px solid #334155'
                      }}
                    >
                      <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#f87171', marginBottom: '0.2rem' }}>
                        🔴 Level 2: Exclusion Ring
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                        Strict zero-tolerance vehicle ban. Automated ANPR breach alarm dispatched on contact.
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                    Mandate / Protocol Reason *
                  </label>
                  <select
                    value={newZoneForm.reason}
                    onChange={(e) => setNewZoneForm({ ...newZoneForm, reason: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="Section 163 BNSS (High-Security Perimeter)">Section 163 BNSS (High-Security Perimeter)</option>
                    <option value="VVIP Motorcade & High-Security Protocol">VVIP Motorcade & High-Security Protocol</option>
                    <option value="Anti-Sabotage & Counter-Terror Lockdown">Anti-Sabotage & Counter-Terror Lockdown</option>
                    <option value="Festival Crowd & VIP Diversion Protocol">Festival Crowd & VIP Diversion Protocol</option>
                    <option value="Emergency Hazardous Road Closure">Emergency Hazardous Road Closure</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                    Select Checkpoints to Enclose ({newZoneForm.cameraIds.length} selected):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', padding: '0.5rem', backgroundColor: '#070f20', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    {MASTER_CHANDIGARH_CHECKPOINTS.map((cam) => {
                      const isChecked = newZoneForm.cameraIds.includes(cam.id);
                      return (
                        <div
                          key={cam.id}
                          onClick={() => toggleCheckpointSelection(cam.id)}
                          style={{
                            padding: '0.5rem 0.65rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: isChecked ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                            border: isChecked ? '1px solid #38bdf8' : '1px solid #334155',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ cursor: 'pointer' }} />
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: isChecked ? '#38bdf8' : '#f8fafc', fontFamily: 'monospace' }}>
                              {cam.id}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {cam.name}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setZoneModalOpen(false)}
                    style={{
                      padding: '0.65rem 1.25rem',
                      backgroundColor: '#1e293b',
                      color: '#94a3b8',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={zoneActionLoading}
                    style={{
                      padding: '0.65rem 1.5rem',
                      backgroundColor: newZoneForm.level === 'LEVEL_2_EXCLUSION' ? '#ef4444' : '#f59e0b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: zoneActionLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {zoneActionLoading ? 'Activating Zone...' : '🚀 Activate Security Protocol'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MapPage;
