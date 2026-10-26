import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Wifi,
  WifiOff,
  UploadCloud,
  ShieldAlert,
  Copy,
  Check,
  Code2,
  LocateFixed,
  Languages,
  UserCheck,
  Download,
  Play,
  Square,
  Share2,
} from 'lucide-react';
import { EXPO_DRIVER_APP_FILES } from '../shared/expoDriverTemplate.ts';
import { formatIstTime } from '../utils/formatters.ts';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface DriverCompanionAndExpoViewProps {
  snapshot: any;
  organizationId: number;
  onRefresh: () => Promise<void>;
}

const OFFLINE_STORAGE_KEY = 'fleetcommand_driver_sqlite_queue_v1';

export const DriverCompanionAndExpoView: React.FC<DriverCompanionAndExpoViewProps> = ({
  snapshot,
  organizationId,
  onRefresh,
}) => {
  const buses: any[] = snapshot?.buses || [];
  const drivers: any[] = snapshot?.drivers || [];
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const [selectedDriverId, setSelectedDriverId] = useState<number>(drivers[0]?.id || 1);
  const [selectedBusId, setSelectedBusId] = useState<number>(buses[0]?.id || 1);
  const [showDpdpBilingualNotice, setShowDpdpBilingualNotice] = useState<boolean>(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState<boolean>(false);
  const [copiedDriverUrl, setCopiedDriverUrl] = useState<boolean>(false);

  const [autoStreamingGps, setAutoStreamingGps] = useState<boolean>(false);

  // Quick Pre-Trip Check state
  const [checkMounted, setCheckMounted] = useState(true);
  const [checkCharging, setCheckCharging] = useState(true);
  const [checkGpsFixed, setCheckGpsFixed] = useState(true);
  const [checkOemBattery, setCheckOemBattery] = useState(true);

  // Driver App simulation controls
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [nightHudKeepAwake] = useState(true);
  const [mockLocationToggle, setMockLocationToggle] = useState(false);
  const [batteryPct, setBatteryPct] = useState(92);
  const [isCharging, setIsCharging] = useState(true);

  const [localQueue, setLocalQueue] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(localQueue));
    } catch {
      // Ignore storage quota errors
    }
  }, [localQueue]);

  const [lastIngestResult, setLastIngestResult] = useState<any | null>(null);
  const [incidentNotes, setIncidentNotes] = useState('');
  const [incidentType, setIncidentType] = useState('TRAFFIC_GRIDLOCK');
  const [incidentBanner, setIncidentBanner] = useState<string | null>(null);

  const [selectedExpoFileIdx, setSelectedExpoFileIdx] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const activeBus = buses.find((b) => b.id === selectedBusId) || buses[0];
  const activeDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];
  const allChecksPassed = checkMounted && checkCharging && checkGpsFixed && checkOemBattery;

  const directDriverAppUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/?mode=driver` : '/?mode=driver';

  const generatePointPayload = (
    overrideOutOfOrder = false,
    realCoords?: { latitude: number; longitude: number; accuracy: number; speed: number | null }
  ) => {
    const baseLat =
      realCoords?.latitude ??
      (activeBus?.latestLocation?.latitude ?? 18.5913) + (Math.random() - 0.45) * 0.0018;
    const baseLng =
      realCoords?.longitude ??
      (activeBus?.latestLocation?.longitude ?? 73.7389) + (Math.random() - 0.45) * 0.0018;
    const recTime = overrideOutOfOrder
      ? new Date(Date.now() - 180_000).toISOString()
      : new Date().toISOString();

    return {
      clientPointId: `drv-pt-${activeBus?.id || 1}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      recordedAt: recTime,
      latitude: mockLocationToggle ? baseLat + 0.09 : baseLat,
      longitude: mockLocationToggle ? baseLng + 0.09 : baseLng,
      accuracyM: realCoords?.accuracy ?? (mockLocationToggle ? 2.1 : 5.4),
      speedKmh: mockLocationToggle
        ? 165
        : realCoords?.speed
        ? Math.max(12, Math.round(realCoords.speed * 3.6))
        : 42,
      headingDeg: 112,
      isMockLocation: mockLocationToggle,
      batteryPct,
      isCharging,
      networkType: isOfflineMode ? 'OFFLINE_SQLITE_QUEUE' : '4G_LTE',
      source: 'ANDROID_FOREGROUND_GPS' as const,
    };
  };

  const handleCaptureOrSendPoint = async (
    overrideOutOfOrder = false,
    realCoords?: { latitude: number; longitude: number; accuracy: number; speed: number | null }
  ) => {
    if (!activeBus) return;
    const newPoint = generatePointPayload(overrideOutOfOrder, realCoords);

    if (isOfflineMode) {
      setLocalQueue((prev) => [...prev, newPoint]);
      setLastIngestResult({
        offlineQueued: true,
        message: `No Internet: Location saved safely on phone (${
          localQueue.length + 1
        } points waiting to upload when internet returns).`,
      });
      return;
    }

    const pointsToUpload = [...localQueue, newPoint];
    const res = await fetch('/v1/ingest/locations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer device-token-${activeBus.device?.deviceUid || 'DEV-XIAOMI-R12-001'}`,
        'x-organization-id': String(organizationId),
      },
      body: JSON.stringify({
        deviceUid: activeBus.device?.deviceUid || 'DEV-XIAOMI-R12-001',
        tripId: activeBus.activeTrip?.id || 1,
        busId: activeBus.id,
        points: pointsToUpload,
      }),
    });

    const data = await res.json();
    setLastIngestResult(data);
    if (res.ok) {
      setLocalQueue([]);
      await onRefresh();
    }
  };

  useEffect(() => {
    if (!autoStreamingGps || !allChecksPassed) return;

    let wakeLockSentinel: any = null;
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock
        .request('screen')
        .then((s: any) => {
          wakeLockSentinel = s;
        })
        .catch(() => {});
    }

    const timer = setInterval(() => {
      handleCaptureOrSendPoint(false);
    }, 5000);

    return () => {
      clearInterval(timer);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [autoStreamingGps, allChecksPassed, selectedBusId, isOfflineMode, mockLocationToggle]);

  const handleUseRealBrowserGps = () => {
    if (!navigator.geolocation) {
      handleCaptureOrSendPoint(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleCaptureOrSendPoint(false, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 6.5,
          speed: pos.coords.speed,
        });
      },
      () => {
        handleCaptureOrSendPoint(false);
      },
      { enableHighAccuracy: true, timeout: 4000 }
    );
  };

  const handleFlushOfflineQueue = async () => {
    if (!activeBus || localQueue.length === 0) return;
    setIsOfflineMode(false);
    const res = await fetch('/v1/ingest/locations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer device-token-${activeBus.device?.deviceUid || 'DEV-XIAOMI-R12-001'}`,
        'x-organization-id': String(organizationId),
      },
      body: JSON.stringify({
        deviceUid: activeBus.device?.deviceUid || 'DEV-XIAOMI-R12-001',
        tripId: activeBus.activeTrip?.id || 1,
        busId: activeBus.id,
        points: localQueue,
      }),
    });
    const data = await res.json();
    setLastIngestResult(data);
    if (res.ok) {
      setLocalQueue([]);
      await onRefresh();
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBus || !incidentNotes.trim()) return;
    const res = await fetch('/v1/incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer operator-session-token',
        'x-organization-id': String(organizationId),
      },
      body: JSON.stringify({
        busId: activeBus.id,
        tripId: activeBus.activeTrip?.id,
        severity:
          incidentType === 'MEDICAL_EMERGENCY' || incidentType === 'MECHANICAL_BREAKDOWN'
            ? 'critical'
            : 'warning',
        incidentType,
        notes: incidentNotes,
      }),
    });
    if (res.ok) {
      setIncidentBanner(`Problem reported to Control Room (${incidentType}).`);
      setIncidentNotes('');
      await onRefresh();
    }
  };

  const handleCopyCode = (idx: number, code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleCopyDriverUrl = () => {
    navigator.clipboard?.writeText(directDriverAppUrl);
    setCopiedDriverUrl(true);
    setTimeout(() => setCopiedDriverUrl(false), 2000);
  };

  const handleDownloadArchive = async (filename: 'mobile-driver-app.tar.gz' | 'deploy-bundle.tar.gz') => {
    const res = await fetch(`/v1/downloads/${filename}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Top Download & Mobile Installation Hub */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Get the Driver App on Your Phone
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Download the Android app files to build an APK, or install the mobile web app directly on your phone after clicking Deploy/Share.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadArchive('mobile-driver-app.tar.gz')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Android App (.tar.gz)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadArchive('deploy-bundle.tar.gz')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Server Setup Files</span>
            </button>

            {!isInstalled && (
              <button
                type="button"
                onClick={async () => {
                  if (isInstallable) {
                    await install();
                  } else {
                    setShowInstallGuideModal((prev) => !prev);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>
                  {isInstallable
                    ? 'Install Driver App'
                    : 'How to Install on Phone'}
                </span>
              </button>
            )}
          </div>
        </div>

        {showInstallGuideModal && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="font-bold text-slate-900">
                Option 1: Install on Your Phone via Chrome (After Clicking Deploy/Share)
              </div>
              <p className="text-slate-600">
                1. Click the <strong>Deploy / Share</strong> button in the top-right corner of Google AI Studio.<br />
                2. Open this link in Chrome on your phone and tap <strong>Install App / Add to Home Screen</strong>:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={directDriverAppUrl}
                  className="flex-1 px-2.5 py-1.5 font-mono text-[11px] bg-white border border-slate-200 rounded"
                />
                <button
                  type="button"
                  onClick={handleCopyDriverUrl}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer"
                >
                  {copiedDriverUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-slate-600">
                {isIOS
                  ? 'On iPhone Safari: Tap Share → "Add to Home Screen".'
                  : 'On Android Chrome: Tap the 3-dot menu (⋮) → "Install app".'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 text-slate-100 rounded-md font-mono text-[11px] space-y-1.5">
              <div className="text-emerald-400 font-semibold">
                Option 2: Create an Android `.apk` File from the Downloaded File
              </div>
              <div>$ tar -xzf mobile-driver-app.tar.gz &amp;&amp; cd mobile-driver-app</div>
              <div>$ npm install</div>
              <div>$ npx eas-cli build -p android --profile preview</div>
              <div className="text-slate-400">
                # Gives you a direct Android .apk file to install on any phone
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left 5 Cols: Driver Mobile Screen */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Driver Mobile Screen (Live Working App)
              </h2>
              <p className="text-xs text-slate-500">
                Use this screen on a phone or computer to send live GPS updates to the map
              </p>
            </div>
            <Smartphone className="w-4 h-4 text-slate-600" />
          </div>

          <div className="p-4 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Driver
                </label>
                <select
                  aria-label="Select driver"
                  value={selectedDriverId}
                  onChange={(e) => {
                    const drvId = Number(e.target.value);
                    setSelectedDriverId(drvId);
                    const matchingBus = buses.find((b) => b.driver?.id === drvId);
                    if (matchingBus) setSelectedBusId(matchingBus.id);
                  }}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-md bg-slate-50"
                >
                  {drivers.slice(0, 15).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.employeeCode} · {d.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Bus &amp; Phone
                </label>
                <select
                  aria-label="Select bus and phone"
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(Number(e.target.value))}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-md bg-slate-50"
                >
                  {buses.slice(0, 15).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.registrationNumber} · {b.device?.manufacturer}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bilingual Privacy Notice */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Driver Privacy Notice ({activeDriver?.employeeCode})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDpdpBilingualNotice((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 underline cursor-pointer"
                >
                  <Languages className="w-3 h-3" />
                  <span>{showDpdpBilingualNotice ? 'Hide Notice' : 'Read in English / मराठी'}</span>
                </button>
              </div>

              {showDpdpBilingualNotice && (
                <div className="text-[11px] text-slate-700 space-y-1.5 pt-1 border-t border-slate-200">
                  <p>
                    <strong>English:</strong> Your location and phone battery are shared ONLY while your bus trip is active. Tracking stops as soon as you end the trip. Help contact: {snapshot?.organization?.grievanceOfficerEmail}.
                  </p>
                  <p>
                    <strong>मराठी / हिंदी:</strong> तुमचे जीपीएस लोकेशन आणि बॅटरी माहिती फक्त चालू बस फेरी (Active Trip) दरम्यानच घेतली जाते. फेरी संपल्यावर ट्रॅकिंग लगेच बंद होते.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Pre-Trip Check */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  Quick Check Before Starting Trip (30 Seconds)
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {allChecksPassed ? 'READY TO GO' : 'CHECK ITEMS'}
                </span>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkMounted}
                  onChange={(e) => setCheckMounted(e.target.checked)}
                  className="accent-slate-900"
                />
                <span>1. Phone is fixed in the dashboard holder</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkCharging}
                  onChange={(e) => setCheckCharging(e.target.checked)}
                  className="accent-slate-900"
                />
                <span>2. Charger cable is plugged in and charging</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkGpsFixed}
                  onChange={(e) => setCheckGpsFixed(e.target.checked)}
                  className="accent-slate-900"
                />
                <span>3. Phone GPS location is turned ON</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkOemBattery}
                  onChange={(e) => setCheckOemBattery(e.target.checked)}
                  className="accent-slate-900"
                />
                <span>
                  4. Battery saver is turned OFF for this app ({activeBus?.device?.manufacturer || 'Phone'})
                </span>
              </label>
            </div>

            {/* Driver Screen Display */}
            <div
              className={`p-4 rounded-md border transition-colors ${
                nightHudKeepAwake
                  ? 'bg-slate-950 text-white border-slate-800'
                  : 'bg-slate-100 text-slate-900 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-emerald-400">
                  {autoStreamingGps
                    ? 'AUTO GPS SENDING EVERY 5 SEC'
                    : 'LIVE GPS TRACKING READY'}
                </span>
                <span className="font-mono text-[11px] opacity-80">
                  {isOfflineMode ? 'NO INTERNET (SAVING ON PHONE)' : 'INTERNET CONNECTED'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono tabular-nums">
                <div>
                  <div className="text-[11px] opacity-60">SPEED</div>
                  <div className="text-lg font-bold">
                    {Math.round(activeBus?.latestLocation?.speedKmh || 42)} km/h
                  </div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60">SAVED OFFLINE</div>
                  <div className="text-lg font-bold">{localQueue.length} pts</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60">BATTERY</div>
                  <div className="text-lg font-bold">
                    {batteryPct}% {isCharging ? '⚡' : ''}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono opacity-80">
                <span>Phone: {activeBus?.device?.deviceUid}</span>
                <span>Last Sent: {formatIstTime(activeBus?.latestLocation?.recordedAt)}</span>
              </div>
            </div>

            {/* Driver Action Buttons */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                disabled={!allChecksPassed}
                onClick={() => setAutoStreamingGps((prev) => !prev)}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-md cursor-pointer ${
                  autoStreamingGps
                    ? 'bg-red-700 hover:bg-red-800 text-white'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                {autoStreamingGps ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop Auto GPS Tracking</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Auto GPS Tracking (Sends Every 5 Seconds)</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIsOfflineMode((prev) => !prev)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 font-medium rounded-md border cursor-pointer ${
                    isOfflineMode
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                  <span>{isOfflineMode ? 'Internet: OFF (Offline)' : 'Internet: ON'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMockLocationToggle((prev) => !prev)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 font-medium rounded-md border cursor-pointer ${
                    mockLocationToggle
                      ? 'bg-red-50 border-red-300 text-red-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{mockLocationToggle ? 'Test Fake GPS: ON' : 'Test Fake GPS: OFF'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <label className="flex items-center gap-1.5 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={isCharging}
                    onChange={(e) => setIsCharging(e.target.checked)}
                    className="accent-slate-900"
                  />
                  <span>Charger Plugged In</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Battery: {batteryPct}%</span>
                  <input
                    type="range"
                    aria-label="Simulated device battery level"
                    min={10}
                    max={100}
                    value={batteryPct}
                    onChange={(e) => setBatteryPct(Number(e.target.value))}
                    className="w-24 accent-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={!allChecksPassed}
                  onClick={() => handleCaptureOrSendPoint(false)}
                  className="px-3 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-md cursor-pointer"
                >
                  {isOfflineMode
                    ? 'Save Location on Phone (Offline)'
                    : 'Send Location Now'}
                </button>

                <button
                  type="button"
                  disabled={!allChecksPassed}
                  onClick={() => handleCaptureOrSendPoint(true)}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                >
                  Send Old Location (3 Min Late Test)
                </button>
              </div>

              <button
                type="button"
                disabled={!allChecksPassed}
                onClick={handleUseRealBrowserGps}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md cursor-pointer"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>Send My Real Phone / Browser GPS Location</span>
              </button>

              {localQueue.length > 0 && (
                <button
                  type="button"
                  onClick={handleFlushOfflineQueue}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    Internet Back — Upload {localQueue.length} Saved Locations Now
                  </span>
                </button>
              )}
            </div>

            {lastIngestResult && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono space-y-1">
                <div className="font-semibold text-slate-900">
                  Last Location Update Result:
                </div>
                {lastIngestResult.offlineQueued ? (
                  <div className="text-amber-800">{lastIngestResult.message}</div>
                ) : (
                  <>
                    <div className="text-slate-700">
                      Time taken: {lastIngestResult.ingestLatencyMs}ms · Saved:{' '}
                      {lastIngestResult.acceptedCount} · Duplicate ignored:{' '}
                      {lastIngestResult.duplicateCount} · Blocked (Fake GPS):{' '}
                      {lastIngestResult.rejectedCount}
                    </div>
                    {(lastIngestResult.results || []).slice(-3).map((r: any) => (
                      <div
                        key={r.clientPointId}
                        className={
                          r.status === 'rejected'
                            ? 'text-red-700 font-semibold'
                            : 'text-emerald-700'
                        }
                      >
                        [{r.status.toUpperCase()}] {r.reasonCode}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Driver Incident Reporting Form */}
            <form onSubmit={handleReportIncident} className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="text-xs font-semibold text-slate-900">
                Report Road Problem or Breakdown to Control Room
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value="TRAFFIC_GRIDLOCK">Heavy Traffic Jam / Delay</option>
                  <option value="MECHANICAL_BREAKDOWN">Bus Breakdown</option>
                  <option value="TYRE_PUNCTURE">Tyre Puncture</option>
                  <option value="MOUNT_CHARGER_FAULT">Charger / Phone Holder Broken</option>
                  <option value="MEDICAL_EMERGENCY">Passenger Medical Emergency</option>
                </select>
                <input
                  type="text"
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  placeholder="Where & what happened..."
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                />
              </div>
              <button
                type="submit"
                className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                Send Alert to Control Room
              </button>
              {incidentBanner && (
                <p className="text-xs text-emerald-700 font-medium">{incidentBanner}</p>
              )}
            </form>
          </div>
        </div>

        {/* Right 7 Cols: Android App Source Code */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Android App Source Files (Included in Download)
              </h2>
              <Code2 className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              These files are inside `mobile-driver-app.tar.gz` so your developer can build the Google Play Store / APK file
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {EXPO_DRIVER_APP_FILES.map((file, idx) => (
                <button
                  key={file.filename}
                  type="button"
                  onClick={() => setSelectedExpoFileIdx(idx)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                    selectedExpoFileIdx === idx
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {file.filename.split('/').pop()}
                </button>
              ))}
            </div>
          </div>

          {EXPO_DRIVER_APP_FILES[selectedExpoFileIdx] && (
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {EXPO_DRIVER_APP_FILES[selectedExpoFileIdx].title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {EXPO_DRIVER_APP_FILES[selectedExpoFileIdx].description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyCode(selectedExpoFileIdx, EXPO_DRIVER_APP_FILES[selectedExpoFileIdx].code)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md shrink-0 cursor-pointer"
                >
                  {copiedIdx === selectedExpoFileIdx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 bg-slate-950 text-slate-100 rounded-md text-xs font-mono overflow-x-auto max-h-[540px] leading-relaxed">
                <code>{EXPO_DRIVER_APP_FILES[selectedExpoFileIdx].code}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
