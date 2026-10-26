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
      setConnectionStatus('disconnected');
    });

    // 1. Wait for server.hello, then fetch snapshot
    socket.on('server.hello', async () => {
      try {
        const res = await fetch('/v1/live/buses');
        if (res.ok) {
          const data = await res.json();
          applySnapshot(data.snapshot_rev, data.buses);
        }
      } catch (err) {
        console.error('Failed to fetch snapshot:', err);
      }
    });

    // 2. Incoming coalesced batch updates
    socket.on('bus.batch', (payload: { v: number; items: any[] }) => {
      applyBatch(payload.items);
    });

    // 3. Immediate status changes
    socket.on('bus.status', (payload: { bus_id: string; status: any; status_since: string; rev: string }) => {
      applyStatus(payload.bus_id, payload.status, payload.status_since, payload.rev);
    });

    return () => {
      socket.disconnect();
    };
  }, [applySnapshot, applyBatch, applyStatus, setConnectionStatus]);

  const busesList = Array.from(busesById.values()).filter((b) => {
    const matchSearch = b.bus_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterStatus === 'all' || b.status === filterStatus;
    return matchSearch && matchFilter;
  });

  const selectedBus = selectedBusId ? busesById.get(selectedBusId) : null;

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
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Global Navigation Bar with Multi-User Role Switcher */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-lg text-white shadow">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide text-white">FleetCommand</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded font-mono">
                v1.0
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {user.org_name}
            </div>
          </div>
        </div>

        {/* Active User Role Badge & Profile */}
        <div className="flex items-center gap-3">
          {/* Static Authenticated Role Badge */}
          <div className="flex items-center">
            {currentRole === 'super_admin' && (
              <span className="px-3 py-1 bg-purple-950/80 border border-purple-600/50 text-purple-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Super Admin Console</span>
              </span>
            )}
            {currentRole === 'fleet_manager' && (
              <span className="px-3 py-1 bg-blue-950/80 border border-blue-600/50 text-blue-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>Fleet Manager Desk</span>
              </span>
            )}
            {currentRole === 'supervisor' && (
              <span className="px-3 py-1 bg-amber-950/80 border border-amber-600/50 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Control Room Supervisor</span>
              </span>
            )}
            {currentRole === 'driver' && (
              <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Driver Terminal</span>
              </span>
            )}
          </div>

          {/* Action Controls */}
          <button
            onClick={() => setShowReplayModal(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trip Replay</span>
          </button>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-slate-950 border-slate-800">
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400">Reconnecting</span>
              </>
            )}
          </div>

          {/* User Profile & Sign Out Button */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-200 leading-tight">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-mono leading-tight">{user.email || user.phone}</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 bg-slate-800 hover:bg-rose-950/70 hover:text-rose-400 text-slate-400 rounded-lg border border-slate-700 transition"
              title="Sign Out to Login Screen"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Fleet Manager Sub-Navigation Bar */}
      {currentRole === 'fleet_manager' && (
        <div className="h-11 bg-slate-900/95 border-b border-slate-800 px-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fleet Operations Mode:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setManagerSubView('resources')}
                className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                  managerSubView === 'resources'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📋 Fleet Directory (Buses, Drivers, Routes)</span>
              </button>
              <button
                onClick={() => setManagerSubView('live_ops')}
                className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                  managerSubView === 'live_ops'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🗺️ Live Map & Real-time Tracking</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDispatchModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md transition"
            >
              + Dispatch Trip
            </button>
            <button
              onClick={handleExportCsv}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 border border-slate-700"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
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

        {/* View 3: Fleet Manager Resource Management (Buses, Drivers, Routes) */}
        {currentRole === 'fleet_manager' && managerSubView === 'resources' && (
          <FleetManagementView />
        )}

        {/* View 4: Live Map Operations (Supervisor or Fleet Manager Live Ops) */}
        {((currentRole === 'fleet_manager' && managerSubView === 'live_ops') || currentRole === 'supervisor') && (
          <>
            {/* Sidebar: Fleet List & Search */}
            <aside className="w-96 flex flex-col border-r border-slate-800 bg-slate-900/90 backdrop-blur z-10">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-sm text-white">
                    {currentRole === 'fleet_manager' ? 'Fleet Operations Desk' : 'Control Room Live Feed'}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {currentRole === 'fleet_manager' ? 'Full Dispatch & PII Access' : 'Read-Only Supervisor Scope'}
                  </p>
                </div>
                {currentRole === 'fleet_manager' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowDispatchModal(true)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md transition"
                    >
                      + Dispatch Trip
                    </button>
                    <button
                      onClick={handleExportCsv}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 border border-slate-700"
                      title="Export CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Fleet KPI Quick Bar */}
              <div className="grid grid-cols-4 p-3 gap-2 border-b border-slate-800/80 text-center text-xs">
                <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                  <div className="text-emerald-400 font-bold">{counts.moving}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Moving</div>
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                  <div className="text-amber-400 font-bold">{counts.stopped}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Stopped</div>
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                  <div className="text-orange-400 font-bold">{counts.stale}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Stale</div>
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                  <div className="text-rose-400 font-bold">{counts.offline}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Offline</div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-3 border-b border-slate-800 flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter by Car / Plate..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 text-xs rounded border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 text-xs px-2 py-1.5 rounded border border-slate-800 text-slate-300 focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="moving">Moving</option>
                  <option value="stopped">Stopped</option>
                  <option value="stale">Stale</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              {/* Car List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
                {busesList.map((bus) => {
                  const isSelected = bus.bus_id === selectedBusId;
                  const carInfo = CAR_NAMES[bus.bus_id] || { plate: bus.bus_id.slice(0, 10), model: 'Fleet Car' };

                  return (
                    <div
                      key={bus.bus_id}
                      onClick={() => setSelectedBusId(bus.bus_id)}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-500/10 border-l-4 border-blue-500'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-800 rounded-lg text-blue-400 border border-slate-700">
                            <Car className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs font-mono text-white">
                              {carInfo.plate}
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              {carInfo.model}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            bus.status === 'moving'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : bus.status === 'stopped'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : bus.status === 'stale'
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {bus.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-slate-500" />
                          <span>{bus.speed_kmh?.toFixed(0) || 0} km/h</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Battery className="w-3 h-3 text-slate-500" />
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

            {/* Main Map View Area */}
            <main className="flex-1 relative">
              <LiveMap />

              {/* Selected Car Floating Detail Card */}
              {selectedBus && (
                <div className="absolute top-4 right-4 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-4 text-xs z-20">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-100 font-mono text-sm">
                          {CAR_NAMES[selectedBus.bus_id]?.plate || selectedBus.bus_id}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          {CAR_NAMES[selectedBus.bus_id]?.model || 'Electric Car'} • Live Telemetry
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedBusId(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status</span>
                      <span className="font-bold uppercase text-emerald-400">{selectedBus.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Speed</span>
                      <span className="font-mono">{selectedBus.speed_kmh?.toFixed(1) || 0} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Battery Level</span>
                      <span className="font-mono">{selectedBus.battery_pct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">GPS Accuracy</span>
                      <span className="font-mono">{selectedBus.accuracy_m?.toFixed(1) || 0} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coordinates</span>
                      <span className="font-mono text-[10px]">
                        {selectedBus.lat.toFixed(5)}, {selectedBus.lng.toFixed(5)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Monotonic Version</span>
                      <span className="font-mono text-emerald-400">rev #{selectedBus.rev}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-500">
                      <span>Last Fix</span>
                      <span>{new Date(selectedBus.recorded_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </>
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
