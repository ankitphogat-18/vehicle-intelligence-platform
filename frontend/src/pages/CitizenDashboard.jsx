import React, { useState, useEffect } from 'react';
import {
  Car,
  ShieldAlert,
  PlusCircle,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Upload,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Radio,
  Lock
} from 'lucide-react';

function CitizenDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'register'

  // Form State
  const [formData, setFormData] = useState({
    plateNumber: '',
    makeModel: '',
    color: ''
  });
  const [rcFile, setRcFile] = useState(null);
  const [rcFileName, setRcFileName] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(null);

  // Confirm report stolen modal
  const [confirmVehicle, setConfirmVehicle] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchMyVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vehicles/my-vehicles', {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to fetch registered vehicles');
      }
      setVehicles(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyVehicles();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRcFile(file);
      setRcFileName(file.name);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setFormSuccess(null);

    try {
      const bodyFormData = new FormData();
      bodyFormData.append('plateNumber', formData.plateNumber.trim().toUpperCase());
      bodyFormData.append('makeModel', formData.makeModel.trim());
      if (formData.color.trim()) {
        bodyFormData.append('color', formData.color.trim());
      }
      if (rcFile) {
        bodyFormData.append('rcDocument', rcFile);
      }

      const res = await fetch('/api/vehicles/register', {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        },
        body: bodyFormData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Registration failed');
      }

      setFormSuccess(`✓ Vehicle ${data.data.plateNumber} submitted! Police verification pending.`);
      setFormData({ plateNumber: '', makeModel: '', color: '' });
      setRcFile(null);
      setRcFileName('');
      setActiveTab('list');
      fetchMyVehicles();
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmReportStolen = async () => {
    if (!confirmVehicle) return;
    const vId = confirmVehicle._id;
    setActionLoadingId(vId);
    setError(null);
    setFormSuccess(null);

    try {
      const res = await fetch(`/api/vehicles/${vId}/report-stolen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          incidentNotes: 'Reported stolen via Citizen Telemetry Portal'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to report vehicle stolen');
      }

      setFormSuccess(`🚨 Hotlist alert broadcast! Vehicle ${confirmVehicle.plateNumber} is now tracked across all municipal checkpoints.`);
      setConfirmVehicle(null);
      fetchMyVehicles();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkRecovered = async (vehicle) => {
    setActionLoadingId(vehicle._id);
    setError(null);
    setFormSuccess(null);

    try {
      const alertsRes = await fetch('/api/alerts/active', {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });
      const alertsData = await alertsRes.json();
      const matchingAlert = alertsData.data?.find((a) => a.plateNumber === vehicle.plateNumber);

      if (matchingAlert) {
        await fetch(`/api/alerts/${matchingAlert._id}/resolve`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        });
      }

      setFormSuccess(`✓ Vehicle ${vehicle.plateNumber} marked as RECOVERED. Active hotlist alert cleared.`);
      fetchMyVehicles();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getTimelineBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'Verified & Approved', isLight: true };
      case 'REJECTED':
        return { label: 'Registration Rejected', isLight: false };
      case 'SEARCH_IN_PROGRESS':
      case 'PATROL_ALERTED':
        return { label: 'ANPR Interception Active', isLight: true };
      case 'VEHICLE_FOUND':
        return { label: 'Vehicle Recovered', isLight: true };
      case 'PENDING':
      case 'VERIFICATION_UNDER_REVIEW':
      default:
        return { label: 'Under Verification', isLight: false };
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Topographic Background Overlay */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="topo-citizen" width="140" height="140" patternUnits="userSpaceOnUse">
              <path
                d="M 0 35 Q 35 10, 70 35 T 140 35 M 0 70 Q 35 95, 70 70 T 140 70 M 0 105 Q 35 80, 70 105 T 140 105"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo-citizen)" />
        </svg>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto rounded-3xl bg-[#090909] border border-neutral-800 shadow-2xl p-6 sm:p-10 relative overflow-hidden">
        {/* Header Bar */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-neutral-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-mono font-bold text-white uppercase tracking-wider mb-3">
              <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
              CITIZEN TELEMETRY & REGISTRY PORTAL
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase">
              My Vehicle Registry & Theft Alert Center
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-xl">
              Register vehicles with official RC proof, track police verification status, and instantly broadcast stolen alerts to the highway ANPR camera network.
            </p>
          </div>

          {/* Tab Selector Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-neutral-900 border border-neutral-800 self-stretch sm:self-auto">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'list'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Registered ({vehicles.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'register'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register Vehicle</span>
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 text-sm flex items-center gap-3 font-mono">
            <AlertTriangle className="w-5 h-5 shrink-0 text-white" />
            <span>{error}</span>
          </div>
        )}

        {formSuccess && (
          <div className="mt-6 p-4 rounded-xl bg-white text-black text-sm flex items-center gap-3 font-mono font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-black" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            CONFIRM REPORT STOLEN MODAL (Monochrome)
            ──────────────────────────────────────────────────────── */}
        {confirmVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="rounded-2xl bg-black border border-neutral-700 p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center">
              <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">
                Broadcast Stolen Vehicle Alert?
              </h3>

              <p className="text-xs sm:text-sm text-neutral-400 mb-4 leading-relaxed">
                Are you sure you want to flag vehicle <span className="font-mono font-bold text-white underline underline-offset-4">{confirmVehicle.plateNumber}</span> as stolen?
                This activates instantaneous optical interception across all municipal ANPR checkpoints.
              </p>

              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 font-mono text-xs text-left mb-6 space-y-1">
                <div><span className="text-neutral-500">PLATE:</span> <span className="font-bold text-white">{confirmVehicle.plateNumber}</span></div>
                <div><span className="text-neutral-500">MAKE:</span> <span className="text-neutral-300">{confirmVehicle.makeModel}</span></div>
                <div><span className="text-neutral-500">TARGET:</span> <span className="text-white font-bold">MUNICIPAL HIGHWAY INTERDICTION FEED</span></div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmReportStolen}
                  className="flex-1 py-3 px-4 rounded-full bg-white hover:bg-neutral-200 text-black font-black uppercase tracking-wider text-xs shadow-lg transition-all"
                >
                  Confirm & Broadcast
                </button>
                <button
                  onClick={() => setConfirmVehicle(null)}
                  className="py-3 px-5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold uppercase tracking-wider text-xs border border-neutral-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            TAB 1: REGISTER VEHICLE FORM
            ──────────────────────────────────────────────────────── */}
        {activeTab === 'register' && (
          <div className="mt-8 max-w-2xl mx-auto rounded-2xl bg-black border border-neutral-800 p-6 sm:p-8 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Register New Vehicle</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Submit official details and upload your Registration Certificate (RC) proof for cyber cell verification.
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  License Plate Number *
                </label>
                <input
                  type="text"
                  name="plateNumber"
                  value={formData.plateNumber}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. DL 01 AB 1234 or HR 26 DQ 5678"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-white focus:ring-1 focus:ring-white rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-neutral-600 outline-none uppercase transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Vehicle Make & Model *
                </label>
                <input
                  type="text"
                  name="makeModel"
                  value={formData.makeModel}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Mahindra Scorpio-N, Tata Nexon EV, Hyundai Creta"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-white focus:ring-1 focus:ring-white rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Vehicle Color
                </label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  placeholder="e.g. Obsidian Black, Glacier White, Silver Metallic"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-white focus:ring-1 focus:ring-white rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition-all"
                />
              </div>

              {/* RC Document Upload */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Upload Official RC Document Proof (PDF, PNG, JPG)
                </label>
                <div
                  onClick={() => document.getElementById('rcFileInput').click()}
                  className="border-2 border-dashed border-neutral-800 hover:border-neutral-600 rounded-2xl p-6 bg-neutral-900/60 text-center cursor-pointer transition-all group"
                >
                  <input
                    id="rcFileInput"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-neutral-800 text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>

                  {rcFileName ? (
                    <div>
                      <div className="font-mono font-bold text-sm text-white">{rcFileName}</div>
                      <div className="text-xs text-neutral-400 mt-1">
                        ✓ Selected ({((rcFile?.size || 0) / 1024).toFixed(1)} KB)
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-bold text-white">Click to Browse or Drag & Drop RC Document</div>
                      <div className="text-xs text-neutral-500 mt-1 font-mono">Max size: 20MB • PDF, PNG, JPG</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3.5 px-6 rounded-full bg-white hover:bg-neutral-200 text-black font-black uppercase tracking-wider text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? 'SUBMITTING REGISTRATION...' : 'SUBMIT FOR POLICE VERIFICATION'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="py-3.5 px-6 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold uppercase tracking-wider text-xs border border-neutral-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            TAB 2: REGISTERED VEHICLES LIST
            ──────────────────────────────────────────────────────── */}
        {activeTab === 'list' && (
          <div className="mt-8">
            {loading ? (
              <div className="py-20 text-center text-neutral-400 font-mono text-sm flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-white" />
                <span>Loading registered vehicles from VAHAN database...</span>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="rounded-2xl bg-black border border-neutral-800 p-12 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white mb-2 uppercase">No Vehicles Registered Yet</h3>
                <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                  You do not have any registered vehicles under your citizen profile. Register your vehicle to link it with optical checkpoint tracking and activate fast-track theft recovery.
                </p>
                <button
                  onClick={() => setActiveTab('register')}
                  className="px-6 py-3 rounded-full bg-white hover:bg-neutral-200 text-black font-extrabold uppercase tracking-wider text-xs shadow-md transition-all inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Register First Vehicle</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {vehicles.map((v) => {
                  const isApproved = v.verificationStatus === 'APPROVED' || v.isVerified;
                  const isPending = v.verificationStatus === 'PENDING' && !v.isVerified;
                  const isRejected = v.verificationStatus === 'REJECTED';

                  return (
                    <div
                      key={v._id}
                      className={`rounded-2xl bg-black border transition-all p-6 sm:p-8 relative overflow-hidden shadow-xl ${
                        v.isStolen
                          ? 'border-white ring-1 ring-white/80'
                          : isApproved
                          ? 'border-neutral-800 hover:border-neutral-600'
                          : 'border-neutral-800/80'
                      }`}
                    >
                      {/* Top Bar: Plate Visual & Status */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
                        {/* High-Security Plate Badge Box */}
                        <div className="flex items-center gap-4">
                          <div className="bg-white text-black px-4 py-2 rounded-lg border-2 border-black shadow-inner inline-flex flex-col items-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-neutral-600 font-mono">
                              IND // TRANSPORT
                            </span>
                            <span className="text-xl sm:text-2xl font-black font-mono tracking-wider">
                              {v.plateNumber}
                            </span>
                          </div>

                          <div>
                            <div className="text-lg font-black text-white uppercase">{v.makeModel}</div>
                            <div className="text-xs text-neutral-400 font-mono">
                              Color: {v.color || 'Not specified'} • Registered ID: {v._id?.slice(-8)}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {v.isStolen ? (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-mono font-bold animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-black"></span>
                              <span>REPORTED STOLEN // INTERCEPTION ACTIVE</span>
                            </div>
                          ) : isApproved ? (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-700 text-xs font-mono font-bold text-white">
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>✓ VERIFIED VEHICLE</span>
                            </div>
                          ) : isRejected ? (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-700 text-xs font-mono font-bold text-neutral-400">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>REGISTRATION REJECTED</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono font-bold text-neutral-300">
                              <Clock className="w-3.5 h-3.5" />
                              <span>UNDER VERIFICATION</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Official RC Proof Document */}
                      {(v.rcDocumentUrl || v.rcDocPath) && (() => {
                        const rawPath = v.rcDocumentUrl || v.rcDocPath;
                        const fullDoc = rawPath.startsWith('http')
                          ? rawPath
                          : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
                        return (
                          <div className="py-4 flex items-center justify-between text-xs border-b border-neutral-800/80">
                            <span className="text-neutral-400">Official RC Document Proof:</span>
                            <a
                              href={fullDoc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-white hover:underline font-mono font-bold"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Uploaded RC Proof</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        );
                      })()}

                      {/* Cyber Cell Police Notes */}
                      <div className="my-5 p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs font-mono">
                        <div className="flex items-center gap-2 text-white font-bold mb-1.5 uppercase tracking-wider">
                          <Radio className="w-3.5 h-3.5 text-white" />
                          <span>Law Enforcement & Cyber Cell Directives</span>
                        </div>
                        <p className="text-neutral-300 font-sans text-sm">
                          {v.policeNotes || 'Registration dossier logged. Under routine optical audit by the Command Center.'}
                        </p>
                      </div>

                      {/* Timeline Progress */}
                      <div className="mb-6">
                        <div className="text-xs font-mono uppercase tracking-wider text-neutral-500 mb-3">
                          Case Timeline & Event History
                        </div>
                        <div className="space-y-3 pl-3 border-l-2 border-neutral-800">
                          {(v.statusTimeline && v.statusTimeline.length > 0 ? v.statusTimeline : [
                            {
                              status: isApproved ? 'APPROVED' : 'PENDING',
                              message: isApproved ? 'Vehicle verified and approved into VAHAN database.' : 'Documents submitted for cyber cell verification.',
                              updatedAt: v.createdAt || new Date()
                            }
                          ]).map((step, sIdx) => {
                            const badge = getTimelineBadge(step.status);
                            return (
                              <div key={sIdx} className="relative pl-4 text-xs font-mono">
                                <div
                                  className={`absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full ${
                                    badge.isLight ? 'bg-white' : 'bg-neutral-600'
                                  }`}
                                />
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                        badge.isLight
                                          ? 'bg-white text-black border-white'
                                          : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                                      }`}
                                    >
                                      {badge.label}
                                    </span>
                                    <span className="text-white font-sans">{step.message}</span>
                                  </div>
                                  <span className="text-neutral-500">{formatDateTime(step.updatedAt)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4">
                        {v.isStolen ? (
                          <>
                            <button
                              disabled={actionLoadingId === v._id}
                              onClick={() => handleMarkRecovered(v)}
                              className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 font-bold uppercase tracking-wider text-xs transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4 text-black" />
                              <span>Mark Vehicle As Recovered</span>
                            </button>
                            <span className="text-xs font-mono text-white font-bold">
                              LIVE CORRIDOR CHECKPOINT INTERDICTION ACTIVE
                            </span>
                          </>
                        ) : isApproved ? (
                          <>
                            <button
                              disabled={actionLoadingId === v._id}
                              onClick={() => setConfirmVehicle(v)}
                              className="px-6 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black font-extrabold uppercase tracking-wider text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                              <ShieldAlert className="w-4 h-4 text-black" />
                              <span>Report As Stolen</span>
                            </button>
                            <span className="text-xs font-mono text-neutral-400">
                              ✓ Verified with VAHAN • Ready for fast-track recovery
                            </span>
                          </>
                        ) : (
                          <>
                            <button
                              disabled
                              className="px-6 py-2.5 rounded-full bg-neutral-900 text-neutral-600 border border-neutral-800 font-bold uppercase tracking-wider text-xs cursor-not-allowed flex items-center gap-2"
                            >
                              <Lock className="w-4 h-4" />
                              <span>Report As Stolen</span>
                            </button>
                            <span className="text-xs font-mono text-neutral-500">
                              🔒 Stolen alert reporting unlocks upon police verification
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CitizenDashboard;
