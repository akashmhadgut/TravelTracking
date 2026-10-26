import React, { useEffect, useState, useCallback } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import {
  RefreshCw,
  Download,
  LogIn,
  LogOut,
  Building2,
  Wifi,
  WifiOff,
  Shield,
} from 'lucide-react';
import { signInWithGooglePopup, signOutUser, auth } from './lib/firebase.ts';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { LiveFleetMapView } from './components/LiveFleetMapView.tsx';
import { FleetAndTripsView } from './components/FleetAndTripsView.tsx';
import { AlertsAndHealthView } from './components/AlertsAndHealthView.tsx';
import { DriverCompanionAndExpoView } from './components/DriverCompanionAndExpoView.tsx';
import { SimulatorAndAuditView } from './components/SimulatorAndAuditView.tsx';
import { formatIstTime } from './utils/formatters.ts';
import type { OperatorRole } from './shared/contracts.ts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
});

type ActiveTab = 'map' | 'fleet' | 'alerts' | 'driver' | 'simulator';

function FleetOperationsWorkspace() {
  const rqClient = useQueryClient();
  const isDriverUrlMode =
    typeof window !== 'undefined' && window.location.search.includes('mode=driver');
  const [activeTab, setActiveTab] = useState<ActiveTab>(isDriverUrlMode ? 'driver' : 'map');
  const [organizationId, setOrganizationId] = useState<number>(1);
  const [operatorRole, setOperatorRole] = useState<OperatorRole>(
    isDriverUrlMode ? 'driver' : 'admin'
  );
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string>('operator-session-token');
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const [isStepping, setIsStepping] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usr) => {
      setFirebaseUser(usr);
      if (usr) {
        try {
          const token = await usr.getIdToken();
          setIdToken(token);
          await fetch('/v1/auth/sync', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'x-organization-id': String(organizationId),
              'x-operator-role': operatorRole,
            },
          });
        } catch {
          // Keep default session token if popup token fails
        }
      } else {
        setIdToken('operator-session-token');
      }
    });
    return () => unsub();
  }, [organizationId, operatorRole]);

  const { data: snapshot, isLoading, error, refetch } = useQuery({
    queryKey: ['live-fleet-snapshot', organizationId, operatorRole],
    queryFn: async () => {
      const res = await fetch('/v1/live/buses', {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'x-organization-id': String(organizationId),
          'x-operator-role': operatorRole,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Could not load bus data`);
      }
      return res.json();
    },
  });

  useEffect(() => {
    const socket = io({
      auth: { organizationId },
      query: { organizationId: String(organizationId) },
      transports: ['polling', 'websocket'],
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('fleet:request_resync', { organizationId });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('fleet:snapshot', (incomingSnapshot) => {
      if (incomingSnapshot?.organization?.id === organizationId && operatorRole !== 'viewer') {
        rqClient.setQueryData(
          ['live-fleet-snapshot', organizationId, operatorRole],
          incomingSnapshot
        );
      }
    });

    setSocketInstance(socket);
    return () => {
      socket.disconnect();
    };
  }, [organizationId, operatorRole, rqClient]);

  const handleManualResync = useCallback(async () => {
    if (socketInstance?.connected) {
      socketInstance.emit('fleet:request_resync', { organizationId });
    }
    await refetch();
  }, [socketInstance, organizationId, refetch]);

  const handleStepSimulation = useCallback(async () => {
    setIsStepping(true);
    try {
      await fetch('/v1/simulator/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
          'x-organization-id': String(organizationId),
          'x-operator-role': operatorRole,
        },
        body: JSON.stringify({ mode: 'LIVE_STEP' }),
      });
      await refetch();
    } finally {
      setIsStepping(false);
    }
  }, [idToken, organizationId, operatorRole, refetch]);

  const handleAcknowledgeAlert = useCallback(
    async (alertId: number) => {
      await fetch(`/v1/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'x-organization-id': String(organizationId),
          'x-operator-role': operatorRole,
        },
      });
      await refetch();
    },
    [idToken, organizationId, operatorRole, refetch]
  );

  const handleSendWakeupPing = useCallback(
    async (deviceId: number) => {
      await fetch(`/v1/devices/${deviceId}/wakeup`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'x-organization-id': String(organizationId),
          'x-operator-role': operatorRole,
        },
      });
      await refetch();
    },
    [idToken, organizationId, operatorRole, refetch]
  );

  const handleExportCsv = useCallback(
    async (reportType: 'fleet' | 'alerts' | 'quarantine' | 'devices' = 'fleet') => {
      const res = await fetch(`/v1/exports/locations.csv?type=${reportType}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'x-organization-id': String(organizationId),
          'x-operator-role': operatorRole,
        },
      });
      if (!res.ok) return;
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `fleetcommand_org_${organizationId}_${reportType}_report.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      await refetch();
    },
    [idToken, organizationId, operatorRole, refetch]
  );

  const openAlertsCount = (snapshot?.alerts || []).filter((a: any) => a.status === 'open').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation Bar — Fits cleanly at 760px+ preview width with zero scrollbar */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-b border-slate-200">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('map');
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          FleetCommand
        </a>

        <nav className="flex items-center gap-3 lg:gap-5 text-xs lg:text-sm font-medium text-slate-600 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'map'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                : 'hover:text-slate-900'
            }`}
          >
            Live Map
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'fleet'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                : 'hover:text-slate-900'
            }`}
          >
            Buses &amp; Trips
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'alerts'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                : 'hover:text-slate-900'
            }`}
          >
            Alerts ({openAlertsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('driver')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'driver'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                : 'hover:text-slate-900'
            }`}
          >
            Driver App
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'simulator'
                ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                : 'hover:text-slate-900'
            }`}
          >
            Tests &amp; Cost
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleExportCsv('fleet')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Report</span>
          </button>
        </div>
      </header>

      {/* Secondary Toolbar — Balanced single-row / clean wrap without stray separators */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-medium text-slate-700">Company:</span>
            <select
              aria-label="Select company"
              value={organizationId}
              onChange={(e) => setOrganizationId(Number(e.target.value))}
              className="px-2 py-1 text-xs font-medium bg-white border border-slate-200 rounded text-slate-900 max-w-[210px] truncate"
            >
              <option value={1}>Deccan Metro Transit (Pune)</option>
              <option value={2}>Konkan Coastal Express</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-medium text-slate-700">Role:</span>
            <select
              aria-label="Select user role"
              value={operatorRole}
              onChange={(e) => {
                const nextRole = e.target.value as OperatorRole;
                setOperatorRole(nextRole);
                if (nextRole === 'driver') {
                  setActiveTab('driver');
                }
              }}
              className="px-2 py-1 text-xs font-medium bg-white border border-slate-200 rounded text-slate-900 max-w-[200px] truncate"
            >
              <option value="admin">Admin — Full Control</option>
              <option value="supervisor">Supervisor — Manage Trips</option>
              <option value="dispatcher">Dispatcher — Assign Buses</option>
              <option value="viewer">Viewer — Read Only</option>
              <option value="driver">Driver — Mobile App</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-mono tabular-nums text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200">
            {socketConnected ? (
              <Wifi className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-600 shrink-0" />
            )}
            <span className={socketConnected ? 'text-emerald-700 font-medium' : 'text-amber-700'}>
              {socketConnected ? 'Live' : 'Sync'}
            </span>
            <span className="text-slate-300">|</span>
            <span>{formatIstTime(snapshot?.generatedAt)}</span>
          </div>

          <button
            type="button"
            onClick={handleManualResync}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>

          {firebaseUser ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-700 font-mono text-[11px] truncate max-w-[140px]">
                {firebaseUser.email}
              </span>
              <button
                type="button"
                onClick={() => signOutUser()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signInWithGooglePopup().catch(() => {})}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3 h-3" />
              <span>Google Sign-In</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-4 h-[520px] bg-white border border-slate-200 rounded-lg p-4 space-y-3 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/2" />
              <div className="h-10 bg-slate-100 rounded" />
              <div className="h-20 bg-slate-100 rounded" />
              <div className="h-20 bg-slate-100 rounded" />
            </div>
            <div className="md:col-span-8 h-[520px] bg-white border border-slate-200 rounded-lg p-4 animate-pulse" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
            <p className="font-bold">Could not load live bus data</p>
            <p className="mt-1 text-xs">{(error as Error).message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-red-700 rounded-md cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'map' && (
              <LiveFleetMapView
                snapshot={snapshot}
                onStepSimulation={handleStepSimulation}
                onSendWakeupPing={handleSendWakeupPing}
                isStepping={isStepping}
              />
            )}

            {activeTab === 'fleet' && (
              <FleetAndTripsView
                snapshot={snapshot}
                organizationId={organizationId}
                operatorRole={operatorRole}
                onRefresh={async () => {
                  await refetch();
                }}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertsAndHealthView
                snapshot={snapshot}
                organizationId={organizationId}
                onAcknowledgeAlert={handleAcknowledgeAlert}
                onSendWakeupPing={handleSendWakeupPing}
              />
            )}

            {activeTab === 'driver' && (
              <DriverCompanionAndExpoView
                snapshot={snapshot}
                organizationId={organizationId}
                onRefresh={async () => {
                  await refetch();
                }}
              />
            )}

            {activeTab === 'simulator' && (
              <SimulatorAndAuditView
                snapshot={snapshot}
                organizationId={organizationId}
                onRefresh={async () => {
                  await refetch();
                }}
                onExportCsv={handleExportCsv}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3.5 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div>FleetCommand — Live Bus Tracking &amp; Fleet Management System</div>
        <div className="flex items-center gap-4">
          <a
            href="/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-900 underline"
          >
            API Documentation
          </a>
          <span>·</span>
          <span>DPDP Act 2023 &amp; AIS-140 Compliant</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FleetOperationsWorkspace />
    </QueryClientProvider>
  );
}
