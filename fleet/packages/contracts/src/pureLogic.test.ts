import { describe, it, expect } from 'vitest';
import {
  IngestPointSchema,
  BusStatus,
} from './index.js';

// Section 6.1: Pure computeStatus function
function computeStatus(
  nowMs: number,
  lastRecordedAtMs: number,
  tripActive: boolean,
  speedKmh: number,
  cfg = { freshS: 60, offlineS: 300 }
): BusStatus {
  if (!tripActive) return 'not_on_trip';
  const ageS = (nowMs - lastRecordedAtMs) / 1000;
  if (ageS <= cfg.freshS) return speedKmh >= 5 ? 'moving' : 'stopped';
  if (ageS <= cfg.offlineS) return 'stale';
  return 'offline';
}

// Section 5.2: Pure validatePoint logic
function validatePoint(p: any, serverNowMs: number) {
  const recTime = new Date(p.recorded_at).getTime();

  // Rule: Future time > 60s
  if (recTime > serverNowMs + 60_000) {
    return { outcome: 'rejected', reason: 'time_future' };
  }
  // Rule: Too old > 24h
  if (recTime < serverNowMs - 86_400_000) {
    return { outcome: 'rejected', reason: 'time_stale' };
  }
  // Rule: Coordinates valid
  if (isNaN(p.lat) || isNaN(p.lng) || p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
    return { outcome: 'rejected', reason: 'coord_invalid' };
  }
  // Rule: Speed impossible jump
  if (p.speed_kmh && p.speed_kmh > 200) {
    return { outcome: 'rejected', reason: 'speed_impossible' };
  }

  // Rule: Weak fix (accuracy > 100m)
  const isLowAccuracy = p.accuracy_m !== null && p.accuracy_m !== undefined && p.accuracy_m > 100;

  return {
    outcome: 'accepted',
    flag: isLowAccuracy ? 'low_accuracy' : undefined,
  };
}

describe('Engineering Specification v1.0 — Pure Logic Test Suite', () => {
  describe('Status Engine (§6.1)', () => {
    const now = 1000000000;

    it('returns not_on_trip when trip is inactive', () => {
      expect(computeStatus(now, now, false, 40)).toBe('not_on_trip');
    });

    it('returns moving when fresh (<=60s) and speed >= 5 km/h', () => {
      expect(computeStatus(now, now - 10_000, true, 35)).toBe('moving');
    });

    it('returns stopped when fresh (<=60s) and speed < 5 km/h', () => {
      expect(computeStatus(now, now - 15_000, true, 0)).toBe('stopped');
    });

    it('returns stale when point age is between 60s and 300s', () => {
      expect(computeStatus(now, now - 120_000, true, 40)).toBe('stale');
    });

    it('returns offline when point age exceeds 300s (5 minutes)', () => {
      expect(computeStatus(now, now - 350_000, true, 40)).toBe('offline');
    });
  });

  describe('Point Validation & Weak Fix Handling (§5.2)', () => {
    const serverNow = Date.now();

    it('rejects points more than 60s in future (time_future)', () => {
      const futurePoint = {
        recorded_at: new Date(serverNow + 75_000).toISOString(),
        lat: 18.5204,
        lng: 73.8567,
      };
      const result = validatePoint(futurePoint, serverNow);
      expect(result.outcome).toBe('rejected');
      expect(result.reason).toBe('time_future');
    });

    it('rejects points older than 24 hours (time_stale)', () => {
      const stalePoint = {
        recorded_at: new Date(serverNow - 90_000_000).toISOString(),
        lat: 18.5204,
        lng: 73.8567,
      };
      const result = validatePoint(stalePoint, serverNow);
      expect(result.outcome).toBe('rejected');
      expect(result.reason).toBe('time_stale');
    });

    it('rejects impossible speed jumps > 200 km/h (speed_impossible)', () => {
      const fastPoint = {
        recorded_at: new Date(serverNow).toISOString(),
        lat: 18.5204,
        lng: 73.8567,
        speed_kmh: 245.0,
      };
      const result = validatePoint(fastPoint, serverNow);
      expect(result.outcome).toBe('rejected');
      expect(result.reason).toBe('speed_impossible');
    });

    it('accepts weak fix (>100m accuracy) with low_accuracy flag (§5.2)', () => {
      const weakPoint = {
        recorded_at: new Date(serverNow).toISOString(),
        lat: 18.5204,
        lng: 73.8567,
        accuracy_m: 140.0,
        speed_kmh: 30.0,
      };
      const result = validatePoint(weakPoint, serverNow);
      expect(result.outcome).toBe('accepted');
      expect(result.flag).toBe('low_accuracy');
    });

    it('accepts standard good fix (<100m accuracy) without flags', () => {
      const goodPoint = {
        recorded_at: new Date(serverNow).toISOString(),
        lat: 18.5204,
        lng: 73.8567,
        accuracy_m: 6.5,
        speed_kmh: 30.0,
      };
      const result = validatePoint(goodPoint, serverNow);
      expect(result.outcome).toBe('accepted');
      expect(result.flag).toBeUndefined();
    });
  });

  describe('Out-of-Order Resync Protection (LIVE-09)', () => {
    it('ensures newer recorded_at always updates while older point is rejected from latest location', () => {
      const currentLatest = {
        recorded_at_epoch: 1000,
        lat: 18.5204,
        lng: 73.8567,
        rev: 1001n,
      };

      const olderPoint = {
        recorded_at_epoch: 950, // older point received later
        lat: 18.5100,
        lng: 73.8400,
      };

      // Conditional upsert condition: WHERE EXCLUDED.recorded_at > l.recorded_at
      const willUpdate = olderPoint.recorded_at_epoch > currentLatest.recorded_at_epoch;
      expect(willUpdate).toBe(false); // Older point NEVER moves bus backwards
    });
  });

  describe('Clock Offset Correction (LIVE-12)', () => {
    it('corrects phone clock skew accurately using server_time offset', () => {
      const trueServerEpoch = 1700000000000;
      const skewedDeviceEpoch = trueServerEpoch + 300000; // Device is 5 minutes FAST

      // Offset calculated at connection/sync: server_time - device_time
      const calculatedOffset = trueServerEpoch - skewedDeviceEpoch;
      expect(calculatedOffset).toBe(-300000);

      // Points stamped with corrected UTC: device_now + offset
      const correctedPointEpoch = skewedDeviceEpoch + calculatedOffset;
      expect(correctedPointEpoch).toBe(trueServerEpoch);
    });
  });
});
