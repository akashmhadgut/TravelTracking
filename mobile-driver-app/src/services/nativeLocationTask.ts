import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { driverUploader, HealthMetrics } from './sqliteQueue';

export const TRACKING_TASK_NAME = 'FLEETCOMMAND_DRIVER_LOCATION_TASK';

let lastStoredTime = 0;
let lastStoredLat = 0;
let lastStoredLng = 0;
let lastStoredHeading = 0;

let currentIntervalMovingMs = 10_000;
let currentIntervalStillMs = 30_000;

export function configureCadence(movingS: number, stillS: number) {
  currentIntervalMovingMs = movingS * 1000;
  currentIntervalStillMs = stillS * 1000;
}

// Section 9.4: Pure throttle callback
function shouldStorePoint(
  lat: number,
  lng: number,
  speedKmh: number,
  headingDeg: number,
  nowMs: number
): boolean {
  if (lastStoredTime === 0) return true;

  const timeDiff = nowMs - lastStoredTime;
  const isMoving = speedKmh >= 5;
  const requiredInterval = isMoving ? currentIntervalMovingMs : currentIntervalStillMs;

  if (timeDiff >= requiredInterval) return true;

  // Heading changed by more than 25 degrees
  const headingDiff = Math.abs(headingDeg - lastStoredHeading);
  if (headingDiff > 25 && headingDiff < 335) return true;

  // Moved more than 150m (approx 0.00135 degrees)
  const dLat = Math.abs(lat - lastStoredLat);
  const dLng = Math.abs(lng - lastStoredLng);
  if (Math.hypot(dLat, dLng) > 0.00135) return true;

  return false;
}

// Background Location Task definition (Section 9.1 & 9.4)
// CRITICAL SPEC RULE: The background task NEVER makes network requests. It ONLY writes to SQLite!
TaskManager.defineTask(TRACKING_TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const tripId = driverUploader.getKV('active_trip_id') || '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a10';

  for (const loc of locations) {
    const lat = loc.coords.latitude;
    const lng = loc.coords.longitude;
    const speedKmh = Math.max(0, (loc.coords.speed ?? 0) * 3.6);
    const headingDeg = loc.coords.heading ?? 0;
    const accuracyM = loc.coords.accuracy ?? 8;
    const nowMs = driverUploader.getCorrectedNow();

    if (shouldStorePoint(lat, lng, speedKmh, headingDeg, nowMs)) {
      lastStoredTime = nowMs;
      lastStoredLat = lat;
      lastStoredLng = lng;
      lastStoredHeading = headingDeg;

      // Section 9.1: Background task ONLY writes to local SQLite queue
      driverUploader.enqueuePoint({
        id: '0192f0a1-8a01-7d22-8b31-' + Math.random().toString(36).substring(2, 14),
        trip_id: tripId,
        recorded_at: nowMs,
        lat,
        lng,
        accuracy: accuracyM,
        speed: speedKmh,
        heading: headingDeg,
      });
    }
  }
});

// Periodic Uploader Manager (Section 9.5)
// Operates on a detached timer or foreground trigger to upload batches up to 200 points
let uploaderIntervalId: any = null;

export function startPeriodicUploader(
  apiUrl: string,
  authToken: string,
  onUploadSuccess?: () => void
) {
  if (uploaderIntervalId) clearInterval(uploaderIntervalId);

  uploaderIntervalId = setInterval(async () => {
    // Collect device health block (§9.8)
    let batteryPct = 85;
    let isCharging = true;
    try {
      const level = await Battery.getBatteryLevelAsync();
      const state = await Battery.getBatteryStateAsync();
      batteryPct = Math.round(level * 100);
      isCharging =
        state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
    } catch {}

    const health: HealthMetrics = {
      battery_pct: batteryPct,
      charging: isCharging,
      network: '4g',
      permission: 'always',
      app_version: '1.0.0',
    };

    const flushed = await driverUploader.flush(apiUrl, authToken, health);
    if (flushed && onUploadSuccess) {
      onUploadSuccess();
    }
  }, 5000);
}

export function stopPeriodicUploader() {
  if (uploaderIntervalId) {
    clearInterval(uploaderIntervalId);
    uploaderIntervalId = null;
  }
}

// Section 9.4: Start Native Location Updates
export async function startNativeTracking(
  tripId: string,
  apiUrl: string,
  authToken: string,
  onUploadSuccess?: () => void
) {
  driverUploader.setKV('active_trip_id', tripId);
  driverUploader.setKV('api_url', apiUrl);
  driverUploader.setKV('auth_token', authToken);

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
  if (!hasStarted) {
    await Location.startLocationUpdatesAsync(TRACKING_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 0,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'FleetCommand — Live Bus Tracking Active',
        notificationBody: 'Sharing location telemetry with depot control room.',
        killServiceOnDestroy: false,
      },
    });
  }

  startPeriodicUploader(apiUrl, authToken, onUploadSuccess);
}

// Section 9.6: Stop Native Tracking
export async function stopNativeTracking() {
  stopPeriodicUploader();
  driverUploader.setKV('active_trip_id', '');

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME);
  }
}
