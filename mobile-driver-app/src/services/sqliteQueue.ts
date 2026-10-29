import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

// SQLite Queue & Uploader Engine (Engineering Spec Section 9.5)
// Rule (§9.1): Background location task ONLY writes to SQLite; a separate uploader reads from SQLite.
// WAL Mode: PRAGMA journal_mode = WAL ensures crash-proof local persistence.

export interface QueuePoint {
  id: string; // UUID
  trip_id: string;
  recorded_at: number; // epoch ms (clock-corrected)
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  state: number; // 0 pending, 1 in flight
  attempts: number;
  next_try_at: number;
}

export interface HealthMetrics {
  battery_pct: number;
  charging: boolean;
  network: string;
  permission: string;
  app_version: string;
  [key: string]: any;
}

class SQLiteQueueUploader {
  private db: SQLite.SQLiteDatabase | null = null;
  private memoryQueue: QueuePoint[] = [];
  private memoryKv: Record<string, string> = {};
  private serverClockOffsetMs = 0;
  private isUploading = false;
  private backoffDelayMs = 2000;
  private droppedStaleCount = 0;
  private capturePausedTimeS = 0;

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        this.db = SQLite.openDatabaseSync('fleetcommand_driver.db');
        // Enable Write-Ahead Logging (WAL) mode for crash safety (§9.5)
        this.db.execSync('PRAGMA journal_mode = WAL;');

        // Create points queue table
        this.db.execSync(`
          CREATE TABLE IF NOT EXISTS points (
            id TEXT PRIMARY KEY,
            trip_id TEXT NOT NULL,
            recorded_at INTEGER NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            accuracy REAL,
            speed REAL,
            heading REAL,
            state INTEGER NOT NULL DEFAULT 0,
            attempts INTEGER NOT NULL DEFAULT 0,
            next_try_at INTEGER NOT NULL DEFAULT 0
          );
          CREATE INDEX IF NOT EXISTS points_pending ON points (state, next_try_at, recorded_at);

          CREATE TABLE IF NOT EXISTS outbox (
            id TEXT PRIMARY KEY,
            kind TEXT,
            payload TEXT,
            created_at INTEGER,
            attempts INTEGER DEFAULT 0,
            next_try_at INTEGER DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS kv (
            k TEXT PRIMARY KEY,
            v TEXT
          );
        `);

        // Reset rows stuck in flight for more than 60s back to pending on startup (§9.5)
        this.db.runSync(`
          UPDATE points
          SET state = 0
          WHERE state = 1;
        `);

        // Purge points older than 24 hours (time_stale)
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const purgeRes = this.db.runSync(
          'DELETE FROM points WHERE recorded_at < ?',
          [twentyFourHoursAgo]
        );
        if (purgeRes.changes > 0) {
          this.droppedStaleCount += purgeRes.changes;
        }

