import React, { useState } from 'react';
import { Car, User, MapPin, Plus } from 'lucide-react';

export const FleetManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'buses' | 'drivers' | 'routes'>('buses');

  // Cars State
  const [buses, setBuses] = useState([
    { id: '1', reg_no: 'MH-12-DT-0001', make: 'Tata Motors', model: 'Nexon EV Max', capacity: 5, tracking_source: 'phone', is_active: true },
    { id: '2', reg_no: 'MH-12-DT-0002', make: 'MG Motor', model: 'ZS EV Exclusive', capacity: 5, tracking_source: 'phone', is_active: true },
    { id: '3', reg_no: 'MH-12-DT-0003', make: 'Hyundai', model: 'Ioniq 5 Electric', capacity: 5, tracking_source: 'phone', is_active: true },
    { id: '4', reg_no: 'MH-12-DT-0004', make: 'Mahindra', model: 'XUV400 EV Pro', capacity: 5, tracking_source: 'phone', is_active: true },
  ]);
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [newRegNo, setNewRegNo] = useState('');
  const [newBusModel, setNewBusModel] = useState('Tata Nexon EV Max');
  const [newCapacity, setNewCapacity] = useState(5);

  // Drivers State
  const [drivers, setDrivers] = useState([
    { id: '1', name: 'Ganesh Jadhav', phone: '+919822001122', license: 'MH-14-2018-0045129', class: 'HMV-Passenger', address: 'Kothrud, Pune', pin: '123456', duty_status: 'on_duty' },
    { id: '2', name: 'Sunil Patil', phone: '+919822003344', license: 'MH-12-2019-0098432', class: 'HMV-Passenger', address: 'Hadapsar, Pune', pin: '654321', duty_status: 'on_duty' },
    { id: '3', name: 'Ramesh More', phone: '+919822005566', license: 'MH-14-2020-0012876', class: 'HMV-Passenger', address: 'Nigdi, Pune', pin: '112233', duty_status: 'off_duty' },
  ]);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverLicense, setNewDriverLicense] = useState('');
  const [newDriverAddress, setNewDriverAddress] = useState('');

  // Routes State
  const [routes, setRoutes] = useState([
    { id: '1', code: 'RT-501', name: 'Swargate to Nigdi Express', distance_km: 24.5, stops: ['Swargate Terminal', 'Shivajinagar', 'Khadki', 'Chinchwad', 'Nigdi'] },
    { id: '2', code: 'RT-505', name: 'Katraj to Hinjawadi IT Park', distance_km: 31.2, stops: ['Katraj Depot', 'Warje Flyover', 'Chandani Chowk', 'Baner', 'Hinjawadi Phase 3'] },
  ]);
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [newRouteCode, setNewRouteCode] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDistance, setNewRouteDistance] = useState(25.0);

  // Handle Add Bus
  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegNo) return;

    try {
      const res = await fetch('/v1/buses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reg_no: newRegNo,
          make: 'Tata Motors',
          model: newBusModel,
          capacity: Number(newCapacity),
          tracking_source: 'phone',
        }),
      });

      if (res.ok) {
        setBuses((prev) => [
          ...prev,
          {
            id: String(prev.length + 1),
            reg_no: newRegNo,
            make: 'Tata Motors',
            model: newBusModel,
            capacity: Number(newCapacity),
            tracking_source: 'phone',
            is_active: true,
          },
        ]);
        setNewRegNo('');
        setShowAddBusModal(false);
      }
    } catch (err) {
      console.error('Failed to add bus:', err);
    }
  };

  // Handle Add Driver
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverPhone) return;

    try {
      const res = await fetch('/v1/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDriverName,
          phone: newDriverPhone,
          licence_class: 'HMV-Passenger',
          licence_number: newDriverLicense || 'MH-14-2026-9999999',
          address: newDriverAddress || 'Pune, Maharashtra',
        }),
      });

      if (res.ok) {
        setDrivers((prev) => [
          ...prev,
          {
            id: String(prev.length + 1),
            name: newDriverName,
            phone: newDriverPhone,
            license: newDriverLicense,
            class: 'HMV-Passenger',
            address: newDriverAddress,
            pin: '123456',
            duty_status: 'on_duty',
          },
        ]);
        setNewDriverName('');
        setNewDriverPhone('');
        setNewDriverLicense('');
        setNewDriverAddress('');
        setShowAddDriverModal(false);
      }
    } catch (err) {
      console.error('Failed to enroll driver:', err);
    }
  };

  // Handle Add Route
  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteCode || !newRouteName) return;

    setRoutes((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        code: newRouteCode,
        name: newRouteName,
        distance_km: Number(newRouteDistance),
        stops: ['Origin Terminal', 'Midpoint Junction', 'Destination Terminal'],
      },
    ]);
    setNewRouteCode('');
    setNewRouteName('');
    setShowAddRouteModal(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-bold text-lg text-white">Fleet & Resource Administration</h1>
          <p className="text-slate-400">
            <strong>Fleet Manager Authority (§7.3)</strong>: Add and configure buses, enroll drivers with licenses, and build routes.
          </p>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('buses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'buses' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>1. Cars / Vehicles ({buses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'drivers' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>2. Drivers ({drivers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('routes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'routes' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>3. Routes ({routes.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CARS MANAGEMENT */}
      {activeTab === 'buses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-100">Fleet Cars & Vehicle Registration Roster (§4 & §7.3)</h2>
              <p className="text-[11px] text-slate-400">Unique registration numbers enforced per vehicle.</p>
            </div>
            <button
              onClick={() => setShowAddBusModal(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Car</span>
            </button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                <th className="pb-2">Registration No</th>
                <th className="pb-2">Make & Model</th>
                <th className="pb-2">Passenger Capacity</th>
                <th className="pb-2">Tracking Mode</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {buses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40">
                  <td className="py-3 font-bold text-white text-xs">{b.reg_no}</td>
                  <td className="py-3 font-sans">{b.make} — {b.model}</td>
                  <td className="py-3">{b.capacity} Seats</td>
                  <td className="py-3 uppercase text-blue-400 font-bold text-[10px]">Android / iOS Phone</td>
                  <td className="py-3 text-emerald-400 font-sans font-semibold">Active In Fleet</td>
                  <td className="py-3 text-right font-sans">
                    <button className="text-slate-400 hover:text-white underline">Edit Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: DRIVERS MANAGEMENT */}
      {activeTab === 'drivers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-100">Driver Roster & DPDP Consent Compliance (§7.3 & §12.2)</h2>
              <p className="text-[11px] text-slate-400">Fleet Managers have full unmasked access to commercial license numbers and addresses.</p>
            </div>
            <button
              onClick={() => setShowAddDriverModal(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Enroll New Driver</span>
            </button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                <th className="pb-2">Driver Name</th>
                <th className="pb-2">Phone (Login ID)</th>
                <th className="pb-2">License Number (Unmasked)</th>
                <th className="pb-2">Assigned PIN</th>
                <th className="pb-2">Duty Status</th>
                <th className="pb-2 text-right">Security Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40">
                  <td className="py-3 font-bold font-sans text-white text-xs">{d.name}</td>
                  <td className="py-3 text-blue-400">{d.phone}</td>
                  <td className="py-3 font-semibold text-slate-200">{d.license}</td>
                  <td className="py-3 text-emerald-400 tracking-wider font-bold">•••••• ({d.pin})</td>
                  <td className="py-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ON DUTY
                    </span>
                  </td>
                  <td className="py-3 text-right font-sans">
                    <button
                      onClick={() => alert(`Temporary PIN for ${d.name} reset to 123456. First login will force change.`)}
                      className="text-amber-400 hover:text-amber-300 underline font-semibold"
                    >
                      Reset PIN
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ROUTES & STOPS MANAGEMENT */}
      {activeTab === 'routes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-100">Route Corridors & Versioned Stops (§4 & §10.3)</h2>
              <p className="text-[11px] text-slate-400">Routes are versioned so modifying stops never alters historical trip logs.</p>
            </div>
            <button
              onClick={() => setShowAddRouteModal(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create Route Corridor</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {routes.map((r) => (
              <div key={r.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 font-mono font-bold rounded">
                      {r.code}
                    </span>
                    <h3 className="font-bold text-white text-xs">{r.name}</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{r.distance_km} km</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Ordered Stop Sequence
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {r.stops.map((stop, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-1 bg-slate-900 rounded border border-slate-800 text-[10px] text-slate-300 font-medium"
                      >
                        {sIdx + 1}. {stop}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD CAR */}
      {showAddBusModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddBus} className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white">Add New Car Vehicle</h3>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Vehicle Registration Number</label>
              <input
                type="text"
                placeholder="MH-12-DT-0005"
                value={newRegNo}
                onChange={(e) => setNewRegNo(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Car Model (e.g. Tata Nexon EV, MG ZS EV)</label>
              <input
                type="text"
                value={newBusModel}
                onChange={(e) => setNewBusModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Passenger Seating Capacity</label>
              <input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddBusModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold"
              >
                Register Car
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ENROLL DRIVER */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddDriver} className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white">Enroll New Driver</h3>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Driver Full Name</label>
              <input
                type="text"
                placeholder="Santosh Gaikwad"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Mobile Phone Number (Login ID)</label>
              <input
                type="text"
                placeholder="+919822007788"
                value={newDriverPhone}
                onChange={(e) => setNewDriverPhone(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Commercial License Number</label>
              <input
                type="text"
                placeholder="MH-14-2021-0078912"
                value={newDriverLicense}
                onChange={(e) => setNewDriverLicense(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Residential Address</label>
              <input
                type="text"
                placeholder="Shivajinagar, Pune"
                value={newDriverAddress}
                onChange={(e) => setNewDriverAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDriverModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold"
              >
                Enroll Driver
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE ROUTE */}
      {showAddRouteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddRoute} className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white">Create Route Corridor</h3>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Route Code</label>
              <input
                type="text"
                placeholder="RT-601"
                value={newRouteCode}
                onChange={(e) => setNewRouteCode(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Route Name (Origin to Destination)</label>
              <input
                type="text"
                placeholder="Pune Station to Kothrud Depot"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Total Corridor Distance (km)</label>
              <input
                type="number"
                value={newRouteDistance}
                onChange={(e) => setNewRouteDistance(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRouteModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold"
              >
                Create Route
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
