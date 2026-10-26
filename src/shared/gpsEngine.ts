import type { IngestPointInput, IngestPointResult, TrackingStatus } from './contracts.ts';

const EARTH_RADIUS_M = 6371000;

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export function calculateImpliedSpeedKmh(
  lat1: number,
  lon1: number,
  time1Ms: number,
  lat2: number,
  lon2: number,
  time2Ms: number
): number {
  const deltaSec = Math.abs(time2Ms - time1Ms) / 1000;
  if (deltaSec < 1) {
    return 0;
  }
  const distMeters = haversineDistanceMeters(lat1, lon1, lat2, lon2);
  return (distMeters / deltaSec) * 3.6;
}

export interface PreviousLocationContext {
  latitude: number;
  longitude: number;
  recordedAtMs: number;
}

export interface PointEvaluationOutcome extends IngestPointResult {
  shouldInsertHistory: boolean;
  shouldQuarantine: boolean;
  quarantineDetail?: string;
  recordedAtMs: number;
}

/**
 * Pure deterministic GPS ingestion validator implementing Section 5 of the Production Plan v2.0:
 * - Coordinate bounds check
 * - Future clock skew protection (> 60s ahead of server time)
 * - Client point ID deduplication
 * - Mock location flag quarantine
 * - Low accuracy filter (> 80m rejected as multipath noise without false spoofing alert)
 * - Impossible movement quarantine (> 120 km/h jump with tight accuracy)
 * - Out-of-order protection (only updates latest_bus_locations when recorded_at is newer)
 */
export function evaluateGpsPoint(
  point: IngestPointInput,
  serverNowMs: number,
  existingPointIds: ReadonlySet<string>,
  latestKnown: PreviousLocationContext | null
): PointEvaluationOutcome {
  const recordedAtMs = Date.parse(point.recordedAt);

  if (
    Number.isNaN(recordedAtMs) ||
    point.latitude < -90 ||
    point.latitude > 90 ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    return {
      clientPointId: point.clientPointId,
      status: 'rejected',
      reasonCode: 'REJECTED_INVALID_COORDINATES',
      updatedLatest: false,
      shouldInsertHistory: false,
      shouldQuarantine: false,
      recordedAtMs: Number.isNaN(recordedAtMs) ? serverNowMs : recordedAtMs,
    };
  }

  // Deduplication check
  if (existingPointIds.has(point.clientPointId)) {
    return {
      clientPointId: point.clientPointId,
      status: 'duplicate',
      reasonCode: 'DUPLICATE_CLIENT_POINT_ID',
      updatedLatest: false,
      shouldInsertHistory: false,
      shouldQuarantine: false,
      recordedAtMs,
    };
  }

  // Clock skew guard: reject points more than 60s in the future so a drifted device clock never freezes live position
  if (recordedAtMs > serverNowMs + 60_000) {
    return {
      clientPointId: point.clientPointId,
      status: 'rejected',
      reasonCode: 'REJECTED_CLOCK_SKEW',
      updatedLatest: false,
      shouldInsertHistory: false,
      shouldQuarantine: true,
      quarantineDetail: `Device timestamp skewed +${Math.round((recordedAtMs - serverNowMs) / 1000)}s into the future`,
      recordedAtMs,
    };
  }

  // Device mock-location check (Section 5: Fake-GPS protection)
  if (point.isMockLocation) {
    return {
      clientPointId: point.clientPointId,
      status: 'rejected',
      reasonCode: 'REJECTED_SPOOFING_MOCK_LOCATION',
      updatedLatest: false,
      shouldInsertHistory: false,
      shouldQuarantine: true,
      quarantineDetail: 'Android mock-location provider flag (isFromMockProvider=true) detected on point',
      recordedAtMs,
    };
  }

  // Accuracy check: multipath urban canyon jumps (> 80m accuracy) are rejected cleanly without raising spoofing alerts
  if (point.accuracyM > 80) {
    return {
      clientPointId: point.clientPointId,
      status: 'rejected',
      reasonCode: 'REJECTED_LOW_ACCURACY',
      updatedLatest: false,
      shouldInsertHistory: false,
      shouldQuarantine: false,
      recordedAtMs,
    };
  }

  // Server impossible-movement check (> 120 km/h between sequential points)
  let impliedSpeedKmh = point.speedKmh ?? 0;
  if (latestKnown && recordedAtMs > latestKnown.recordedAtMs) {
    const deltaSec = (recordedAtMs - latestKnown.recordedAtMs) / 1000;
    if (deltaSec >= 2 && deltaSec <= 300) {
      impliedSpeedKmh = calculateImpliedSpeedKmh(
        latestKnown.latitude,
        latestKnown.longitude,
        latestKnown.recordedAtMs,
        point.latitude,
        point.longitude,
        recordedAtMs
      );
      if (impliedSpeedKmh > 120 && point.accuracyM <= 35) {
        return {
          clientPointId: point.clientPointId,
          status: 'rejected',
          reasonCode: 'REJECTED_IMPOSSIBLE_SPEED_JUMP',
          updatedLatest: false,
          shouldInsertHistory: false,
          shouldQuarantine: true,
          impliedSpeedKmh: Math.round(impliedSpeedKmh * 10) / 10,
          quarantineDetail: `Impossible coordinate jump implying ${Math.round(impliedSpeedKmh)} km/h (> 120 km/h bus limit)`,
          recordedAtMs,
        };
      }
    }
  }

  // Out-of-order check: delayed uploads insert into history but NEVER overwrite a newer latest_bus_locations row
  const isNewerThanLatest = !latestKnown || recordedAtMs > latestKnown.recordedAtMs;

  return {
    clientPointId: point.clientPointId,
    status: 'accepted',
    reasonCode: isNewerThanLatest
      ? 'ACCEPTED_LIVE_AND_HISTORY'
      : 'ACCEPTED_HISTORY_ONLY_OLDER_TIMESTAMP',
    updatedLatest: isNewerThanLatest,
    shouldInsertHistory: true,
    shouldQuarantine: false,
    impliedSpeedKmh: Math.round(impliedSpeedKmh * 10) / 10,
    recordedAtMs,
  };
}