        // Restore clock offset from KV
        const offsetRow = this.db.getFirstSync<{ v: string }>(
          'SELECT v FROM kv WHERE k = ?',
          ['server_clock_offset']
        );
        if (offsetRow?.v) {
          this.serverClockOffsetMs = parseInt(offsetRow.v, 10) || 0;
        }
      }
    } catch (err) {
      console.warn('SQLite init fallback to in-memory mode:', err);
      this.db = null;
    }
  }

  public setClockOffset(offsetMs: number) {
    this.serverClockOffsetMs = offsetMs;
    this.setKV('server_clock_offset', String(offsetMs));
  }

  public getCorrectedNow(): number {
    return Date.now() + this.serverClockOffsetMs;
  }

  public setKV(key: string, value: string) {
    if (this.db) {
      try {
        this.db.runSync(
          'INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)',
          [key, value]
        );
      } catch (err) {
        console.warn('KV write error:', err);
      }
    } else {
      this.memoryKv[key] = value;
    }
  }

  public getKV(key: string): string | null {
    if (this.db) {
      try {
        const row = this.db.getFirstSync<{ v: string }>(
          'SELECT v FROM kv WHERE k = ?',
          [key]
        );
        return row ? row.v : null;
      } catch {
        return null;
      }
    }
    return this.memoryKv[key] || null;
  }

  // Section 9.4 & 9.5: Fast synchronous or in-memory write from location task
  public enqueuePoint(point: Omit<QueuePoint, 'state' | 'attempts' | 'next_try_at'>) {
    if (this.db) {
      try {
        this.db.runSync(
          `INSERT OR REPLACE INTO points (
            id, trip_id, recorded_at, lat, lng, accuracy, speed, heading, state, attempts, next_try_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
          [
            point.id,
            point.trip_id,
            point.recorded_at,
            point.lat,
            point.lng,
            point.accuracy,
            point.speed,
            point.heading,
          ]
        );
        return;
      } catch (err) {
        console.warn('SQLite enqueue error, falling back to memory queue:', err);
      }
    }

    this.memoryQueue.push({
      ...point,
      state: 0,
      attempts: 0,
      next_try_at: 0,
    });
  }

  public getQueueDepth(): number {
    if (this.db) {
      try {
        const res = this.db.getFirstSync<{ count: number }>(
          'SELECT COUNT(*) as count FROM points WHERE state = 0'
        );
        return res?.count ?? 0;
      } catch {
        return 0;
      }
    }
    return this.memoryQueue.filter((p) => p.state === 0).length;
  }

  public getDroppedStaleCount(): number {
    return this.droppedStaleCount;
  }

  public getCapturePausedTimeS(): number {
    return this.capturePausedTimeS;
  }

  // Section 9.5: Flush algorithm with batch size <= 200, jittered backoff, and outcome deletion
  public async flush(apiUrl: string, authToken: string, healthMetrics: HealthMetrics): Promise<boolean> {
    if (this.isUploading) return false;
    this.isUploading = true;

    try {
      const now = this.getCorrectedNow();

      let pendingPoints: QueuePoint[] = [];

      if (this.db) {
        // Drop points older than 24h (§9.5)
        const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
        const purgeRes = this.db.runSync('DELETE FROM points WHERE recorded_at < ?', [twentyFourHoursAgo]);
        if (purgeRes.changes > 0) {
          this.droppedStaleCount += purgeRes.changes;
        }

        // Fetch up to 200 pending points ordered by recorded_at
        pendingPoints = this.db.getAllSync<QueuePoint>(
          'SELECT * FROM points WHERE state = 0 AND next_try_at <= ? ORDER BY recorded_at ASC LIMIT 200',
          [now]
        );

        if (pendingPoints.length === 0) {
          this.isUploading = false;
          return true;
        }

        // Mark points in flight
        const ids = pendingPoints.map((p) => `'${p.id}'`).join(',');
        this.db.runSync(`UPDATE points SET state = 1 WHERE id IN (${ids})`);
      } else {
        const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
        const beforeLen = this.memoryQueue.length;
        this.memoryQueue = this.memoryQueue.filter((p) => p.recorded_at >= twentyFourHoursAgo);
        this.droppedStaleCount += beforeLen - this.memoryQueue.length;

        pendingPoints = this.memoryQueue
          .filter((p) => p.state === 0 && p.next_try_at <= now)
          .slice(0, 200);

        if (pendingPoints.length === 0) {
          this.isUploading = false;
          return true;
        }

        for (const p of pendingPoints) p.state = 1;
      }

      const payload = {
        sent_at: new Date(now).toISOString(),
        trip_id: pendingPoints[0]!.trip_id,
        points: pendingPoints.map((p) => ({
          id: p.id,
          recorded_at: new Date(p.recorded_at).toISOString(),
          lat: p.lat,
          lng: p.lng,
          accuracy_m: p.accuracy,
          speed_kmh: p.speed,
          heading_deg: p.heading,
        })),
        health: {
          ...healthMetrics,
          queue_depth: this.getQueueDepth(),
          dropped_stale: this.droppedStaleCount,
          capture_paused_s: this.capturePausedTimeS,
        },
      };

      const res = await fetch(`${apiUrl}/v1/ingest/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const body = await res.json();

        // Update clock offset from server_time (§5.1 & §9.5)
        if (body.server_time) {
          const serverEpoch = new Date(body.server_time).getTime();
          this.setClockOffset(serverEpoch - Date.now());
        }

        // Section 9.5: accepted, duplicate, rejected outcomes -> DELETE row from SQLite
        const handledIds = new Set<string>(
          (body.results || [])
            .filter((r: any) => r.outcome === 'accepted' || r.outcome === 'duplicate' || r.outcome === 'rejected')
            .map((r: any) => String(r.id))
        );

        if (this.db) {
          for (const id of handledIds) {
            this.db.runSync('DELETE FROM points WHERE id = ?', [id]);
          }
          // Any points remaining in flight revert to pending
          this.db.runSync('UPDATE points SET state = 0 WHERE state = 1');
        } else {
          this.memoryQueue = this.memoryQueue.filter((p) => !handledIds.has(p.id));
          for (const p of this.memoryQueue) {
            if (p.state === 1) p.state = 0;
          }
        }

        this.backoffDelayMs = 2000; // Reset backoff on success
      } else {
        // Server returned 4xx or 5xx: revert batch to pending with exponential backoff & 20% jitter (§9.5)
        const jitter = (Math.random() * 0.4 - 0.2) * this.backoffDelayMs;
        const retryAt = now + this.backoffDelayMs + jitter;
        this.backoffDelayMs = Math.min(60_000, this.backoffDelayMs * 2);

        if (this.db) {
          const ids = pendingPoints.map((p) => `'${p.id}'`).join(',');
          this.db.runSync(`
            UPDATE points 
            SET state = 0, attempts = attempts + 1, next_try_at = ${Math.round(retryAt)}
            WHERE id IN (${ids})
          `);
        } else {
          for (const p of pendingPoints) {
            p.state = 0;
            p.attempts += 1;
            p.next_try_at = Math.round(retryAt);
          }
        }
      }
    } catch {
      // Network unreachable: revert in flight to pending
      if (this.db) {
        this.db.runSync('UPDATE points SET state = 0 WHERE state = 1');
      } else {
        for (const p of this.memoryQueue) {
          if (p.state === 1) p.state = 0;
        }
      }
    } finally {
      this.isUploading = false;
    }

    return true;
  }
}

export const driverUploader = new SQLiteQueueUploader();
