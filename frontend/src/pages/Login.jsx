import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Camera,
  Car,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Activity,
  Layers,
  Cpu,
  Radio
} from 'lucide-react';

function Login({ onAuthSuccess }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CITIZEN'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const DEMO_ACCOUNTS = [
    {
      role: 'POLICE',
      label: 'Police Intelligence',
      badge: 'LAW ENFORCEMENT',
      email: 'police@chd.gov.in',
      password: 'password123',
      name: 'Chief Officer',
      desc: 'Real-time ANPR CCTV ingestion, hotlist hits, vehicle trajectories',
      accentColor: '#ef4444',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      badgeText: '#f87171'
    },
    {
      role: 'INCIDENT_MANAGEMENT',
      label: 'Incident Command',
      badge: 'COMMAND CENTER',
      email: 'incident@expressway.gov.in',
      password: 'password123',
      name: 'Control Room Commander',
      desc: 'Expressway traffic flow, congestion heatmaps, active accident response',
      accentColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeText: '#fbbf24'
    },
    {
      role: 'CITIZEN',
      label: 'Citizen Portal',
      badge: 'PUBLIC SERVICE',
      email: 'citizen@vehicleportal.in',
      password: 'password123',
      name: 'Rajesh Sharma',
      desc: 'Vehicle registration, digital RC verification, stolen vehicle reporting',
      accentColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeText: '#34d399'
    }
  ];

  const handleSelectDemo = (account) => {
    setFormData({
      name: account.name,
      email: account.email,
      password: account.password,
      role: account.role
    });
    setIsRegister(false);
    setError(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role
        }
      : {
          email: formData.email.trim(),
          password: formData.password
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseBody = await response.text();
      let data = null;
      try {
        data = responseBody ? JSON.parse(responseBody) : null;
      } catch {
        // A proxy or unavailable backend can return an empty or non-JSON response.
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message ||
            data?.error ||
            (response.ok
              ? 'Authentication service returned an invalid response.'
              : `Authentication service returned HTTP ${response.status}. Ensure the backend is running.`)
        );
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setSuccessMsg(isRegister ? 'Account created successfully! Connecting...' : 'Authenticated successfully! Entering console...');

      if (onAuthSuccess) {
        onAuthSuccess(data.user);
      }

      setTimeout(() => {
        if (data.user?.role === 'CITIZEN') {
          navigate('/citizen');
        } else if (data.user?.role === 'INCIDENT_MANAGEMENT') {
          navigate('/incidents');
        } else {
          navigate('/');
        }
      }, 400);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500 selection:text-white flex flex-col justify-between relative overflow-hidden">
      {/* Topographic Background Overlay */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="topo-login" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M 0 30 Q 30 10, 60 30 T 120 30 M 0 60 Q 30 80, 60 60 T 120 60 M 0 90 Q 30 70, 60 90 T 120 90" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo-login)" />
        </svg>
      </div>

      {/* Subtle Red Radial Glow in center */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-red-600/10 blur-[130px] rounded-full pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">VEHICLE INTELLIGENCE</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-950 border border-red-800 text-red-400">
                  PLATFORM
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 tracking-wider uppercase">City-Wide ANPR & Investigation System</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>ANPR SURVEILLANCE NODE // ACTIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container - Styled like the #live-demo dark card */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex items-center">
        <div className="w-full rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl p-6 sm:p-10 lg:p-12 relative overflow-hidden">
          {/* Accent Glow Inside Container */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 blur-[90px] rounded-full pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: System Identity & Role Switchers & Live Simulation */}
            <div className="lg:col-span-7 space-y-6">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/60 border border-red-800/80 text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                AUTOMATIC NUMBER PLATE RECOGNITION (ANPR)
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1]">
                  City-Wide Vehicle<br />Intelligence & Investigation
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                  Automated vehicle detection, multi-camera corridor tracking, and real-time stolen plate interdiction across master municipal checkpoints.
                </p>
              </div>

              {/* Quick Role Switcher Pills */}
              <div className="space-y-2.5 pt-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>1-Click Test Credential Fill:</span>
                  <span className="text-[11px] text-slate-500">Auto-fills credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {DEMO_ACCOUNTS.map((acc) => {
                    const isSelected = formData.email === acc.email;
                    return (
                      <button
                        key={acc.role}
                        type="button"
                        onClick={() => handleSelectDemo(acc)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-slate-800 border-red-500 shadow-md ring-1 ring-red-500'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono"
                            style={{ backgroundColor: acc.badgeBg, color: acc.badgeText }}
                          >
                            {acc.badge}
                          </span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                        </div>
                        <div className="text-xs font-bold text-white truncate">{acc.label}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">{acc.email}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Detection HUD Mockup (matching the live-demo camera visual) */}
              <div className="mt-4 rounded-xl bg-slate-950 border border-slate-800/90 p-4 font-mono text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>CHECKPOINT_04 // SECTOR_17_EXPRESS</span>
                  </div>
                  <span className="text-red-400 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-800/80">
                    🚨 HOTLIST MATCH: DL 01 AA 9999
                  </span>
                </div>
                <div className="pt-3 flex flex-wrap items-center justify-between text-slate-400 text-[11px] gap-2">
                  <span>LATENCY: &lt;85ms</span>
                  <span>CONFIDENCE: 99.6%</span>
                  <span>STATUS: PATROL DISPATCHED</span>
                </div>
              </div>
            </div>

            {/* Right Column: Tactical Glassmorphic Auth Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl p-6 sm:p-8 backdrop-blur-md">
                {/* Tabs: Sign In / Register */}
                <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                      !isRegister ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Authenticate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                      isRegister ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Register Citizen
                  </button>
                </div>

                <div className="mb-5">
                  <h2 className="text-xl font-black text-white">
                    {isRegister ? 'Citizen Registration' : 'System Access'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {isRegister
                      ? 'Register your civilian identity to verify vehicles and file theft reports.'
                      : 'Provide authorized credentials or select a 1-click test role above.'}
                  </p>
                </div>

                {/* Status Messages */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isRegister && (
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="e.g. Rajesh Sharma"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Email Address / Badge ID
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="officer@agency.gov.in or email"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="••••••••••••"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isRegister && (
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                        System Role
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      >
                        <option value="CITIZEN">Citizen (Vehicle Owner)</option>
                        <option value="INCIDENT_MANAGEMENT">Incident Field Management</option>
                        <option value="POLICE">Police Command Officer</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-full bg-red-500 hover:bg-red-600 text-white font-extrabold uppercase tracking-wider text-xs shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <span>PROCESSING...</span>
                      ) : isRegister ? (
                        <>
                          <span>CREATE CITIZEN PROFILE</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span>AUTHENTICATE & ENTER CONSOLE</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-5 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
                  {isRegister ? (
                    <button
                      type="button"
                      onClick={() => setIsRegister(false)}
                      className="hover:text-red-400 font-semibold"
                    >
                      Already have access? Switch to Authenticate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsRegister(true)}
                      className="hover:text-red-400 font-semibold"
                    >
                      New citizen? Register an account here
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Compact Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © 2026 Vehicle Intelligence Platform • Master Optical ANPR & Highway Interdiction
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>RTSP 4K INGESTION</span>
            <span>•</span>
            <span>SUB-85ms INFERENCE</span>
            <span>•</span>
            <span className="text-emerald-400">ENCRYPTED TELEMETRY</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Login;
