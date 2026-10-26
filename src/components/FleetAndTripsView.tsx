import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Bus,
  UserCheck,
  Route as RouteIcon,
  Play,
  Plus,
  Smartphone,
  Power,
  Lock,
} from 'lucide-react';
import {
  CreateBusSchema,
  CreateDriverSchema,
  CreateTripSchema,
  CreateRouteSchema,
  SwapSpareDeviceSchema,
  type OperatorRole,
} from '../shared/contracts.ts';
import { formatIstDateTime, getStatusMeta } from '../utils/formatters.ts';

interface FleetAndTripsViewProps {
  snapshot: any;
  organizationId: number;
  operatorRole?: OperatorRole;
  onRefresh: () => Promise<void>;
}

const busColHelper = createColumnHelper<any>();

export const FleetAndTripsView: React.FC<FleetAndTripsViewProps> = ({
  snapshot,
  organizationId,
  operatorRole = 'admin',
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'buses' | 'drivers' | 'trips' | 'routes' | 'devices'
  >('buses');
  const [globalFilter, setGlobalFilter] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isReadOnly = operatorRole === 'viewer' || operatorRole === 'driver';

  const buses: any[] = snapshot?.buses || [];
  const drivers: any[] = snapshot?.drivers || [];
  const devices: any[] = snapshot?.devices || [];
  const routes: any[] = snapshot?.routes || [];
  const trips: any[] = snapshot?.trips || [];

  const handleToggleEntityActive = async (
    entityType: 'bus' | 'driver' | 'device' | 'route',
    entityId: number,
    isActive: boolean
  ) => {
    setFeedbackBanner(null);
    const res = await fetch('/v1/entities/active', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer operator-session-token',
        'x-organization-id': String(organizationId),
        'x-operator-role': operatorRole,
      },
      body: JSON.stringify({ entityType, entityId, isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedbackBanner({
        type: 'error',
        text: data.error || 'Could not update status',
      });
      return;
    }
    setFeedbackBanner({
      type: 'success',
      text: `${entityType.toUpperCase()} #${entityId} is now ${
        isActive ? 'Active' : 'Deactivated (past history kept safe)'
      }.`,
    });
    await onRefresh();
  };

  const busColumns = useMemo(
    () => [
      busColHelper.accessor('registrationNumber', {
        header: 'Bus Number',
        cell: (info) => (
          <span className="font-mono font-bold text-slate-900">{info.getValue()}</span>
        ),
      }),
      busColHelper.accessor('fleetCode', {
        header: 'Code',
        cell: (info) => <span className="font-mono text-slate-700">{info.getValue()}</span>,
      }),
      busColHelper.accessor('depotName', {
        header: 'Depot',
      }),
      busColHelper.accessor('locationSourceType', {
        header: 'GPS Type',
        cell: (info) => (
          <span className="text-xs">
            {info.getValue() === 'AIS140_VLTD' ? 'AIS-140 Box' : 'Driver Phone'}
          </span>
        ),
      }),
      busColHelper.accessor('trackingStatus', {
        header: 'Status',
        cell: (info) => {
          const meta = getStatusMeta(info.getValue());
          return <span className={`font-semibold ${meta.textClass}`}>{meta.shortLabel}</span>;
        },
      }),
      busColHelper.accessor(
        (row) => (row.device ? `${row.device.manufacturer} ${row.device.model}` : 'No Phone'),
        {
          id: 'boundDevice',
          header: 'Phone in Bus',
        }
      ),
      busColHelper.display({
        id: 'softDeactivate',
        header: 'Action',
        cell: (info) => {
          const row = info.row.original;
          const active = row.isActive !== false;
          return (
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleToggleEntityActive('bus', row.id, !active)}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border cursor-pointer disabled:opacity-40 ${
                active
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{active ? 'Deactivate' : 'Turn On'}</span>
            </button>
          );
        },
      }),
    ],
    [isReadOnly, operatorRole, organizationId]
  );

  const busTable = useReactTable({
    data: buses,
    columns: busColumns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const busForm = useForm({
    resolver: zodResolver(CreateBusSchema),
    defaultValues: {
      registrationNumber: 'MH-12-FC-1025',
      fleetCode: 'BUS-025',
      depotName: 'Pune Wakad Depot',
      busModel: 'Tata Starbus EV 12m',
      capacity: 45,
      locationSourceType: 'ANDROID_COMPANION' as const,
      ais140DeviceImei: '',
    },
  });

  const driverForm = useForm({
    resolver: zodResolver(CreateDriverSchema),
    defaultValues: {
      employeeCode: 'DRV-209',
      fullName: '',
      phone: '+91 98230 55109',
      licenseNumber: 'MH12-20190088219',
      preferredLanguage: 'Marathi / Hindi / English',
      dpdpNoticeAccepted: true,
    },
  });

  const tripForm = useForm({
    resolver: zodResolver(CreateTripSchema),
    defaultValues: {
      tripCode: `TRP-${Date.now().toString().slice(-5)}`,
      busId: buses[0]?.id || 1,
      driverId: drivers[0]?.id || 1,
      deviceId: devices[0]?.id || 1,
      routeId: routes[0]?.id || 1,
      scheduledStartAt: new Date().toISOString().slice(0, 16),
    },
  });

  const routeForm = useForm({
    resolver: zodResolver(CreateRouteSchema),
    defaultValues: {
      routeCode: 'R-104',
      name: 'Pune Swargate — Nashik CBS Express',
      originName: 'Pune Swargate Bus Stand',
      destinationName: 'Nashik CBS Terminal',
      distanceKm: 212,
      scheduledDurationMin: 240,
      stopsText:
        'Swargate Stand, 18.5018, 73.8636, 0\nChakan MIDC Chowk, 18.7606, 73.8630, 55\nSangamner Bypass, 19.5761, 74.2070, 150\nNashik CBS Terminal, 19.9975, 73.7898, 240',
    },
  });

  const swapDeviceForm = useForm({
    resolver: zodResolver(SwapSpareDeviceSchema),
    defaultValues: {
      busId: buses[0]?.id || 1,
      deviceUid: `DEV-SPARE-XIAOMI-${Math.floor(100 + Math.random() * 899)}`,
      manufacturer: 'Xiaomi',
      model: 'Redmi Note 13 5G (Spare Phone)',
      osVersion: 'Android 14',
      mountVerified: true,
      chargerVerified: true,
    },
  });

  const handleCreateBus = busForm.handleSubmit(async (values) => {
    setFeedbackBanner(null);
    const res = await fetch('/v1/buses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer operator-session-token',
        'x-organization-id': String(organizationId),
        'x-operator-role': operatorRole,
      },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedbackBanner({ type: 'error', text: data.error || 'Could not add bus' });
      return;
    }
    setFeedbackBanner({
      type: 'success',
      text: `Bus ${values.registrationNumber} (${values.fleetCode}) added successfully.`,
    });
    await onRefresh();
  });

  const handleCreateDriver = driverForm.handleSubmit(async (values) => {
    setFeedbackBanner(null);
    const res = await fetch('/v1/drivers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer operator-session-token',
        'x-organization-id': String(organizationId),
        'x-operator-role': operatorRole,
      },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedbackBanner({ type: 'error', text: data.error || 'Could not add driver' });
      return;
    }
    setFeedbackBanner({
      type: 'success',
      text: `Driver ${values.fullName} added and privacy consent saved.`,
    });
    driverForm.reset({
      employeeCode: `DRV-${Math.floor(210 + Math.random() * 700)}`,
      fullName: '',
      phone: '+91 98230 55110',
      licenseNumber: 'MH12-20190088220',
      preferredLanguage: 'Marathi / Hindi / English',
      dpdpNoticeAccepted: true,
    });
    await onRefresh();
  });

  const handleDispatchTrip = tripForm.handleSubmit(async (values) => {
    setFeedbackBanner(null);
    const res = await fetch('/v1/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer operator-session-token',
        'x-organization-id': String(organizationId),
        'x-operator-role': operatorRole,
      },
      body: JSON.stringify({
        ...values,
        scheduledStartAt: new Date(values.scheduledStartAt).toISOString(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedbackBanner({ type: 'error', text: data.error || 'Could not start trip' });
      return;
    }
    setFeedbackBanner({
      type: 'success',
      text: `Trip ${values.tripCode} started and live tracking is now active.`,
    });
    await onRefresh();
  });

  const handleCreateRoute = routeForm.handleSubmit(async (values) => {
    setFeedbackBanner(null);
    const res = await fetch('/v1/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer operator-session-token',
        'x-organization-id': String(organizationId),
        'x-operator-role': operatorRole,
      },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedbackBanner({ type: 'error', text: data.error || 'Could not save route' });
      return;
    }
    setFeedbackBanner({
      type: 'success',
      text: `Route ${values.routeCode} (${values.name}) saved with all stops.`,
    });
    await onRefresh();
  });

  const handleSwapDevice = swapDeviceForm.handleSubmit(async (values) => {
    setFeedbackBanner(null);
    const res = await fetch('/v1/devices/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer operator-session-token',
        'x-organization-id': String(organizationId),
        'x-operator-role': operatorRole,
      },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedbackBanner({ type: 'error', text: data.error || 'Could not swap phone' });
      return;
    }
    setFeedbackBanner({
      type: 'success',
      text: `Spare phone ${values.deviceUid} (${values.manufacturer} ${values.model}) is now linked to Bus #${values.busId}.`,
    });
    await onRefresh();
  });

  const handleToggleTripStatus = async (tripId: number, status: 'active' | 'completed') => {
    setFeedbackBanner(null);
    const res = await fetch(`/v1/trips/${tripId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer operator-session-token',
        'x-organization-id': String(organizationId),
        'x-operator-role': operatorRole,
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json();
      setFeedbackBanner({ type: 'error', text: err.error || 'Not allowed in Read-Only mode' });
      return;
    }
    await onRefresh();
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation bar — Fits on a single row at 760px+ with search box aligned right */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
          {[
            { id: 'buses', label: `Buses (${buses.length})`, icon: Bus },
            { id: 'drivers', label: `Drivers (${drivers.length})`, icon: UserCheck },
            { id: 'devices', label: `Spare Phones (${devices.length})`, icon: Smartphone },
            { id: 'trips', label: `Trips (${trips.length})`, icon: Play },
            { id: 'routes', label: `Routes (${routes.length})`, icon: RouteIcon },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveSubTab(t.id as any)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeSubTab === t.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          aria-label="Filter table records"
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search in table..."
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-900 w-44 sm:w-52"
        />
      </div>

      {isReadOnly && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2 font-medium">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              Viewing as <strong>{operatorRole.toUpperCase()}</strong> (Read-Only): Driver personal
              phone numbers and license numbers are hidden for privacy, and editing is locked.
            </span>
          </div>
          <span className="font-mono text-[11px]">Switch Role to Admin to edit</span>
        </div>
      )}

      {feedbackBanner && (
        <div
          role="status"
          className={`p-3.5 rounded-lg border text-xs font-medium ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedbackBanner.text}
        </div>
      )}

      {activeSubTab === 'buses' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <div className="md:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">All Buses</h3>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                Showing {busTable.getRowModel().rows.length} of {buses.length} buses
              </span>
            </div>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  {busTable.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      {hg.headers.map((header) => (
                        <th key={header.id} className="py-2.5 px-2.5 font-semibold whitespace-nowrap">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {busTable.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50 ${
                        row.original.isActive === false ? 'opacity-55 bg-slate-50' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="py-2.5 px-2.5 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form
            onSubmit={handleCreateBus}
            className="md:col-span-4 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3.5"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Add New Bus</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add a bus to your fleet and choose how its GPS location will be tracked
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bus Registration Number (RTO)
              </label>
              <input
                {...busForm.register('registrationNumber')}
                placeholder="MH-12-FC-1025"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md"
              />
              {busForm.formState.errors.registrationNumber && (
                <p className="mt-1 text-xs text-red-600">
                  {busForm.formState.errors.registrationNumber.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Bus Code</label>
                <input
                  {...busForm.register('fleetCode')}
                  placeholder="BUS-025"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md"
                />
                {busForm.formState.errors.fleetCode && (
                  <p className="mt-1 text-xs text-red-600">
                    {busForm.formState.errors.fleetCode.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Seats</label>
                <input
                  type="number"
                  {...busForm.register('capacity')}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bus Depot</label>
              <input
                {...busForm.register('depotName')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                GPS Tracker Type
              </label>
              <select
                {...busForm.register('locationSourceType')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white"
              >
                <option value="ANDROID_COMPANION">
                  Driver Android Phone (Any Brand)
                </option>
                <option value="AIS140_VLTD">
                  AIS-140 Vehicle GPS Box
                </option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isReadOnly}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save New Bus</span>
            </button>
          </form>
        </div>
      )}

      {activeSubTab === 'drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <div className="md:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">All Drivers</h3>
              <span className="text-xs font-mono text-slate-500">
                {operatorRole === 'viewer' || operatorRole === 'driver'
                  ? 'Privacy Mode: Phone & License Hidden'
                  : 'Full Supervisor View'}
              </span>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Driver ID</th>
                    <th className="py-2.5 px-3 font-semibold">Full Name</th>
                    <th className="py-2.5 px-3 font-semibold">Mobile Number</th>
                    <th className="py-2.5 px-3 font-semibold">License Number</th>
                    <th className="py-2.5 px-3 font-semibold">Privacy Consent Saved</th>
                    <th className="py-2.5 px-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {drivers.map((drv) => (
                    <tr
                      key={drv.id}
                      className={`hover:bg-slate-50 ${
                        drv.isActive === false ? 'opacity-55 bg-slate-50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        {drv.employeeCode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{drv.fullName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{drv.phone}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{drv.licenseNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-700 tabular-nums">
                        {formatIstDateTime(drv.dpdpConsentRecordedAt)}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() =>
                            handleToggleEntityActive('driver', drv.id, drv.isActive === false)
                          }
                          className="px-2 py-1 text-[11px] font-medium border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                        >
                          {drv.isActive === false ? 'Turn On' : 'Deactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form
            onSubmit={handleCreateDriver}
            className="md:col-span-4 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3.5"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Add New Driver</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Saves driver details and confirms location is tracked only during trips
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Driver Full Name</label>
              <input
                {...driverForm.register('fullName')}
                placeholder="e.g., Ashok Tukaram More"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md"
              />
              {driverForm.formState.errors.fullName && (
                <p className="mt-1 text-xs text-red-600">
                  {driverForm.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Driver ID</label>
                <input
                  {...driverForm.register('employeeCode')}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Number</label>
                <input
                  {...driverForm.register('phone')}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Driving License Number
              </label>
              <input
                {...driverForm.register('licenseNumber')}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                {...driverForm.register('dpdpNoticeAccepted')}
                className="mt-0.5 accent-slate-900"
              />
              <span>
                Driver has been informed in English and Marathi/Hindi that GPS is tracked only during active bus trips.
              </span>
            </label>

            <button
              type="submit"
              disabled={isReadOnly}
              className="w-full px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-md cursor-pointer"
            >
              Save New Driver
            </button>
          </form>
        </div>
      )}

      {activeSubTab === 'devices' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <div className="md:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Phones &amp; GPS Boxes Assigned to Buses
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Phone / Box ID</th>
                    <th className="py-2.5 px-3 font-semibold">Phone Brand &amp; Model</th>
                    <th className="py-2.5 px-3 font-semibold">Assigned Bus</th>
                    <th className="py-2.5 px-3 font-semibold">Battery</th>
                    <th className="py-2.5 px-3 font-semibold">Holder &amp; Charger</th>
                    <th className="py-2.5 px-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {devices.map((dev) => (
                    <tr
                      key={dev.id}
                      className={`hover:bg-slate-50 ${
                        dev.isActive === false ? 'opacity-50 bg-slate-50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {dev.deviceUid}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {dev.manufacturer} {dev.model}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {dev.assignedBusId ? `Bus #${dev.assignedBusId}` : 'Spare Phone (Not in Bus)'}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums">
                        {dev.batteryPct}% {dev.isCharging ? '⚡' : ''}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700 font-medium">
                        {dev.mountVerified && dev.chargerVerified ? 'Checked OK' : 'Check Needed'}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() =>
                            handleToggleEntityActive('device', dev.id, dev.isActive === false)
                          }
                          className="px-2 py-1 text-[11px] font-medium border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                        >
                          {dev.isActive === false ? 'Turn On' : 'Deactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form
            onSubmit={handleSwapDevice}
            className="md:col-span-4 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3.5"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Replace Broken Phone with Depot Spare Phone
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                If a bus phone breaks or gets lost, link a spare phone to that bus in 1 click
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Which Bus Needs the Spare Phone?
              </label>
              <select
                {...swapDeviceForm.register('busId')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white"
              >
                {buses.slice(0, 25).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.registrationNumber} ({b.fleetCode}) — Current:{' '}
                    {b.device?.deviceUid || 'None'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                New Spare Phone ID / Tag
              </label>
              <input
                {...swapDeviceForm.register('deviceUid')}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Brand
                </label>
                <select
                  {...swapDeviceForm.register('manufacturer')}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value="Xiaomi">Xiaomi / Redmi</option>
                  <option value="Vivo">Vivo</option>
                  <option value="Oppo">Oppo</option>
                  <option value="Realme">Realme</option>
                  <option value="Samsung">Samsung Galaxy</option>
                  <option value="Motorola">Motorola</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone Model</label>
                <input
                  {...swapDeviceForm.register('model')}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isReadOnly}
              className="w-full px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-md cursor-pointer"
            >
              Link Spare Phone to Bus
            </button>
          </form>
        </div>
      )}

      {activeSubTab === 'trips' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <div className="md:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Current &amp; Scheduled Bus Trips
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Trip Number</th>
                    <th className="py-2.5 px-3 font-semibold">Bus</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Start Time (IST)</th>
                    <th className="py-2.5 px-3 font-semibold">Phone Check</th>
                    <th className="py-2.5 px-3 font-semibold">Start / Stop Trip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {trips.map((trp) => (
                    <tr key={trp.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {trp.tripCode}
                      </td>
                      <td className="py-2.5 px-3 font-mono">Bus #{trp.busId}</td>
                      <td className="py-2.5 px-3 font-semibold uppercase">
                        <span
                          className={
                            trp.status === 'active'
                              ? 'text-emerald-700'
                              : trp.status === 'scheduled'
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }
                        >
                          {trp.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                        {formatIstDateTime(trp.scheduledStartAt)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Holder OK · Charging · GPS Ready
                      </td>
                      <td className="py-2.5 px-3">
                        {trp.status === 'active' ? (
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleToggleTripStatus(trp.id, 'completed')}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer"
                          >
                            End Trip
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleToggleTripStatus(trp.id, 'active')}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded cursor-pointer"
                          >
                            Start Trip Now
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form
            onSubmit={handleDispatchTrip}
            className="md:col-span-4 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3.5"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Start or Schedule a New Trip</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose a bus, driver, and route to start live tracking
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Trip Number</label>
              <input
                {...tripForm.register('tripCode')}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Choose Bus</label>
              <select
                {...tripForm.register('busId')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white"
              >
                {buses.slice(0, 25).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.registrationNumber} ({b.fleetCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Choose Driver</label>
              <select
                {...tripForm.register('driverId')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white"
              >
                {drivers.slice(0, 25).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Choose Route</label>
              <select
                {...tripForm.register('routeId')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.routeCode} — {r.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isReadOnly}
              className="w-full px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-md cursor-pointer"
            >
              Start Trip Now
            </button>
          </form>
        </div>
      )}

      {activeSubTab === 'routes' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {routes.map((r) => (
              <div
                key={r.id}
                className={`bg-white border border-slate-200 rounded-lg p-4 space-y-2.5 ${
                  r.isActive === false ? 'opacity-55 bg-slate-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">{r.routeCode}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      {r.distanceKm} km · {r.scheduledDurationMin} min
                    </span>
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() =>
                        handleToggleEntityActive('route', r.id, r.isActive === false)
                      }
                      className="px-2 py-0.5 text-[11px] border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      {r.isActive === false ? 'Turn On' : 'Deactivate'}
                    </button>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{r.name}</h4>
                <div className="text-xs text-slate-600">
                  From: <strong className="text-slate-900">{r.originName}</strong> → To:{' '}
                  <strong className="text-slate-900">{r.destinationName}</strong>
                </div>
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <div className="text-xs font-semibold text-slate-700">Bus Stops on This Route:</div>
                  {(r.stops || []).map((s: any) => (
                    <div
                      key={s.seq}
                      className="flex items-center justify-between text-xs text-slate-600 font-mono tabular-nums"
                    >
                      <span>
                        0{s.seq}. {s.name}
                      </span>
                      <span>
                        +{s.offsetMin}m ({Number(s.lat).toFixed(3)}, {Number(s.lng).toFixed(3)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleCreateRoute}
            className="md:col-span-4 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3.5"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Add New Bus Route &amp; Stops
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add a route with start, end, and bus stop locations
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Route Code</label>
                <input
                  {...routeForm.register('routeCode')}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Distance (km)</label>
                <input
                  type="number"
                  {...routeForm.register('distanceKm')}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Route Name</label>
              <input
                {...routeForm.register('name')}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Start Point</label>
                <input
                  {...routeForm.register('originName')}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">End Point</label>
                <input
                  {...routeForm.register('destinationName')}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bus Stops (One per line: Stop Name, Lat, Lng, Minutes from Start)
              </label>
              <textarea
                rows={4}
                {...routeForm.register('stopsText')}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-md"
              />
            </div>

            <button
              type="submit"
              disabled={isReadOnly}
              className="w-full px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-md cursor-pointer"
            >
              Save Route &amp; Stops
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
