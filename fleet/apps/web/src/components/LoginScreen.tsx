import React, { useState } from 'react';
import { Bus, Shield, Briefcase, Eye as EyeIcon, EyeOff, Smartphone, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
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
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 z-10 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-xl text-white shadow-lg">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              FleetCommand <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono">v1.0</span>
            </h1>
            <p className="text-xs text-slate-400">Enterprise Transit Telemetry & Control</p>
          </div>
        </div>

        {/* Quick Demo Role Auto-fill Selector */}
        <div className="mb-6 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>Quick Demo Role Fill:</span>
            <span className="text-[10px] text-blue-400 font-mono">1-Click Test</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDemoAccount('super_admin')}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition text-left"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <div>
                <div className="font-bold text-[11px]">Super Admin</div>
                <div className="text-[9px] text-slate-500">System owner</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('fleet_manager')}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition text-left"
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              <div>
                <div className="font-bold text-[11px]">Fleet Manager</div>
                <div className="text-[9px] text-slate-500">Buses, Drivers, Trips</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('supervisor')}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition text-left"
            >
              <EyeIcon className="w-3.5 h-3.5 text-amber-400" />
              <div>
                <div className="font-bold text-[11px]">Supervisor</div>
                <div className="text-[9px] text-slate-500">Live feed read-only</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('driver')}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition text-left"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <div className="font-bold text-[11px]">Driver App</div>
                <div className="text-[9px] text-slate-500">Phone + PIN</div>
              </div>
            </button>
          </div>
        </div>

        {/* Portal Switch Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode('staff');
              clearError();
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              authMode === 'staff'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
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
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              authMode === 'driver'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Driver Terminal</span>
          </button>
        </div>

        {/* RFC 9457 Inline Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-rose-300 flex items-center gap-2">
                <span>{error.title}</span>
                {error.status > 0 && <span className="font-mono text-[10px] text-rose-400">({error.status})</span>}
              </div>
              <div className="text-[11px] text-rose-200/90 mt-0.5">{error.detail}</div>
              {error.code && (
                <div className="font-mono text-[9px] text-rose-400/80 mt-1">Code: {error.code}</div>
              )}
            </div>
          </div>
        )}

        {/* Form 1: Staff Portal (Super Admin, Fleet Manager, Supervisor) */}
        {authMode === 'staff' && (
          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@fleetcommand.io"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Account Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
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
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Registered Mobile Phone
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98220 01122"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                6-Digit Security PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
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
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[10px] text-slate-500 leading-relaxed font-mono">
          🔒 TLS 1.3 End-to-End Encrypted Session. Subject to Enterprise Audit Logging & DPDP Act 2023.
        </div>
      </div>
    </div>
  );
};
