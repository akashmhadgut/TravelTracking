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
      } else {
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
    } catch {
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
  };

  // Handle Add Driver
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverPhone || !newDriverLicense) return;

    try {
      const res = await fetch('/v1/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDriverName,
          phone: newDriverPhone,
          license_number: newDriverLicense,
          license_class: 'HMV-Passenger',
          residential_address: newDriverAddress,
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
            address: newDriverAddress || 'Pune, MH',
            pin: '123456',
            duty_status: 'on_duty',
          },
        ]);
        setNewDriverName('');
        setNewDriverPhone('');
        setNewDriverLicense('');
        setNewDriverAddress('');
        setShowAddDriverModal(false);
      } else {
        setDrivers((prev) => [
          ...prev,
          {
            id: String(prev.length + 1),
            name: newDriverName,
            phone: newDriverPhone,
            license: newDriverLicense,
            class: 'HMV-Passenger',
            address: newDriverAddress || 'Pune, MH',
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
    } catch {
      setDrivers((prev) => [
        ...prev,
        {
          id: String(prev.length + 1),
          name: newDriverName,
          phone: newDriverPhone,
          license: newDriverLicense,
          class: 'HMV-Passenger',
          address: newDriverAddress || 'Pune, MH',
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
    <div className="flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-6 space-y-4 sm:space-y-6 text-slate-800 text-xs font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">Fleet & Resource Administration</h1>
          <p className="text-slate-500 text-xs">
            <strong className="text-indigo-600">Fleet Manager Authority (§7.3)</strong>: Add and configure cars, enroll drivers with licenses, and build routes.
          </p>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('buses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'buses'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5 shrink-0" />
            <span>1. Cars / Vehicles ({buses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'drivers'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>2. Drivers ({drivers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('routes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'routes'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>3. Routes ({routes.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CARS MANAGEMENT */}
      {activeTab === 'buses' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Fleet Cars & Vehicle Registration Roster (§4 & §7.3)</h2>
              <p className="text-[11px] text-slate-500">Unique registration numbers enforced per vehicle.</p>
            </div>
            <button
              onClick={() => setShowAddBusModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Car</span>
            </button>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase font-semibold">
                <th className="pb-3">Registration No</th>
                <th className="pb-3">Make & Model</th>
                <th className="pb-3">Passenger Capacity</th>
                <th className="pb-3">Tracking Mode</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {buses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 font-bold text-slate-900 text-xs">{b.reg_no}</td>
                  <td className="py-3 font-sans font-medium">{b.make} — {b.model}</td>
                  <td className="py-3">{b.capacity} Seats</td>
                  <td className="py-3 uppercase text-indigo-600 font-bold text-[10px]">Android / iOS Phone</td>
                  <td className="py-3 text-emerald-600 font-sans font-semibold">Active In Fleet</td>
                  <td className="py-3 text-right font-sans">
                    <button className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer">Edit Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* TAB 2: DRIVERS MANAGEMENT */}
      {activeTab === 'drivers' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Driver Roster & DPDP Consent Compliance (§7.3 & §12.2)</h2>
              <p className="text-[11px] text-slate-500">Fleet Managers have full unmasked access to commercial license numbers and addresses.</p>
            </div>
            <button
              onClick={() => setShowAddDriverModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Enroll New Driver</span>
            </button>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-left border-collapse min-w-[620px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase font-semibold">
                <th className="pb-3">Driver Name</th>
                <th className="pb-3">Phone (Login ID)</th>
                <th className="pb-3">License Number (Unmasked)</th>
                <th className="pb-3">Assigned PIN</th>
                <th className="pb-3">Duty Status</th>
                <th className="pb-3 text-right">Security Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 font-bold font-sans text-slate-900 text-xs">{d.name}</td>
                  <td className="py-3 text-indigo-600 font-semibold">{d.phone}</td>
                  <td className="py-3 font-semibold text-slate-800">{d.license}</td>
                  <td className="py-3 text-emerald-600 tracking-wider font-bold">•••••• ({d.pin})</td>
                  <td className="py-3 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ON DUTY
                    </span>
                  </td>
                  <td className="py-3 text-right font-sans">
                    <button
                      onClick={() => alert(`Temporary PIN for ${d.name} reset to 123456. First login will force change.`)}
                      className="text-amber-600 hover:text-amber-800 font-semibold cursor-pointer"
                    >
                      Reset PIN
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROUTES & STOPS MANAGEMENT */}
      {activeTab === 'routes' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Route Corridors & Versioned Stops (§4 & §10.3)</h2>
              <p className="text-[11px] text-slate-500">Routes are versioned so modifying stops never alters historical trip logs.</p>
            </div>
            <button
              onClick={() => setShowAddRouteModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create Route Corridor</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((r) => (
              <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold rounded-lg text-xs">
                      {r.code}
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs">{r.name}</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{r.distance_km} km</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Ordered Stop Sequence
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {r.stops.map((stop, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-1 bg-white rounded-lg border border-slate-200 text-[10px] text-slate-700 font-medium shadow-2xs"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddBus} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900">Add New Car Vehicle</h3>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Vehicle Registration Number</label>
              <input
                type="text"
                placeholder="MH-12-DT-0005"
                value={newRegNo}
                onChange={(e) => setNewRegNo(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono uppercase focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Car Model (e.g. Tata Nexon EV, MG ZS EV)</label>
              <input
                type="text"
                value={newBusModel}
                onChange={(e) => setNewBusModel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Passenger Seating Capacity</label>
              <input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddBusModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
              >
                Register Car
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ENROLL DRIVER */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddDriver} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900">Enroll New Driver</h3>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Driver Full Name</label>
              <input
                type="text"
                placeholder="Santosh Gaikwad"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Mobile Phone Number (Login ID)</label>
              <input
                type="text"
                placeholder="+919822007788"
                value={newDriverPhone}
                onChange={(e) => setNewDriverPhone(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Commercial License Number</label>
              <input
                type="text"
                placeholder="MH-14-2021-0078912"
                value={newDriverLicense}
                onChange={(e) => setNewDriverLicense(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Residential Address</label>
              <input
                type="text"
                placeholder="Shivajinagar, Pune"
                value={newDriverAddress}
                onChange={(e) => setNewDriverAddress(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDriverModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
              >
                Enroll Driver
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE ROUTE */}
      {showAddRouteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddRoute} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900">Create Route Corridor</h3>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Route Code</label>
              <input
                type="text"
                placeholder="RT-601"
                value={newRouteCode}
                onChange={(e) => setNewRouteCode(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono uppercase focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Route Name (Origin to Destination)</label>
              <input
                type="text"
                placeholder="Pune Station to Kothrud Depot"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Total Corridor Distance (km)</label>
              <input
                type="number"
                value={newRouteDistance}
                onChange={(e) => setNewRouteDistance(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRouteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
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
