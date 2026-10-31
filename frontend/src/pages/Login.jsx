import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Car,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Radio,
  SlidersHorizontal,
  ChevronRight
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
      desc: 'Real-time ANPR CCTV ingestion, hotlist hits, vehicle trajectories'
    },
    {
      role: 'INCIDENT_MANAGEMENT',
      label: 'Incident Command',
      badge: 'COMMAND CENTER',
      email: 'incident@expressway.gov.in',
      password: 'password123',
      name: 'Control Room Commander',
      desc: 'Expressway traffic flow, congestion heatmaps, active accident response'
    },
    {
      role: 'CITIZEN',
      label: 'Citizen Portal',
      badge: 'PUBLIC SERVICE',
      email: 'citizen@vehicleportal.in',
      password: 'password123',
      name: 'Rajesh Sharma',
      desc: 'Vehicle registration, digital RC verification, stolen vehicle reporting'
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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black flex flex-col justify-between relative overflow-hidden">
      {/* Nayan-inspired subtle monochrome wave lines */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="topo-monochrome" width="140" height="140" patternUnits="userSpaceOnUse">
              <path
                d="M 0 35 Q 35 10, 70 35 T 140 35 M 0 70 Q 35 95, 70 70 T 140 70 M 0 105 Q 35 80, 70 105 T 140 105"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo-monochrome)" />
        </svg>
      </div>

      {/* Subtle Monochrome Ambient Vignette */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-white/[0.03] blur-[150px] rounded-full pointer-events-none"></div>

      {/* Floating Header Bar inspired by NAYAN aesthetic */}
      <header className="relative z-10 px-4 sm:px-8 pt-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-black text-sm tracking-tighter">
              VI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white uppercase">
                  Vehicle Intelligence
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-black">
                  ANPR
                </span>
              </div>
              <p className="text-[10px] font-mono text-neutral-400 tracking-widest uppercase">
                City-Wide Interdiction Network
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <span>SURVEILLANCE NODE // ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero Card Container */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex items-center">
        <div className="w-full rounded-3xl bg-[#090909] border border-neutral-800 shadow-2xl p-6 sm:p-10 lg:p-12 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: System Identity & Quick Role Switchers */}
            <div className="lg:col-span-7 space-y-6">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-mono font-bold text-white uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
                AUTOMATIC NUMBER PLATE RECOGNITION (ANPR)
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] uppercase">
                  City-Wide Vehicle<br />Intelligence & Investigation
                </h1>
                <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-xl">
                  Automated vehicle detection, multi-camera corridor tracking, and real-time stolen plate interdiction across master municipal checkpoints.
                </p>
              </div>

              {/* Quick Role Switcher Pills */}
              <div className="space-y-2.5 pt-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                  <span>1-Click Test Credential Fill:</span>
                  <span className="text-[11px] text-neutral-500 font-mono">Auto-populates credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {DEMO_ACCOUNTS.map((acc) => {
                    const isSelected = formData.email === acc.email;
                    return (
                      <button
                        key={acc.role}
                        type="button"
                        onClick={() => handleSelectDemo(acc)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-white text-black border-white shadow-xl ring-2 ring-white/50'
                            : 'bg-black border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/60 text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isSelected
                                ? 'bg-black text-white border-black'
                                : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                            }`}
                          >
                            {acc.badge}
                          </span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-black"></span>}
                        </div>
                        <div className={`text-xs font-bold truncate ${isSelected ? 'text-black' : 'text-white'}`}>
                          {acc.label}
                        </div>
                        <div className={`text-[11px] font-mono truncate ${isSelected ? 'text-neutral-700' : 'text-neutral-400'}`}>
                          {acc.email}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monochrome Live Detection HUD Mockup */}
              <div className="mt-4 rounded-2xl bg-black border border-neutral-800 p-4 font-mono text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-[11px]">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    <span>CHECKPOINT_04 // SECTOR_17_EXPRESS</span>
                  </div>
                  <span className="text-black font-bold bg-white px-2.5 py-0.5 rounded text-[10px] tracking-wider uppercase">
                    HOTLIST MATCH: DL 01 AA 9999
                  </span>
                </div>
                <div className="pt-3 flex flex-wrap items-center justify-between text-neutral-400 text-[11px] gap-2">
                  <span>LATENCY: &lt;85ms</span>
                  <span>CONFIDENCE: 99.6%</span>
                  <span className="text-white font-bold">STATUS: PATROL DISPATCHED</span>
                </div>
              </div>
            </div>

            {/* Right Column: High-End Monochrome Auth Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-black border border-neutral-800 shadow-2xl p-6 sm:p-8">
                {/* Tabs: Sign In / Register */}
                <div className="flex rounded-full bg-neutral-900 p-1 border border-neutral-800 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all ${
                      !isRegister
                        ? 'bg-white text-black shadow-md'
                        : 'text-neutral-400 hover:text-white'
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
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all ${
                      isRegister
                        ? 'bg-white text-black shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Register Citizen
                  </button>
                </div>

                <div className="mb-5">
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">
                    {isRegister ? 'Citizen Registration' : 'System Access'}
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    {isRegister
                      ? 'Register civilian credentials to verify vehicles and file theft reports.'
                      : 'Provide credentials or select a 1-click test role above.'}
                  </p>
                </div>

                {/* Status Messages */}
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs flex items-center gap-2 font-mono">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-4 p-3 rounded-xl bg-white text-black text-xs flex items-center gap-2 font-mono font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-black" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isRegister && (
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="e.g. Rajesh Sharma"
                          className="w-full bg-neutral-900 border border-neutral-800 focus:border-white focus:ring-1 focus:ring-white rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Email Address / Badge ID
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="officer@agency.gov.in or email"
                        className="w-full bg-neutral-900 border border-neutral-800 focus:border-white focus:ring-1 focus:ring-white rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="••••••••••••"
                        className="w-full bg-neutral-900 border border-neutral-800 focus:border-white focus:ring-1 focus:ring-white rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-neutral-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isRegister && (
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1">
                        System Role
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full bg-neutral-900 border border-neutral-800 focus:border-white focus:ring-1 focus:ring-white rounded-xl px-4 py-2.5 text-sm text-white outline-none"
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
                      className="w-full py-3.5 px-6 rounded-full bg-white hover:bg-neutral-200 text-black font-black uppercase tracking-wider text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <span>PROCESSING...</span>
                      ) : isRegister ? (
                        <>
                          <span>CREATE CITIZEN PROFILE</span>
                          <ArrowRight className="w-4 h-4 text-black" />
                        </>
                      ) : (
                        <>
                          <span>AUTHENTICATE & ENTER CONSOLE</span>
                          <ArrowRight className="w-4 h-4 text-black" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-5 pt-4 border-t border-neutral-800 text-center text-xs text-neutral-400">
                  {isRegister ? (
                    <button
                      type="button"
                      onClick={() => setIsRegister(false)}
                      className="hover:text-white font-semibold underline underline-offset-4"
                    >
                      Already have access? Switch to Authenticate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsRegister(true)}
                      className="hover:text-white font-semibold underline underline-offset-4"
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

      {/* Modern Compact Monochrome Footer */}
      <footer className="relative z-10 border-t border-neutral-900 bg-black py-4 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © 2026 Vehicle Intelligence Platform • Master Optical ANPR & Highway Interdiction
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-neutral-400">
            <span>RTSP 4K INGESTION</span>
            <span>•</span>
            <span>SUB-85ms INFERENCE</span>
            <span>•</span>
            <span className="text-white font-bold">ENCRYPTED TELEMETRY</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Login;
