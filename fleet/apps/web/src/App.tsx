import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  Car,
  WifiOff,
  Battery,
  Gauge,
  Search,
  Shield,
  Briefcase,
  Eye,
  Smartphone,
  History,
  Download,
  LogOut,
} from 'lucide-react';
import { LiveMap } from './components/LiveMap';
import { useLiveMapStore } from './stores/liveMapStore';
import { SuperAdminView } from './components/SuperAdminView';
import { DriverPhoneSimulator } from './components/DriverPhoneSimulator';
import { TripReplayModal } from './components/TripReplayModal';
import { DispatchTripModal } from './components/DispatchTripModal';
import { FleetManagementView } from './components/FleetManagementView';
import { useAuthStore } from './stores/authStore';
import { LoginScreen } from './components/LoginScreen';
import { ProblemDetailsToast } from './components/ProblemDetailsToast';

const CAR_NAMES: Record<string, { plate: string; model: string }> = {
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a01': { plate: 'MH-12-DT-0001', model: 'Tata Nexon EV Max' },
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a02': { plate: 'MH-12-DT-0002', model: 'MG ZS EV' },
};

export function App() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const currentRole = user?.role || 'fleet_manager';

  const [managerSubView, setManagerSubView] = useState<'live_ops' | 'resources'>('resources');
  const [mobileOpsTab, setMobileOpsTab] = useState<'map' | 'list'>('map');
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  const connectionStatus = useLiveMapStore((s) => s.connectionStatus);
  const setConnectionStatus = useLiveMapStore((s) => s.setConnectionStatus);
  const applySnapshot = useLiveMapStore((s) => s.applySnapshot);
  const applyBatch = useLiveMapStore((s) => s.applyBatch);
  const applyStatus = useLiveMapStore((s) => s.applyStatus);
  const busesById = useLiveMapStore((s) => s.busesById);
  const selectedBusId = useLiveMapStore((s) => s.selectedBusId);
  const setSelectedBusId = useLiveMapStore((s) => s.setSelectedBusId);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Section 8.3: Resynchronization Protocol
  useEffect(() => {
    const socket: Socket = io({
      auth: { orgId: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000' },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('reconnecting');
    });

    // Inbound GPS stream
    socket.on('v1/live/snapshot', (snapshot) => {
      applySnapshot(String(snapshot.snapshot_rev || snapshot.rev || '0'), snapshot.buses || []);
    });

    socket.on('v1/live/batch', (batch) => {
      applyBatch(Array.isArray(batch) ? batch : batch.items || []);
    });

    socket.on('v1/live/status', (statusEvent) => {
      applyStatus(statusEvent.bus_id, statusEvent.status, statusEvent.status_since, String(statusEvent.rev));
    });

    return () => {
      socket.disconnect();
    };
  }, [setConnectionStatus, applySnapshot, applyBatch, applyStatus]);

  // Initial Snapshot fetch via REST
  useEffect(() => {
    fetch('/v1/live/buses')
      .then((res) => res.json())
      .then((data) => {
        if (data.buses) {
          applySnapshot(String(data.snapshot_rev || '0'), data.buses);
        }
      })
      .catch((err) => console.error('Failed to load initial cars snapshot:', err));
  }, [applySnapshot]);

  // Car list filtered by search and status
  const busesList = Array.from(busesById.values()).filter((bus) => {
    const carInfo = CAR_NAMES[bus.bus_id] || { plate: bus.bus_id, model: '' };
    const matchesSearch =
      bus.bus_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      carInfo.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      carInfo.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || bus.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedBus = selectedBusId ? busesById.get(selectedBusId) : null;

  // Counts by status
  const counts = {
    moving: Array.from(busesById.values()).filter((b) => b.status === 'moving').length,
    stopped: Array.from(busesById.values()).filter((b) => b.status === 'stopped').length,
    stale: Array.from(busesById.values()).filter((b) => b.status === 'stale').length,
    offline: Array.from(busesById.values()).filter((b) => b.status === 'offline').length,
  };

  const handleExportCsv = () => {
    window.open('/v1/reports/trip_summary', '_blank');
  };

  // Auth Guard: If not logged in, render professional role-based login screen
  if (!isAuthenticated || !user) {
    return (
      <>
        <LoginScreen />
        <ProblemDetailsToast />
      </>
    );
  }

  return (
    <div className="flex flex-col h-dvh max-h-dvh w-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Top Global Navigation Bar */}
      <header className="h-auto py-2 px-3 sm:px-5 bg-white border-b border-slate-200/80 flex items-center justify-between z-30 shadow-2xs gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="p-1.5 sm:p-2 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-lg text-white shadow-sm shadow-indigo-500/20">
            <Car className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900">FleetCommand</span>
              <span className="text-[9px] sm:text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                v1.0 Live
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate max-w-[120px] sm:max-w-none">
              {user.org_name}
            </div>
          </div>
        </div>

        {/* Active User Role Badge & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Static Authenticated Role Badge */}
          <div className="flex items-center">
            {currentRole === 'super_admin' && (
              <span className="px-2 sm:px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-2xs">
                <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="hidden sm:inline">Super Admin Console</span>
                <span className="sm:hidden">Admin</span>
              </span>
            )}
            {currentRole === 'fleet_manager' && (
              <span className="px-2 sm:px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-2xs">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="hidden sm:inline">Fleet Manager Desk</span>
                <span className="sm:hidden">Manager</span>
              </span>
            )}
            {currentRole === 'supervisor' && (
              <span className="px-2 sm:px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-2xs">
                <Eye className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">Control Room Supervisor</span>
                <span className="sm:hidden">Supervisor</span>
              </span>
            )}
            {currentRole === 'driver' && (
              <span className="px-2 sm:px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-2xs">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Driver Terminal</span>
                <span className="sm:hidden">Driver</span>
              </span>
            )}
          </div>

          {/* Action Controls */}
          <button
            onClick={() => setShowReplayModal(true)}
            className="px-2 sm:px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition border border-slate-200 shadow-2xs cursor-pointer"
            title="Trip Replay"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Trip Replay</span>
          </button>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-white border-slate-200 shadow-2xs">
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-bold hidden sm:inline">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-rose-600 font-semibold hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          {/* User Profile & Sign Out Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[100px] md:max-w-none">{user.name}</div>
              <div className="text-[10px] text-slate-500 font-mono leading-tight truncate max-w-[100px] md:max-w-none">{user.email || user.phone}</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg border border-slate-200 transition cursor-pointer"
              title="Sign Out to Login Screen"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Fleet Manager Sub-Navigation Bar */}
      {currentRole === 'fleet_manager' && (
        <div className="bg-white border-b border-slate-200/80 px-3 sm:px-6 py-1.5 sm:py-0 sm:h-11 flex flex-col sm:flex-row items-stretch sm:items-center justify-between z-20 shadow-2xs gap-2">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hidden md:inline shrink-0">Fleet Operations Mode:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
              <button
                onClick={() => setManagerSubView('resources')}
                className={`px-2.5 sm:px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap ${
                  managerSubView === 'resources'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="hidden sm:inline">📋 Cars Directory, Drivers & Routes</span>
                <span className="sm:hidden">📋 Directory & Drivers</span>
              </button>
              <button
                onClick={() => setManagerSubView('live_ops')}
                className={`px-2.5 sm:px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap ${
                  managerSubView === 'live_ops'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="hidden sm:inline">🗺️ Live Map & Real-time Tracking</span>
                <span className="sm:hidden">🗺️ Live Map</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end shrink-0">
            <button
              onClick={() => setShowDispatchModal(true)}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              + Dispatch Trip
            </button>
            <button
              onClick={handleExportCsv}
              className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs flex items-center gap-1 border border-slate-200 shadow-2xs cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
            </button>
          </div>
        </div>
      )}

      {/* Main Body Area Switcher */}
      <div className="flex-1 flex overflow-hidden">
        {/* View 1: Super Admin View */}
        {currentRole === 'super_admin' && <SuperAdminView />}

        {/* View 2: Driver Mobile App View */}
        {currentRole === 'driver' && <DriverPhoneSimulator />}

        {/* View 3: Fleet Manager Resource Management (Cars, Drivers, Routes) */}
        {currentRole === 'fleet_manager' && managerSubView === 'resources' && (
          <FleetManagementView />
        )}

        {/* View 4: Live Map Operations (Supervisor or Fleet Manager Live Ops) */}
        {((currentRole === 'fleet_manager' && managerSubView === 'live_ops') || currentRole === 'supervisor') && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* Mobile View Toggle Bar (< md screens) */}
            <div className="md:hidden flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 z-20 shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setMobileOpsTab('map')}
                  className={`px-3 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                    mobileOpsTab === 'map'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🗺️ Map</span>
                </button>
                <button
                  onClick={() => setMobileOpsTab('list')}
                  className={`px-3 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                    mobileOpsTab === 'list'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>📋 Cars ({busesList.length})</span>
                </button>
              </div>

              {currentRole === 'fleet_manager' && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowDispatchModal(true)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    + Dispatch
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="p-1 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs border border-slate-200 shadow-2xs cursor-pointer"
                    title="Export CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar: Fleet List & Search */}
            <aside
              className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-white z-10 shadow-sm overflow-hidden ${
                mobileOpsTab === 'list' ? 'flex flex-1' : 'hidden md:flex'
              }`}
            >
              <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-xs sm:text-sm text-slate-900">
                    {currentRole === 'fleet_manager' ? 'Fleet Operations Desk' : 'Control Room Live Feed'}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono">
                    {currentRole === 'fleet_manager' ? 'Full Dispatch & PII Access' : 'Read-Only Supervisor Scope'}
                  </p>
                </div>
                {currentRole === 'fleet_manager' && (
                  <div className="hidden md:flex items-center gap-1.5">
                    <button
                      onClick={() => setShowDispatchModal(true)}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                    >
                      + Dispatch Trip
                    </button>
                    <button
                      onClick={handleExportCsv}
                      className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs flex items-center gap-1 border border-slate-200 shadow-2xs cursor-pointer"
                      title="Export CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* Fleet KPI Quick Bar */}
              <div className="grid grid-cols-4 p-2.5 sm:p-3 gap-1.5 sm:gap-2 border-b border-slate-100 text-center text-xs">
                <div className="bg-emerald-50/60 p-1.5 sm:p-2 rounded-lg border border-emerald-100">
                  <div className="text-emerald-700 font-extrabold text-xs sm:text-sm">{counts.moving}</div>
                  <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Moving</div>
                </div>
                <div className="bg-amber-50/60 p-1.5 sm:p-2 rounded-lg border border-amber-100">
                  <div className="text-amber-700 font-extrabold text-xs sm:text-sm">{counts.stopped}</div>
                  <div className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Stopped</div>
                </div>
                <div className="bg-orange-50/60 p-1.5 sm:p-2 rounded-lg border border-orange-100">
                  <div className="text-orange-700 font-extrabold text-xs sm:text-sm">{counts.stale}</div>
                  <div className="text-[9px] text-orange-600 font-bold uppercase tracking-wider">Stale</div>
                </div>
                <div className="bg-slate-100 p-1.5 sm:p-2 rounded-lg border border-slate-200">
                  <div className="text-slate-600 font-extrabold text-xs sm:text-sm">{counts.offline}</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Offline</div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-2.5 sm:p-3 border-b border-slate-100 flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter by Car / Plate..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-xs rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-50 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-600"
                >
                  <option value="all">All</option>
                  <option value="moving">Moving</option>
                  <option value="stopped">Stopped</option>
                  <option value="stale">Stale</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              {/* Car List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {busesList.map((bus) => {
                  const isSelected = bus.bus_id === selectedBusId;
                  const carInfo = CAR_NAMES[bus.bus_id] || { plate: bus.bus_id.slice(0, 10), model: 'Fleet Car' };

                  return (
                    <div
                      key={bus.bus_id}
                      onClick={() => {
                        setSelectedBusId(bus.bus_id);
                        setMobileOpsTab('map');
                      }}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                          : 'hover:bg-slate-50/80 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-indigo-600 border-slate-200'}`}>
                            <Car className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs font-mono text-slate-900">
                              {carInfo.plate}
                            </div>
                            <div className="text-[10px] text-slate-500 font-sans">
                              {carInfo.model}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            bus.status === 'moving'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : bus.status === 'stopped'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : bus.status === 'stale'
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {bus.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500 font-medium">
                        <div className="flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-slate-400" />
                          <span>{bus.speed_kmh?.toFixed(0) || 0} km/h</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Battery className="w-3 h-3 text-slate-400" />
                          <span>{bus.battery_pct ?? '--'}%</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end font-mono text-[10px] text-slate-400">
                          rev #{bus.rev}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Main Map View Area */}
            <main
              className={`flex-1 relative ${
                mobileOpsTab === 'map' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
              }`}
            >
              <LiveMap />

              {/* Selected Car Floating Detail Card */}
              {selectedBus && (
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto sm:w-80 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-4 text-xs z-30 max-h-[50dvh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 font-mono text-sm">
                          {CAR_NAMES[selectedBus.bus_id]?.plate || selectedBus.bus_id}
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          {CAR_NAMES[selectedBus.bus_id]?.model || 'Electric Car'} • Live Telemetry
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedBusId(null)}
                      className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Status</span>
                      <span className="font-bold uppercase text-emerald-600">{selectedBus.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Current Speed</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedBus.speed_kmh?.toFixed(1) || 0} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Battery Level</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedBus.battery_pct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">GPS Accuracy</span>
                      <span className="font-mono text-slate-700">{selectedBus.accuracy_m?.toFixed(1) || 0} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Coordinates</span>
                      <span className="font-mono text-[10px] text-slate-700">
                        {selectedBus.lat.toFixed(5)}, {selectedBus.lng.toFixed(5)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Monotonic Version</span>
                      <span className="font-mono text-indigo-600 font-semibold">rev #{selectedBus.rev}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                      <span>Last Fix</span>
                      <span>{new Date(selectedBus.recorded_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      {/* Trip Replay Scrubber Modal */}
      {showReplayModal && (
        <TripReplayModal
          tripId="0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a10"
          onClose={() => setShowReplayModal(false)}
        />
      )}

      {/* Dispatch Trip & Driver Assignment Modal */}
      {showDispatchModal && (
        <DispatchTripModal
          onClose={() => setShowDispatchModal(false)}
          onTripDispatched={(trip) => {
            console.log('Trip dispatched successfully:', trip);
          }}
        />
      )}

      {/* RFC 9457 Global Error Toast */}
      <ProblemDetailsToast />
    </div>
  );
}
