import React, { useState } from 'react';
import { Car, Shield, Briefcase, Eye as EyeIcon, EyeOff, Smartphone, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore, type UserRole } from '../stores/authStore';

export const LoginScreen: React.FC = () => {
  const [authMode, setAuthMode] = useState<'staff' | 'driver'>('staff');
  const [email, setEmail] = useState('manager@fleetcommand.io');
  const [password, setPassword] = useState('manager123');
  const [showPassword, setShowPassword] = useState(false);

  // Driver fields
  const [phone, setPhone] = useState('+919822001122');
  const [pin, setPin] = useState('123456');

  const login = useAuthStore((s) => s.login);
  const driverLogin = useAuthStore((s) => s.driverLogin);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
    } catch {
      // Handled in store
    }
  };

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await driverLogin(phone, pin);
    } catch {
      // Handled in store
    }
  };

  const setDemoAccount = (role: UserRole) => {
    clearError();
    if (role === 'super_admin') {
      setAuthMode('staff');
      setEmail('admin@fleetcommand.io');
      setPassword('admin123');
    } else if (role === 'fleet_manager') {
      setAuthMode('staff');
      setEmail('manager@fleetcommand.io');
      setPassword('manager123');
    } else if (role === 'supervisor') {
      setAuthMode('staff');
      setEmail('supervisor@fleetcommand.io');
      setPassword('supervisor123');
    } else if (role === 'driver') {
      setAuthMode('driver');
      setPhone('+919822001122');
      setPin('123456');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Background subtle glowing radial gradients */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white/90 border border-slate-200/80 rounded-2xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)] p-8 z-10 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              FleetCommand <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-mono font-semibold">v1.0 Live</span>
            </h1>
            <p className="text-xs text-slate-500">Smart EV & Car Fleet Telemetry Desk</p>
          </div>
        </div>

        {/* Quick Demo Role Auto-fill Selector */}
        <div className="mb-6 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
            <span>Quick Demo Role Fill:</span>
            <span className="text-[10px] text-indigo-600 font-semibold font-mono">1-Click Test</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDemoAccount('super_admin')}
              className="p-2 rounded-lg bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 text-slate-700 flex items-center gap-1.5 transition text-left shadow-2xs cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <div>
                <div className="font-bold text-[11px] text-slate-900">Super Admin</div>
                <div className="text-[9px] text-slate-500">System owner</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('fleet_manager')}
              className="p-2 rounded-lg bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 text-slate-700 flex items-center gap-1.5 transition text-left shadow-2xs cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              <div>
                <div className="font-bold text-[11px] text-slate-900">Fleet Manager</div>
                <div className="text-[9px] text-slate-500">Cars, Drivers, Trips</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('supervisor')}
              className="p-2 rounded-lg bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 text-slate-700 flex items-center gap-1.5 transition text-left shadow-2xs cursor-pointer"
            >
              <EyeIcon className="w-3.5 h-3.5 text-amber-600" />
              <div>
                <div className="font-bold text-[11px] text-slate-900">Supervisor</div>
                <div className="text-[9px] text-slate-500">Live feed monitor</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('driver')}
              className="p-2 rounded-lg bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 text-slate-700 flex items-center gap-1.5 transition text-left shadow-2xs cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <div>
                <div className="font-bold text-[11px] text-slate-900">Driver App</div>
                <div className="text-[9px] text-slate-500">Phone + PIN</div>
              </div>
            </button>
          </div>
        </div>

        {/* Portal Switch Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode('staff');
              clearError();
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'staff'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Staff Portal</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('driver');
              clearError();
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'driver'
                ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Driver Terminal</span>
          </button>
        </div>

        {/* RFC 9457 Inline Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-rose-900 flex items-center gap-2">
                <span>{error.title}</span>
                {error.status > 0 && <span className="font-mono text-[10px] text-rose-600">({error.status})</span>}
              </div>
              <div className="text-[11px] text-rose-700 mt-0.5">{error.detail}</div>
              {error.code && (
                <div className="font-mono text-[9px] text-rose-500 mt-1">Code: {error.code}</div>
              )}
            </div>
          </div>
        )}

        {/* Form 1: Staff Portal */}
        {authMode === 'staff' && (
          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@fleetcommand.io"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Form 2: Driver Mobile Phone + PIN */}
        {authMode === 'driver' && (
          <form onSubmit={handleDriverSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Registered Mobile Phone
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98220 01122"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                6-Digit Security PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50 transition font-mono tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting Terminal...</span>
                </>
              ) : (
                <>
                  <span>Launch Driver Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Footer Notice */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 leading-relaxed font-mono">
          🔒 TLS 1.3 End-to-End Encrypted Session. Subject to Enterprise Audit Logging & DPDP Act 2023.
        </div>
      </div>
    </div>
  );
};
