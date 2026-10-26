import React, { useState } from 'react';
import {
  CheckCircle2,
  Radio,
  BatteryCharging,
  BatteryWarning,
  Lock,
} from 'lucide-react';
import { formatIstDateTime } from '../utils/formatters.ts';

interface AlertsAndHealthViewProps {
  snapshot: any;
  organizationId: number;
  onAcknowledgeAlert: (alertId: number) => Promise<void>;
  onSendWakeupPing: (deviceId: number) => Promise<void>;
}

export const AlertsAndHealthView: React.FC<AlertsAndHealthViewProps> = ({
  snapshot,
  onAcknowledgeAlert,
  onSendWakeupPing,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'acknowledged'>('all');

  const alerts: any[] = snapshot?.alerts || [];
  const quarantined: any[] = snapshot?.quarantinedLocations || [];
  const devices: any[] = snapshot?.devices || [];

  const filteredAlerts = alerts.filter((a) =>
    filterStatus === 'all' ? true : a.status === filterStatus
  );

  return (
    <div className="space-y-5">
      {/* Section 1: Live Alerts */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Live Alerts &amp; Warnings (Offline Buses, Late Starts, Unplugged Chargers, Fake GPS)
            </h2>
            <p className="text-xs text-slate-500">
              Checked automatically every 15 seconds · Click &quot;Mark as Seen&quot; once handled
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'open', label: 'New / Open' },
                { id: 'acknowledged', label: 'Seen' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilterStatus(st.id)}
                className={`px-3 py-1 text-xs font-medium rounded cursor-pointer ${
                  filterStatus === st.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No alerts in this list.
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`font-semibold uppercase ${
                        alert.severity === 'critical' ? 'text-red-700' : 'text-amber-700'
                      }`}
                    >
                      {alert.severity === 'critical' ? 'URGENT' : 'WARNING'}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-600">{alert.alertType}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {formatIstDateTime(alert.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                  <p className="text-xs text-slate-600 max-w-3xl">{alert.message}</p>
                  {alert.acknowledgedBy && (
                    <p className="text-xs text-emerald-700 font-mono">
                      Seen by {alert.acknowledgedBy} at {formatIstDateTime(alert.acknowledgedAt)}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {alert.status === 'open' ? (
                    <button
                      type="button"
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark as Seen</span>
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-emerald-700">Seen</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 2: Phone Battery & Connection Status */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Phone Battery, Charger &amp; Connection Status (Works on All Phone Brands)
          </h2>
          <p className="text-xs text-slate-500">
            Check battery level and charger status for each bus phone · Click &quot;Wake Up Phone&quot; if a Xiaomi, Vivo, Oppo, or Realme phone stops sending updates
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-3 font-semibold">Phone ID</th>
                <th className="py-2.5 px-3 font-semibold">Bus</th>
                <th className="py-2.5 px-3 font-semibold">Phone Brand &amp; Model</th>
                <th className="py-2.5 px-3 font-semibold">Owner</th>
                <th className="py-2.5 px-3 font-semibold">Battery &amp; Charger</th>
                <th className="py-2.5 px-3 font-semibold">Background Tracking</th>
                <th className="py-2.5 px-3 font-semibold">Last Seen (IST)</th>
                <th className="py-2.5 px-3 font-semibold">Wake Up Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {devices.slice(0, 20).map((dev) => (
                <tr key={dev.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{dev.deviceUid}</td>
                  <td className="py-2.5 px-3 font-mono">Bus #{dev.assignedBusId || '—'}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">
                      {dev.manufacturer} {dev.model}
                    </div>
                    <div className="text-slate-500">{dev.osVersion}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {dev.ownershipType === 'COMPANY_ISSUED' ? 'Company Phone' : 'Driver Phone'}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums">
                    <div className="flex items-center gap-1.5">
                      {dev.isCharging ? (
                        <BatteryCharging className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <BatteryWarning className="w-4 h-4 text-amber-600" />
                      )}
                      <span className={dev.batteryPct < 30 ? 'text-red-700 font-bold' : 'text-slate-900'}>
                        {dev.batteryPct}% · {dev.isCharging ? 'Plugged In' : 'Unplugged'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    <div>
                      Battery Saver Off: <strong className="text-emerald-700">Yes</strong> · Auto-Start:{' '}
                      <strong className={dev.oemAutostartEnabled ? 'text-emerald-700' : 'text-red-700'}>
                        {dev.oemAutostartEnabled ? 'ON' : 'Stopped'}
                      </strong>
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      Wake-up signals sent: {dev.wakeupPingsSent}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                    {formatIstDateTime(dev.lastSeenAt)}
                  </td>
                  <td className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={() => onSendWakeupPing(dev.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer whitespace-nowrap"
                    >
                      <Radio className="w-3 h-3" />
                      <span>Wake Up Phone</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Blocked Fake GPS Locations */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Blocked Fake GPS &amp; Suspicious Locations (Never Shown on Live Map)
            </h2>
            <p className="text-xs text-slate-500">
              Locations blocked automatically because a fake GPS app was used or the bus jumped faster than 120 km/h
            </p>
          </div>
          <Lock className="w-4 h-4 text-slate-500" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-3 font-semibold">Point ID</th>
                <th className="py-2.5 px-3 font-semibold">Bus / Trip</th>
                <th className="py-2.5 px-3 font-semibold">Why It Was Blocked</th>
                <th className="py-2.5 px-3 font-semibold">Details</th>
                <th className="py-2.5 px-3 font-semibold">Location</th>
                <th className="py-2.5 px-3 font-semibold">Reported Speed</th>
                <th className="py-2.5 px-3 font-semibold">Time Blocked (IST)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quarantined.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                    {q.clientPointId}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    Bus #{q.busId} · Trip #{q.tripId}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-red-700">
                    {q.reasonCode}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{q.reasonDetail}</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums">
                    {q.latitude.toFixed(4)}, {q.longitude.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-red-700 tabular-nums">
                    {Math.round(q.impliedSpeedKmh)} km/h
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                    {formatIstDateTime(q.receivedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
