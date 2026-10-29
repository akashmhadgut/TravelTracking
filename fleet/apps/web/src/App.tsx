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
  Sparkles,
  User,
} from 'lucide-react';
import { LiveMap } from './components/LiveMap';
import { useLiveMapStore } from './stores/liveMapStore';
import { SuperAdminView } from './components/SuperAdminView';
import { DriverPhoneSimulator } from './components/DriverPhoneSimulator';
import { TripReplayModal } from './components/TripReplayModal';
import { DispatchTripModal } from './components/DispatchTripModal';
import { FleetManagementView } from './components/FleetManagementView';
import { SupervisorCarInspectionDrawer } from './components/SupervisorCarInspectionDrawer';
import { SupervisorCleanlinessView } from './components/SupervisorCleanlinessView';
import { useAuthStore } from './stores/authStore';
import { LoginScreen } from './components/LoginScreen';
import { ProblemDetailsToast } from './components/ProblemDetailsToast';

export function App() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const currentRole = user?.role || 'fleet_manager';

  const [managerSubView, setManagerSubView] = useState<'live_ops' | 'resources'>('live_ops');
  const [supervisorSubView, setSupervisorSubView] = useState<'live_ops' | 'cleanliness'>('live_ops');
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
      auth: { orgId: user?.org_id || '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000' },
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
  }, [user?.org_id, setConnectionStatus, applySnapshot, applyBatch, applyStatus]);

  // Initial Snapshot fetch via REST
  useEffect(() => {
    fetch('/v1/live/buses')
      .then((res) => res.json())
      .then((data) => {
        if (data.buses) {
          applySnapshot(String(data.snapshot_rev || '0'), data.buses);
        }
      })
      .catch((err) => console.error('Failed to load initial buses snapshot:', err));
  }, [applySnapshot]);

  // Filtered bus list
  const busesList = Array.from(busesById.values()).filter((bus) => {
    const regNo = (bus as any).reg_no || (`MH-12-DT-${bus.bus_id.slice(-4).toUpperCase()}`);
    const model = (bus as any).model || 'Nexon EV Max';
    const make = (bus as any).make || 'Tata Motors';
    const driverName = (bus as any).driver_name || '';

    const matchesSearch =
      bus.bus_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      regNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driverName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || bus.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedBus = selectedBusId ? busesById.get(selectedBusId) : null;

  // Counts by status
  const counts = {
    total: busesById.size,
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
    <div className="flex flex-col h-dvh max-h-dvh w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Global Navigation Bar */}
      <header className="h-14 py-2 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-30 shadow-md gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/30">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">FleetCommand</span>
              <span className="text-[10px] bg-slate-800 text-indigo-400 border border-slate-700 px-2 py-0.5 rounded-full font-mono font-medium">
                Car Fleet Ops
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium truncate">
              {user.org_name || 'City Express Mobility Corporation'}
            </div>
          </div>
        </div>

        {/* Active User Role Badge & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center">
            {currentRole === 'super_admin' && (
              <span className="px-3 py-1 bg-purple-950/80 border border-purple-800/80 text-purple-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">System Administration</span>
                <span className="sm:hidden">Admin</span>
              </span>
            )}
            {currentRole === 'fleet_manager' && (
              <span className="px-3 py-1 bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Fleet Operations Manager</span>
                <span className="sm:hidden">Manager</span>
              </span>
            )}
            {currentRole === 'supervisor' && (
              <span className="px-3 py-1 bg-amber-950/80 border border-amber-800/80 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Control Room Supervisor</span>
                <span className="sm:hidden">Supervisor</span>
              </span>
            )}
            {currentRole === 'driver' && (
              <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Driver Terminal</span>
                <span className="sm:hidden">Driver</span>
              </span>
            )}
          </div>

          {/* Trip Replay Modal Trigger */}
          <button
            onClick={() => setShowReplayModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 shadow-sm cursor-pointer"
            title="Trip Replay"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Trip Replay</span>
          </button>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-900 border-slate-800 shadow-sm">
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 font-semibold hidden sm:inline">Live Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400 font-semibold hidden sm:inline">Reconnecting</span>
              </>
            )}
          </div>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white leading-tight">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-mono leading-tight">{user.email || user.phone}</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 rounded-lg border border-slate-700 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Operations Sub-Navigation Bar for Fleet Managers */}
      {currentRole === 'fleet_manager' && (
        <div className="bg-slate-900/90 border-b border-slate-800/90 px-4 sm:px-6 py-2 flex items-center justify-between z-20 shadow-sm gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400 hidden md:inline">View Mode:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setManagerSubView('live_ops')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  managerSubView === 'live_ops'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Live Fleet Map</span>
              </button>
              <button
                onClick={() => setManagerSubView('resources')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  managerSubView === 'resources'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Car Fleet & Drivers</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDispatchModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              + Dispatch Trip
            </button>
            <button
              onClick={handleExportCsv}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 shadow-sm cursor-pointer"
              title="Export Trip Telemetry CSV"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          </div>
        </div>
      )}

      {/* Operations Sub-Navigation Bar for Supervisors */}
      {currentRole === 'supervisor' && (
        <div className="bg-slate-900/95 border-b border-amber-900/40 px-4 sm:px-6 py-2 flex items-center justify-between z-20 shadow-sm gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Supervisor Control Desk:</span>
            </span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setSupervisorSubView('live_ops');
                  setFilterStatus('all');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  supervisorSubView === 'live_ops' && filterStatus !== 'stopped'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Live Fleet Map</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {counts.total}
                </span>
              </button>
              <button
                onClick={() => {
                  setSupervisorSubView('live_ops');
                  setFilterStatus('stopped');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  supervisorSubView === 'live_ops' && filterStatus === 'stopped'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-400 hover:text-rose-300 hover:bg-slate-900'
                }`}
              >
                <span>🛑 Stopped Cars Queue</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950 border border-rose-800 text-rose-300 font-mono font-bold">
                  {counts.stopped}
                </span>
              </button>
              <button
                onClick={() => setSupervisorSubView('cleanliness')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  supervisorSubView === 'cleanliness'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Vehicle Cleanliness Desk</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {filterStatus === 'stopped' && (
              <span className="text-[11px] bg-rose-950/80 border border-rose-800 text-rose-300 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                {counts.stopped} Stationary Vehicles Requiring Intervention
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Command Console Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* View 1: Super Admin View */}
        {currentRole === 'super_admin' && <SuperAdminView />}

        {/* View 2: Driver Mobile App Simulator */}
        {currentRole === 'driver' && <DriverPhoneSimulator />}

        {/* View 3: Fleet Management (Buses, Drivers, Routes, Compliance) */}
        {currentRole === 'fleet_manager' && managerSubView === 'resources' && (
          <FleetManagementView />
        )}

        {/* View 4: Supervisor Cleanliness Desk */}
        {currentRole === 'supervisor' && supervisorSubView === 'cleanliness' && (
          <SupervisorCleanlinessView
            buses={Array.from(busesById.values())}
            supervisorName={user.name}
            onSelectCarForInspection={(busId) => {
              setSupervisorSubView('live_ops');
              setSelectedBusId(busId);
            }}
          />
        )}

        {/* View 5: Live Map Operations (Live Ops Desk) */}
        {((currentRole === 'fleet_manager' && managerSubView === 'live_ops') ||
          (currentRole === 'supervisor' && supervisorSubView === 'live_ops')) && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* Sidebar: Bus Fleet Registry & Filter */}
            <aside className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-800 bg-slate-900 z-10 shadow-xl overflow-hidden">
              {/* Telemetry KPI Header */}
              <div className="grid grid-cols-4 p-3 gap-2 border-b border-slate-800 text-center text-xs bg-slate-950/60">
                <div
                  onClick={() => setFilterStatus('moving')}
                  className={`p-2 rounded-lg border transition cursor-pointer ${
                    filterStatus === 'moving'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-emerald-950/40 border-emerald-900/60 hover:bg-emerald-950/70'
                  }`}
                >
                  <div className="font-bold text-sm text-emerald-400">{counts.moving}</div>
                  <div className="text-[10px] text-emerald-500/80 font-medium uppercase tracking-wider">Moving</div>
                </div>
                <div
                  onClick={() => setFilterStatus('stopped')}
                  className={`p-2 rounded-lg border transition cursor-pointer ${
                    filterStatus === 'stopped'
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-blue-950/40 border-blue-900/60 hover:bg-blue-950/70'
                  }`}
                >
                  <div className="font-bold text-sm text-blue-400">{counts.stopped}</div>
                  <div className="text-[10px] text-blue-500/80 font-medium uppercase tracking-wider">Stopped</div>
                </div>
                <div
                  onClick={() => setFilterStatus('stale')}
                  className={`p-2 rounded-lg border transition cursor-pointer ${
                    filterStatus === 'stale'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-amber-950/40 border-amber-900/60 hover:bg-amber-950/70'
                  }`}
                >
                  <div className="font-bold text-sm text-amber-400">{counts.stale}</div>
                  <div className="text-[10px] text-amber-500/80 font-medium uppercase tracking-wider">Stale</div>
                </div>
                <div
                  onClick={() => setFilterStatus('offline')}
                  className={`p-2 rounded-lg border transition cursor-pointer ${
                    filterStatus === 'offline'
                      ? 'bg-slate-700 text-white border-slate-600'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-400">{counts.offline}</div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Offline</div>
                </div>
              </div>

              {/* Search & Status Filters */}
              <div className="p-3 border-b border-slate-800 flex gap-2 bg-slate-900">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search car or driver (MH-12, Sunil)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 text-xs rounded-lg border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 text-xs px-2.5 py-2 rounded-lg border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All ({counts.total})</option>
                  <option value="moving">Moving</option>
                  <option value="stopped">Stopped</option>
                  <option value="stale">Stale</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              {/* Bus List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                {busesList.map((bus) => {
                  const isSelected = bus.bus_id === selectedBusId;
                  const regNo = (bus as any).reg_no || (`MH-12-DT-${bus.bus_id.slice(-4).toUpperCase()}`);
                  const model = (bus as any).model || 'Starbus Ultra EV';
                  const driverName = (bus as any).driver_name || 'Sunil Patil';
                  const cleanStatus = (bus as any).cleanliness_status || 'clean';

                  return (
                    <div
                      key={bus.bus_id}
                      onClick={() => {
                        setSelectedBusId(bus.bus_id);
                      }}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-950/60 border-l-4 border-indigo-500'
                          : 'hover:bg-slate-800/40 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2 rounded-lg border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-800 text-indigo-400 border-slate-700'
                            }`}
                          >
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
                            bus.status === 'moving'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                              : bus.status === 'stopped'
                              ? 'bg-rose-950/90 text-rose-300 border border-rose-800/80 font-bold'
                              : bus.status === 'stale'
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/80'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {bus.status === 'stopped' ? '🔴 STOPPED' : bus.status}
                        </span>
                      </div>

                      {/* Driver & Cleanliness Line on Card */}
                      <div className="mb-2 p-1.5 bg-slate-950/80 rounded-lg border border-slate-800/80 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 text-slate-300 truncate">
                          <User className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="truncate font-medium">{driverName}</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.2 rounded font-semibold text-[9px] uppercase ${
                            cleanStatus === 'needs_cleaning'
                              ? 'text-amber-400 bg-amber-950/60 border border-amber-800/60'
                              : 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                          }`}
                        >
                          {cleanStatus === 'needs_cleaning' ? '⚠️ Clean Req' : '✨ Clean'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-slate-500" />
                          <span>{bus.speed_kmh?.toFixed(0) || 0} km/h</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Battery className="w-3.5 h-3.5 text-slate-500" />
                          <span>{bus.battery_pct ?? '--'}%</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end font-mono text-[10px] text-slate-500">
                          rev #{bus.rev}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Map Area */}
            <main className="flex-1 relative flex flex-col">
              <LiveMap />

              {/* Selected Bus Supervisor Intervention Drawer */}
              {selectedBus && (
                <SupervisorCarInspectionDrawer
                  car={selectedBus}
                  supervisorName={user.name}
                  onClose={() => setSelectedBusId(null)}
                  onOpenReplay={() => setShowReplayModal(true)}
                />
              )}
            </main>
          </div>
        )}
      </div>

      {/* Modals & Alerts */}
      {showReplayModal && (
        <TripReplayModal
          tripId={selectedBus?.trip_id || '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a10'}
          onClose={() => setShowReplayModal(false)}
        />
      )}
      {showDispatchModal && (
        <DispatchTripModal
          onTripDispatched={() => setShowDispatchModal(false)}
          onClose={() => setShowDispatchModal(false)}
        />
      )}
      <ProblemDetailsToast />
    </div>
  );
}
