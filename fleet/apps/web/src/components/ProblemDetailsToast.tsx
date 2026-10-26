import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const ProblemDetailsToast: React.FC = () => {
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  if (!error) return null;

  return (
    <div className="fixed bottom-6 right-6 max-w-md w-full bg-rose-950/95 border border-rose-600/50 rounded-xl shadow-2xl p-4 text-slate-100 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm text-rose-200">{error.title}</span>
            {error.status > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-900/80 border border-rose-700/60 text-rose-300 font-mono text-[10px] rounded font-bold">
                HTTP {error.status}
              </span>
            )}
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">{error.detail}</p>
          {error.code && (
            <div className="mt-2 text-[10px] text-rose-400/80 font-mono">
              Error Code: <span className="text-rose-300 font-semibold">{error.code}</span>
            </div>
          )}
          {error.invalidParams && error.invalidParams.length > 0 && (
            <ul className="mt-2 text-[11px] text-rose-300 list-disc list-inside space-y-0.5 font-mono">
              {error.invalidParams.map((param, i) => (
                <li key={i}>
                  <span className="font-bold">{param.name}</span>: {param.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={clearError}
          className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-900/40 transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
