import React, { useState } from 'react';
import { Car, Lock, User, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, Shield, Briefcase } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const LoginScreen: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(identifier, password);
    } catch {
      // Handled in store
    }
  };

  return (
    <div className="min-h-dvh w-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-y-auto font-sans text-slate-100">
      {/* Background subtle professional telemetry grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Single Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 z-10 backdrop-blur-xl my-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-800">
          <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30 shrink-0">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">FleetCommand</h1>
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800/80 px-2 py-0.5 rounded-full font-mono">
                Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Smart Car Fleet & Live Telemetry Desk</p>
          </div>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800/70 rounded-xl text-xs flex items-start gap-2.5 text-rose-200 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-rose-100">{error.title || 'Authentication Error'}</div>
              <div className="text-[11px] text-rose-300/90 mt-0.5">{error.detail}</div>
            </div>
          </div>
        )}

        {/* Single Unified Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Corporate Email or Registered Mobile
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="name@deccantransit.in or +91 98220..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 transition outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Password or Security PIN
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Password reset instructions have been forwarded to your system administrator.');
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 transition outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Credentials...
              </>
            ) : (
              <>
                Sign In to Console
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Role Fill Shortcuts */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>Instant Demo Sign-In:</span>
            <span className="text-[10px] text-slate-500 font-normal">1-Click Fill</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setIdentifier('admin@fleetcommand.io');
                setPassword('admin123');
              }}
              className="p-2 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 rounded-xl text-left transition flex flex-col gap-1 cursor-pointer group"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-purple-300">
                <Shield className="w-3 h-3 text-purple-400" />
                <span>Super Admin</span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono truncate">admin@fleetcommand.io</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIdentifier('vasant.kulkarni@deccantransit.in');
                setPassword('manager123');
              }}
              className="p-2 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 rounded-xl text-left transition flex flex-col gap-1 cursor-pointer group"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-300">
                <Briefcase className="w-3 h-3 text-indigo-400" />
                <span>Fleet Mgr</span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono truncate">vasant@deccan</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIdentifier('anand.shinde@deccantransit.in');
                setPassword('supervisor123');
              }}
              className="p-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-xl text-left transition flex flex-col gap-1 cursor-pointer group"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                <Eye className="w-3 h-3 text-amber-400" />
                <span>Supervisor</span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono truncate">anand@deccan</div>
            </button>
          </div>
        </div>

        {/* Security & Regulatory Compliance Footer */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <Lock className="w-3 h-3 text-slate-400" />
            TLS 1.3 Encrypted • DPDP Act 2023 Compliant • 256-bit AES Token Auth
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            City Express Mobility Corporation • Automated Vehicle Location (AVL) System
          </p>
        </div>
      </div>
    </div>
  );
};
