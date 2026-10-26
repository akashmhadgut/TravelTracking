import { z } from 'zod';

// Client point uploaded from phone / device
export const IngestPointSchema = z.object({
  id: z.string().uuid(), // client_point_id
  recorded_at: z.string().datetime({ offset: true }),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_m: z.number().nonnegative().nullable().optional(),
  speed_kmh: z.number().nonnegative().max(300).nullable().optional(),
  heading_deg: z.number().min(0).max(360).nullable().optional(),
});
export type IngestPoint = z.infer<typeof IngestPointSchema>;

export const HealthBlockSchema = z.object({
  battery_pct: z.number().int().min(0).max(100),
  charging: z.boolean(),
  network: z.string().max(32),
  permission: z.enum(['always', 'while_using', 'denied', 'restricted']),
  queue_depth: z.number().int().nonnegative(),
  app_version: z.string().max(32),
  dropped_stale: z.number().int().nonnegative().optional().default(0),
  capture_paused_s: z.number().int().nonnegative().optional().default(0),
});
export type HealthBlock = z.infer<typeof HealthBlockSchema>;

// Request: POST /v1/ingest/locations (Section 5.1)
export const IngestBatchRequestSchema = z.object({
  sent_at: z.string().datetime({ offset: true }),
  trip_id: z.string().uuid(),
  points: z.array(IngestPointSchema).min(1).max(200),
  health: HealthBlockSchema,
});
export type IngestBatchRequest = z.infer<typeof IngestBatchRequestSchema>;

export const IngestOutcomeSchema = z.enum([
  'accepted',
  'duplicate',
  'rejected',
]);
export type IngestOutcome = z.infer<typeof IngestOutcomeSchema>;

export const IngestRejectReasonSchema = z.enum([
  'coord_invalid',
  'out_of_region',
  'time_future',
  'time_stale',
  'outside_trip_window',
  'speed_impossible',
]);
export type IngestRejectReason = z.infer<typeof IngestRejectReasonSchema>;

export const PointResultSchema = z.object({
  id: z.string().uuid(),
  outcome: IngestOutcomeSchema,
  reason: IngestRejectReasonSchema.optional(),
  flag: z.enum(['low_accuracy']).optional(),
});
export type PointResult = z.infer<typeof PointResultSchema>;

export const IngestBatchResponseSchema = z.object({
  server_time: z.string().datetime({ offset: true }),
  results: z.array(PointResultSchema),
  config: z.object({
    interval_moving_s: z.number().int().min(5).max(60),
    interval_still_s: z.number().int().min(5).max(120),
  }),
  min_app_version: z.string(),
});
export type IngestBatchResponse = z.infer<typeof IngestBatchResponseSchema>;
