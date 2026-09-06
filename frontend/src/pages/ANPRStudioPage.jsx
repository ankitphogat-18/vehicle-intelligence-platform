import React, { useState, useEffect, useRef } from 'react';

function ANPRStudioPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [error, setError] = useState(null);

  // Manual verification & logging state
  const [correctedPlate, setCorrectedPlate] = useState('');
  const [selectedCamera, setSelectedCamera] = useState('CAM-001');
  const [vehicleType, setVehicleType] = useState('SEDAN');
  const [vehicleColor, setVehicleColor] = useState('White');
  const [cameras, setCameras] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null);

  // Recent scans audit log in session
  const [scanHistory, setScanHistory] = useState([]);

  const fileInputRef = useRef(null);

  // Fetch available cameras for verification assignment
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const res = await fetch('/api/cameras');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data.length > 0) {
            setCameras(json.data);
            setSelectedCamera(json.data[0].cameraId);
          }
        }
      } catch (err) {
        console.warn('Could not load camera list:', err);
      }
    };
    loadCameras();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setOcrResult(null);
    setError(null);
    setSaveStatus(null);
  };

  // Run ANPR OCR processing
  const handleProcessImage = async () => {
    if (!selectedFile) {
      setError('Please select or generate a vehicle image first.');
      return;
    }

    setProcessing(true);
    setError(null);
    setOcrResult(null);
    setSaveStatus(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const res = await fetch('/api/anpr/recognize', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Server error ${res.status}`);
      }

      setOcrResult(data);
      setCorrectedPlate(data.plateNumber || '');

      // Add to session scan history
      setScanHistory((prev) => [
        {
          id: Date.now(),
          timestamp: new Date(),
          plate: data.plateNumber,
          confidence: data.confidence,
          isValidFormat: data.isValidFormat,
          processingTimeMs: data.processingTimeMs
        },
        ...prev.slice(0, 9)
      ]);
    } catch (err) {
      console.error('ANPR processing failed:', err);
      setError(err.message || 'Failed to process image with OCR engine.');
    } finally {
      setProcessing(false);
    }
  };

  // Generate realistic synthetic vehicle frame with embedded license plate to test auto-cropping
  const generateVehicleFrame = (sampleText, carColor = '#1e3a8a') => {
    setError(null);
    setSaveStatus(null);

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    // Background (Road / Street Scene)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Car Body (Front View)
    ctx.fillStyle = carColor;
    ctx.beginPath();
    ctx.roundRect(140, 100, 520, 320, [40, 40, 10, 10]);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(190, 120, 420, 110, [20, 20, 5, 5]);
    ctx.fill();

    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.roundRect(160, 260, 90, 45, [10]);
    ctx.roundRect(550, 260, 90, 45, [10]);
    ctx.fill();

    // Front Grille
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(280, 260, 240, 60, [8]);
    ctx.fill();

    // Front Bumper Lower Section
    ctx.fillStyle = '#334155';
    ctx.fillRect(160, 370, 480, 50);

    // EMBEDDED LICENSE PLATE (Positioned on lower bumper: x=290, y=340, w=220, h=65)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.rect(290, 340, 220, 65);
    ctx.fill();
    ctx.stroke();

    // Blue IND strip
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(292, 342, 22, 61);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('IND', 295, 375);

    // License Plate Characters
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sampleText, 410, 373);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `vehicle_${sampleText}.png`, { type: 'image/png' });
        setSelectedFile(file);
        setImagePreview(URL.createObjectURL(blob));
        setOcrResult(null);
      }
    }, 'image/png');
  };

  // Generate synthetic canvas sample plate for immediate testing
  const generateSamplePlate = (sampleText) => {
    generateVehicleFrame(sampleText);
  };

  // Save verified detection observation
  const handleSaveObservation = async () => {
    if (!correctedPlate.trim()) {
      setError('Please provide a valid plate number.');
      return;
    }

    try {
      const res = await fetch('/api/anpr/log-observation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraId: selectedCamera,
          plateNumber: correctedPlate.trim().toUpperCase(),
          plateConfidence: ocrResult ? ocrResult.confidence : 0.95,
          vehicleType,
          vehicleColor,
          manuallyVerified: true
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to save observation');
      }

      setSaveStatus(`✔ Verified sighting logged at camera ${selectedCamera} for plate ${correctedPlate.toUpperCase()}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            High-Precision OCR / ANPR Studio
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Phase 3: Image Ingestion, Tesseract OCR Engine, Indian Plate Normalization & Human Verification.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => generateSamplePlate('DL01AB1234', 'DL')}
            className="btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            Sample: DL-01-AB-1234
          </button>
          <button
            onClick={() => generateSamplePlate('HR26DQ5678', 'HR')}
            className="btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            Sample: HR-26-DQ-5678
          </button>
          <button
            onClick={() => generateSamplePlate('UP16XY9988', 'UP')}
            className="btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            Sample: UP-16-XY-9988
          </button>
        </div>
      </div>

      {/* Grid: Upload & Image Viewport vs OCR Result */}
      <div className="grid-2">
        {/* Left Card: Ingestion & Frame Viewport */}
        <div className="card">
          <h2 className="card-title">1. Vehicle Frame Ingestion</h2>
          <p className="card-desc">
            Upload a vehicle image, crop, or use test sample presets for OCR recognition.
          </p>

          <div
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card)',
              cursor: 'pointer',
              marginBottom: '1rem',
              transition: 'border-color 0.15s ease'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📷</div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              Click to select image or drag & drop here
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Supported: JPEG, PNG, WebP (Max 10MB)
            </p>
          </div>

          {/* Image Preview Container */}
          {imagePreview && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                FRAME PREVIEW:
              </div>
              <div
                style={{
                  background: '#020617',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '160px',
                  maxHeight: '260px',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={imagePreview}
                  alt="Vehicle Frame"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '220px',
                    objectFit: 'contain',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleProcessImage}
            disabled={!selectedFile || processing}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: !selectedFile || processing ? 0.6 : 1,
              cursor: !selectedFile || processing ? 'not-allowed' : 'pointer'
            }}
          >
            {processing ? (
              <>
                <span>⚙️ Executing Tesseract OCR Pipeline...</span>
              </>
            ) : (
              <>
                <span>⚡ Run ANPR / OCR Recognition</span>
              </>
            )}
          </button>
        </div>

        {/* Right Card: OCR Analysis & Normalization Output */}
        <div className="card">
          <h2 className="card-title">2. OCR Analysis & Plate Normalization</h2>
          <p className="card-desc">
            Extracted text, Indian HSRP structure validation, and confidence telemetry.
          </p>

          {error && (
            <div className="card" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)', padding: '0.75rem 1rem' }}>
              ⚠️ {error}
            </div>
          )}

          {processing && (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>
                ⚙️
              </div>
              <p style={{ marginTop: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
                Enhancing image contrast & running character recognition...
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tesseract.js OCR engine in progress
              </p>
            </div>
          )}

          {!ocrResult && !processing && (
            <div
              style={{
                padding: '3rem 1.5rem',
                border: '1px dashed var(--border-color)',
                borderRadius: '8px',
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}
            >
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No Active OCR Result</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Upload an image or pick a sample preset on the top right, then click "Run ANPR / OCR Recognition".
              </p>
            </div>
          )}

          {ocrResult && !processing && (
            <div>
              {/* Isolated Plate Region Preview if Auto-Cropped */}
              {ocrResult.croppedPlateImage && (
                <div style={{ marginBottom: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
                      🔍 AUTO-ISOLATED PLATE ROI (SHARP DETECTOR)
                    </span>
                    {ocrResult.bbox && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        BBox: x={ocrResult.bbox.left}, y={ocrResult.bbox.top}, {ocrResult.bbox.width}x{ocrResult.bbox.height}px
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', background: '#020617', padding: '0.5rem', borderRadius: '6px' }}>
                    <img
                      src={ocrResult.croppedPlateImage}
                      alt="Isolated Plate ROI"
                      style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}

              {/* Primary Plate Badge Display */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  marginBottom: '1rem'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  RECOGNIZED REGISTRATION NUMBER
                </span>
                <div style={{ marginTop: '0.5rem' }}>
                  <span
                    className="plate-badge"
                    style={{
                      fontSize: '1.75rem',
                      padding: '0.4rem 1.25rem',
                      borderRadius: '6px',
                      letterSpacing: '0.1em'
                    }}
                  >
                    {ocrResult.plateNumber || 'UNKNOWN'}
                  </span>
                </div>
              </div>

              {/* Telemetry Metrics */}
              <div className="grid-2" style={{ marginBottom: '1rem' }}>
                <div className="stat-box">
                  <div className="stat-label">OCR Confidence</div>
                  <div
                    className="stat-value"
                    style={{
                      color:
                        ocrResult.confidence >= 0.85
                          ? 'var(--accent-green)'
                          : ocrResult.confidence >= 0.6
                          ? 'var(--accent-amber)'
                          : 'var(--accent-red)'
                    }}
                  >
                    {(ocrResult.confidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Format Validity</div>
                  <div className="stat-value" style={{ fontSize: '1rem', marginTop: '0.4rem' }}>
                    {ocrResult.isValidFormat ? (
                      <span style={{ color: 'var(--accent-green)' }}>✔ Valid Indian HSRP</span>
                    ) : (
                      <span style={{ color: 'var(--accent-amber)' }}>⚠️ Non-Standard Format</span>
                    )}
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Processing Time</div>
                  <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                    {ocrResult.processingTimeMs} ms
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Raw OCR String</div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
                    "{ocrResult.rawText || '—'}"
                  </div>
                </div>
              </div>

              {/* SIH Investigation Advisory */}
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: 'var(--accent-amber)',
                  marginBottom: '1.25rem'
                }}
              >
                ⚖️ <strong>SIH Investigation Rule:</strong> {ocrResult.advisory}
              </div>

              {/* Human Verification & Logging Form */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1.25rem'
                }}
              >
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  3. Human Verification & Sighting Logger
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Corrected Plate
                    </label>
                    <input
                      type="text"
                      value={correctedPlate}
                      onChange={(e) => setCorrectedPlate(e.target.value.toUpperCase())}
                      className="form-input"
                      style={{ fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Assigned Camera
                    </label>
                    <select
                      value={selectedCamera}
                      onChange={(e) => setSelectedCamera(e.target.value)}
                      className="form-select"
                    >
                      {cameras.map((c) => (
                        <option key={c.cameraId} value={c.cameraId}>
                          {c.cameraId} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Vehicle Class
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="form-select"
                    >
                      <option value="SEDAN">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="HATCHBACK">Hatchback</option>
                      <option value="TRUCK">Truck</option>
                      <option value="BUS">Bus</option>
                      <option value="MOTORCYCLE">Motorcycle</option>
                      <option value="AUTO_RICKSHAW">Auto Rickshaw</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Vehicle Color
                    </label>
                    <select
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      className="form-select"
                    >
                      <option value="White">White</option>
                      <option value="Black">Black</option>
                      <option value="Silver">Silver</option>
                      <option value="Dark Grey">Dark Grey</option>
                      <option value="Red">Red</option>
                      <option value="Blue">Blue</option>
                      <option value="Yellow">Yellow</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSaveObservation}
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '0.25rem' }}
                >
                  ✔ Confirm Human Verification & Record Sighting
                </button>

                {saveStatus && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 500 }}>
                    {saveStatus}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session ANPR Scan History */}
      {scanHistory.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2 className="card-title">Recent Studio Scan History</h2>
          <p className="card-desc">Audit log of license plates processed during this session.</p>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Extracted Plate</th>
                  <th>Format Check</th>
                  <th>Confidence</th>
                  <th>Latency</th>
                </tr>
              </thead>
              <tbody>
                {scanHistory.map((scan) => (
                  <tr key={scan.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {scan.timestamp.toLocaleTimeString()}
                    </td>
                    <td>
                      <span className="plate-badge">{scan.plate}</span>
                    </td>
                    <td>
                      {scan.isValidFormat ? (
                        <span className="badge badge-green">Standard HSRP</span>
                      ) : (
                        <span className="badge badge-amber">Non-Standard</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-blue">
                        {(scan.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{scan.processingTimeMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ANPRStudioPage;

