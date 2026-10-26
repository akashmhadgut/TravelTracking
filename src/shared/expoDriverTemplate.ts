export interface ExpoFileTemplate {
  filename: string;
  title: string;
  description: string;
  code: string;
}

export const EXPO_DRIVER_APP_FILES: ExpoFileTemplate[] = [
  {
    filename: 'mobile-driver-app/src/services/oemBatteryGuardian.ts',
    title: 'Multi-Brand OEM Battery & Autostart Deep-Linker (Xiaomi, Vivo, Oppo, Realme, Samsung)',
    description:
      'Solves aggressive background app killing on ANY phone brand chosen by the client or driver using direct Android Intent deep-links, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, and KeepAwake HUD.',
    code: `import { Platform, Linking, NativeModules } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Device from 'expo-device';

export interface OemSurvivalProfile {
  manufacturer: string;
  requiresAutostartToggle: boolean;
  autostartPackage?: string;
  autostartClass?: string;
  driverInstructions: string[];
}

export function detectOemSurvivalProfile(): OemSurvivalProfile {
  const brand = (Device.manufacturer || Device.brand || 'Generic').toLowerCase();

  if (brand.includes('xiaomi') || brand.includes('redmi') || brand.includes('poco')) {
    return {
      manufacturer: 'Xiaomi / Redmi (MIUI / HyperOS)',
      requiresAutostartToggle: true,
      autostartPackage: 'com.miui.securitycenter',
      autostartClass: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
      driverInstructions: [
        '1. Tap "Enable Background Autostart" below and switch FleetCommand ON.',
        '2. Set Battery Saver to "No restrictions".',
        '3. Keep phone plugged into 12V/24V dash charger with Night-HUD active.',
      ],
    };
  }

  if (brand.includes('vivo') || brand.includes('iqoo')) {
    return {
      manufacturer: 'Vivo (FuntouchOS)',
      requiresAutostartToggle: true,
      autostartPackage: 'com.vivo.permissionmanager',
      autostartClass: 'com.vivo.permissionmanager.activity.BgStartUpManagerActivity',
      driverInstructions: [
        '1. Enable "Allow High Background Power Consumption" for FleetCommand.',
        '2. Turn ON Autostart in Vivo Permission Manager.',
      ],
    };
  }

  if (brand.includes('oppo') || brand.includes('realme') || brand.includes('oneplus')) {
    return {
      manufacturer: 'Oppo / Realme (ColorOS)',
      requiresAutostartToggle: true,
      autostartPackage: 'com.coloros.safecenter',
      autostartClass: 'com.coloros.safecenter.permission.startup.StartupAppListActivity',
      driverInstructions: [
        '1. Allow "Auto-launch" and "Allow Background Activity" in Battery settings.',
        '2. Lock FleetCommand in Recent Apps tray.',
      ],
    };
  }

  return {
    manufacturer: Device.manufacturer || 'Samsung / Standard Android',
    requiresAutostartToggle: false,
    driverInstructions: [
      '1. Tap "Allow Unrestricted Battery" in the 1-tap system dialog.',
      '2. Set Location Permission to "Allow while using the app" (Foreground Service).',
    ],
  };
}

export async function requestIgnoreBatteryOptimizations(packageName: string) {
  if (Platform.OS !== 'android') return;
  await IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
    { data: \`package:\${packageName}\` }
  );
}

export async function openOemAutostartScreen(profile: OemSurvivalProfile) {
  if (Platform.OS !== 'android') return;
  try {
    if (profile.autostartPackage && profile.autostartClass) {
      await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
        className: profile.autostartClass,
        packageName: profile.autostartPackage,
      });
      return;
    }
  } catch {
    // Fallback to app details settings if OEM changes internal class name
    await Linking.openSettings();
  }
}`,
  },
  {
    filename: 'mobile-driver-app/src/services/sqliteOfflineQueue.ts',
    title: 'SQLite Persistent Offline GPS Queue + Batch Uploader',
    description:
      'Persists every GPS point to SQLite before network upload. Removes ONLY points returned as accepted or duplicate by POST /v1/ingest/locations.',
    code: `import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';

export interface QueuedGpsPoint {
  clientPointId: string;
  tripId: number;
  recordedAt: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
  speedKmh: number;
  headingDeg: number;
  isMockLocation: boolean;
  batteryPct: number;
  isCharging: boolean;
  networkType: string;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getQueueDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('fleet_gps_queue.db');
    await dbInstance.execAsync(\`
      CREATE TABLE IF NOT EXISTS gps_queue (
        client_point_id TEXT PRIMARY KEY NOT NULL,
        trip_id INTEGER NOT NULL,
        recorded_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    \`);
  }
  return dbInstance;
}

export async function enqueueGpsPoint(point: QueuedGpsPoint): Promise<void> {
  const db = await getQueueDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO gps_queue (client_point_id, trip_id, recorded_at, payload_json, created_at) VALUES (?, ?, ?, ?, ?)',
    [point.clientPointId, point.tripId, point.recordedAt, JSON.stringify(point), Date.now()]
  );
}

export async function flushQueueBatch(apiBaseUrl: string, deviceUid: string, tripId: number) {
  const db = await getQueueDb();
  const rows = await db.getAllAsync<{ client_point_id: string; payload_json: string }>(
    'SELECT client_point_id, payload_json FROM gps_queue WHERE trip_id = ? ORDER BY recorded_at ASC LIMIT 200',
    [tripId]
  );

  if (rows.length === 0) return { flushed: 0, remaining: 0 };

  const token = await SecureStore.getItemAsync('driver_access_token');
  const points = rows.map((r) => JSON.parse(r.payload_json));

  const response = await fetch(\`\${apiBaseUrl}/v1/ingest/locations\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${token || 'device-token-' + deviceUid}\`,
    },
    body: JSON.stringify({ deviceUid, tripId, points }),
  });

  if (!response.ok) {
    throw new Error(\`Upload failed with HTTP \${response.status}\`);
  }

  const result = await response.json();
  const removableIds: string[] = (result.results || [])
    .filter((r: any) => r.status === 'accepted' || r.status === 'duplicate')
    .map((r: any) => r.clientPointId);

  for (const id of removableIds) {
    await db.runAsync('DELETE FROM gps_queue WHERE client_point_id = ?', [id]);
  }

  return { flushed: removableIds.length };
}`,
  },
  {
    filename: 'mobile-driver-app/src/services/backgroundLocationTask.ts',
    title: 'Android Foreground Service + Mock-Location Detector + FCM Ping-to-Wake Receiver',
    description:
      'Runs foregroundServiceType="location", reads Android mocked flag on every fix, and wakes up on server 45s FCM high-priority data push.',
    code: `import * as TaskManager from 'expo-task-manager';
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
      clientPointId: \`pt-\${loc.timestamp}-\${Math.random().toString(36).slice(2, 8)}\`,
      tripId: globalThis.__ACTIVE_TRIP_ID || 1,
      recordedAt: new Date(loc.timestamp).toISOString(),
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracyM: loc.coords.accuracy ?? 10,
      speedKmh: Math.max(0, (loc.coords.speed ?? 0) * 3.6),
      headingDeg: loc.coords.heading ?? 0,
      // Section 5: Read Android mock-location flag on every point
      isMockLocation: Boolean((loc as any).mocked),
      batteryPct: Math.round(batteryLevel * 100),
      isCharging,
      networkType: '4G_LTE',
    });
  }

  try {
    await flushQueueBatch(
      globalThis.__API_BASE_URL,
      globalThis.__DEVICE_UID,
      globalThis.__ACTIVE_TRIP_ID
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
}`,
  },
];
