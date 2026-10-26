import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { enqueueGpsPoint, flushQueueBatch } from './sqliteOfflineQueue';

export const LOCATION_TASK_NAME = 'FLEETCOMMAND_FOREGROUND_GPS_TASK';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };

  const batteryLevel = await Battery.getBatteryLevelAsync();
  const batteryState = await Battery.getBatteryStateAsync();
  const isCharging =
    batteryState === Battery.BatteryState.CHARGING ||
    batteryState === Battery.BatteryState.FULL;

  for (const loc of locations) {
    await enqueueGpsPoint({
      clientPointId: `pt-${loc.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      tripId: (globalThis as any).__ACTIVE_TRIP_ID || 1,
      recordedAt: new Date(loc.timestamp).toISOString(),
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracyM: loc.coords.accuracy ?? 10,
      speedKmh: Math.max(0, (loc.coords.speed ?? 0) * 3.6),
      headingDeg: loc.coords.heading ?? 0,
      isMockLocation: Boolean((loc as any).mocked),
      batteryPct: Math.round(batteryLevel * 100),
      isCharging,
      networkType: '4G_LTE',
    });
  }

  try {
    await flushQueueBatch(
      (globalThis as any).__API_BASE_URL,
      (globalThis as any).__DEVICE_UID,
      (globalThis as any).__ACTIVE_TRIP_ID
    );
  } catch {
    // Offline: points remain safely stored in SQLite until next tick or reconnect
  }
});

export async function startActiveTripTracking() {
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 5000,
    distanceInterval: 0,
    foregroundService: {
      notificationTitle: 'FleetCommand — Active Trip Tracking',
      notificationBody: 'Live bus GPS telemetry is active for passenger & depot safety.',
      notificationColor: '#0F172A',
      killServiceOnDestroy: false,
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}
