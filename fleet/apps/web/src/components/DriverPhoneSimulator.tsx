import React, { useState, useEffect } from 'react';
import { Smartphone, Shield, CheckCircle, Radio, Battery, Wifi } from 'lucide-react';

export const DriverPhoneSimulator: React.FC = () => {
  const [screen, setScreen] = useState<'login' | 'consent' | 'permissions' | 'hud'>('login');
  const [phone, setPhone] = useState('9822001122');
  const [pin, setPin] = useState('123456');
  const [isTripActive, setIsTripActive] = useState(false);
  const [pointsSent, setPointsSent] = useState(0);
  const [lastUploadTime, setLastUploadTime] = useState<string>('Never');

  // When trip is active, send live GPS fixes to the backend every 4 seconds!
  useEffect(() => {
    if (!isTripActive) return;

    const ROAD_WAYPOINTS = [
      { lat: 18.5145, lng: 73.8448 },
      { lat: 18.5165, lng: 73.8452 },
      { lat: 18.5185, lng: 73.8458 },
      { lat: 18.5205, lng: 73.8466 },
      { lat: 18.5228, lng: 73.8478 },
      { lat: 18.5250, lng: 73.8492 },
      { lat: 18.5272, lng: 73.8508 },
      { lat: 18.5295, lng: 73.8522 },
      { lat: 18.5318, lng: 73.8532 },
    ];
    let wpIndex = 3;

    const timer = setInterval(async () => {
      wpIndex = (wpIndex + 1) % ROAD_WAYPOINTS.length;
      const pt = ROAD_WAYPOINTS[wpIndex]!;
      const speed = Math.floor(35 + Math.random() * 8);

      const payload = {
        sent_at: new Date().toISOString(),
        trip_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a10',
        points: [
          {
            id: '0192f0a1-8a01-7d22-8b31-' + Math.random().toString(36).substring(2, 14),
            recorded_at: new Date().toISOString(),
            lat: pt.lat,
            lng: pt.lng,
            accuracy_m: 4.8,
            speed_kmh: speed,
            heading_deg: 35,
          },
        ],
        health: {
          battery_pct: 88,
          charging: true,
          network: '4g',
          permission: 'always',
          queue_depth: 0,
          app_version: '1.0.0',
        },
      };

      try {
        await fetch('/v1/ingest/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setPointsSent((prev) => prev + 1);
        setLastUploadTime(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Driver simulator point failed:', err);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [isTripActive]);

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-950 p-6">
      {/* Mobile Device Frame */}
      <div className="w-[380px] h-[720px] bg-slate-900 border-4 border-slate-700 rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative text-slate-100 font-sans">
        {/* Phone Notch & Status Bar */}
        <div className="h-6 bg-slate-950 flex items-center justify-between px-6 pt-1 text-[10px] text-slate-400 font-mono">
          <span>11:50</span>
          <div className="w-20 h-4 bg-slate-900 rounded-b-xl" />
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <Battery className="w-3 h-3 text-emerald-400" />
          </div>
        </div>

        {/* Screen 1: Driver 6-Digit PIN Login */}
        {screen === 'login' && (
          <div className="flex-1 p-6 flex flex-col justify-center space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mx-auto flex items-center justify-center text-emerald-400 mb-2">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">FleetCommand Driver</h2>
              <p className="text-xs text-slate-400">Section 7.2: Phone + 6-Digit PIN Login</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Driver Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">6-Digit Security PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white text-center tracking-widest font-mono text-base font-bold"
                />
              </div>

              <button
                onClick={() => setScreen('consent')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs mt-4 shadow-lg"
              >
                LOGIN TO DRIVER SHIFT
              </button>
            </div>
          </div>
        )}

        {/* Screen 2: DPDP Act 2023 Consent */}
        {screen === 'consent' && (
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-3">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white">DPDP Act 2023 Consent</h2>
              <p className="text-[11px] text-slate-400 mb-4">Statutory Driver Location Notice</p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                <p>• Location tracking is strictly activated <strong>ONLY while your assigned bus trip is in progress</strong>.</p>
                <p>• Tracking stops immediately the moment you tap 'End Trip'.</p>
                <p>• Data is processed solely for fleet coordination, passenger ETA, and passenger safety.</p>
              </div>
            </div>

            <button
              onClick={() => setScreen('permissions')}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
            >
              I AGREE & ACCEPT (DPDP)
            </button>
          </div>
        )}

        {/* Screen 3: Guided 4-Step Permissions */}
        {screen === 'permissions' && (
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white mb-1">Required Permissions</h2>
              <p className="text-[11px] text-slate-400 mb-4">Mandatory for reliable background capture</p>

              <div className="space-y-2.5">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-[11px] text-white block">Step 1: Notifications</span>
                    <span className="text-[10px] text-slate-400">Foreground dispatch notification active</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-[11px] text-white block">Step 2: Precise Location</span>
                    <span className="text-[10px] text-slate-400">Set to 'Allow all the time'</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-[11px] text-white block">Step 3: OEM Battery Exemption</span>
                    <span className="text-[10px] text-slate-400">Xiaomi / Vivo / Samsung uncapped</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setScreen('hud')}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
            >
              ALL PERMISSIONS CONFIRMED
            </button>
          </div>
        )}

        {/* Screen 4: Active Trip HUD (Live Ingestion Controller) */}
        {screen === 'hud' && (
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="font-bold text-sm text-white">Trip Console</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Car: MH-12-DT-0001 (Tata Nexon EV) • Route 501</p>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isTripActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isTripActive ? 'TRACKING ACTIVE' : 'IDLE'}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
                <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
                  isTripActive ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Radio className="w-6 h-6" />
                </div>
                <div className="font-bold text-xs text-white">
                  {isTripActive ? 'Sharing Live GPS With Control Room' : 'Ready to Start Trip'}
                </div>
                <p className="text-[10px] text-slate-500">
                  {isTripActive ? 'Points sent directly to /v1/ingest/locations every 4s' : 'Tap below to begin shift telemetry'}
                </p>
              </div>

              {/* Telemetry Stats */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Points Sent</span>
                  <span className="text-base font-bold font-mono text-emerald-400">{pointsSent}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Last Ingest</span>
                  <span className="text-[11px] font-bold font-mono text-slate-300">{lastUploadTime}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsTripActive(!isTripActive)}
              className={`w-full py-4 text-white font-bold rounded-2xl text-sm transition shadow-xl ${
                isTripActive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {isTripActive ? 'END TRIP NOW' : 'START TRIP (LIVE)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
