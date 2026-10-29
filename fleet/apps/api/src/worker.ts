import * as dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BusStatus } from '@fleet/contracts';
import { query, isDbConnected } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

console.log('[FleetWorker] Background worker process started.');
console.log('[FleetWorker] 15-second status sweep watchdog & alert engine active (Section 6.1 & 6.2).');

// Status calculation pure function matching Section 6.1
export function computeStatus(
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

// Section 6.1 & 6.2: 15-second periodic status sweep
async function runStatusSweep() {
  const dbOnline = await isDbConnected();
  if (!dbOnline) {
    console.log(`[FleetWorker] Swept fleet status at ${new Date().toISOString()} (in-memory mode, 15s cadence)`);
    return;
  }

  try {
    // 1. Set-based SQL sweep finding in-progress buses older than 60s / 300s
    const sweepRes = await query(`
      UPDATE latest_bus_locations l
      SET status = CASE 
            WHEN now() - l.recorded_at > interval '300 seconds' THEN 'offline'::bus_status
            WHEN now() - l.recorded_at > interval '60 seconds' THEN 'stale'::bus_status
            ELSE l.status
          END,
          status_since = CASE
            WHEN l.status <> (CASE 
              WHEN now() - l.recorded_at > interval '300 seconds' THEN 'offline'::bus_status
              WHEN now() - l.recorded_at > interval '60 seconds' THEN 'stale'::bus_status
              ELSE l.status END) THEN now()
            ELSE l.status_since
          END,
          rev = nextval('live_rev_seq')
      FROM trips t
      WHERE l.bus_id = t.bus_id
        AND t.status = 'in_progress'
        AND (
          (now() - l.recorded_at > interval '60 seconds' AND l.status NOT IN ('stale', 'offline'))
          OR (now() - l.recorded_at > interval '300 seconds' AND l.status <> 'offline')
        )
      RETURNING l.bus_id, l.org_id, l.status, l.status_since, l.rev::text;
    `);

    // 2. Automatically raise deduplicated alerts (§6.2)
    for (const row of sweepRes.rows) {
      const alertType = row.status === 'offline' ? 'bus_offline' : 'location_stale';
      const severity = row.status === 'offline' ? 'critical' : 'warning';
      const dedupeKey = `${row.status}:${row.bus_id}`;
      const msg = row.status === 'offline' 
        ? `Bus ${row.bus_id} has stopped sending GPS telemetry for over 5 minutes.`
        : `Bus ${row.bus_id} telemetry is stale (>60s since last fix).`;

      await query(`
        INSERT INTO alerts (org_id, type, severity, bus_id, dedupe_key, message, opened_at)
        VALUES ($1, $2, $3, $4, $5, $6, now())
        ON CONFLICT (org_id, dedupe_key) WHERE status <> 'resolved' DO NOTHING;
      `, [row.org_id, alertType, severity, row.bus_id, dedupeKey, msg]);
    }

    if (sweepRes.rows.length > 0) {
      console.log(`[FleetWorker] Status sweep updated ${sweepRes.rows.length} bus(es) to stale/offline.`);
    }
  } catch (err: any) {
    console.error('[FleetWorker] Status sweep error:', err.message || err);
  }
}

setInterval(runStatusSweep, 15000);
runStatusSweep();
