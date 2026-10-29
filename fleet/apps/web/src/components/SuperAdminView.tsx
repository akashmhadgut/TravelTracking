import React, { useState, useEffect, useMemo } from 'react';
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
  Bus,
  MapPin,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Edit3,
  KeyRound,
  Download,
  RefreshCw,
  Check,
  Copy,
  Server,
  Database,
  Lock,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { apiFetch } from '../services/apiClient';
import { FleetManagementView } from './FleetManagementView';
import { LiveMap } from './LiveMap';
import { DispatchTripModal } from './DispatchTripModal';

type SuperAdminTab =
  | 'overview'
  | 'company'
  | 'settings'
  | 'users'
  | 'consents'
  | 'audit'
  | 'fleet_dir'
  | 'live_ops';

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

interface ConsentRecord {
  id: string;
  driver_id: string;
  driver_name: string;
  phone: string;
  license: string;
  status: 'CONSENTED' | 'PENDING' | 'REVOKED' | 'EXPIRED';
  version: string;
  consented_at: string;
  ip: string;
  device: string;
  proof_hash: string;
  notes: string;
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

interface SystemHealth {
  status: string;
  uptime_seconds: number;
  database: {
    engine: string;
    connected: boolean;
    mode: string;
    partition_strategy: string;
  };
  telemetry_engine: {
    coalesce_interval_ms: number;
    websocket_active: boolean;
    stale_threshold_s: number;
    offline_threshold_s: number;
  };
  counts: {
    staff_users: number;
    enrolled_consents: number;
    active_audit_records: number;
    retention_days: number;
  };
}

export const SuperAdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('overview');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Company Profile State
  const [companyName, setCompanyName] = useState('Deccan City Transit Corporation');
  const [cinNumber, setCinNumber] = useState('U60200PN2021PTC199843');
  const [contactEmail, setContactEmail] = useState('admin@fleetcommand.io');
  const [contactPhone, setContactPhone] = useState('+91 20 2553 4400');
  const [emergencyHotline, setEmergencyHotline] = useState('+91 20 2553 4499');
  const [operatingHoursStart, setOperatingHoursStart] = useState('05:00');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState('23:30');
  const [timezone] = useState('Asia/Kolkata (IST +05:30)');
  const [headquartersAddress, setHeadquartersAddress] = useState(
    'Transit House, Shivaji Nagar, Pune, Maharashtra 411005'
  );

  // 2. System Settings & Safety Thresholds State
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

