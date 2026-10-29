import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Phone,
  Car,
  Shield,
  Eye,
} from 'lucide-react';
import type { LatestBusLocation } from '@fleet/contracts';

interface SupervisorCleanlinessViewProps {
  buses: LatestBusLocation[];
  supervisorName: string;
  onSelectCarForInspection: (busId: string) => void;
  onRefreshData?: () => void;
}

export const SupervisorCleanlinessView: React.FC<SupervisorCleanlinessViewProps> = ({
  buses,
  supervisorName,
  onSelectCarForInspection,
  onRefreshData,
}) => {
  const [filterCleanliness, setFilterCleanliness] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingBusId, setUpdatingBusId] = useState<string | null>(null);

  // Cleanliness counts
  const counts = {
    total: buses.length,
    clean: buses.filter((b) => (b as any).cleanliness_status === 'clean' || !(b as any).cleanliness_status).length,
    needs_cleaning: buses.filter((b) => (b as any).cleanliness_status === 'needs_cleaning').length,
    in_progress: buses.filter((b) => (b as any).cleanliness_status === 'in_progress').length,
  };

  const filteredBuses = buses.filter((b) => {
    const regNo = (b as any).reg_no || `MH-12-DT-${b.bus_id.slice(-4).toUpperCase()}`;
    const driver = (b as any).driver_name || 'Driver';
    const status = (b as any).cleanliness_status || 'clean';

    const matchesSearch =
      regNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bus_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterCleanliness === 'all' || status === filterCleanliness;
    return matchesSearch && matchesFilter;
  });

  const handleUpdateStatus = async (busId: string, newStatus: 'clean' | 'needs_cleaning' | 'in_progress') => {
    setUpdatingBusId(busId);
    try {
      await fetch('/v1/supervisor/cleanliness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bus_id: busId,
          status: newStatus,
          interior_clean: newStatus === 'clean',
          exterior_clean: newStatus === 'clean',
          sanitized: newStatus === 'clean',
          ac_fresh: newStatus === 'clean',
          inspected_by: supervisorName || 'Anand Shinde',
          notes: newStatus === 'clean' ? 'Passed supervisor inspection' : 'Cleanliness flagged by supervisor',
        }),
      });

      // Update locally
      const target = buses.find((b) => b.bus_id === busId);
      if (target) {
        (target as any).cleanliness_status = newStatus;
      }
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to update cleanliness:', err);
    } finally {
      setUpdatingBusId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Desk KPI Overview */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Vehicle Cleanliness & Hygiene Verification Desk
              </h2>
              <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full font-semibold uppercase">
                Supervisor Audit
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Supervise cabin sanitation, wash certification, and dispatch cleaning instructions across all 100 fleet vehicles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-amber-400" /> Auditor: {supervisorName}
            </span>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setFilterCleanliness('all')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              filterCleanliness === 'all'
                ? 'bg-indigo-950/60 border-indigo-600 shadow-sm'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <div className="text-xs text-slate-400 font-medium">Total Fleet Cars</div>
            <div className="text-xl font-bold font-mono text-white mt-1">{counts.total}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">100% Monitored</div>
          </div>

          <div
            onClick={() => setFilterCleanliness('clean')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              filterCleanliness === 'clean'
                ? 'bg-emerald-950/60 border-emerald-600 shadow-sm'
                : 'bg-emerald-950/20 border-emerald-900/50 hover:bg-emerald-950/40'
            }`}
          >
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Certified Clean
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-1">{counts.clean}</div>
            <div className="text-[10px] text-emerald-500 mt-0.5">Ready for Passengers</div>
          </div>

          <div
            onClick={() => setFilterCleanliness('needs_cleaning')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              filterCleanliness === 'needs_cleaning'
                ? 'bg-amber-950/60 border-amber-600 shadow-sm'
                : 'bg-amber-950/20 border-amber-900/50 hover:bg-amber-950/40'
            }`}
          >
            <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Cleaning Required
            </div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-1">{counts.needs_cleaning}</div>
            <div className="text-[10px] text-amber-500 mt-0.5">Supervisor Alert</div>
          </div>

          <div
            onClick={() => setFilterCleanliness('in_progress')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              filterCleanliness === 'in_progress'
                ? 'bg-sky-950/60 border-sky-600 shadow-sm'
                : 'bg-sky-950/20 border-sky-900/50 hover:bg-sky-950/40'
            }`}
          >
            <div className="text-xs text-sky-400 font-medium flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Wash in Progress
            </div>
            <div className="text-xl font-bold font-mono text-sky-300 mt-1">{counts.in_progress}</div>
            <div className="text-[10px] text-sky-500 mt-0.5">Depot Bay Active</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:px-6 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search vehicle or driver (e.g. MH-12, Sunil)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-950 text-xs rounded-lg border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilterCleanliness('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                filterCleanliness === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => setFilterCleanliness('clean')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                filterCleanliness === 'clean' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Clean ({counts.clean})
            </button>
            <button
              onClick={() => setFilterCleanliness('needs_cleaning')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                filterCleanliness === 'needs_cleaning' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              Needs Attention ({counts.needs_cleaning})
            </button>
          </div>
        </div>
      </div>

      {/* Cleanliness Fleet Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredBuses.map((bus) => {
            const regNo = (bus as any).reg_no || `MH-12-DT-${bus.bus_id.slice(-4).toUpperCase()}`;
            const model = (bus as any).model || 'Nexon EV Max';
            const driverName = (bus as any).driver_name || 'Sunil Patil';
            const driverPhone = (bus as any).driver_phone || '+91 98220 03344';
            const cleanStatus = (bus as any).cleanliness_status || 'clean';
            const isStopped = bus.status === 'stopped';

            return (
              <div
                key={bus.bus_id}
                className={`p-4 rounded-xl border bg-slate-900 transition flex flex-col justify-between space-y-3 ${
                  cleanStatus === 'needs_cleaning'
                    ? 'border-amber-900/60 hover:border-amber-600'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-slate-800 rounded-lg text-indigo-400 border border-slate-700">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs font-mono text-white tracking-wide">
                          {regNo}
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans">
                          {model}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isStopped
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : bus.status === 'moving'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {bus.status}
                    </span>
                  </div>

                  {/* Driver Information */}
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 mb-2.5 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Assigned Driver</span>
                      <span className="font-semibold text-slate-200">{driverName}</span>
                    </div>
                    <a
                      href={`tel:${driverPhone}`}
                      className="p-1.5 bg-slate-900 hover:bg-emerald-950 hover:text-emerald-400 text-slate-400 border border-slate-800 rounded-lg transition"
                      title={`Call ${driverPhone}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Cleanliness Status Badge */}
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Hygiene Status
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        cleanStatus === 'clean'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : cleanStatus === 'needs_cleaning'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          : 'bg-sky-950 text-sky-400 border border-sky-800/60'
                      }`}
                    >
                      {cleanStatus === 'clean'
                        ? 'Certified Clean'
                        : cleanStatus === 'needs_cleaning'
                        ? 'Inspection / Wash Req'
                        : 'Washing in Bay'}
                    </span>
                  </div>
                </div>

                {/* Supervisor 1-Click Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
                  {cleanStatus !== 'clean' ? (
                    <button
                      disabled={updatingBusId === bus.bus_id}
                      onClick={() => handleUpdateStatus(bus.bus_id, 'clean')}
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Certify Clean</span>
                    </button>
                  ) : (
                    <button
                      disabled={updatingBusId === bus.bus_id}
                      onClick={() => handleUpdateStatus(bus.bus_id, 'needs_cleaning')}
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-amber-950 hover:text-amber-400 hover:border-amber-800 text-slate-300 font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1 transition border border-slate-700 cursor-pointer"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Flag for Wash</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectCarForInspection(bus.bus_id)}
                    className="py-1.5 px-2.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-600/40 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                    title="Open Full Inspection & Driver Contact Drawer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
