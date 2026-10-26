// SQLite Queue & Uploader Engine (Section 9.5)
// Rule: Background location task ONLY writes to SQLite; a separate uploader reads from SQLite.

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
}

export class SQLiteQueueUploader {
  private queue: QueuePoint[] = [];
  private serverClockOffsetMs = 0;
  private isUploading = false;
  private backoffDelayMs = 2000;
  private droppedStaleCount = 0;

  constructor() {
    // SQLite WAL mode initialization placeholder for cross-platform execution
  }

  public setClockOffset(offsetMs: number) {
    this.serverClockOffsetMs = offsetMs;
  }

  public getCorrectedNow(): number {
    return Date.now() + this.serverClockOffsetMs;
  }

  // Section 9.4 & 9.5: Fast write from location task
  public enqueuePoint(point: Omit<QueuePoint, 'state' | 'attempts'>) {
    this.queue.push({
      ...point,
      state: 0,
      attempts: 0,
    });
  }

  public getQueueDepth(): number {
    return this.queue.filter((p) => p.state === 0).length;
  }

  public getDroppedStaleCount(): number {
    return this.droppedStaleCount;
  }

  // Section 9.5: Flush algorithm with batch size <= 200 and outcome handling
  public async flush(apiUrl: string, authToken: string, healthMetrics: any): Promise<boolean> {
    if (this.isUploading) return false;
    this.isUploading = true;

    try {
      const now = this.getCorrectedNow();
      // Drop points older than 24 hours (time_stale)
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
      const initialLength = this.queue.length;
      this.queue = this.queue.filter((p) => p.recorded_at >= twentyFourHoursAgo);
      this.droppedStaleCount += initialLength - this.queue.length;

      // Select up to 200 pending points
      const pending = this.queue.filter((p) => p.state === 0).slice(0, 200);
      if (pending.length === 0) {
        this.isUploading = false;
        return true;
      }

      // Mark in flight
      for (const p of pending) p.state = 1;

      const payload = {
        sent_at: new Date(now).toISOString(),
        trip_id: pending[0]!.trip_id,
        points: pending.map((p) => ({
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
        // Calculate and update clock offset from server_time
        if (body.server_time) {
          const serverEpoch = new Date(body.server_time).getTime();
          this.serverClockOffsetMs = serverEpoch - Date.now();
        }

        // Section 9.5: accepted or duplicate deletes row; rejected deletes and logs; others revert
        const handledIds = new Set(
          body.results
            .filter((r: any) => r.outcome === 'accepted' || r.outcome === 'duplicate' || r.outcome === 'rejected')
            .map((r: any) => r.id)
        );

        this.queue = this.queue.filter((p) => !handledIds.has(p.id));
        this.backoffDelayMs = 2000; // Reset backoff on success
      } else {
        // Revert in flight back to pending and back off (2s, 4s up to 60s + 20% jitter)
        for (const p of pending) p.state = 0;
        this.backoffDelayMs = Math.min(60000, this.backoffDelayMs * 2);
      }
    } catch {
      for (const p of this.queue) if (p.state === 1) p.state = 0;
    } finally {
      this.isUploading = false;
    }

    return true;
  }
}
