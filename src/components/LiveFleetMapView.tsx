import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  BatteryCharging,
  BatteryWarning,
  ShieldAlert,
  Play,
  History,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { formatIstTime, formatAgeDuration, getStatusMeta } from '../utils/formatters.ts';

interface LiveFleetMapViewProps {
  snapshot: any;
  onStepSimulation: () => Promise<void>;
  onSendWakeupPing: (deviceId: number) => Promise<void>;
  isStepping: boolean;
}

const BOUNDS = {
  minLng: 73.66,
  maxLng: 73.97,
  minLat: 18.43,
  maxLat: 18.69,
};

function projectToSvg(lng: number, lat: number, width = 900, height = 420) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * (width - 100) + 50;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * (height - 80) + 40;
  return { x, y };
}

export const LiveFleetMapView: React.FC<LiveFleetMapViewProps> = ({
  snapshot,
  onStepSimulation,
  onSendWakeupPing,
  isStepping,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBusId, setSelectedBusId] = useState<number>(1);
  const [historyPoints, setHistoryPoints] = useState<any[]>([]);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);

  const buses: any[] = snapshot?.buses || [];
  const routes: any[] = snapshot?.routes || [];

  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      const matchesStatus = statusFilter === 'all' || bus.trackingStatus === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesStatus;
      const matchesSearch =
        bus.registrationNumber.toLowerCase().includes(q) ||
        bus.fleetCode.toLowerCase().includes(q) ||
        (bus.driver?.fullName || '').toLowerCase().includes(q) ||
        (bus.route?.routeCode || '').toLowerCase().includes(q) ||
        (bus.depotName || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [buses, statusFilter, searchQuery]);

  const selectedBus = useMemo(
    () => buses.find((b) => b.id === selectedBusId) || filteredBuses[0] || buses[0] || null,
    [buses, filteredBuses, selectedBusId]
  );

  useEffect(() => {
    if (!selectedBus?.id) return;
    let cancelled = false;
    setLoadingHistory(true);
    fetch(`/v1/buses/${selectedBus.id}/history`, {
      headers: {
        Authorization: 'Bearer operator-session-token',
        'x-organization-id': String(snapshot?.organization?.id || 1),
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setHistoryPoints(data.points || []);
          setReplayIndex(null);
          setLoadingHistory(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBus?.id, snapshot?.generatedAt]);

  const counts = useMemo(() => {
    const c = { all: buses.length, fresh: 0, stale: 0, offline: 0, not_started: 0 };
    for (const b of buses) {
      if (b.trackingStatus === 'fresh') c.fresh++;
      else if (b.trackingStatus === 'stale') c.stale++;
      else if (b.trackingStatus === 'offline') c.offline++;
      else if (b.trackingStatus === 'not_started') c.not_started++;
    }
    return c;
  }, [buses]);

  const activeReplayPoint =
    replayIndex !== null && historyPoints[replayIndex] ? historyPoints[replayIndex] : null;

  const routeColors = ['#2563eb', '#0d9488', '#7c3aed', '#ea580c'];

  return (
    <div className="space-y-5">
      {/* Top Summary Strip — 5 balanced columns at 640px+ (sm:grid-cols-5) with crisp borders and zero orphan cells */}
      <div className="grid grid-cols-2 sm:grid-cols-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-3.5 border-b sm:border-b-0 border-r border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Total Buses</div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {counts.all} <span className="text-xs font-normal text-slate-500">buses</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Updates every 5 sec
          </div>
        </div>
        <div className="p-3.5 border-b sm:border-b-0 sm:border-r border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Live Now</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {counts.fresh}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Updated ≤ 1 min</div>
        </div>
        <div className="p-3.5 border-b sm:border-b-0 border-r border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Delayed Signal</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-amber-700 font-mono tabular-nums">
            {counts.stale}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">1–5 min old</div>
        </div>
        <div className="p-3.5 border-b sm:border-b-0 sm:border-r border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Offline</span>
            <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-red-700 font-mono tabular-nums">
            {counts.offline}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">No update &gt; 5 min</div>
        </div>
        <div className="p-3.5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Late Start</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-red-700 font-mono tabular-nums">
            {counts.not_started}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Delayed &gt; 10 min</div>
        </div>
      </div>

      {/* Main 12-Column Split at md (768px+): Bus List (4 cols) + Map & Details (8 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left Column: Search, Filter Tabs, and Bus List */}
        <div className="md:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">All Buses</h2>
              <button
                type="button"
                onClick={onStepSimulation}
                disabled={isStepping}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isStepping ? 'animate-spin' : ''}`} />
                <span>Move Buses (5s)</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Search buses by number, driver, or route"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bus number, driver..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-md">
              {[
                { key: 'all', label: `All (${counts.all})` },
                { key: 'fresh', label: `Live (${counts.fresh})` },
                { key: 'stale', label: `Slow (${counts.stale})` },
                { key: 'offline', label: `Off (${counts.offline})` },
                { key: 'not_started', label: `Late (${counts.not_started})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-1 py-1 text-[10px] font-medium rounded text-center transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === tab.key
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-200 max-h-[540px] overflow-y-auto">
            {filteredBuses.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-slate-900">No buses found</p>
                <p className="mt-1 text-xs text-slate-500">
                  Clear your search or filter to see all buses.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 cursor-pointer"
                >
                  Show All Buses
                </button>
              </div>
            ) : (
              filteredBuses.map((bus) => {
                const meta = getStatusMeta(bus.trackingStatus);
                const isSelected = selectedBus?.id === bus.id;
                return (
                  <button
                    key={bus.id}
                    type="button"
                    onClick={() => setSelectedBusId(bus.id)}
                    className={`w-full text-left p-3 transition-colors hover:bg-slate-50 cursor-pointer ${
                      isSelected ? 'bg-slate-50 ring-1 ring-inset ring-slate-900/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-slate-900 truncate">
                          {bus.registrationNumber}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-[11px] text-slate-600 font-mono shrink-0">
                          {bus.fleetCode}
                        </span>
                      </div>
                      <span className={`text-[11px] font-medium shrink-0 ${meta.textClass}`}>
                        {meta.shortLabel}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-600 truncate">
                      {bus.route ? `${bus.route.routeCode}: ${bus.route.name}` : 'No Route Assigned'}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                      <span>
                        {bus.trackingStatus === 'fresh'
                          ? `${Math.round(bus.latestLocation?.speedKmh || 0)} km/h`
                          : 'Last seen'}
                        {' · '}
                        {formatAgeDuration(bus.ageSeconds)}
                      </span>
                      <span className="truncate ml-2">
                        {bus.device?.manufacturer} · {bus.device?.batteryPct ?? 85}%
                        {bus.device?.isCharging ? ' ⚡' : ''}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Map + Selected Bus Details & Trip Replay */}
        <div className="md:col-span-8 space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Live Bus Map (Pune — Pimpri — Hinjewadi — Kharadi)
                </h2>
                <p className="text-xs text-slate-500">
                  Click any bus on the map to see its driver, speed, phone battery, and past route
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> Live
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> Delayed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-600 inline-block" /> Offline
                </span>
              </div>
            </div>

            <div
              className="relative h-[380px] sm:h-[420px] w-full bg-[#f4f6f9] overflow-hidden select-none"
              data-testid="live-fleet-map"
            >
              <svg
                viewBox="0 0 900 420"
                className="w-full h-full transition-transform duration-200"
                style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
              >
                <defs>
                  <pattern id="corridor-grid" width="45" height="45" patternUnits="userSpaceOnUse">
                    <path
                      d="M 45 0 L 0 0 0 45"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>

                <rect width="900" height="420" fill="url(#corridor-grid)" />

                <path
                  d="M 40 165 Q 240 190, 410 235 T 790 250 L 890 265"
                  fill="none"
                  stroke="#bae6fd"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M 320 40 Q 380 140, 430 235"
                  fill="none"
                  stroke="#bae6fd"
                  strokeWidth="11"
                  strokeLinecap="round"
                />

                <path
                  d="M 110 20 L 290 155 L 355 280 L 580 395"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="6"
                />
                <path
                  d="M 80 230 L 490 245 L 850 185"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="5"
                />

                <g className="text-[10px] font-mono fill-slate-400 font-semibold">
                  <text x="65" y="140">HINJEWADI IT PARK</text>
                  <text x="310" y="65">NIGDI / PCMC MIDC</text>
                  <text x="485" y="275">SHIVAJINAGAR / STATION</text>
                  <text x="710" y="165">KHARADI EON HUB</text>
                  <text x="530" y="385">KATRAJ TERMINAL</text>
                  <text x="640" y="295">HADAPSAR MAGARPATTA</text>
                </g>

                {routes.map((route: any, rIdx: number) => {
                  const poly: [number, number][] = route.polyline || [];
                  if (poly.length === 0) return null;
                  const pts = poly
                    .map(([lng, lat]) => {
                      const p = projectToSvg(lng, lat);
                      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                    })
                    .join(' ');
                  const color = routeColors[rIdx % routeColors.length];
                  const isSelectedRoute = selectedBus?.route?.id === route.id;

                  return (
                    <g key={route.id}>
                      <polyline
                        points={pts}
                        fill="none"
                        stroke={color}
                        strokeWidth={isSelectedRoute ? 4.5 : 2.5}
                        strokeOpacity={isSelectedRoute ? 0.9 : 0.45}
                        strokeDasharray={isSelectedRoute ? 'none' : '6 4'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {(route.stops || []).map((stop: any, sIdx: number) => {
                        const sp = projectToSvg(stop.lng, stop.lat);
                        return (
                          <g key={`${route.id}-stop-${sIdx}`}>
                            <circle
                              cx={sp.x}
                              cy={sp.y}
                              r={isSelectedRoute ? 4.5 : 3}
                              fill="#ffffff"
                              stroke={color}
                              strokeWidth="2"
                            />
                            {isSelectedRoute && (
                              <text
                                x={sp.x + 7}
                                y={sp.y + 3}
                                className="text-[10px] fill-slate-700 font-medium"
                              >
                                {stop.name}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {historyPoints.length > 1 && (
                  <polyline
                    points={historyPoints
                      .map((hp) => {
                        const p = projectToSvg(hp.longitude, hp.latitude);
                        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                )}
              </svg>

              {filteredBuses.map((bus) => {
                if (!bus.latestLocation) return null;
                const isSelected = selectedBus?.id === bus.id;
                const replayPt =
                  isSelected && replayIndex !== null && historyPoints[replayIndex]
                    ? historyPoints[replayIndex]
                    : null;

                const lat = replayPt ? replayPt.latitude : bus.latestLocation.latitude;
                const lng = replayPt ? replayPt.longitude : bus.latestLocation.longitude;
                const pos = projectToSvg(lng, lat);
                const leftPct = (pos.x / 900) * 100;
                const topPct = (pos.y / 420) * 100;
                const meta = getStatusMeta(bus.trackingStatus);

                return (
                  <button
                    key={bus.id}
                    type="button"
                    aria-label={`Select bus ${bus.registrationNumber}`}
                    onClick={() => setSelectedBusId(bus.id)}
                    style={{
                      left: `${Math.min(92, Math.max(8, leftPct))}%`,
                      top: `${Math.min(86, Math.max(10, topPct))}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-mono font-semibold shadow-xs transition-transform cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 scale-110 z-20'
                        : 'bg-white text-slate-900 border-slate-300 hover:border-slate-900 z-10'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: meta.dotColor }}
                    />
                    <span>{bus.fleetCode}</span>
                  </button>
                );
              })}

              {/* Zoom Controls */}
              <div className="absolute top-3 right-3 flex flex-col bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden z-20">
                <button
                  type="button"
                  aria-label="Zoom in map"
                  onClick={() => setZoomScale((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))}
                  className="p-2 hover:bg-slate-50 text-slate-700 border-b border-slate-200 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Zoom out map"
                  onClick={() => setZoomScale((z) => Math.max(0.85, +(z - 0.15).toFixed(2)))}
                  className="p-2 hover:bg-slate-50 text-slate-700 border-b border-slate-200 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Reset map zoom"
                  onClick={() => setZoomScale(1)}
                  className="p-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Selected Bus Floating Card */}
              {selectedBus && (
                <div className="absolute bottom-3 left-3 max-w-xs bg-white/95 backdrop-blur-xs border border-slate-200 rounded-md p-2.5 shadow-xs z-20">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {selectedBus.registrationNumber}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        getStatusMeta(selectedBus.trackingStatus).textClass
                      }`}
                    >
                      {getStatusMeta(selectedBus.trackingStatus).label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600 truncate">
                    Driver: {selectedBus.driver?.fullName || 'Unassigned'} (
                    {selectedBus.driver?.phone || '—'})
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-700 tabular-nums">
                    {activeReplayPoint ? (
                      <>
                        PAST REPLAY: {activeReplayPoint.latitude.toFixed(4)}°N,{' '}
                        {activeReplayPoint.longitude.toFixed(4)}°E ·{' '}
                        {Math.round(activeReplayPoint.speedKmh)} km/h
                      </>
                    ) : (
                      <>
                        {selectedBus.latestLocation?.latitude?.toFixed(4)}°N,{' '}
                        {selectedBus.latestLocation?.longitude?.toFixed(4)}°E ·{' '}
                        {selectedBus.trackingStatus === 'fresh'
                          ? `${Math.round(selectedBus.latestLocation?.speedKmh || 0)} km/h`
                          : 'Last Seen Here'}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Bus Details & Past Route Replay */}
          {selectedBus && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Selected Bus Details</span>
                    <span>·</span>
                    <span className="font-mono">{selectedBus.fleetCode}</span>
                    <span>·</span>
                    <span>{selectedBus.depotName}</span>
                  </div>
                  <h3 className="mt-0.5 text-sm sm:text-base font-bold text-slate-900">
                    {selectedBus.registrationNumber} — {selectedBus.route?.name || 'Standby'}
                  </h3>
                </div>

                {selectedBus.device && (
                  <button
                    type="button"
                    onClick={() => onSendWakeupPing(selectedBus.device.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Wake Up Driver Phone</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80">
                  <div className="text-slate-500">Status &amp; GPS Type</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {getStatusMeta(selectedBus.trackingStatus).label}
                  </div>
                  <div className="text-slate-500 font-mono mt-0.5 text-[11px]">
                    {selectedBus.locationSourceType === 'AIS140_VLTD'
                      ? 'AIS-140 Vehicle Box'
                      : 'Driver Android Phone'}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80">
                  <div className="text-slate-500">Last Update Time (IST)</div>
                  <div className="mt-1 font-mono text-slate-900 tabular-nums">
                    GPS: {formatIstTime(selectedBus.latestLocation?.recordedAt)}
                  </div>
                  <div className="text-slate-500 font-mono tabular-nums mt-0.5 text-[11px]">
                    Rcvd: {formatIstTime(selectedBus.latestLocation?.receivedAt)}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80">
                  <div className="text-slate-500">Phone in Bus</div>
                  <div className="mt-1 font-semibold text-slate-900 truncate">
                    {selectedBus.device
                      ? `${selectedBus.device.manufacturer} ${selectedBus.device.model}`
                      : 'No Phone Assigned'}
                  </div>
                  <div className="text-slate-500 mt-0.5 text-[11px] truncate">
                    {selectedBus.device?.osVersion}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80">
                  <div className="text-slate-500">Battery &amp; Charger</div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono font-semibold text-slate-900 tabular-nums">
                    {selectedBus.device?.isCharging ? (
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <BatteryWarning className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {selectedBus.device?.batteryPct ?? 85}% ·{' '}
                      {selectedBus.device?.isCharging ? 'Plugged' : 'Unplugged'}
                    </span>
                  </div>
                  <div className="text-slate-500 mt-0.5 font-mono text-[11px]">
                    Wake-ups sent: {selectedBus.device?.wakeupPingsSent ?? 0}
                  </div>
                </div>
              </div>

              {/* Past Route Replay Scrubber */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <History className="w-3.5 h-3.5 text-slate-600" />
                    <span>
                      Past Route Replay ({historyPoints.length} saved GPS points)
                    </span>
                  </div>
                  {replayIndex !== null ? (
                    <button
                      type="button"
                      onClick={() => setReplayIndex(null)}
                      className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                    >
                      Back to Live View
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Drag slider to replay earlier locations
                    </span>
                  )}
                </div>

                {loadingHistory ? (
                  <div className="h-8 bg-slate-100 rounded animate-pulse" />
                ) : historyPoints.length > 0 ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setReplayIndex((prev) =>
                          prev === null || prev >= historyPoints.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Play className="w-3 h-3" />
                      <span>Next Point</span>
                    </button>
                    <input
                      type="range"
                      aria-label="Trip history replay scrubber"
                      min={0}
                      max={Math.max(0, historyPoints.length - 1)}
                      value={replayIndex !== null ? replayIndex : historyPoints.length - 1}
                      onChange={(e) => setReplayIndex(Number(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap shrink-0">
                      {replayIndex !== null
                        ? `Point ${replayIndex + 1}/${historyPoints.length} · ${formatIstTime(
                            historyPoints[replayIndex]?.recordedAt
                          )}`
                        : 'Live Now'}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No past route points saved for this bus yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
