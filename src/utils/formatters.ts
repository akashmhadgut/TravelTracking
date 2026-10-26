import type { TrackingStatus } from '../shared/contracts.ts';

export function formatIstTime(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '—';
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return '—';
  return (
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date) + ' IST'
  );
}

export function formatIstDateTime(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '—';
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return '—';
  return (
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date) + ' IST'
  );
}

export function formatAgeDuration(ageSeconds: number | null | undefined): string {
  if (ageSeconds === null || ageSeconds === undefined) return 'No signal';
  if (ageSeconds < 60) return `${ageSeconds}s ago`;
  const mins = Math.floor(ageSeconds / 60);
  const secs = ageSeconds % 60;
  if (mins < 60) return `${mins}m ${secs}s ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

export function getStatusMeta(status: TrackingStatus | string) {
  switch (status) {
    case 'fresh':
      return {
        label: 'Live Now (≤ 1 min)',
        shortLabel: 'Live',
        textClass: 'text-emerald-700',
        dotColor: '#16a34a',
        ruleText: 'Live location · updated within 1 min',
      };
    case 'stale':
      return {
        label: 'Delayed Signal (1–5 min)',
        shortLabel: 'Delayed',
        textClass: 'text-amber-700',
        dotColor: '#d97706',
        ruleText: 'No update for 1–5 min',
      };
    case 'offline':
      return {
        label: 'Offline (> 5 min)',
        shortLabel: 'Offline',
        textClass: 'text-red-700',
        dotColor: '#dc2626',
        ruleText: 'Offline · showing last seen location',
      };
    case 'not_started':
      return {
        label: 'Late Start (> 10 min)',
        shortLabel: 'Late Start',
        textClass: 'text-red-700',
        dotColor: '#dc2626',
        ruleText: 'Trip has not started on time',
      };
    default:
      return {
        label: 'Parked at Depot',
        shortLabel: 'At Depot',
        textClass: 'text-slate-600',
        dotColor: '#64748b',
        ruleText: 'No active trip right now',
      };
  }
}
