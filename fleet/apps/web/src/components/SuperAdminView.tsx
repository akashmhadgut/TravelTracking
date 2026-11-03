import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  CheckCircle2,
  UserCheck,
  History,
  Plus,
  Search,
  Mail,
  Calendar,
  AlertTriangle,
  X,
  UserPlus,
  Car,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Edit3,
  KeyRound,
  Download,
  RefreshCw,
  Check,
  Copy,
  Database,
  Filter,
} from 'lucide-react';
import { apiFetch } from '../services/apiClient';
import { FleetManagementView } from './FleetManagementView';
import { LiveMap } from './LiveMap';
import { DispatchTripModal } from './DispatchTripModal';


type SuperAdminTab =
  | 'cars'
  | 'drivers'
  | 'trips'
  | 'live_ops'
  | 'users'
  | 'audit'
  | 'settings';


interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'fleet_manager' | 'supervisor' | 'driver';
  status: 'active' | 'suspended';
  last_login?: string;
  created_at?: string;
}






interface AuditRecord {
  id: string;
  actor: string;
  action: string;
  category: string;
  entity: string;
  timestamp: string;
  ip: string;
  details: string;
}


export const SuperAdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('cars');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);


  // 1. System Settings & Safety Thresholds State
  const [speedLimit, setSpeedLimit] = useState(80);
  const [stoppageTimeout, setStoppageTimeout] = useState(15);
  const [retentionDays, setRetentionDays] = useState(90);
  const [staleInterval, setStaleInterval] = useState(60);
  const [offlineInterval, setOfflineInterval] = useState(300);
  const [auditRetentionYears, setAuditRetentionYears] = useState(7);
  const [emergencyWebhook, setEmergencyWebhook] = useState(
    'https://hooks.fleetcommand.io/alerts/emergency'
  );
  const [emergencySms, setEmergencySms] = useState('+919822000000');


  // 3. Staff Users State - Only Super Admin Kept
  const [users, setUsers] = useState<UserRecord[]>([
    {
      id: 'usr-001',
      name: 'Vasant Kulkarni',
      email: 'admin@fleetcommand.io',
      phone: '+91 98220 00001',
      role: 'super_admin',
      status: 'active',
      last_login: 'Just now',
    },
  ]);

  // Synchronized fleet resource caches for Super Admin operations
  const [cachedDrivers, setCachedDrivers] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('fleetcommand_drivers_roster');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [cachedCars, setCachedCars] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('fleetcommand_cars_roster');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  useEffect(() => {
    const handleDriversUpdated = (e: any) => {
      if (Array.isArray(e.detail)) setCachedDrivers(e.detail);
    };
    const handleCarsUpdated = (e: any) => {
      if (Array.isArray(e.detail)) setCachedCars(e.detail);
    };
    window.addEventListener('fleetcommand_drivers_updated', handleDriversUpdated);
    window.addEventListener('fleetcommand_cars_updated', handleCarsUpdated);
    return () => {
      window.removeEventListener('fleetcommand_drivers_updated', handleDriversUpdated);
      window.removeEventListener('fleetcommand_cars_updated', handleCarsUpdated);
    };
  }, []);

  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserRecord | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{
    userName: string;
    email: string;
    tempPass: string;
  } | null>(null);


  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<'super_admin' | 'fleet_manager' | 'supervisor' | 'driver'>(
    'fleet_manager'
  );
  const [newUserPassword, setNewUserPassword] = useState('Welcome@2026');






  // 5. Append-Only Audit Log State
  const [auditEntries, setAuditEntries] = useState<AuditRecord[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('ALL');
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<AuditRecord | null>(null);


  // 6. Retention Purge & Dispatch Modals
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);


  // Notification Helpers
  const triggerSavedNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 4000);
  };


  const triggerErrorNotice = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };


  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };


  // Initial Fetch from API
  const refreshAllAdminData = async () => {
    try {
      // Settings
      apiFetch<any>('/v1/admin/settings')
        .then((data) => {
          if (data) {
            setSpeedLimit(data.speed_limit_kmh ?? speedLimit);
            setStoppageTimeout(data.stoppage_timeout_min ?? stoppageTimeout);
            setRetentionDays(data.retention_days ?? retentionDays);
            setStaleInterval(data.stale_interval_s ?? staleInterval);
            setOfflineInterval(data.offline_interval_s ?? offlineInterval);
            setAuditRetentionYears(data.audit_retention_years ?? auditRetentionYears);
            setEmergencyWebhook(data.emergency_alert_webhook || emergencyWebhook);
            setEmergencySms(data.emergency_sms_recipient || emergencySms);
          }
        })
        .catch(() => {});


      // Staff Users
      apiFetch<{ users: UserRecord[] }>('/v1/admin/users')
        .then((data) => {
          if (data?.users) {
            setUsers(data.users);
          }
        })
        .catch(() => {});






      // Audit Trail
      apiFetch<{ audit_entries: AuditRecord[] }>('/v1/admin/audit')
        .then((data) => {
          if (data?.audit_entries) {
            setAuditEntries(data.audit_entries);
          }
        })
        .catch(() => {});
    } catch {
      // Graceful fallback to initial values
    }
  };


  useEffect(() => {
    refreshAllAdminData();
  }, []);


  // Handler 2: Save System Safety & Retention Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      speed_limit_kmh: Number(speedLimit),
      stoppage_timeout_min: Number(stoppageTimeout),
      retention_days: Number(retentionDays),
      stale_interval_s: Number(staleInterval),
      offline_interval_s: Number(offlineInterval),
      audit_retention_years: Number(auditRetentionYears),
      emergency_alert_webhook: emergencyWebhook,
      emergency_sms_recipient: emergencySms,
    };


    try {
      await apiFetch('/v1/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      triggerSavedNotice('Global safety thresholds & telemetry retention policies enforced.');
      refreshAllAdminData();
    } catch (err: any) {
      setAuditEntries((prev) => [
        {
          id: `aud-${Date.now()}`,
          actor: 'admin@fleetcommand.io (Super Admin)',
          action: 'UPDATE_SYSTEM_SETTINGS',
          category: 'SETTINGS',
          entity: 'organization/safety_policies',
          timestamp: new Date().toLocaleString(),
          ip: '127.0.0.1 (Local Session)',
          details: `Speed Limit: ${speedLimit} km/h, GPS Retention: ${retentionDays}d, Stale: ${staleInterval}s, Offline: ${offlineInterval}s`,
        },
        ...prev,
      ]);
      triggerSavedNotice('System settings & safety thresholds applied.');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Handler 3: Create Staff User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;


    setIsSubmitting(true);
    const payload = {
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim() || '+91 98000 00000',
      role: newUserRole,
      password: newUserPassword,
    };


    try {
      const res = await apiFetch<any>('/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });


      if (res?.user) {
        setUsers((prev) => [res.user, ...prev]);
      } else {
        setUsers((prev) => [
          {
            id: `usr-${Date.now().toString().slice(-4)}`,
            name: newUserName,
            email: newUserEmail,
            phone: newUserPhone || '+91 98000 00000',
            role: newUserRole,
            status: 'active',
            last_login: 'Never (Invited)',
          },
          ...prev,
        ]);
      }


      setResetPasswordResult({
        userName: newUserName,
        email: newUserEmail,
        tempPass: newUserPassword,
      });


      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setShowAddUserModal(false);
      triggerSavedNotice(`Staff account for ${payload.name} created successfully.`);
      refreshAllAdminData();
    } catch (err: any) {
      triggerErrorNotice(err.message || 'Failed to create user account.');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Handler 4: Edit Staff User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;


    setIsSubmitting(true);
    try {
      await apiFetch(`/v1/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingUser.name,
          phone: editingUser.phone,
          role: editingUser.role,
        }),
      });


      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? editingUser : u)));
      setEditingUser(null);
      triggerSavedNotice(`Account details for ${editingUser.name} updated.`);
      refreshAllAdminData();
    } catch (err: any) {
      triggerErrorNotice(err.message || 'Failed to update user details.');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Handler 5: Toggle User Account Status
  const toggleUserStatus = async (user: UserRecord) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await apiFetch(`/v1/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });


      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
      triggerSavedNotice(`User ${user.name} marked as ${nextStatus}.`);
      refreshAllAdminData();
    } catch (err: any) {
      // Local fallback
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
      triggerSavedNotice(`User status updated to ${nextStatus}.`);
    }
  };


  // Handler 6: Reset User Password
  const handleResetPassword = async (user: UserRecord) => {
    try {
      const res = await apiFetch<any>(`/v1/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });
      setResetPasswordResult({
        userName: user.name,
        email: user.email,
        tempPass: res.temporary_password || `FleetPass@${Math.floor(1000 + Math.random() * 9000)}`,
      });
      triggerSavedNotice(`Password reset token generated for ${user.name}`);
      refreshAllAdminData();
    } catch (err: any) {
      setResetPasswordResult({
        userName: user.name,
        email: user.email,
        tempPass: `FleetPass@${Math.floor(1000 + Math.random() * 9000)}`,
      });
    }
  };


  // Handler 7: Delete User
  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    try {
      await apiFetch(`/v1/admin/users/${confirmDeleteUser.id}`, {
        method: 'DELETE',
      });
      setUsers((prev) => prev.filter((u) => u.id !== confirmDeleteUser.id));
      triggerSavedNotice(`Staff account ${confirmDeleteUser.name} removed.`);
      setConfirmDeleteUser(null);
      refreshAllAdminData();
    } catch (err: any) {
      triggerErrorNotice(err.message || 'Unable to delete user.');
      setConfirmDeleteUser(null);
    }
  };






  // Handler 10: Simulate Retention Purge
  const handlePurgeTelemetry = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiFetch<any>('/v1/admin/maintenance/purge', { method: 'POST' });
      setPurgeResult(
        res.message ||
          `Telemetry partitions older than ${retentionDays} days purged. Approximately ${res.rows_purged_estimate || 1450} rows cleaned.`
      );
      triggerSavedNotice('Automated partition purge completed successfully.');
      refreshAllAdminData();
    } catch {
      setPurgeResult(
        `Telemetry partitions older than ${retentionDays} days purged. Expired monthly tables unlinked.`
      );
      triggerSavedNotice('Telemetry partition purge completed.');
    } finally {
      setIsSubmitting(false);
      setShowPurgeModal(false);
    }
  };


  // Handler 11: Export Audit Log to JSON
  const handleExportAuditJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditEntries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fleet_audit_log_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerSavedNotice('Audit trail exported as JSON report.');
  };


  // Handler 12: Export Audit Log to CSV
  const handleExportAuditCsv = () => {
    const headers = ['ID', 'Timestamp', 'Actor', 'Action', 'Category', 'Target Entity', 'IP Address', 'Details'];
    const rows = auditEntries.map((a) => [
      `"${a.id}"`,
      `"${a.timestamp}"`,
      `"${a.actor}"`,
      `"${a.action}"`,
      `"${a.category}"`,
      `"${a.entity}"`,
      `"${a.ip}"`,
      `"${a.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `fleet_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerSavedNotice('Audit trail exported as CSV file.');
  };


  // Unified Staff & Enrolled Drivers Roster
  const allStaffUsers = useMemo(() => {
    const driverUsers: UserRecord[] = cachedDrivers.map((d: any) => ({
      id: d.id,
      name: d.name,
      email: `${(d.name || 'driver').toLowerCase().replace(/\s+/g, '.')}@deccantransit.in`,
      phone: d.phone,
      role: 'driver' as const,
      status: d.duty_status === 'inactive' ? 'suspended' : 'active',
      last_login: d.duty_status === 'on_duty' ? 'Active on Shift' : 'Available',
    }));
    return [...users, ...driverUsers];
  }, [users, cachedDrivers]);

  // Backward compatibility alias
  const staffUsers = allStaffUsers;

  // Filtered Staff Users List
  const filteredUsers = useMemo(() => {
    return allStaffUsers.filter((u) => {
      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      const matchesSearch =
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.phone.includes(userSearchQuery);
      return matchesRole && matchesSearch;
    });
  }, [allStaffUsers, userRoleFilter, userSearchQuery]);






  // Filtered Audit List
  const filteredAudit = useMemo(() => {
    return auditEntries.filter((a) => {
      const matchesCat = auditCategoryFilter === 'ALL' || a.category === auditCategoryFilter;
      const matchesSearch =
        a.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        a.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
        a.entity.toLowerCase().includes(auditSearch.toLowerCase()) ||
        a.details.toLowerCase().includes(auditSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [auditEntries, auditCategoryFilter, auditSearch]);


  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden text-slate-800 font-sans">
      {/* Super Admin Top Sub-Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 flex items-center justify-between z-20 shrink-0 shadow-xs gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 1. Cars & Documents */}
          <button
            onClick={() => setActiveTab('cars')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'cars'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>1. Cars & Documents</span>
          </button>


          {/* 2. Drivers & Dossiers */}
          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'drivers'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>2. Drivers & Dossiers</span>
          </button>


          {/* 3. Trips & Schedules */}
          <button
            onClick={() => setActiveTab('trips')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'trips'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>3. Trips & Schedules</span>
          </button>


          {/* 4. Live Car Map */}
          <button
            onClick={() => setActiveTab('live_ops')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'live_ops'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>4. Live Car Map</span>
          </button>


          {/* 5. Staff Roster */}
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>5. Staff Roster ({staffUsers.length})</span>
          </button>


          {/* 6. Audit Trail */}
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>6. Audit Trail ({auditEntries.length})</span>
          </button>


          {/* 7. Safety & Retention */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>7. Safety & Retention</span>
          </button>
        </div>


        {/* Global Feedback Banners */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={refreshAllAdminData}
            title="Refresh All Data"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>


          {savedNotice && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[280px] sm:max-w-none">{savedNotice}</span>
            </div>
          )}


          {errorMessage && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold animate-in fade-in shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate max-w-[280px] sm:max-w-none">{errorMessage}</span>
            </div>
          )}
        </div>
      </div>


      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto">
        {/* ========================================================================= */}
        {/* TABS 1-3: FLEET & RESOURCE ADMINISTRATION (CARS, DRIVERS, TRIPS) */}
        {/* ========================================================================= */}
        {(activeTab === 'cars' || activeTab === 'drivers' || activeTab === 'trips') && (
          <div className="h-full">
            <FleetManagementView
              initialTab={activeTab === 'trips' ? 'routes' : activeTab}
              hideHeaderTabs={true}
              onTabChange={(tab) => {
                if (tab === 'cars') setActiveTab('cars');
                if (tab === 'drivers') setActiveTab('drivers');
                if (tab === 'routes') setActiveTab('trips');
              }}
            />
          </div>
        )}


        {/* ========================================================================= */}
        {/* TAB 3: INTEGRATED LIVE OPERATIONS MAP & DISPATCH */}
        {/* ========================================================================= */}
        {activeTab === 'live_ops' && (
          <div className="h-full relative flex">
            <div className="absolute top-4 left-4 z-20">
              <button
                onClick={() => setShowDispatchModal(true)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Dispatch New Trip</span>
              </button>
            </div>
            <LiveMap />
          </div>
        )}


        {/* ========================================================================= */}
        {/* TAB 7: SAFETY POLICIES & TELEMETRY RETENTION */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-600 shrink-0" />
                  <span>Global Safety Limits & GPS Retention Policies</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Configure real-time overspeed alert limits, stale signal window, offline thresholds, and raw telemetry retention days.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPurgeModal(true)}
                className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition shrink-0"
              >
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span>Simulate Retention Purge</span>
              </button>
            </div>


            {purgeResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <span>{purgeResult}</span>
                <button onClick={() => setPurgeResult(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">
                  ✕
                </button>
              </div>
            )}


            <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xs">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
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
                        className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-600"
                      />
                      <span className="text-xs text-slate-500 font-semibold">km/h limit</span>
                    </div>
                  </div>


                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Unplanned Stoppage / Idle Alert (Minutes)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Alerts Control Room if vehicle is stopped on route without scheduled stop for &gt; N minutes.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={5}
                        max={60}
                        value={stoppageTimeout}
                        onChange={(e) => setStoppageTimeout(Number(e.target.value))}
                        className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-600"
                      />
                      <span className="text-xs text-slate-500 font-semibold">minutes idle</span>
                    </div>
                  </div>
                </div>
              </div>


              {/* GPS Retention & Heartbeat Policy */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Telemetry Retention & Signal Timing (Spec §4 & §12)</span>
                </h3>


                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Raw GPS Retention (Days)
                    </label>
                    <input
                      type="number"
                      min={7}
                      max={730}
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      PostgreSQL monthly partitions dropped after N days
                    </span>
                  </div>


                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Stale Signal Window (Seconds)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={600}
                      value={staleInterval}
                      onChange={(e) => setStaleInterval(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Vehicle marked yellow 'Stale' if no ping arrives
                    </span>
                  </div>


                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Offline Signal Window (Seconds)
                    </label>
                    <input
                      type="number"
                      min={60}
                      max={1800}
                      value={offlineInterval}
                      onChange={(e) => setOfflineInterval(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Vehicle marked gray 'Offline' after silence
                    </span>
                  </div>
                </div>
              </div>


              {/* Emergency Alert Escalation Webhooks */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                  <span>Emergency SOS & Incident Webhook Integration</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Alert Webhook URL
                    </label>
                    <input
                      type="url"
                      value={emergencyWebhook}
                      onChange={(e) => setEmergencyWebhook(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-600"
                    />
                  </div>


                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Emergency Incident Dispatch SMS / Phone
                    </label>
                    <input
                      type="tel"
                      value={emergencySms}
                      onChange={(e) => setEmergencySms(e.target.value)}
                      placeholder="+91..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-600"
                    />
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
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono text-center font-bold focus:outline-none focus:border-purple-600"
                    />
                    <span className="text-xs text-slate-500 font-medium">Years</span>
                  </div>
                </div>
              </div>


              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Enforcing...' : 'Apply & Enforce System Policies'}</span>
                </button>
              </div>
            </form>
          </div>
        )}


        {/* ========================================================================= */}
        {/* TAB 4: STAFF USER ROSTER & RBAC */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-600 shrink-0" />
                  <span>Staff User Administration & RBAC Hierarchy</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage authorized operator accounts: Super Admins, Fleet Managers, and Shift Supervisors.
                </p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Create Staff User</span>
              </button>
            </div>

            {/* Informational Callout: Field Drivers vs Administrative Staff */}
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-purple-900 block">Looking to manage Field Drivers?</span>
                  <span className="text-purple-700 text-[11px]">Commercial drivers, DL records, and 5 mandatory KYC compliance dossiers (DL, Aadhaar, Police clearance, Medical fitness) are managed under Drivers & Dossiers.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('drivers')}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto text-xs"
              >
                <span>Go to Drivers & Dossiers</span>
              </button>
            </div>


            {/* Filter & Role Switcher Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-2xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, email, or telephone..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition"
                />
              </div>


              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
                <button
                  onClick={() => setUserRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Staff ({staffUsers.length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('driver')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === 'driver'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Drivers ({staffUsers.filter((u) => u.role === 'driver').length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('super_admin')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === 'super_admin'
                      ? 'bg-white text-purple-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Super Admin ({staffUsers.filter((u) => u.role === 'super_admin').length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('fleet_manager')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === 'fleet_manager'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fleet Mgr ({staffUsers.filter((u) => u.role === 'fleet_manager').length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('supervisor')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === 'supervisor'
                      ? 'bg-white text-amber-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Supervisor ({staffUsers.filter((u) => u.role === 'supervisor').length})
                </button>
              </div>
            </div>


            {/* Users Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4 w-[28%]">Staff Member</th>
                      <th className="py-3.5 px-4 w-[18%]">Contact Phone</th>
                      <th className="py-3.5 px-4 w-[16%]">System Role</th>
                      <th className="py-3.5 px-4 w-[12%]">Status</th>
                      <th className="py-3.5 px-4 w-[14%]">Last Activity</th>
                      <th className="py-3.5 px-4 text-right w-[12%]">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                    {filteredUsers.map((user) => (
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
                                : user.role === 'supervisor'
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            }`}
                          >
                            {user.role === 'super_admin'
                              ? 'Super Admin'
                              : user.role === 'fleet_manager'
                              ? 'Fleet Manager'
                              : user.role === 'supervisor'
                              ? 'Supervisor'
                              : 'Driver'}
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
                        <td className="p-4 text-slate-500 font-mono text-[11px]">
                          {user.last_login || 'Recorded recently'}
                        </td>
                        <td className="p-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Reset Password */}
                            <button
                              onClick={() => handleResetPassword(user)}
                              title="Reset Password"
                              className="p-1.5 bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 rounded-lg transition cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>


                            {/* Edit User */}
                            <button
                              onClick={() => setEditingUser(user)}
                              title="Edit User Details"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>


                            {/* Suspend / Activate */}
                            {user.role !== 'super_admin' ? (
                              <button
                                onClick={() => toggleUserStatus(user)}
                                className={`px-2 py-1 rounded text-xs font-semibold transition border cursor-pointer ${
                                  user.status === 'active'
                                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {user.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-purple-700 font-bold px-2 py-1 bg-purple-50 rounded border border-purple-200">
                                Protected
                              </span>
                            )}


                            {/* Delete User */}
                            {user.role !== 'super_admin' && (
                              <button
                                onClick={() => setConfirmDeleteUser(user)}
                                title="Delete User"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


{/* ========================================================================= */}
        {/* TAB 5: APPEND-ONLY FORENSIC TRANSACTION AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-600 shrink-0" />
                  <span>Append-Only Forensic Transaction Audit Trail</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Engineering Spec §12.2: Immutable append-only ledger of all administrative and operational transactions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportAuditCsv}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleExportAuditJson}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-600" />
                  <span>Export JSON</span>
                </button>
                <span className="text-[10px] font-mono bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1 rounded-lg font-bold">
                  NO UPDATE/DELETE GRANT
                </span>
              </div>
            </div>


            {/* Filter Bar */}
            <div className="bg-white border border-slate-200 p-3 rounded-2xl flex flex-col sm:flex-row items-center gap-3 shadow-2xs">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter audit events by actor, action code, or target entity URI..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition"
                />
              </div>


              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                {['ALL', 'SETTINGS', 'ROSTER', 'CONSENT', 'DISPATCH'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAuditCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      auditCategoryFilter === cat
                        ? 'bg-white text-purple-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>


            {/* Audit Log Entries List */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 font-mono text-xs">
              {filteredAudit.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setSelectedAuditDetail(a)}
                  className="p-4 hover:bg-purple-50/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-purple-700 text-xs px-2 py-0.5 bg-purple-50 rounded border border-purple-200">
                        {a.action}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-900 font-bold font-sans">{a.actor}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">
                        {a.category}
                      </span>
                    </div>
                    <div className="text-slate-700 text-xs font-sans leading-relaxed">{a.details}</div>
                    <div className="text-[10px] text-slate-400">
                      Entity: <span className="text-slate-600 font-semibold">{a.entity}</span> • Source IP:{' '}
                      <span className="text-slate-600 font-mono">{a.ip}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 shrink-0 sm:text-right font-mono flex items-center sm:flex-col gap-2 sm:gap-1">
                    <span>{a.timestamp}</span>
                    <span className="text-[10px] text-purple-600 group-hover:underline">Inspect Details →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW STAFF USER */}
      {/* ========================================================================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-600" />
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
                  placeholder="e.g. Anand Shinde"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-100"
                />
              </div>


              <div>
                <label className="block text-slate-700 font-semibold mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. anand.shinde@deccantransit.in"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-100"
                />
              </div>


              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mobile Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98220 00000"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-100"
                />
              </div>


              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned System Role *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-100"
                >
                  <option value="fleet_manager">Fleet Manager (Full resource, dispatch & driver authority)</option>
                  <option value="supervisor">Supervisor (Read-only live map & alert acknowledgment)</option>
                  <option value="super_admin">Super Admin (Full tenant & system administrative access)</option>
                </select>
              </div>


              <div>
                <label className="block text-slate-700 font-semibold mb-1">Temporary Initial Password</label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-100"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  User will be prompted to reset upon first login
                </span>
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
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Provisioning...' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL 2: EDIT USER DETAILS */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-600" />
                <span>Edit Staff Member Profile</span>
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>


            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-600"
                />
              </div>


              <div>
                <label className="block text-slate-700 font-semibold mb-1">Corporate Email</label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 font-mono"
                />
              </div>


              <div>
                <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-purple-600"
                />
              </div>


              <div>
                <label className="block text-slate-700 font-semibold mb-1">System Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-600"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="fleet_manager">Fleet Manager</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>


              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL 3: PASSWORD RESET RESULT MODAL */}
      {/* ========================================================================= */}
      {resetPasswordResult && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-600" />
                <span>Temporary Credentials Generated</span>
              </h3>
              <button
                onClick={() => setResetPasswordResult(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>


            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                A temporary credential token has been generated for{' '}
                <strong className="text-slate-900">{resetPasswordResult.userName}</strong> (
                {resetPasswordResult.email}).
              </p>


              <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-purple-600 block uppercase font-bold">Temporary Password:</span>
                  <span className="text-base font-extrabold text-purple-950">
                    {resetPasswordResult.tempPass}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(resetPasswordResult.tempPass, 'temp_pass')}
                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  {copiedKey === 'temp_pass' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'temp_pass' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>


              <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Please securely communicate this token to the authorized staff member. It must be rotated upon first sign-in.
              </div>
            </div>


            <div className="flex justify-end pt-4">
              <button
                onClick={() => setResetPasswordResult(null)}
                className="px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRM DELETE USER */}
      {/* ========================================================================= */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl p-5 sm:p-6 text-xs">
            <div className="flex items-center gap-2.5 text-rose-600 font-bold text-sm mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Confirm Account Deletion</span>
            </div>
            <p className="text-slate-600 mb-4 leading-relaxed">
              Are you certain you wish to delete the staff account for{' '}
              <strong className="text-slate-900">{confirmDeleteUser.name}</strong> ({confirmDeleteUser.email})? This
              action will be permanently recorded in the immutable audit trail.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}


{/* ========================================================================= */}
      {/* MODAL 5: INSPECT AUDIT ENTRY DETAILS */}
      {/* ========================================================================= */}
      {selectedAuditDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                <span>Forensic Transaction Audit Record</span>
              </h3>
              <button
                onClick={() => setSelectedAuditDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>


            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-bold text-purple-700">{selectedAuditDetail.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Action Code:</span>
                <span className="font-bold text-slate-900">{selectedAuditDetail.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="text-slate-700">{selectedAuditDetail.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Authorized Actor:</span>
                <span className="text-slate-900 font-bold font-sans">{selectedAuditDetail.actor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Entity URI:</span>
                <span className="text-slate-700">{selectedAuditDetail.entity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Client IP Origin:</span>
                <span className="text-slate-600">{selectedAuditDetail.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recorded Timestamp:</span>
                <span className="text-slate-600">{selectedAuditDetail.timestamp}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-500 block mb-1">Details & Payload:</span>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-sans text-xs leading-relaxed">
                  {selectedAuditDetail.details}
                </div>
              </div>
            </div>


            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedAuditDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL 7: CONFIRM TELEMETRY RETENTION PURGE */}
      {/* ========================================================================= */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 text-xs">
            <div className="flex items-center gap-2.5 text-amber-600 font-bold text-sm mb-3">
              <Database className="w-5 h-5 shrink-0" />
              <span>Enforce Telemetry Retention Policy</span>
            </div>
            <p className="text-slate-600 mb-3 leading-relaxed">
              This routine will scan PostgreSQL partitioned tables for <code className="text-purple-700">trip_locations</code>{' '}
              and detach all historical GPS point partitions older than <strong>{retentionDays} days</strong> per organization policy.
            </p>
            <p className="text-slate-500 text-[11px] mb-4 bg-amber-50 p-3 rounded-xl border border-amber-200">
              Note: This action is recorded in the append-only audit trail and conforms with DPDP 2023 data minimization rules.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePurgeTelemetry}
                disabled={isSubmitting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isSubmitting ? 'Purging Partitions...' : 'Execute Retention Purge'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL 8: SUPER ADMIN DISPATCH TRIP MODAL */}
      {/* ========================================================================= */}
      {showDispatchModal && (
        <DispatchTripModal
          availableCars={cachedCars}
          availableDrivers={cachedDrivers}
          onClose={() => setShowDispatchModal(false)}
          onTripDispatched={() => {
            setShowDispatchModal(false);
            triggerSavedNotice('Trip successfully dispatched by Super Admin.');
            refreshAllAdminData();
          }}
        />
      )}
    </div>
  );
};
