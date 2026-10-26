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
    { id: 'aud-02', actor: 'manager@fleetcommand.io (Fleet Manager)', action: 'DISPATCH_TRIP', entity: 'trips/0192f0a1-7c3e', timestamp: '2026-10-26 11:45:10', ip: '103.21.144.12', details: 'Car MH-12-DT-0001 paired with Driver Ganesh Jadhav on Route RT-501' },
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
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden text-slate-800 font-sans">
      {/* Super Admin Top Sub-Navigation Bar */}
      <div className="bg-white border-b border-slate-200/80 px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between z-20 shrink-0 shadow-2xs gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'company'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. Company</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>2. Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>3. Staff ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('consents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'consents'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>4. Consents</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>5. Audit ({auditEntries.length})</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

          {/* Super Admin Omniscient Access */}
          <button
            onClick={() => setActiveTab('fleet_dir')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'fleet_dir'
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cars Directory</span>
          </button>

          <button
            onClick={() => setActiveTab('live_ops')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'live_ops'
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
            <span>Live Operations</span>
          </button>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold animate-pulse shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-none">{savedNotice}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* TAB 1: Company Account Setup */}
        {activeTab === 'company' && (
          <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Company Account & Organization Profile</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Owner authority: Setup legal entity identity, contact details, operating hours, and localized timezone.
                </p>
              </div>
              <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-lg font-bold self-start sm:self-auto shrink-0">
                TENANT ID: 0192f0a1-7c3e-7c11-9d0a
              </span>
            </div>

            <form onSubmit={handleSaveCompany} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Corporate Registration (CIN / GSTIN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={cinNumber}
                    onChange={(e) => setCinNumber(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Official Contact Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Support Contact Phone *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </div>

              {/* Operating Hours & Timezone */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Fleet Operating Window & Dispatch Hours</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">Daily Operations Start</label>
                    <input
                      type="time"
                      value={operatingHoursStart}
                      onChange={(e) => setOperatingHoursStart(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">Daily Operations End</label>
                    <input
                      type="time"
                      value={operatingHoursEnd}
                      onChange={(e) => setOperatingHoursEnd(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">System Timezone</label>
                    <input
                      type="text"
                      disabled
                      value={timezone}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Organization Account Details</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: System Settings & Safety Thresholds */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Global Safety Limits & GPS Retention Policies</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Configure real-time overspeed alert limits, stale signal window, offline thresholds, and raw telemetry retention days.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xs">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Real-Time Alert Thresholds (Spec §4)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
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
                        className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600"
                      />
                      <span className="text-xs text-slate-500 font-semibold">km/h limit</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Unplanned Stoppage / Idle Alert (Minutes)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Alerts Control Room if car is stopped on route without scheduled stop for &gt; N minutes.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={5}
                        max={60}
                        value={stoppageTimeout}
                        onChange={(e) => setStoppageTimeout(Number(e.target.value))}
                        className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600"
                      />
                      <span className="text-xs text-slate-500 font-semibold">minutes idle</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GPS Retention & Heartbeat Policy */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Telemetry Retention & Signal Timing (Spec §4 & §12)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Raw GPS Retention (Days)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={365}
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">PostgreSQL monthly partitions dropped after N days</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Stale Signal Window (Seconds)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={300}
                      value={staleInterval}
                      onChange={(e) => setStaleInterval(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Car marked yellow 'Stale' if no telemetry arrives</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Offline Signal Window (Seconds)
                    </label>
                    <input
                      type="number"
                      min={120}
                      max={1800}
                      value={offlineInterval}
                      onChange={(e) => setOfflineInterval(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Car marked gray 'Offline' after N seconds silence</span>
                  </div>
                </div>
              </div>

              {/* Compliance Audit Retention */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
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
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono text-center font-bold focus:outline-none focus:border-indigo-600"
                    />
                    <span className="text-xs text-slate-500 font-medium">Years</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply & Enforce System Policies</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: Staff User Management */}
        {activeTab === 'users' && (
          <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Staff User Administration & RBAC Hierarchy</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Create and manage authorized staff accounts: Fleet Managers (full fleet authority) and Supervisors (read-only control room).
                </p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Create Staff User</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, email, or role..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Contact Phone</th>
                      <th className="p-4">System Role</th>
                      <th className="p-4">Account Status</th>
                      <th className="p-4">Last Activity</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                    {users
                      .filter((u) => u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
                      .map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-900 text-sm font-sans">{user.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{user.email}</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-slate-700">{user.phone}</td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                                user.role === 'super_admin'
                                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                                  : user.role === 'fleet_manager'
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                  : 'bg-amber-50 border-amber-200 text-amber-700'
                              }`}
                            >
                              {user.role === 'super_admin' ? 'Super Admin' : user.role === 'fleet_manager' ? 'Fleet Manager' : 'Supervisor'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                user.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 font-mono text-[11px]">{user.lastLogin}</td>
                          <td className="p-4 text-right font-sans">
                            {user.role !== 'super_admin' ? (
                              <button
                                onClick={() => toggleUserStatus(user.id)}
                                className={`px-2.5 py-1 rounded text-xs font-semibold transition border cursor-pointer ${
                                  user.status === 'active'
                                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {user.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">Owner (Protected)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Driver DPDP Consent Compliance Registry */}
        {activeTab === 'consents' && (
          <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Driver Location Consent Compliance Register</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enforces India Digital Personal Data Protection (DPDP) Act 2023 & §6 of Spec. Drivers without valid consent cannot be dispatched on trips.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold font-mono">
                  DPDP Policy: v1.0 Active
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-[11px] font-bold uppercase text-slate-500">Total Enrolled Drivers</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{consents.length}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-[11px] font-bold uppercase text-emerald-600">Consent Verified (Eligible)</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {consents.filter((c) => c.status === 'CONSENTED').length}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-[11px] font-bold uppercase text-amber-600">Pending Consent (Blocked)</div>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {consents.filter((c) => c.status === 'PENDING').length}
                </div>
              </div>
            </div>

            {/* Consents Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-4">Driver Name & Phone</th>
                      <th className="p-4">Licence Number</th>
                      <th className="p-4">Consent Status</th>
                      <th className="p-4">Consent Version</th>
                      <th className="p-4">Timestamp & Device</th>
                      <th className="p-4 text-right">Audit Proof</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                    {consents.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 font-sans">{c.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{c.phone}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-700">{c.license}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                              c.status === 'CONSENTED'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-600">{c.version}</td>
                        <td className="p-4">
                          <div className="text-slate-800 font-mono text-[11px]">{c.consentedAt}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{c.device}</div>
                        </td>
                        <td className="p-4 text-right font-sans">
                          {c.status === 'CONSENTED' ? (
                            <button
                              onClick={() => setSelectedConsentCert(c)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto shadow-2xs cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              <span>View Proof</span>
                            </button>
                          ) : (
                            <span className="text-amber-600 text-[11px] font-semibold">Requires Phone Login</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Append-Only Audit Trail */}
        {activeTab === 'audit' && (
          <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Append-Only Forensic Transaction Audit Trail</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enforces §12.2 of Spec. Tracks every change to settings, user roles, driver enrollments, and trip lifecycle events.
                </p>
              </div>
              <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg font-bold self-start sm:self-auto shrink-0">
                NO UPDATE/DELETE GRANT
              </span>
            </div>

            {/* Filter */}
            <div className="bg-white border border-slate-200 p-3 rounded-xl flex items-center gap-3 shadow-2xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter audit events by actor, action, or target entity..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Audit List */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 font-mono text-xs">
              {auditEntries
                .filter((a) =>
                  a.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                  a.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
                  a.details.toLowerCase().includes(auditSearch.toLowerCase())
                )
                .map((a) => (
                  <div key={a.id} className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-indigo-600 text-xs">{a.action}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-900 font-semibold font-sans">{a.actor}</span>
                      </div>
                      <div className="text-slate-600 text-[11px] font-sans">{a.details}</div>
                      <div className="text-[10px] text-slate-400">
                        Target: <span className="text-slate-600 font-semibold">{a.entity}</span> • IP: {a.ip}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 shrink-0 sm:text-right font-mono">
                      {a.timestamp}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 6: Fleet Directory */}
        {activeTab === 'fleet_dir' && (
          <div className="h-full">
            <FleetManagementView />
          </div>
        )}

        {/* TAB 7: Live Operations & Dispatch */}
        {activeTab === 'live_ops' && (
          <div className="h-full relative flex">
            <div className="absolute top-4 left-4 z-20">
              <button
                onClick={() => setShowDispatchModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Create New Staff Account</span>
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Deshpande"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@fleetcommand.io"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mobile Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98220 00000"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned System Role *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                >
                  <option value="fleet_manager">Fleet Manager (Full resource & dispatch authority)</option>
                  <option value="supervisor">Supervisor (Read-only control room live feed & alerts)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Temporary Initial Password</label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">User will be prompted to change on first login</span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>DPDP 2023 Location Consent Proof</span>
              </h3>
              <button
                onClick={() => setSelectedConsentCert(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Driver Name:</span>
                <span className="font-bold text-slate-900">{selectedConsentCert.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mobile Phone:</span>
                <span className="text-slate-700">{selectedConsentCert.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Licence No:</span>
                <span className="text-slate-700">{selectedConsentCert.license}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Policy Version:</span>
                <span className="text-emerald-700 font-bold">{selectedConsentCert.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Consent Timestamp:</span>
                <span className="text-slate-700">{selectedConsentCert.consentedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Device Hardware:</span>
                <span className="text-slate-600">{selectedConsentCert.device}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IP Origin:</span>
                <span className="text-slate-600">{selectedConsentCert.ip}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 leading-relaxed">
              ✓ Complies with Section 6 of India DPDP Act 2023. Notice given in Marathi, Hindi, and English. Driver explicit affirmative consent recorded with non-repudiation timestamp.
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedConsentCert(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
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