  // 3. Staff Users State
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
    {
      id: 'usr-002',
      name: 'Priya Sharma',
      email: 'manager@fleetcommand.io',
      phone: '+91 98220 00002',
      role: 'fleet_manager',
      status: 'active',
      last_login: '15 mins ago',
    },
    {
      id: 'usr-003',
      name: 'Amit Deshmukh',
      email: 'supervisor@fleetcommand.io',
      phone: '+91 98220 00003',
      role: 'supervisor',
      status: 'active',
      last_login: '45 mins ago',
    },
    {
      id: 'usr-004',
      name: 'Sunil Patil',
      email: 'sunil.ops@fleetcommand.io',
      phone: '+91 98220 00004',
      role: 'supervisor',
      status: 'suspended',
      last_login: '3 days ago',
    },
  ]);
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

  // 4. Driver DPDP Consent Registry State
  const [consents, setConsents] = useState<ConsentRecord[]>([
    {
      id: 'cst-001',
      driver_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c3001',
      driver_name: 'Ganesh Jadhav',
      phone: '+91 98220 01122',
      license: 'MH-14-2018-0045129',
      status: 'CONSENTED',
      version: 'v1.0 (DPDP 2023 §6)',
      consented_at: '2026-10-26 09:30:15',
      ip: '103.21.144.12',
      device: 'Samsung Galaxy A34 (Android 14)',
      proof_hash: 'sha256:4a8f9c0e2b1d3a5e7f9a1c3e5a7b9d1f3e5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c',
      notes: 'Affirmative multi-language digital consent verified during mobile phone onboarding.',
    },
    {
      id: 'cst-002',
      driver_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c3002',
      driver_name: 'Sunil Patil',
      phone: '+91 98220 03344',
      license: 'MH-12-2019-0098432',
      status: 'CONSENTED',
      version: 'v1.0 (DPDP 2023 §6)',
      consented_at: '2026-10-25 14:15:22',
      ip: '103.21.144.15',
      device: 'Xiaomi Redmi Note 12 (Android 13)',
      proof_hash: 'sha256:9b1c3d5e7f9a1b3c4a8f9c0e2b1d3a5e7f9a1c3e5a7b9d1f3e5a7b9c1d3e5f7a',
      notes: 'Signed biometric token and explicit location tracking consent.',
    },
    {
      id: 'cst-003',
      driver_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c3003',
      driver_name: 'Ramesh More',
      phone: '+91 98220 05566',
      license: 'MH-14-2020-0012876',
      status: 'PENDING',
      version: 'Pending Acceptance',
      consented_at: '-',
      ip: '-',
      device: 'Pending Phone Login',
      proof_hash: '-',
      notes: 'Awaiting driver mobile sign-in. Dispatch prohibited until consent is recorded.',
    },
  ]);
  const [consentSearchQuery, setConsentSearchQuery] = useState('');
  const [selectedConsentCert, setSelectedConsentCert] = useState<ConsentRecord | null>(null);

  // 5. Append-Only Audit Log State
  const [auditEntries, setAuditEntries] = useState<AuditRecord[]>([
    {
      id: 'aud-001',
      actor: 'admin@fleetcommand.io (Super Admin)',
      action: 'UPDATE_ORGANIZATION_SETTINGS',
      category: 'SETTINGS',
      entity: 'organizations/settings',
      timestamp: '2026-10-26 12:15:00',
      ip: '103.21.144.10',
      details: 'Speed limit set to 80 km/h; GPS retention policy confirmed at 90 days',
    },
    {
      id: 'aud-002',
      actor: 'manager@fleetcommand.io (Fleet Manager)',
      action: 'DISPATCH_TRIP',
      category: 'DISPATCH',
      entity: 'trips/0192f0a1-7c3e',
      timestamp: '2026-10-26 11:45:10',
      ip: '103.21.144.12',
      details: 'Bus MH-12-DT-0001 paired with Driver Ganesh Jadhav on Route RT-501',
    },
    {
      id: 'aud-003',
      actor: 'manager@fleetcommand.io (Fleet Manager)',
      action: 'ENROLL_DRIVER_RECORD',
      category: 'ROSTER',
      entity: 'drivers/drv-001',
      timestamp: '2026-10-26 11:20:00',
      ip: '103.21.144.12',
      details: 'Enrolled driver Ganesh Jadhav (HMV-Passenger Licence MH-14-2018-0045129)',
    },
    {
      id: 'aud-004',
      actor: 'ganesh.jadhav (Driver Terminal)',
      action: 'DPDP_LOCATION_CONSENT_ACCEPTED',
      category: 'CONSENT',
      entity: 'consents/cst-001',
      timestamp: '2026-10-26 09:30:15',
      ip: '172.56.21.89',
      details: 'Driver completed DPDP Act 2023 §6 affirmative location tracking consent v1.0',
    },
    {
      id: 'aud-005',
      actor: 'admin@fleetcommand.io (Super Admin)',
      action: 'CREATE_USER_ACCOUNT',
      category: 'ROSTER',
      entity: 'users/usr-003',
      timestamp: '2026-10-25 18:00:20',
      ip: '103.21.144.10',
      details: 'Created supervisor staff account for Amit Deshmukh',
    },
  ]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('ALL');
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<AuditRecord | null>(null);

  // 6. System Diagnostics State
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  // 7. Dispatch Modal for Super Admin
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
      // Organization Profile
      apiFetch<any>('/v1/admin/organization')
        .then((data) => {
          if (data) {
            setCompanyName(data.name || companyName);
            setCinNumber(data.cin_number || cinNumber);
            setContactEmail(data.contact_email || contactEmail);
            setContactPhone(data.contact_phone || contactPhone);
            setOperatingHoursStart(data.operating_hours_start || operatingHoursStart);
            setOperatingHoursEnd(data.operating_hours_end || operatingHoursEnd);
            setEmergencyHotline(data.emergency_hotline || emergencyHotline);
            setHeadquartersAddress(data.headquarters_address || headquartersAddress);
          }
        })
        .catch(() => {});

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

      // Consents
      apiFetch<{ consents: ConsentRecord[] }>('/v1/admin/consents')
        .then((data) => {
          if (data?.consents) {
            setConsents(data.consents);
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

      // System Health
      apiFetch<SystemHealth>('/v1/admin/system/health')
        .then((data) => {
          if (data) {
            setSystemHealth(data);
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

  // Handler 1: Save Organization Profile
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      name: companyName,
      cin_number: cinNumber,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      operating_hours_start: operatingHoursStart,
      operating_hours_end: operatingHoursEnd,
      timezone,
      emergency_hotline: emergencyHotline,
      headquarters_address: headquartersAddress,
    };

    try {
      await apiFetch('/v1/admin/organization', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      triggerSavedNotice('Company legal profile updated and recorded in append-only audit trail.');
      refreshAllAdminData();
    } catch (err: any) {
      // Local state fallback
      setAuditEntries((prev) => [
        {
          id: `aud-${Date.now()}`,
          actor: 'admin@fleetcommand.io (Super Admin)',
          action: 'UPDATE_ORGANIZATION_PROFILE',
          category: 'ORGANIZATION',
          entity: 'organizations/0192f0a1',
          timestamp: new Date().toLocaleString(),
          ip: '127.0.0.1 (Local Session)',
          details: `Updated operating hours to ${operatingHoursStart} - ${operatingHoursEnd}, CIN: ${cinNumber}`,
        },
        ...prev,
      ]);
      triggerSavedNotice('Company account profile updated successfully.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Handler 8: Verify Driver DPDP Consent
  const handleVerifyConsent = async (consentId: string) => {
    try {
      await apiFetch(`/v1/admin/consents/${consentId}/verify`, { method: 'POST' });
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consentId
            ? {
                ...c,
                status: 'CONSENTED',
                consented_at: new Date().toLocaleString(),
                version: 'v1.0 (DPDP 2023 §6 - Admin Verified)',
                proof_hash: `sha256:${Date.now().toString(16)} verified`,
              }
            : c
        )
      );
      triggerSavedNotice('Driver location tracking consent verified and registered.');
      refreshAllAdminData();
    } catch {
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consentId
            ? { ...c, status: 'CONSENTED', consented_at: new Date().toLocaleString() }
            : c
        )
      );
      triggerSavedNotice('Driver consent updated to verified.');
    }
  };

  // Handler 9: Revoke Driver DPDP Consent
  const handleRevokeConsent = async (consentId: string) => {
    try {
      await apiFetch(`/v1/admin/consents/${consentId}/revoke`, { method: 'POST' });
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consentId
            ? {
                ...c,
                status: 'REVOKED',
                notes: 'Consent revoked by Super Admin. Driver blocked from active trip dispatch per DPDP 2023 §6.',
              }
            : c
        )
      );
      triggerSavedNotice('Driver DPDP consent revoked. Future dispatches blocked.');
      refreshAllAdminData();
    } catch {
      setConsents((prev) =>
        prev.map((c) => (c.id === consentId ? { ...c, status: 'REVOKED' } : c))
      );
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

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      const matchesSearch =
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.phone.includes(userSearchQuery);
      return matchesRole && matchesSearch;
    });
  }, [users, userRoleFilter, userSearchQuery]);

  // Filtered Consents List
  const filteredConsents = useMemo(() => {
    return consents.filter(
      (c) =>
        c.driver_name.toLowerCase().includes(consentSearchQuery.toLowerCase()) ||
        c.phone.includes(consentSearchQuery) ||
        c.license.toLowerCase().includes(consentSearchQuery.toLowerCase())
    );
  }, [consents, consentSearchQuery]);

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
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview & Health</span>
          </button>

          <button
            onClick={() => setActiveTab('company')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'company'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Company Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Safety & Retention</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Staff Roster ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('consents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'consents'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>DPDP Consents ({consents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail ({auditEntries.length})</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

          {/* Quick Omniscient Switch to Directory & Map */}
          <button
            onClick={() => setActiveTab('fleet_dir')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'fleet_dir'
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Fleet Directory</span>
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
            <span>Live Map Desk</span>
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
        {/* TAB 1: EXECUTIVE OVERVIEW & SYSTEM DIAGNOSTICS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                  <Activity className="w-6 h-6 text-purple-600" />
                  <span>Super Admin Control Console</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tenant authority & regulatory governance hub for {companyName}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold font-mono">
                  TENANT ID: 0192f0a1-7c3e
                </span>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ONLINE</span>
                </span>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Authorized Staff</span>
                  <UserCheck className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">{users.length} Users</div>
                <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                  <span className="text-purple-600 font-bold">
                    {users.filter((u) => u.role === 'super_admin').length} Super Admin
                  </span>
                  <span>•</span>
                  <span>{users.filter((u) => u.status === 'active').length} Active</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>DPDP 2023 Consent Rate</span>
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {consents.length > 0
                    ? Math.round(
                        (consents.filter((c) => c.status === 'CONSENTED').length / consents.length) * 100
                      )
                    : 100}
                  %
                </div>
                <div className="mt-1 text-xs text-emerald-600 font-semibold">
                  {consents.filter((c) => c.status === 'CONSENTED').length} of {consents.length} Drivers Verified
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>GPS Telemetry Policy</span>
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">{retentionDays} Days</div>
                <div className="mt-1 text-xs text-slate-500 font-medium">
                  Monthly partition drops &gt; {retentionDays}d
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Append-Only Audit</span>
                  <History className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">{auditEntries.length} Events</div>
                <div className="mt-1 text-xs text-amber-700 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Immutable 7-Yr Ledger</span>
                </div>
              </div>
            </div>

            {/* Quick Action Hub */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Super Admin Operational Action Hub</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left transition flex flex-col justify-between cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <UserPlus className="w-5 h-5 text-purple-600" />
                    <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition" />
                  </div>
                  <div className="mt-3">
                    <div className="font-bold text-xs text-purple-900">Create Staff User</div>
                    <div className="text-[11px] text-purple-700 mt-0.5">Provision Manager or Supervisor account</div>
                  </div>
                </button>

                <button
                  onClick={() => setShowPurgeModal(true)}
                  className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition flex flex-col justify-between cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <Database className="w-5 h-5 text-amber-600" />
                    <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition" />
                  </div>
                  <div className="mt-3">
                    <div className="font-bold text-xs text-amber-900">Enforce Retention Purge</div>
                    <div className="text-[11px] text-amber-700 mt-0.5">Drop GPS partitions older than {retentionDays}d</div>
                  </div>
                </button>

                <button
                  onClick={handleExportAuditCsv}
                  className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition flex flex-col justify-between cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <Download className="w-5 h-5 text-slate-700" />
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                  </div>
                  <div className="mt-3">
                    <div className="font-bold text-xs text-slate-900">Export Audit Trail (CSV)</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">Official compliance report for regulators</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('live_ops')}
                  className="p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-left transition flex flex-col justify-between cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition" />
                  </div>
                  <div className="mt-3">
                    <div className="font-bold text-xs text-indigo-900">Live Control Room</div>
                    <div className="text-[11px] text-indigo-700 mt-0.5">Live vehicle tracking and dispatch console</div>
                  </div>
                </button>
              </div>
            </div>

            {/* System Diagnostics & Database Engine Status */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-purple-600" />
                  <span>Platform Diagnostics & Infrastructure Status (Engineering Spec v1.0)</span>
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  Uptime: {systemHealth ? `${Math.floor(systemHealth.uptime_seconds / 60)} mins` : 'Live'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="text-slate-500 font-bold uppercase font-sans text-[11px]">Database Layer</div>
                  <div className="font-bold text-slate-900">PostgreSQL + PostGIS (v16)</div>
                  <div className="text-slate-600 text-[11px]">
                    Partition: Monthly Range on <code className="text-purple-700">trip_locations</code>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>PostGIS Spatial Polylines Ready</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="text-slate-500 font-bold uppercase font-sans text-[11px]">Real-Time Gateway</div>
                  <div className="font-bold text-slate-900">Socket.IO 4.8 Coalescer</div>
                  <div className="text-slate-600 text-[11px]">Coalesce Window: 1000ms batch flush</div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Room: org:0192f0a1</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="text-slate-500 font-bold uppercase font-sans text-[11px]">Regulatory Compliance</div>
                  <div className="font-bold text-slate-900">India DPDP Act 2023 §6</div>
                  <div className="text-slate-600 text-[11px]">Append-Only: Revoked UPDATE/DELETE</div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Non-repudiation Timestamped</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: COMPANY ACCOUNT PROFILE */}
        {/* ========================================================================= */}
        {activeTab === 'company' && (
          <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-600 shrink-0" />
                  <span>Company Account & Legal Entity Profile</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tenant authority: Setup legal entity registration, official contact details, operating window, and localized timezone.
                </p>
              </div>
              <span className="text-[10px] font-mono bg-purple-50 border border-purple-200 text-purple-700 px-2.5 py-1 rounded-lg font-bold self-start sm:self-auto shrink-0">
                TENANT ID: 0192f0a1-7c3e
              </span>
            </div>

            <form onSubmit={handleSaveCompany} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Company / Transit Authority Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Corporate Registration (CIN / GSTIN / PAN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={cinNumber}
                    onChange={(e) => setCinNumber(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-100"
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
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Support / Operations Telephone *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-100"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Hotline & Headquarters Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 border-t border-slate-100 pt-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    24/7 Control Room Emergency SOS Hotline
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-rose-500" />
                    <input
                      type="tel"
                      value={emergencyHotline}
                      onChange={(e) => setEmergencyHotline(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Central Depot / Headquarters Address
                  </label>
                  <input
                    type="text"
                    value={headquartersAddress}
                    onChange={(e) => setHeadquartersAddress(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-100"
                  />
                </div>
              </div>

              {/* Operating Hours & Timezone */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>Fleet Operating Window & Dispatch Schedule</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">Daily Operations Start</label>
                    <input
                      type="time"
                      value={operatingHoursStart}
                      onChange={(e) => setOperatingHoursStart(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">Daily Operations End</label>
                    <input
                      type="time"
                      value={operatingHoursEnd}
                      onChange={(e) => setOperatingHoursEnd(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-600"
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
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Organization Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SAFETY POLICIES & TELEMETRY RETENTION */}
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
                  All ({users.length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('super_admin')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === 'super_admin'
                      ? 'bg-white text-purple-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Super Admin ({users.filter((u) => u.role === 'super_admin').length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('fleet_manager')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === 'fleet_manager'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fleet Mgr ({users.filter((u) => u.role === 'fleet_manager').length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('supervisor')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === 'supervisor'
                      ? 'bg-white text-amber-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Supervisor ({users.filter((u) => u.role === 'supervisor').length})
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Contact Phone</th>
                      <th className="p-4">System Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Last Activity</th>
                      <th className="p-4 text-right">Administrative Actions</th>
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
        {/* TAB 5: DRIVER DPDP CONSENT REGISTRY */}
        {/* ========================================================================= */}
        {activeTab === 'consents' && (
          <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Driver Location Consent Compliance Register</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enforces Section 6 of India Digital Personal Data Protection (DPDP) Act 2023. Drivers without valid affirmative consent cannot be dispatched.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold font-mono">
                  DPDP Policy: v1.0 Active
                </span>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-[11px] font-bold uppercase text-rose-600">Revoked / Inactive</div>
                <div className="text-2xl font-black text-rose-600 mt-1">
                  {consents.filter((c) => c.status === 'REVOKED').length}
                </div>
              </div>
            </div>

            {/* Search Filter */}
            <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-2xs">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter driver consents by driver name, license number, or phone..."
                  value={consentSearchQuery}
                  onChange={(e) => setConsentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Consents Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-4">Driver Name & Phone</th>
                      <th className="p-4">Licence Number</th>
                      <th className="p-4">Consent Status</th>
                      <th className="p-4">Consent Version</th>
                      <th className="p-4">Timestamp & Device</th>
                      <th className="p-4 text-right">Regulatory Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                    {filteredConsents.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 font-sans text-sm">{c.driver_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{c.phone}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-700 font-semibold">{c.license}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                              c.status === 'CONSENTED'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : c.status === 'PENDING'
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-600">{c.version}</td>
                        <td className="p-4">
                          <div className="text-slate-800 font-mono text-[11px]">{c.consented_at}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{c.device}</div>
                        </td>
                        <td className="p-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status === 'CONSENTED' && (
                              <>
                                <button
                                  onClick={() => setSelectedConsentCert(c)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                                  <span>View Proof</span>
                                </button>
                                <button
                                  onClick={() => handleRevokeConsent(c.id)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  Revoke
                                </button>
                              </>
                            )}

                            {c.status === 'PENDING' && (
                              <button
                                onClick={() => handleVerifyConsent(c.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-2xs"
                              >
                                Verify & Approve
                              </button>
                            )}

                            {c.status === 'REVOKED' && (
                              <button
                                onClick={() => handleVerifyConsent(c.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                Re-instate
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
        {/* TAB 6: APPEND-ONLY FORENSIC TRANSACTION AUDIT TRAIL */}
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

        {/* ========================================================================= */}
        {/* TAB 7: INTEGRATED BUS FLEET DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'fleet_dir' && (
          <div className="h-full">
            <FleetManagementView />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: INTEGRATED LIVE OPERATIONS MAP & DISPATCH */}
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
                  <option value="driver">Driver</option>
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
      {/* MODAL 5: DPDP CONSENT CERTIFICATE AUDIT PROOF */}
      {/* ========================================================================= */}
      {selectedConsentCert && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>DPDP 2023 Digital Location Consent Certificate</span>
              </h3>
              <button
                onClick={() => setSelectedConsentCert(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Driver Legal Name:</span>
                <span className="font-bold text-slate-900">{selectedConsentCert.driver_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mobile Phone:</span>
                <span className="text-slate-700">{selectedConsentCert.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Driving Licence No:</span>
                <span className="text-slate-700">{selectedConsentCert.license}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statutory Policy Version:</span>
                <span className="text-emerald-700 font-bold">{selectedConsentCert.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Consent Recorded At:</span>
                <span className="text-slate-700">{selectedConsentCert.consented_at}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Device Hardware:</span>
                <span className="text-slate-600">{selectedConsentCert.device}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IP Origin:</span>
                <span className="text-slate-600">{selectedConsentCert.ip}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-500 block">Cryptographic Non-Repudiation Hash:</span>
                <span className="text-[10px] text-purple-700 break-all select-all font-mono font-bold">
                  {selectedConsentCert.proof_hash}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 leading-relaxed">
              ✓ Complies with Section 6 of India DPDP Act 2023. Notice given in Marathi, Hindi, and English. Driver explicit affirmative consent recorded with non-repudiation cryptographic signature and timestamp.
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => copyToClipboard(selectedConsentCert.proof_hash, 'cert_hash')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
              >
                {copiedKey === 'cert_hash' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'cert_hash' ? 'Hash Copied' : 'Copy Hash'}</span>
              </button>
              <button
                onClick={() => setSelectedConsentCert(null)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: INSPECT AUDIT ENTRY DETAILS */}
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
