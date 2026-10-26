import React, { useState } from 'react';
import { X, Calendar, Car, User, MapPin, CheckCircle, Clock } from 'lucide-react';

interface DispatchTripModalProps {
  onClose: () => void;
  onTripDispatched: (trip: any) => void;
}

export const DispatchTripModal: React.FC<DispatchTripModalProps> = ({
  onClose,
  onTripDispatched,
}) => {
  const [selectedBus, setSelectedBus] = useState('0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a01');
  const [selectedDriver, setSelectedDriver] = useState('0192f0a1-7c3e-7c11-9d0a-5e2b6f4d0001');
  const [selectedRoute, setSelectedRoute] = useState('0192f0a1-7c3e-7c11-9d0a-5e2b6f4c2001');
  const [plannedTime, setPlannedTime] = useState('12:30');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const availableBuses = [
    { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a01', reg: 'MH-12-DT-0001 (Tata Nexon EV Max)', depot: 'Kothrud Hub' },
    { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a02', reg: 'MH-12-DT-0002 (MG ZS EV)', depot: 'Shivajinagar' },
    { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a03', reg: 'MH-12-DT-0003 (Hyundai Ioniq 5)', depot: 'Baner' },
  ];

  const availableDrivers = [
    { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4d0001', name: 'Ganesh Jadhav', license: 'HMV-2018-0045129', phone: '+919822001122' },
    { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4d0002', name: 'Sunil Patil', license: 'HMV-2019-0098432', phone: '+919822003344' },
    { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4d0003', name: 'Ramesh More', license: 'HMV-2020-0012876', phone: '+919822005566' },
  ];

  const availableRoutes = [
    { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c2001', code: 'RT-501', name: 'Swargate to Nigdi Express (24.5 km)' },
    { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c2002', code: 'RT-505', name: 'Katraj to Hinjawadi Phase 3 (31.2 km)' },
    { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c2003', code: 'RT-204', name: 'Pune Station to Hadapsar Depot (12.0 km)' },
  ];

  const handleDispatch = async () => {
    setIsSubmitting(true);

    const now = new Date();
    const plannedStart = new Date(now.getTime() + 15 * 60000).toISOString();
    const plannedEnd = new Date(now.getTime() + 85 * 60000).toISOString();

    const payload = {
      route_id: selectedRoute,
      bus_id: selectedBus,
      driver_id: selectedDriver,
      planned_start: plannedStart,
      planned_end: plannedEnd,
    };

    try {
      const res = await fetch('/v1/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessNotice(true);
        setTimeout(() => {
          onTripDispatched(data.trip);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Trip dispatch failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Dispatch Trip & Assign Driver</h2>
              <p className="text-[11px] text-slate-400">Fleet Operations Desk (Spec §6.3 & §7.3)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {successNotice ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full mx-auto flex items-center justify-center animate-bounce">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Trip Successfully Dispatched!</h3>
              <p className="text-slate-400 text-xs">
                Trip code generated. Assigned driver phone will automatically receive the trip upon login.
              </p>
            </div>
          ) : (
            <>
              {/* 1. Select Route */}
              <div>
                <label className="text-slate-300 font-bold block mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>1. Select Bus Route Corridor (§4)</span>
                </label>
                <select
                  value={selectedRoute}
                  onChange={(e) => setSelectedRoute(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {availableRoutes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Select Car */}
              <div>
                <label className="text-slate-300 font-bold block mb-1.5 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-400" />
                  <span>2. Assign Car Vehicle (Registration)</span>
                </label>
                <select
                  value={selectedBus}
                  onChange={(e) => setSelectedBus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                >
                  {availableBuses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.reg} • Depot: {b.depot}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  PostgreSQL partial index ensures no overlapping trips for this vehicle.
                </span>
              </div>

              {/* 3. Assign Driver */}
              <div>
                <label className="text-slate-300 font-bold block mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>3. Assign Driver & Phone</span>
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone}) • License: {d.license}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Scheduled Departure Time */}
              <div>
                <label className="text-slate-300 font-bold block mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>4. Scheduled Departure Time</span>
                </label>
                <input
                  type="time"
                  value={plannedTime}
                  onChange={(e) => setPlannedTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-800 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDispatch}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg flex items-center gap-1.5 transition"
                >
                  {isSubmitting ? 'Dispatching...' : 'Dispatch Trip Now'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
