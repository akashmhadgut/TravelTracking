import React, { useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  UserCheck,
  Building2,
  FileCheck2,
  History,
  Plus,
  Search,
  Mail,
  Phone,
  Clock,
  Calendar,
  AlertTriangle,
  X,
  FileText,
  UserPlus,
  Car,
  MapPin,
} from 'lucide-react';
import { FleetManagementView } from './FleetManagementView';
import { LiveMap } from './LiveMap';
import { DispatchTripModal } from './DispatchTripModal';

type SuperAdminTab = 'company' | 'settings' | 'users' | 'consents' | 'audit' | 'fleet_dir' | 'live_ops';

export const SuperAdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('company');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // 1. Company Profile State
  const [companyName, setCompanyName] = useState('City Express Transit Pvt Ltd');
  const [cinNumber, setCinNumber] = useState('U60200PN2021PTC199843');
  const [contactEmail, setContactEmail] = useState('admin@fleetcommand.io');
  const [contactPhone, setContactPhone] = useState('+91 20 2553 4400');
  const [operatingHoursStart, setOperatingHoursStart] = useState('05:00');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState('23:30');
  const [timezone] = useState('Asia/Kolkata (IST +05:30)');

  // 2. System Settings & Safety Thresholds State
  const [speedLimit, setSpeedLimit] = useState(80);
  const [stoppageTimeout, setStoppageTimeout] = useState(15);
  const [retentionDays, setRetentionDays] = useState(90);
  const [staleInterval, setStaleInterval] = useState(60);
  const [offlineInterval, setOfflineInterval] = useState(300);
  const [auditRetentionYears, setAuditRetentionYears] = useState(7);

  // 3. User Roster State
  const [users, setUsers] = useState([
    { id: 'usr-1', name: 'Rajesh Sharma', email: 'admin@fleetcommand.io', phone: '+919822000001', role: 'super_admin', status: 'active', lastLogin: 'Just now' },
    { id: 'usr-2', name: 'Priya Sharma', email: 'manager@fleetcommand.io', phone: '+919822000002', role: 'fleet_manager', status: 'active', lastLogin: '15 mins ago' },
    { id: 'usr-3', name: 'Amit Deshmukh', email: 'supervisor@fleetcommand.io', phone: '+919822000003', role: 'supervisor', status: 'active', lastLogin: '45 mins ago' },
    { id: 'usr-4', name: 'Sunil Patil', email: 'sunil.ops@fleetcommand.io', phone: '+919822000004', role: 'supervisor', status: 'suspended', lastLogin: '3 days ago' },
  ]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<'fleet_manager' | 'supervisor'>('fleet_manager');
  const [newUserPassword, setNewUserPassword] = useState('Welcome@2026');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // 4. Driver DPDP Consent Registry State
  const [consents] = useState([
    { id: 'drv-01', name: 'Ganesh Jadhav', phone: '+919822001122', license: 'MH-14-2018-0045129', status: 'CONSENTED', version: 'v1.0 (DPDP 2023)', consentedAt: '2026-10-26 09:30:15', ip: '103.21.144.12', device: 'Samsung Galaxy A34 (Android 14)' },
    { id: 'drv-02', name: 'Sunil Patil', phone: '+919822003344', license: 'MH-12-2019-0098432', status: 'CONSENTED', version: 'v1.0 (DPDP 2023)', consentedAt: '2026-10-25 14:15:22', ip: '103.21.144.15', device: 'Xiaomi Redmi Note 12 (Android 13)' },
    { id: 'drv-03', name: 'Ramesh More', phone: '+919822005566', license: 'MH-14-2020-0012876', status: 'PENDING', version: 'Pending Acceptance', consentedAt: '-', ip: '-', device: 'Pending Phone Login' },
  ]);
  const [selectedConsentCert, setSelectedConsentCert] = useState<any | null>(null);

  // 5. Append-Only Audit Log State
  const [auditEntries, setAuditEntries] = useState([
    { id: 'aud-01', actor: 'admin@fleetcommand.io (Super Admin)', action: 'UPDATE_ORGANIZATION_SETTINGS', entity: 'organizations/settings', timestamp: '2026-10-26 12:15:00', ip: '103.21.144.10', details: 'Speed limit set to 80 km/h; GPS retention set to 90 days' },
    { id: 'aud-02', actor: 'manager@fleetcommand.io (Fleet Manager)', action: 'DISPATCH_TRIP', entity: 'trips/0192f0a1-7c3e', timestamp: '2026-10-26 11:45:10', ip: '103.21.144.12', details: 'Bus MH-12-DT-0001 paired with Driver Ganesh Jadhav on Route RT-501' },
    { id: 'aud-03', actor: 'manager@fleetcommand.io (Fleet Manager)', action: 'ENROLL_DRIVER_RECORD', entity: 'drivers/drv-001', timestamp: '2026-10-26 11:20:00', ip: '103.21.144.12', details: 'Enrolled driver Ganesh Jadhav (HMV-Passenger)' },
    { id: 'aud-04', actor: 'ganesh.jadhav (Driver)', action: 'DPDP_LOCATION_CONSENT_ACCEPTED', entity: 'consents/drv-001', timestamp: '2026-10-26 09:30:15', ip: '172.56.21.89', details: 'Accepted DPDP location tracking consent v1.0 during mobile onboarding' },
    { id: 'aud-05', actor: 'admin@fleetcommand.io (Super Admin)', action: 'CREATE_USER_ACCOUNT', entity: 'users/usr-3', timestamp: '2026-10-25 18:00:20', ip: '103.21.144.10', details: 'Created supervisor account for Amit Deshmukh' },
  ]);
  const [auditSearch, setAuditSearch] = useState('');

  // 6. Dispatch Modal for Super Admin
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  // Helpers
  const triggerSavedNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setAuditEntries((prev) => [
      {
        id: `aud-${Date.now()}`,
        actor: 'admin@fleetcommand.io (Super Admin)',
        action: 'UPDATE_COMPANY_PROFILE',
        entity: 'organization/profile',
        timestamp: new Date().toLocaleString(),
        ip: '127.0.0.1 (Local)',
        details: `Updated operating hours to ${operatingHoursStart} - ${operatingHoursEnd}, CIN: ${cinNumber}`,
      },
      ...prev,
    ]);
    triggerSavedNotice('Company account profile updated & recorded to audit log');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setAuditEntries((prev) => [
      {
        id: `aud-${Date.now()}`,
        actor: 'admin@fleetcommand.io (Super Admin)',
        action: 'UPDATE_SYSTEM_SETTINGS',
        entity: 'organization/safety_policies',
        timestamp: new Date().toLocaleString(),
        ip: '127.0.0.1 (Local)',
        details: `Speed Limit: ${speedLimit} km/h, GPS Retention: ${retentionDays}d, Stale: ${staleInterval}s, Offline: ${offlineInterval}s`,
      },
      ...prev,
    ]);
    triggerSavedNotice('System settings & safety thresholds saved');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    const newUser = {
      id: `usr-${users.length + 1}`,
      name: newUserName,
      email: newUserEmail,
      phone: newUserPhone || '+91 98000 00000',
      role: newUserRole,
      status: 'active',
      lastLogin: 'Never (Invited)',
    };

    setUsers((prev) => [...prev, newUser]);
    setAuditEntries((prev) => [
      {
        id: `aud-${Date.now()}`,
        actor: 'admin@fleetcommand.io (Super Admin)',
        action: 'CREATE_USER_ACCOUNT',
        entity: `users/${newUser.id}`,
        timestamp: new Date().toLocaleString(),
        ip: '127.0.0.1 (Local)',
        details: `Created new ${newUserRole} account for ${newUserName} (${newUserEmail})`,
      },
      ...prev,
    ]);

    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setShowAddUserModal(false);
    triggerSavedNotice(`User ${newUserName} successfully created`);
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const newStatus = u.status === 'active' ? 'suspended' : 'active';
          setAuditEntries((aud) => [
            {
              id: `aud-${Date.now()}`,
              actor: 'admin@fleetcommand.io (Super Admin)',
              action: newStatus === 'active' ? 'ACTIVATE_USER' : 'SUSPEND_USER',
              entity: `users/${u.id}`,
              timestamp: new Date().toLocaleString(),
              ip: '127.0.0.1',
              details: `Changed account status of ${u.name} (${u.email}) to ${newStatus}`,
            },
            ...aud,
          ]);
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100 font-sans">
      {/* Super Admin Top Sub-Navigation Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'company'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. Company Account</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>2. System Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>3. Staff Users ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('consents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'consents'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>4. Driver Consents</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>5. Audit Log ({auditEntries.length})</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-2" />

          {/* Super Admin Omniscient Access (Can do everything a Fleet Manager can) */}
          <button
            onClick={() => setActiveTab('fleet_dir')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'fleet_dir'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-blue-400" />
            <span>Cars Directory</span>
          </button>

          <button
            onClick={() => setActiveTab('live_ops')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'live_ops'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>Live Operations Desk</span>
          </button>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* ========================================================= */}
        {/* TAB 1: Company Account Setup */}
        {/* ========================================================= */}
        {activeTab === 'company' && (
          <div className="max-w-4xl mx-auto p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  <span>Company Account & Organization Profile</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Owner authority: Setup legal entity identity, contact details, operating hours, and localized timezone.
                </p>
              </div>
              <span className="text-[10px] font-mono bg-purple-950/60 border border-purple-800/40 text-purple-300 px-2.5 py-1 rounded font-bold">
                TENANT ID: 0192f0a1-7c3e-7c11-9d0a
              </span>
            </div>

            <form onSubmit={handleSaveCompany} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Registered Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Corporate Registration (CIN / GSTIN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={cinNumber}
                    onChange={(e) => setCinNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Official Contact Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Support Contact Phone *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Operating Hours & Timezone */}
              <div className="border-t border-slate-800/80 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Fleet Operating Window & Dispatch Hours</span>
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Daily Operations Start</label>
                    <input
                      type="time"
                      value={operatingHoursStart}
                      onChange={(e) => setOperatingHoursStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Daily Operations End</label>
                    <input
                      type="time"
                      value={operatingHoursEnd}
                      onChange={(e) => setOperatingHoursEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">System Timezone</label>
                    <input
                      type="text"
                      disabled
                      value={timezone}
                      className="w-full bg-slate-950/60 border border-slate-800/60 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Organization Account Details</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: System Settings & Safety Thresholds */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  <span>Global Safety Limits & GPS Retention Policies</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Configure real-time overspeed alert limits, stale signal window, offline thresholds, and raw telemetry retention days.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Real-Time Alert Thresholds (Spec §4)</span>
                </h3>

                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Fleet Overspeed Threshold (km/h)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Triggers high-severity overspeed alert to Supervisors if sustained for &gt; 30 seconds.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={30}
                        max={140}
                        value={speedLimit}
                        onChange={(e) => setSpeedLimit(Number(e.target.value))}
                        className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono font-bold"
                      />
                      <span className="text-xs text-slate-400 font-semibold">km/h limit</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Unplanned Stoppage / Idle Alert (Minutes)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Alerts Control Room if bus is stopped on route without scheduled stop for &gt; N minutes.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={5}
                        max={60}
                        value={stoppageTimeout}
                        onChange={(e) => setStoppageTimeout(Number(e.target.value))}
                        className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono font-bold"
                      />
                      <span className="text-xs text-slate-400 font-semibold">minutes idle</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GPS Retention & Heartbeat Policy */}
              <div className="border-t border-slate-800/80 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>Telemetry Retention & Signal Timing (Spec §4 & §12)</span>
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Raw GPS Retention (Days)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={365}
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">PostgreSQL monthly partitions dropped after N days</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Stale Signal Window (Seconds)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={300}
                      value={staleInterval}
                      onChange={(e) => setStaleInterval(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Bus marked yellow 'Stale' if no telemetry arrives</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Offline Signal Window (Seconds)
                    </label>
                    <input
                      type="number"
                      min={120}
                      max={1800}
                      value={offlineInterval}
                      onChange={(e) => setOfflineInterval(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Bus marked red 'Offline' after N seconds silence</span>
                  </div>
                </div>
              </div>

              {/* Compliance Audit Retention */}
              <div className="border-t border-slate-800/80 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-300">
                      Compliance Audit Log Retention Period
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Audit trail logs are immutable and stored in append-only partition (§12.2).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={auditRetentionYears}
                      onChange={(e) => setAuditRetentionYears(Number(e.target.value))}
                      className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center font-bold"
                    />
                    <span className="text-xs text-slate-400">Years</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply & Enforce System Policies</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: Staff User Management (Fleet Managers & Supervisors) */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="max-w-5xl mx-auto p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-400" />
                  <span>Staff User Administration & RBAC Hierarchy</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Create and manage authorized staff accounts: Fleet Managers (full fleet authority) and Supervisors (read-only control room).
                </p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Create New Staff User</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search staff by name, email, or role..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-4">Staff Member</th>
                    <th className="p-4">Contact Phone</th>
                    <th className="p-4">System Role</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4">Last Activity</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users
                    .filter((u) => u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
                    .map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-4">
                          <div className="font-bold text-white text-sm">{user.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{user.email}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-300">{user.phone}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                              user.role === 'super_admin'
                                ? 'bg-purple-950/60 border-purple-600/40 text-purple-300'
                                : user.role === 'fleet_manager'
                                ? 'bg-blue-950/60 border-blue-600/40 text-blue-300'
                                : 'bg-amber-950/60 border-amber-600/40 text-amber-300'
                            }`}
                          >
                            {user.role === 'super_admin' ? 'Super Admin' : user.role === 'fleet_manager' ? 'Fleet Manager' : 'Supervisor'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              user.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-[11px]">{user.lastLogin}</td>
                        <td className="p-4 text-right">
                          {user.role !== 'super_admin' ? (
                            <button
                              onClick={() => toggleUserStatus(user.id)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition border ${
                                user.status === 'active'
                                  ? 'bg-rose-950/40 border-rose-800/40 text-rose-300 hover:bg-rose-900/60'
                                  : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/60'
                              }`}
                            >
                              {user.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono">Owner (Protected)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: Driver DPDP Consent Compliance Registry */}
        {/* ========================================================= */}
        {activeTab === 'consents' && (
          <div className="max-w-5xl mx-auto p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-400" />
                  <span>Driver Location Consent Compliance Register</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enforces India Digital Personal Data Protection (DPDP) Act 2023 & §6 of Spec. Drivers without valid consent cannot be dispatched on trips.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 rounded-lg text-xs font-bold font-mono">
                  DPDP Policy: v1.0 Active
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-[11px] font-bold uppercase text-slate-400">Total Enrolled Drivers</div>
                <div className="text-2xl font-black text-white mt-1">{consents.length}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-[11px] font-bold uppercase text-emerald-400">Consent Verified (Eligible)</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {consents.filter((c) => c.status === 'CONSENTED').length}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-[11px] font-bold uppercase text-amber-400">Pending Consent (Blocked)</div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {consents.filter((c) => c.status === 'PENDING').length}
                </div>
              </div>
            </div>

            {/* Consents Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-4">Driver Name & Phone</th>
                    <th className="p-4">Licence Number</th>
                    <th className="p-4">Consent Status</th>
                    <th className="p-4">Consent Version</th>
                    <th className="p-4">Timestamp & Device</th>
                    <th className="p-4 text-right">Audit Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {consents.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4">
                        <div className="font-bold text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{c.phone}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-300">{c.license}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                            c.status === 'CONSENTED'
                              ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300'
                              : 'bg-amber-950/60 border-amber-600/40 text-amber-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-300">{c.version}</td>
                      <td className="p-4">
                        <div className="text-slate-300 font-mono text-[11px]">{c.consentedAt}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{c.device}</div>
                      </td>
                      <td className="p-4 text-right">
                        {c.status === 'CONSENTED' ? (
                          <button
                            onClick={() => setSelectedConsentCert(c)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1 ml-auto"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>View Proof</span>
                          </button>
                        ) : (
                          <span className="text-amber-400 text-[11px] font-semibold">Requires Phone Login</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: Append-Only Audit Trail */}
        {/* ========================================================= */}
        {activeTab === 'audit' && (
          <div className="max-w-5xl mx-auto p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  <span>Append-Only Forensic Transaction Audit Trail</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enforces §12.2 of Spec. Tracks every change to settings, user roles, driver enrollments, and trip lifecycle events.
                </p>
              </div>
              <span className="text-[10px] font-mono bg-purple-950/60 border border-purple-800/40 text-purple-300 px-3 py-1 rounded font-bold">
                NO UPDATE/DELETE GRANT
              </span>
            </div>

            {/* Filter */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter audit events by actor, action, or target entity..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Audit List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl divide-y divide-slate-800/60 font-mono text-xs">
              {auditEntries
                .filter((a) =>
                  a.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                  a.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
                  a.details.toLowerCase().includes(auditSearch.toLowerCase())
                )
                .map((a) => (
                  <div key={a.id} className="p-4 hover:bg-slate-800/30 transition flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-400 text-xs">{a.action}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-200 font-semibold">{a.actor}</span>
                      </div>
                      <div className="text-slate-300 text-[11px] font-sans">{a.details}</div>
                      <div className="text-[10px] text-slate-500">
                        Target: <span className="text-slate-400">{a.entity}</span> • IP: {a.ip}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 shrink-0 text-right">
                      {a.timestamp}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: Fleet Directory (Omniscient Super Admin access) */}
        {/* ========================================================= */}
        {activeTab === 'fleet_dir' && (
          <div className="h-full">
            <FleetManagementView />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: Live Operations & Dispatch (Omniscient Super Admin access) */}
        {/* ========================================================= */}
        {activeTab === 'live_ops' && (
          <div className="h-full relative flex">
            <div className="absolute top-4 left-4 z-20">
              <button
                onClick={() => setShowDispatchModal(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-2xl transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Dispatch New Trip</span>
              </button>
            </div>
            <LiveMap />
          </div>
        )}
      </div>

      {/* Modal 1: Create New Staff User */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-400" />
                <span>Create New Staff Account</span>
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Deshpande"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@fleetcommand.io"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Mobile Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98220 00000"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Assigned System Role *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="fleet_manager">Fleet Manager (Full resource & dispatch authority)</option>
                  <option value="supervisor">Supervisor (Read-only control room live feed & alerts)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Temporary Initial Password</label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">User will be prompted to change on first login</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/30"
                >
                  Create & Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: View DPDP Driver Consent Certificate */}
      {selectedConsentCert && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>DPDP 2023 Location Consent Proof</span>
              </h3>
              <button
                onClick={() => setSelectedConsentCert(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Driver Name:</span>
                <span className="font-bold text-white">{selectedConsentCert.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mobile Phone:</span>
                <span className="text-slate-200">{selectedConsentCert.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Licence No:</span>
                <span className="text-slate-200">{selectedConsentCert.license}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Policy Version:</span>
                <span className="text-emerald-400 font-bold">{selectedConsentCert.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Consent Timestamp:</span>
                <span className="text-slate-200">{selectedConsentCert.consentedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Device Hardware:</span>
                <span className="text-slate-300">{selectedConsentCert.device}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">IP Origin:</span>
                <span className="text-slate-300">{selectedConsentCert.ip}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-[11px] text-emerald-300 leading-relaxed">
              ✓ Complies with Section 6 of India DPDP Act 2023. Notice given in Marathi, Hindi, and English. Driver explicit affirmative consent recorded with non-repudiation timestamp.
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedConsentCert(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Super Admin Dispatch Trip Modal */}
      {showDispatchModal && (
        <DispatchTripModal
          onClose={() => setShowDispatchModal(false)}
          onTripDispatched={() => setShowDispatchModal(false)}
        />
      )}
    </div>
  );
};
