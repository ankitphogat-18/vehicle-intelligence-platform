import React, { useState, useEffect, useRef } from 'react';

const CAMERA_PRESETS = [
  { id: 'CAM-CHD-01', name: 'CAM-CHD-01: Tribune Chowk (Sector 29/31)' },
  { id: 'CAM-CHD-02', name: 'CAM-CHD-02: Sector 17 Plaza Radial Junction' },
  { id: 'CAM-CHD-03', name: 'CAM-CHD-03: ISBT Sector 43 Chowk' },
  { id: 'CAM-CHD-04', name: 'CAM-CHD-04: Transport Chowk (Madhya Marg)' },
  { id: 'CAM-CHD-05', name: 'CAM-CHD-05: Housing Board Chowk (Panchkula Border)' },
  { id: 'CAM-CHD-06', name: 'CAM-CHD-06: PGI / Panjab University Chowk' },
  { id: 'CAM-CHD-07', name: 'CAM-CHD-07: IT Park Entry Junction' },
  { id: 'CAM-CHD-08', name: 'CAM-CHD-08: Zirakpur-Airport Road Barrier' }
];

function PoliceCameraConsole() {
  const [activeTab, setActiveTab] = useState('live'); // 'live' or 'upload'
  const [selectedCamera, setSelectedCamera] = useState(CAMERA_PRESETS[0]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(null);

  // Critical Alert Banner state
  const [criticalHit, setCriticalHit] = useState(null); // { plateNumber, alertDetails, timestamp }

  // Live Detection Feed
  const [feedSightings, setFeedSightings] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Video Upload state
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Simulated plate injection for easy testing without physical cars in webcam
  const [simulatedInput, setSimulatedInput] = useState('');

  // Mobile QR Modal state
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [mobileQrData, setMobileQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  // DOM Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`
    };
  };

  // Fetch QR Code details for mobile camera connection
  const fetchMobileQr = async () => {
    setLoadingQr(true);
    setShowMobileModal(true);
    try {
      const res = await fetch('/api/mobile-qr');
      const data = await res.json();
      if (data.success) {
        setMobileQrData(data);
      }
    } catch (err) {
      console.error('Failed to generate mobile QR:', err);
    } finally {
      setLoadingQr(false);
    }
  };

  const copyMobileUrl = () => {
    if (mobileQrData?.url) {
      navigator.clipboard.writeText(mobileQrData.url);
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2500);
    }
  };

  // Web Audio synth alert beep
  const playAlertSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // audio error ignored
    }
  };

  // Fetch recent sightings (called initially and every 2s for real-time mobile feed sync)
  const fetchRecentSightings = async () => {
    try {
      const res = await fetch('/api/sightings/recent', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFeedSightings(data.data);
      }
    } catch (err) {
      console.warn('Failed to load recent sightings:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentSightings();
    // Auto-poll detection feed every 2 seconds so mobile camera sightings appear in real time
    const pollInterval = setInterval(fetchRecentSightings, 2000);

    return () => {
      clearInterval(pollInterval);
      stopCameraStream();
    };
  }, []);

  // START CAMERA FEED
  const startCameraStream = async () => {
    setStreamError(null);
    let stream;
    try {
      try {
        // Try rear camera first (for mobile phones / field units)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (camErr) {
        console.warn("Environment camera failed, falling back to default/front webcam:", camErr);
        // Fallback for laptops/desktops without rear cameras
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);

      // Start frame capture loop (every 600ms)
      intervalRef.current = setInterval(captureAndIngestFrame, 600);
    } catch (err) {
      console.error('Failed to access camera:', err);
      setStreamError(`Camera access error: ${err.message || 'Permission denied'}. You can still use the plate simulator or video uploader.`);
    }
  };

  // STOP CAMERA FEED
  const stopCameraStream = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  // CAPTURE & INGEST FRAME
  const captureAndIngestFrame = async (manualSimulatedPlate = null) => {
    if (!videoRef.current && !manualSimulatedPlate) return;

    try {
      const formData = new FormData();
      formData.append('cameraId', selectedCamera.id);
      formData.append('locationName', selectedCamera.name.split(' - ')[1] || selectedCamera.name);

      if (manualSimulatedPlate) {
        formData.append('simulatedPlate', manualSimulatedPlate);
      }

      if (videoRef.current && videoRef.current.readyState === 4) {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        if (blob) {
          formData.append('frame', blob, 'frame.jpg');
        }
      }

      const res = await fetch('/api/sightings/ingest-frame', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      const data = await res.json();

      if (data.success && data.plateNumber) {
        // Add to live feed
        const newFeedItem = {
          _id: data.sighting?._id || Date.now(),
          plateNumber: data.plateNumber,
          cameraId: selectedCamera.id,
          locationName: selectedCamera.name.split(' - ')[1] || selectedCamera.name,
          timestamp: new Date().toISOString(),
          hotlistHit: data.hotlistHit,
          confidence: data.sighting?.confidence || 0.95
        };

        setFeedSightings((prev) => [newFeedItem, ...prev.slice(0, 24)]);

        // Check Hotlist Critical Hit
        if (data.hotlistHit) {
          playAlertSound();
          setCriticalHit({
            plateNumber: data.plateNumber,
            alertDetails: data.alertDetails,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }
    } catch (err) {
      console.warn('Frame ingestion cycle note:', err.message);
    }
  };

  // Manual plate trigger (for testing without vehicle in front of webcam)
  const handleSimulatedTrigger = (e) => {
    e.preventDefault();
    if (!simulatedInput.trim()) return;
    captureAndIngestFrame(simulatedInput.trim().toUpperCase());
    setSimulatedInput('');
  };

  // VIDEO UPLOAD HANDLER
  const handleVideoUploadSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) return;

    setUploadLoading(true);
    setUploadError(null);
    setUploadResult(null);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('cameraId', selectedCamera.id);
      formData.append('locationName', selectedCamera.name.split(' - ')[1] || selectedCamera.name);

      setUploadProgress(45);

      const res = await fetch('/api/sightings/upload-surveillance-video', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      setUploadProgress(85);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to process surveillance video');
      }

      setUploadProgress(100);
      setUploadResult(data);

      // Refresh recent sightings
      fetchRecentSightings();

      // Check if any hotlist hits were in the video
      const hit = data.sightings?.find((s) => s.hotlistHit);
      if (hit) {
        playAlertSound();
        setCriticalHit({
          plateNumber: hit.plateNumber,
          alertDetails: null,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'Just now';
    const d = new Date(isoString);
    return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  return (
    <div className="page police-camera-console" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* CRITICAL HIT AUDIO/VISUAL WARNING BANNER */}
      {criticalHit && (
        <div
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            padding: '1.25rem 1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'pulse 1.5s infinite',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>🚨</span>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                CRITICAL HOTLIST HIT: Stolen Vehicle Spotted Right Now!
              </div>
              <div style={{ fontSize: '0.95rem', marginTop: '0.2rem', opacity: 0.95 }}>
                License Plate <strong style={{ fontFamily: 'monospace', textDecoration: 'underline' }}>{criticalHit.plateNumber}</strong> recognized at checkpoint <strong>{selectedCamera.name}</strong> ({criticalHit.timestamp}).
              </div>
            </div>
          </div>
          <button
            onClick={() => setCriticalHit(null)}
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: '#0b1120',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Acknowledge Alert
          </button>
        </div>
      )}

      {/* HEADER WITH CHECKPOINT SELECTOR & TRY WITH MOBILE BUTTON */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Police CCTV Checkpoint Ingestion Console
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Live ANPR video ingestion, mobile sensor stream, and automated stolen vehicle interceptor.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={fetchMobileQr}
            style={{
              padding: '0.55rem 1.15rem',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              color: '#60a5fa',
              fontWeight: '700',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
            }}
          >
            <span>📱</span>
            <span>Try with Mobile (Live Camera)</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Checkpoint:
            </label>
            <select
              value={selectedCamera.id}
              onChange={(e) => {
                const found = CAMERA_PRESETS.find((c) => c.id === e.target.value);
                if (found) setSelectedCamera(found);
              }}
              style={{
                padding: '0.5rem 0.85rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--accent-blue)',
                fontWeight: '700',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            >
              {CAMERA_PRESETS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MODE SWITCHER TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('live')}
          style={{
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: '700',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'live' ? 'var(--accent-blue)' : 'transparent',
            color: activeTab === 'live' ? '#0b1120' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>📹</span>
          <span>Live CCTV / Mobile Sensor Stream</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('upload');
            stopCameraStream();
          }}
          style={{
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: '700',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'upload' ? 'var(--accent-blue)' : 'transparent',
            color: activeTab === 'upload' ? '#0b1120' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>📁</span>
          <span>Upload Surveillance Video</span>
        </button>
      </div>

      {/* TAB A: LIVE CCTV / SENSOR STREAM */}
      {activeTab === 'live' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`status-dot ${isStreaming ? 'online' : 'offline'}`}></span>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {isStreaming ? 'CCTV Optical Stream Live' : 'Camera Feed Inactive'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={fetchMobileQr}
                  style={{
                    padding: '0.5rem 0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <span>📱</span>
                  <span>Mobile Connect</span>
                </button>

                {!isStreaming ? (
                  <button
                    onClick={startCameraStream}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    ▶ Start Webcam
                  </button>
                ) : (
                  <button
                    onClick={stopCameraStream}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    ⏹ Stop Stream
                  </button>
                )}
              </div>
            </div>

            {streamError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {streamError}
              </div>
            )}

            <div
              style={{
                width: '100%',
                height: '320px',
                backgroundColor: '#070d18',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: isStreaming ? 'block' : 'none'
                }}
              />

              {!isStreaming && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
                  <div style={{ fontWeight: '600' }}>Live Optical Sensor Ready</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Click "Start Camera Feed" to open webcam / surveillance sensor.
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* QUICK PLATE SIMULATOR / TRIGGER FOR DEV TESTING */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                💡 Test Ingestion Trigger (Simulate Plate Crossing Checkpoint):
              </div>
              <form onSubmit={handleSimulatedTrigger} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={simulatedInput}
                  onChange={(e) => setSimulatedInput(e.target.value)}
                  placeholder="e.g. DL01AB1234 or HR26DQ5678"
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--accent-blue)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Send Ingest
                </button>
              </form>
            </div>
          </div>

          {/* CHECKPOINT STATS & STATUS */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                Checkpoint Optics & Telemetry
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Assigned Unit:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedCamera.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Optical Resolution:</span>
                  <span style={{ color: 'var(--accent-blue)' }}>1080p 60fps HD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>OCR Engine:</span>
                  <span style={{ color: '#34d399' }}>Tesseract + Sharp Preprocessor</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Hotlist Sync:</span>
                  <span style={{ color: '#fbbf24' }}>Real-time Intercept Active</span>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <div style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                ⚡ Automated Intercept Ready
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Every frame evaluated by the AI model is cross-referenced with all active citizen stolen vehicle reports.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: UPLOAD SURVEILLANCE VIDEO */}
      {activeTab === 'upload' && (
        <div className="card" style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto 2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Upload Surveillance Video Clip
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Upload `.mp4` traffic camera recordings to extract and catalog all vehicle sightings.
          </p>

          <form onSubmit={handleVideoUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '8px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('videoFileInput').click()}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📹</div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {videoFile ? videoFile.name : 'Click or Drag & Drop Video File (.mp4)'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(2)} MB selected` : 'Maximum file size: 50MB'}
              </div>
              <input
                id="videoFileInput"
                type="file"
                accept="video/mp4,video/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setVideoFile(e.target.files[0]);
                    setUploadError(null);
                    setUploadResult(null);
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>

            {uploadLoading && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  <span>Processing Surveillance Video...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: 'var(--accent-blue)', transition: 'width 0.3s' }}></div>
                </div>
              </div>
            )}

            {uploadError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                {uploadError}
              </div>
            )}

            {uploadResult && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                <strong>✓ Processing Complete:</strong> Successfully recognized and cataloged {uploadResult.totalVehiclesDetected} vehicles from the video clip!
              </div>
            )}

            <button
              type="submit"
              disabled={!videoFile || uploadLoading}
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--accent-blue)',
                color: '#0b1120',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: !videoFile || uploadLoading ? 'not-allowed' : 'pointer',
                opacity: !videoFile || uploadLoading ? 0.6 : 1
              }}
            >
              {uploadLoading ? 'Extracting Detections...' : 'Process Video Feed'}
            </button>
          </form>
        </div>
      )}

      {/* LIVE DETECTION FEED TABLE */}
      <section className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Live Checkpoint Detection Feed ({feedSightings.length})
            </h3>
          </div>

          <button
            onClick={fetchRecentSightings}
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Sightings
          </button>
        </div>

        {feedLoading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            Loading checkpoint detection stream...
          </div>
        ) : feedSightings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No recent camera detections logged yet. Start the stream or send an ingest frame.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Plate Number</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Camera Checkpoint</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Confidence</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Status Badge</th>
                </tr>
              </thead>
              <tbody>
                {feedSightings.map((s, index) => (
                  <tr
                    key={s._id || index}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      backgroundColor: s.hotlistHit ? 'rgba(239, 68, 68, 0.12)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {formatTimestamp(s.timestamp)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          fontSize: '0.95rem',
                          color: '#f8fafc',
                          backgroundColor: '#0f172a',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          border: s.hotlistHit ? '1px solid #ef4444' : '1px solid #334155'
                        }}
                      >
                        {s.plateNumber}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                      {s.locationName || s.cameraId}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#34d399' }}>
                      {s.confidence ? `${(s.confidence * 100).toFixed(1)}%` : '95.0%'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      {s.hotlistHit ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            border: '1px solid #ef4444'
                          }}
                        >
                          🚨 STOLEN HIT
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          ✓ Normal Pass
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MOBILE CAMERA CONNECTION MODAL */}
      {showMobileModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMobileModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#0b1329',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(59, 130, 246, 0.2)',
              position: 'relative',
              animation: 'fadeIn 0.25s ease-out'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📱</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc' }}>
                    Connect Mobile Checkpoint
                  </h3>
                </div>
                <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Turn any iOS or Android phone into an automated tactical ANPR scanner.
                </p>
              </div>
              <button
                onClick={() => setShowMobileModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* QR Code Container */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#030712',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}
            >
              {loadingQr ? (
                <div style={{ padding: '3rem 0', color: '#60a5fa', fontWeight: '600', fontSize: '0.9rem' }}>
                  Generating High-Resolution Mobile QR...
                </div>
              ) : mobileQrData?.qrImage ? (
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '10px',
                      borderRadius: '10px',
                      display: 'inline-block',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    <img
                      src={mobileQrData.qrImage}
                      alt="Mobile Scanner QR Code"
                      style={{ width: '200px', height: '200px', display: 'block' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                    Scan with your phone's default Camera App
                  </div>
                </div>
              ) : (
                <div style={{ color: '#ef4444', padding: '1rem', fontSize: '0.85rem' }}>
                  Failed to load QR code. Please ensure backend is running.
                </div>
              )}
            </div>

            {/* Direct URL & Copy Button */}
            {mobileQrData?.url && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Direct Mobile Web URL
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                  <input
                    type="text"
                    readOnly
                    value={mobileQrData.url}
                    style={{
                      flex: 1,
                      backgroundColor: '#070d18',
                      border: '1px solid #1e293b',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      color: '#cbd5e1',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    onClick={copyMobileUrl}
                    style={{
                      padding: '0.5rem 0.85rem',
                      backgroundColor: qrCopied ? '#10b981' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {qrCopied ? '✓ Copied' : 'Copy URL'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Step Guide */}
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                lineHeight: 1.5
              }}
            >
              <div style={{ fontWeight: '700', color: '#60a5fa', marginBottom: '0.3rem' }}>
                Quick Instructions:
              </div>
              <ol style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li>Connect your phone to the same Wi-Fi network (or hotspot).</li>
                <li>Scan the QR code or open the URL in Chrome / Safari.</li>
                <li>Allow camera access to start streaming live AI frame ingestion.</li>
                <li>Point camera at vehicle plates — detections sync to this dashboard in real time!</li>
              </ol>
            </div>

            {/* Status indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '1.25rem',
                fontSize: '0.775rem',
                color: '#34d399',
                fontWeight: '600'
              }}
            >
              <span className="status-dot online"></span>
              <span>Live Console Synchronization Active (2s Polling)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PoliceCameraConsole;
