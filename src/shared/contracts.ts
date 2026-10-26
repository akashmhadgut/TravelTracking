import { z } from 'zod';

// Section 4 & 11: Normalized LocationSource interface (supports Android app and AIS-140 VLTD hardware)
export type LocationSourceType = 'ANDROID_FOREGROUND_GPS' | 'AIS140_VLTD' | 'SIMULATOR';

export type TrackingStatus = 'fresh' | 'stale' | 'offline' | 'not_started' | 'not_on_trip';

export type OperatorRole = 'admin' | 'supervisor' | 'dispatcher' | 'viewer' | 'driver';

export type IngestDecisionStatus = 'accepted' | 'duplicate' | 'rejected';

export type IngestReasonCode =
  | 'ACCEPTED_LIVE_AND_HISTORY'
  | 'ACCEPTED_HISTORY_ONLY_OLDER_TIMESTAMP'
  | 'DUPLICATE_CLIENT_POINT_ID'
  | 'REJECTED_SPOOFING_MOCK_LOCATION'
  | 'REJECTED_IMPOSSIBLE_SPEED_JUMP'
  | 'REJECTED_CLOCK_SKEW'
  | 'REJECTED_LOW_ACCURACY'
  | 'REJECTED_INVALID_COORDINATES'
  | 'REJECTED_UNREGISTERED_DEVICE';

export const IngestPointSchema = z.object({
  clientPointId: z.string().min(4).max(128),
  recordedAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(5000).default(8),
  speedKmh: z.number().min(0).max(300).optional().default(0),
  headingDeg: z.number().min(0).max(360).optional().default(0),
  isMockLocation: z.boolean().optional().default(false),
  batteryPct: z.number().int().min(0).max(100).optional().default(85),
  isCharging: z.boolean().optional().default(true),
  networkType: z.string().max(32).optional().default('4G_LTE'),
  source: z
    .enum(['ANDROID_FOREGROUND_GPS', 'AIS140_VLTD', 'SIMULATOR'])
    .optional()
    .default('ANDROID_FOREGROUND_GPS'),
});

// Section 11: POST /v1/ingest/locations accepts authenticated batches up to 200 points
export const IngestBatchRequestSchema = z.object({
  deviceUid: z.string().min(3).max(64),
  tripId: z.number().int().positive(),
  busId: z.number().int().positive().optional(),
  points: z.array(IngestPointSchema).min(1).max(200),
});

export type IngestPointInput = z.infer<typeof IngestPointSchema>;
export type IngestBatchRequest = z.infer<typeof IngestBatchRequestSchema>;

export interface IngestPointResult {
  clientPointId: string;
  status: IngestDecisionStatus;
  reasonCode: IngestReasonCode;
  updatedLatest: boolean;
  impliedSpeedKmh?: number;
}

export const CreateBusSchema = z.object({
  registrationNumber: z
    .string()
    .min(6, 'Registration number required (e.g., MH-12-FC-1025)')
    .max(24)
    .regex(/^[A-Z]{2}-[0-9]{2}-[A-Z]{1,3}-[0-9]{4}$/, 'Use standard RTO format: MH-12-FC-1025'),
  fleetCode: z.string().min(3, 'Fleet code required (e.g., BUS-025)').max(20),
  depotName: z.string().min(3, 'Depot name required').max(64),
  busModel: z.string().min(3, 'Bus model required').max(64),
  capacity: z.coerce.number().int().min(10).max(120),
  locationSourceType: z.enum(['ANDROID_COMPANION', 'AIS140_VLTD']),
  ais140DeviceImei: z.string().max(24).optional(),
});

export const CreateDriverSchema = z.object({
  employeeCode: z.string().min(3, 'Employee code required (e.g., DRV-209)').max(24),
  fullName: z.string().min(3, 'Driver full name required').max(80),
  phone: z.string().min(10, '10-digit phone number required').max(16),
  licenseNumber: z.string().min(8, 'Valid driving license required').max(32),
  preferredLanguage: z.string().min(2).max(48),
  dpdpNoticeAccepted: z.boolean().refine((val) => val === true, {
    message: 'DPDP Act 2023 driver notice acknowledgment is mandatory',
  }),
});

