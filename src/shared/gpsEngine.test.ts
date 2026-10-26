import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateGpsPoint,
  evaluateTrackingStatus,
  shouldTriggerOemPingToWake,
  shouldTriggerUnpluggedAlert,
  maskDriverPiiForRole,
  canRoleMutate,
} from './gpsEngine';

const BASE_TIME = Date.parse('2026-10-25T10:00:00.000Z');

test('accepts valid fresh GPS point and marks updatedLatest = true', () => {
  const outcome = evaluateGpsPoint(
    {
      clientPointId: 'pt-001',
      recordedAt: new Date(BASE_TIME - 5000).toISOString(),
      latitude: 18.5913,
      longitude: 73.7389,
      accuracyM: 6.5,
      speedKmh: 42,
      headingDeg: 110,
      isMockLocation: false,
      batteryPct: 90,
      isCharging: true,
      networkType: '4G_LTE',
      source: 'ANDROID_FOREGROUND_GPS',
    },
    BASE_TIME,
    new Set(),
    {
      latitude: 18.5909,
      longitude: 73.7385,
      recordedAtMs: BASE_TIME - 10000,
    }
  );

  assert.equal(outcome.status, 'accepted');
  assert.equal(outcome.reasonCode, 'ACCEPTED_LIVE_AND_HISTORY');
  assert.equal(outcome.updatedLatest, true);
  assert.equal(outcome.shouldInsertHistory, true);
  assert.equal(outcome.shouldQuarantine, false);
});

test('out-of-order delayed upload inserts into history but never moves latest_bus_locations backwards', () => {
  const outcome = evaluateGpsPoint(
    {
      clientPointId: 'pt-delayed-002',
      recordedAt: new Date(BASE_TIME - 30000).toISOString(), // 30s ago
      latitude: 18.589,
      longitude: 73.735,
      accuracyM: 8,
      speedKmh: 35,
      headingDeg: 90,
      isMockLocation: false,
      batteryPct: 88,
      isCharging: true,
      networkType: '4G_LTE',
      source: 'ANDROID_FOREGROUND_GPS',
    },
    BASE_TIME,
    new Set(),
    {
      latitude: 18.5913,
      longitude: 73.7389,
      recordedAtMs: BASE_TIME - 5000, // Newer point already on server (5s ago)
    }
  );

  assert.equal(outcome.status, 'accepted');
  assert.equal(outcome.reasonCode, 'ACCEPTED_HISTORY_ONLY_OLDER_TIMESTAMP');
  assert.equal(outcome.updatedLatest, false);
  assert.equal(outcome.shouldInsertHistory, true);
});

test('deduplicates repeated clientPointId idempotently', () => {
  const outcome = evaluateGpsPoint(
    {
      clientPointId: 'pt-dup-99',
      recordedAt: new Date(BASE_TIME - 5000).toISOString(),
      latitude: 18.5913,
      longitude: 73.7389,
      accuracyM: 6,
      speedKmh: 40,
      headingDeg: 100,
      isMockLocation: false,
      batteryPct: 85,
      isCharging: true,
      networkType: '4G_LTE',
      source: 'ANDROID_FOREGROUND_GPS',
    },
    BASE_TIME,
    new Set(['pt-dup-99']),
    null
  );

  assert.equal(outcome.status, 'duplicate');
  assert.equal(outcome.reasonCode, 'DUPLICATE_CLIENT_POINT_ID');
  assert.equal(outcome.updatedLatest, false);
  assert.equal(outcome.shouldInsertHistory, false);
});

test('quarantines Android mock-location flagged points and never marks them as live', () => {
  const outcome = evaluateGpsPoint(
    {
      clientPointId: 'pt-spoof-1',
      recordedAt: new Date(BASE_TIME - 2000).toISOString(),
      latitude: 18.62,
      longitude: 73.8,
      accuracyM: 3,
      speedKmh: 45,
      headingDeg: 90,
      isMockLocation: true,
      batteryPct: 80,
      isCharging: false,
      networkType: '4G_LTE',
      source: 'ANDROID_FOREGROUND_GPS',
    },
    BASE_TIME,
    new Set(),
    null
  );

  assert.equal(outcome.status, 'rejected');
  assert.equal(outcome.reasonCode, 'REJECTED_SPOOFING_MOCK_LOCATION');
  assert.equal(outcome.shouldQuarantine, true);
  assert.equal(outcome.updatedLatest, false);
});

