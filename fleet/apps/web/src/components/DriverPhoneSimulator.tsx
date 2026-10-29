import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Shield,
  CheckCircle,
  Radio,
  Battery,
  Wifi,
  Bell,
  Sparkles,
  Check,
} from 'lucide-react';
import { io } from 'socket.io-client';

interface IncomingInstruction {
  id: string;
  supervisor_name: string;
  message: string;
  priority: 'normal' | 'urgent';
  sent_at: string;
  category: string;
  status: 'sent' | 'delivered' | 'acknowledged';
  ack_reply?: string;
}

export const DriverPhoneSimulator: React.FC = () => {
  const [screen, setScreen] = useState<'login' | 'consent' | 'permissions' | 'hud'>('hud'); // Default to HUD so user can test immediately!
  const [phone, setPhone] = useState('9822001122');
  const [pin, setPin] = useState('123456');
  const [isTripActive, setIsTripActive] = useState(false);
  const [pointsSent, setPointsSent] = useState(0);
  const [lastUploadTime, setLastUploadTime] = useState<string>('Never');

  // Supervisor Incoming Notifications
  const [activeNotification, setActiveNotification] = useState<IncomingInstruction | null>({
    id: 'inst-seed-01',
    supervisor_name: 'Anand Shinde (Supervisor)',
    message: 'Stationary alert: Stopped near Baner Chowk > 15m. Please report reason.',
    priority: 'normal',
    sent_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    category: 'stop_inquiry',
    status: 'delivered',
  });
  const [isAcking, setIsAcking] = useState(false);
  const [cleanlinessReportSent, setCleanlinessReportSent] = useState(false);

  // Listen to live socket.io for real-time supervisor instructions
  useEffect(() => {
    const socket = io({
      auth: { orgId: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000' },
    });

    socket.on('driver.instruction', (inst: IncomingInstruction) => {
      setActiveNotification(inst);
      // Play a short soft beep if possible
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(inst.priority === 'urgent' ? 880 : 587, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch {}
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // When trip is active, send live GPS fixes to the backend every 4 seconds
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

  const handleAcknowledge = async (replyText: string) => {
    if (!activeNotification) return;
    setIsAcking(true);
    try {
      await fetch(`/v1/driver/instruction/${activeNotification.id}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText }),
      });
      setActiveNotification((prev) => (prev ? { ...prev, status: 'acknowledged', ack_reply: replyText } : null));
      setTimeout(() => {
        setActiveNotification(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setIsAcking(false);
    }
  };

  const handleDriverCleanlinessReport = async () => {
    try {
      await fetch('/v1/supervisor/cleanliness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bus_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a01',
          status: 'clean',
          interior_clean: true,
          exterior_clean: true,
          sanitized: true,
          ac_fresh: true,
          inspected_by: 'Driver Self-Audit (Ganesh Jadhav)',
          notes: 'Full vehicle wipe-down & trash bin emptied by driver',
        }),
      });
      setCleanlinessReportSent(true);
      setTimeout(() => setCleanlinessReportSent(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-950 p-2 sm:p-6 overflow-hidden">
      {/* Mobile Device Frame */}
      <div className="w-full max-w-[390px] h-full sm:h-[740px] bg-slate-900 sm:border-4 sm:border-slate-700 rounded-2xl sm:rounded-[42px] shadow-2xl overflow-hidden flex flex-col relative text-slate-100 font-sans border border-slate-800">
        {/* Phone Notch & Status Bar */}
        <div className="h-6 bg-slate-950 flex items-center justify-between px-6 pt-1 text-[10px] text-slate-400 font-mono shrink-0">
          <span>12:28</span>
          <div className="w-24 h-4 bg-slate-900 rounded-b-xl" />
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
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs mt-4 shadow-lg cursor-pointer"
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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer"
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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              ALL PERMISSIONS CONFIRMED
            </button>
          </div>
        )}

        {/* Screen 4: Active Trip HUD & Supervisor Dispatch Receiver */}
        {screen === 'hud' && (
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-3">
              {/* Top Shift Status Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h3 className="font-bold text-sm text-white">Driver Shift Terminal</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Car: MH-12-DT-0033 • Tigor EV Sedan
                  </p>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isTripActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {isTripActive ? 'TRACKING ACTIVE' : 'SHIFT ON DUTY'}
                </div>
              </div>

              {/* INCOMING SUPERVISOR NOTIFICATION CARD (If any) */}
              {activeNotification && (
                <div className={`p-3.5 rounded-2xl border shadow-lg space-y-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
                  activeNotification.priority === 'urgent'
                    ? 'bg-rose-950/80 border-rose-800/80 text-rose-100 shadow-rose-950/50'
                    : 'bg-amber-950/80 border-amber-800/80 text-amber-100 shadow-amber-950/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Bell className="w-4 h-4 text-amber-300 animate-bounce" />
                      <span>Notice from Control Room</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-300/80">
                      {activeNotification.supervisor_name}
                    </span>
                  </div>

                  <p className="text-xs bg-black/40 p-2.5 rounded-xl border border-white/10 leading-snug font-medium">
                    "{activeNotification.message}"
                  </p>

                  {/* If already acknowledged */}
                  {activeNotification.status === 'acknowledged' ? (
                    <div className="p-2 bg-emerald-950 border border-emerald-800 rounded-lg text-[11px] text-emerald-300 flex items-center gap-1.5 font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Sent Reply: "{activeNotification.ack_reply}"</span>
                    </div>
                  ) : (
                    /* Driver Quick-Reply Action Buttons */
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] text-amber-200/80 font-semibold">
                        Tap Quick Response to Supervisor:
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <button
                          disabled={isAcking}
                          onClick={() => handleAcknowledge('Heavy traffic at signal, moving in 2m')}
                          className="p-1.5 bg-black/50 hover:bg-black/70 border border-white/20 rounded-lg text-left transition text-white font-medium cursor-pointer"
                        >
                          🚗 "In Traffic Jam"
                        </button>
                        <button
                          disabled={isAcking}
                          onClick={() => handleAcknowledge('Traffic cleared, resuming route now')}
                          className="p-1.5 bg-black/50 hover:bg-black/70 border border-white/20 rounded-lg text-left transition text-white font-medium cursor-pointer"
                        >
                          🚦 "Resuming Route"
                        </button>
                        <button
                          disabled={isAcking}
                          onClick={() => handleAcknowledge('Vehicle inspected & cabin cleaned')}
                          className="p-1.5 bg-black/50 hover:bg-black/70 border border-white/20 rounded-lg text-left transition text-white font-medium cursor-pointer"
                        >
                          🧹 "Cleaned & Inspected"
                        </button>
                        <button
                          disabled={isAcking}
                          onClick={() => handleAcknowledge('Understood & acknowledged')}
                          className="p-1.5 bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-500 rounded-lg text-center transition text-white font-bold cursor-pointer"
                        >
                          ✓ "Acknowledge"
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Indicator */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center space-y-1.5">
                <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center ${
                  isTripActive ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div className="font-bold text-xs text-white">
                  {isTripActive ? 'Sharing Live GPS With Control Room' : 'Ready to Start Trip / On Standby'}
                </div>
                <p className="text-[10px] text-slate-500">
                  {isTripActive ? 'Telemetry broadcasting to Supervisor Desk' : 'Vehicle stationary • Connected to supervisor'}
                </p>
              </div>

              {/* Driver Cleanliness Self-Certification Button */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Vehicle Hygiene
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {cleanlinessReportSent ? 'Reported Clean to Desk!' : 'Report cabin cleaned & ready'}
                  </span>
                </div>
                <button
                  onClick={handleDriverCleanlinessReport}
                  disabled={cleanlinessReportSent}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    cleanlinessReportSent
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                  }`}
                >
                  {cleanlinessReportSent ? '✓ Reported Clean' : 'Report Clean'}
                </button>
              </div>

              {/* Telemetry Stats */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">GPS Points Sent</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">{pointsSent}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Last Ingest</span>
                  <span className="text-[11px] font-bold font-mono text-slate-300">{lastUploadTime}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsTripActive(!isTripActive)}
              className={`w-full py-3 text-white font-bold rounded-2xl text-xs transition shadow-xl mt-3 cursor-pointer ${
                isTripActive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {isTripActive ? 'END TRIP NOW' : 'START LIVE GPS BROADCAST'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