export const CreateTripSchema = z.object({
  tripCode: z.string().min(4, 'Trip code required').max(32),
  busId: z.coerce.number().int().positive('Select a bus'),
  driverId: z.coerce.number().int().positive('Select a driver'),
  deviceId: z.coerce.number().int().positive('Select a registered device'),
  routeId: z.coerce.number().int().positive('Select a route'),
  scheduledStartAt: z.string().min(10, 'Scheduled departure time required'),
});

// Section 2: Route, Stop & Schedule Builder Schema
export const CreateRouteSchema = z.object({
  routeCode: z.string().min(3, 'Route code required (e.g., RT-505)').max(20),
  name: z.string().min(5, 'Route corridor name required').max(100),
  originName: z.string().min(3, 'Origin terminal required').max(64),
  destinationName: z.string().min(3, 'Destination terminal required').max(64),
  distanceKm: z.coerce.number().min(1).max(500),
  scheduledDurationMin: z.coerce.number().int().min(5).max(600),
  intermediateStopsText: z
    .string()
    .min(3, 'Enter comma-separated intermediate stops (e.g., Baner, Pashan, Kothrud)'),
});

// Section 9: Device Registration & Same-Day Spare Phone Swap Schema
export const SwapSpareDeviceSchema = z.object({
  busId: z.coerce.number().int().positive('Select a bus to bind or swap phone'),
  newDeviceUid: z.string().min(4, 'New or spare Device UID required (e.g., DEV-SPARE-XIAOMI-09)').max(64),
  manufacturer: z.string().min(2, 'Manufacturer required').max(40),
  model: z.string().min(2, 'Phone model required').max(48),
  osVersion: z.string().min(2).max(48).default('Android 14'),
  ownershipType: z.enum(['COMPANY_ISSUED', 'DRIVER_PERSONAL']),
});

// Section 5: Soft-Deactivate Business Records Schema
export const ToggleEntityActiveSchema = z.object({
  entityType: z.enum(['bus', 'driver', 'device', 'route']),
  entityId: z.coerce.number().int().positive(),
  isActive: z.boolean(),
});

export const DriverIncidentSchema = z.object({
  busId: z.coerce.number().int().positive(),
  tripId: z.coerce.number().int().positive().optional(),
  severity: z.enum(['warning', 'critical']),
  incidentType: z.enum([
    'TRAFFIC_GRIDLOCK',
    'MECHANICAL_BREAKDOWN',
    'TYRE_PUNCTURE',
    'MEDICAL_EMERGENCY',
    'MOUNT_CHARGER_FAULT',
  ]),
  notes: z.string().min(5, 'Provide brief incident details for control room').max(280),
});

export function generateOpenApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'FleetCommand — Live Bus Tracking & Fleet Operations API',
      version: '2.0.0',
      description:
        'Production Implementation Plan v2.0 compliant REST + Socket.IO contract with idempotent batch ingestion, out-of-order protection, RBAC PII masking, and anti-spoofing quarantine.',
    },
    paths: {
      '/v1/ingest/locations': {
        post: {
          summary: 'Ingest authenticated batch of up to 200 GPS points from driver device or AIS-140 adapter',
        },
      },
      '/v1/live/buses': {
        get: {
          summary: 'Fetch authorized organization live fleet snapshot with freshness & device health',
        },
      },
      '/v1/routes': {
        post: {
          summary: 'Create new bus route corridor with stop sequence and schedule',
        },
      },
      '/v1/devices/swap': {
        post: {
          summary: 'Perform same-day spare phone swap or bind new device to a bus',
        },
      },
      '/v1/entities/active': {
        patch: {
          summary: 'Soft-deactivate or reactivate a business record while preserving audit trail',
        },
      },
      '/v1/exports/locations.csv': {
        get: {
          summary: 'Export organization-scoped report (fleet, trips, alerts, quarantine, devices) as CSV',
        },
      },
    },
  };
}
