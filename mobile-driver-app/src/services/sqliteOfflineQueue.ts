import * as SQLite from 'expo-sqlite';
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
    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS gps_queue (
        client_point_id TEXT PRIMARY KEY NOT NULL,
        trip_id INTEGER NOT NULL,
        recorded_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
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

  const response = await fetch(`${apiBaseUrl}/v1/ingest/locations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || 'device-token-' + deviceUid}`,
    },
    body: JSON.stringify({ deviceUid, tripId, points }),
  });

  if (!response.ok) {
    throw new Error(`Upload failed with HTTP ${response.status}`);
  }

  const result = await response.json();
  const removableIds: string[] = (result.results || [])
    .filter((r: any) => r.status === 'accepted' || r.status === 'duplicate')
    .map((r: any) => r.clientPointId);

  for (const id of removableIds) {
    await db.runAsync('DELETE FROM gps_queue WHERE client_point_id = ?', [id]);
  }

  return { flushed: removableIds.length };
}