test('quarantines impossible movement jumps faster than 120 km/h', () => {
  const outcome = evaluateGpsPoint(
    {
      clientPointId: 'pt-teleport-1',
      recordedAt: new Date(BASE_TIME).toISOString(),
      latitude: 18.65, // ~6.5 km jump in 5 seconds!
      longitude: 73.7389,
      accuracyM: 10,
      speedKmh: 50,
      headingDeg: 0,
      isMockLocation: false,
      batteryPct: 80,
      isCharging: true,
      networkType: '4G_LTE',
      source: 'ANDROID_FOREGROUND_GPS',
    },
    BASE_TIME,
    new Set(),
    {
      latitude: 18.5913,
      longitude: 73.7389,
      recordedAtMs: BASE_TIME - 5000,
    }
  );

  assert.equal(outcome.status, 'rejected');
  assert.equal(outcome.reasonCode, 'REJECTED_IMPOSSIBLE_SPEED_JUMP');
  assert.equal(outcome.shouldQuarantine, true);
  assert.equal(outcome.updatedLatest, false);
});

test('evaluates Fresh, Stale, Offline, and Not Started states per Section 5 thresholds', () => {
  assert.equal(
    evaluateTrackingStatus({
      lastRecordedAtMs: BASE_TIME - 45_000,
      nowMs: BASE_TIME,
      tripStatus: 'active',
    }),
    'fresh'
  );

  assert.equal(
    evaluateTrackingStatus({
      lastRecordedAtMs: BASE_TIME - 120_000,
      nowMs: BASE_TIME,
      tripStatus: 'active',
    }),
    'stale'
  );

  assert.equal(
    evaluateTrackingStatus({
      lastRecordedAtMs: BASE_TIME - 360_000,
      nowMs: BASE_TIME,
      tripStatus: 'active',
    }),
    'offline'
  );

  assert.equal(
    evaluateTrackingStatus({
      lastRecordedAtMs: null,
      nowMs: BASE_TIME,
      tripStatus: 'scheduled',
      scheduledStartAtMs: BASE_TIME - 12 * 60 * 1000, // 12 min past departure
    }),
    'not_started'
  );
});

test('triggers OEM Ping-to-Wake at 45s and Unplugged Alert below 30% battery', () => {
  assert.equal(
    shouldTriggerOemPingToWake({
      lastRecordedAtMs: BASE_TIME - 48_000,
      nowMs: BASE_TIME,
      tripStatus: 'active',
    }),
    true
  );

  assert.equal(
    shouldTriggerUnpluggedAlert({
      tripStatus: 'active',
      isCharging: false,
      batteryPct: 24,
    }),
    true
  );

  assert.equal(
    shouldTriggerUnpluggedAlert({
      tripStatus: 'active',
      isCharging: true,
      batteryPct: 24,
    }),
    false
  );
});

test('enforces DPDP Act 2023 driver PII masking and RBAC read-only lock for viewer role', () => {
  const rawDriver = {
    phone: '+91 98230 11001',
    licenseNumber: 'MH12-20160089121',
  };

  const supervisorView = maskDriverPiiForRole(rawDriver, 'supervisor');
  assert.equal(supervisorView.piiMasked, false);
  assert.equal(supervisorView.phone, '+91 98230 11001');

  const viewerView = maskDriverPiiForRole(rawDriver, 'viewer');
  assert.equal(viewerView.piiMasked, true);
  assert.notEqual(viewerView.phone, '+91 98230 11001');
  assert.equal(canRoleMutate('viewer', 'FLEET_CRUD'), false);
  assert.equal(canRoleMutate('admin', 'FLEET_CRUD'), true);
});