/**
 * Section 5 Tracking Status Table (Page 8 of PDF):
 * - Fresh: Last valid point <= 60s old, trip active
 * - Stale: Last valid point 60s - 5 min (300s) old, trip active
 * - Offline: Last valid point > 5 min (300s) old during an active trip
 * - Not started: Scheduled trip not started within 10 min (600s) of departure time
 * - Not on trip: No active or scheduled trip
 */
export function evaluateTrackingStatus(params: {
  lastRecordedAtMs: number | null;
  nowMs: number;
  tripStatus: 'scheduled' | 'active' | 'completed' | 'cancelled' | null;
  scheduledStartAtMs?: number | null;
}): TrackingStatus {
  const { lastRecordedAtMs, nowMs, tripStatus, scheduledStartAtMs } = params;

  if (!tripStatus || tripStatus === 'completed' || tripStatus === 'cancelled') {
    return 'not_on_trip';
  }

  if (tripStatus === 'scheduled') {
    if (scheduledStartAtMs && nowMs - scheduledStartAtMs >= 10 * 60 * 1000) {
      return 'not_started';
    }
    return 'not_on_trip';
  }

  // tripStatus === 'active'
  if (!lastRecordedAtMs) {
    return 'offline';
  }

  const ageSec = Math.max(0, (nowMs - lastRecordedAtMs) / 1000);
  if (ageSec <= 60) {
    return 'fresh';
  }
  if (ageSec <= 300) {
    return 'stale';
  }
  return 'offline';
}

/**
 * Chinese OEM (Xiaomi/Vivo/Oppo/Realme) Background Survival Helper:
 * Triggers a high-priority silent FCM wakeup push when an active bus has not reported for 45 seconds
 * (before crossing the 60s Stale threshold).
 */
export function shouldTriggerOemPingToWake(params: {
  lastRecordedAtMs: number | null;
  nowMs: number;
  tripStatus: string | null;
}): boolean {
  if (params.tripStatus !== 'active' || !params.lastRecordedAtMs) {
    return false;
  }
  const ageSec = (params.nowMs - params.lastRecordedAtMs) / 1000;
  return ageSec >= 45;
}

/**
 * Section 9 Operational Control:
 * Unplugged alert when a phone on an active trip stops charging and drops below 30% battery.
 */
export function shouldTriggerUnpluggedAlert(params: {
  tripStatus: string | null;
  isCharging: boolean;
  batteryPct: number;
}): boolean {
  return params.tripStatus === 'active' && !params.isCharging && params.batteryPct < 30;
}

/**
 * Section 5 & Section 7 (DPDP Act 2023 Minimization & Access Control):
 * Restricts access to driver personal data (phone & driving license) when accessed by 'viewer' role.
 */
export function maskDriverPiiForRole(
  driver: { phone: string; licenseNumber: string },
  role: string
): { phone: string; licenseNumber: string; piiMasked: boolean } {
  if (role === 'admin' || role === 'supervisor' || role === 'dispatcher') {
    return {
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      piiMasked: false,
    };
  }
  const cleanPhone = driver.phone || '';
  const maskedPhone =
    cleanPhone.length > 6 ? `${cleanPhone.slice(0, 7)}•••••${cleanPhone.slice(-2)}` : '••••••••••';
  const cleanLic = driver.licenseNumber || '';
  const maskedLic = cleanLic.length > 6 ? `${cleanLic.slice(0, 7)}•••••••` : '••••••••••';

  return {
    phone: maskedPhone,
    licenseNumber: maskedLic,
    piiMasked: true,
  };
}

/**
 * Section 2 & 7 RBAC Guard:
 * Determines whether a given role is permitted to perform write/mutation operations.
 */
export function canRoleMutate(
  role: string,
  action: 'FLEET_CRUD' | 'DISPATCH_TRIP' | 'ACKNOWLEDGE_ALERT' | 'DRIVER_ACTION'
): boolean {
  if (role === 'admin' || role === 'supervisor') return true;
  if (role === 'dispatcher') {
    return action === 'DISPATCH_TRIP' || action === 'ACKNOWLEDGE_ALERT' || action === 'FLEET_CRUD';
  }
  if (role === 'driver') {
    return action === 'DRIVER_ACTION';
  }
  return false; // 'viewer' is strictly read-only
}

