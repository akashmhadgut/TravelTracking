import { z } from 'zod';
import {
  UserRoleSchema,
  TripStatusSchema,
  BusStatusSchema,
  AlertStatusSchema,
  SeveritySchema,
  TrackingSourceSchema,
  PlatformSchema,
  ClosedBySchema,
} from './enums.js';

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  settings: z.object({
    speed_limit_kmh: z.number().default(80),
    retention_days: z.number().default(90),
    fresh_s: z.number().default(60),
    offline_s: z.number().default(300),
    interval_moving_s: z.number().default(10),
    interval_still_s: z.number().default(30),
  }),
  created_at: z.string().datetime({ offset: true }),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  role: UserRoleSchema,
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  status: z.enum(['active', 'suspended', 'locked']).default('active'),
  failed_attempts: z.number().int().default(0),
  locked_until: z.string().datetime({ offset: true }).nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
});
export type User = z.infer<typeof UserSchema>;

export const InstallationSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  user_id: z.string().uuid(),
  platform: PlatformSchema,
  model: z.string().nullable().optional(),
  os_version: z.string().nullable().optional(),
  app_version: z.string().nullable().optional(),
  revoked_at: z.string().datetime({ offset: true }).nullable().optional(),
  last_seen_at: z.string().datetime({ offset: true }).nullable().optional(),
});
export type Installation = z.infer<typeof InstallationSchema>;

export const VehicleDocumentComplianceSchema = z.object({
  rc: z.object({
    doc_number: z.string(),
    valid_until: z.string().optional(),
    status: z.enum(['verified', 'pending', 'expired']).default('verified'),
  }).optional(),
  road_tax: z.object({
    receipt_number: z.string(),
    valid_until: z.string().optional(),
    status: z.enum(['verified', 'pending', 'expired']).default('verified'),
  }).optional(),
  puc: z.object({
    cert_number: z.string(),
    valid_until: z.string().optional(),
    status: z.enum(['verified', 'pending', 'expired']).default('verified'),
  }).optional(),
  insurance: z.object({
    policy_number: z.string(),
    provider: z.string().optional(),
    valid_until: z.string().optional(),
    status: z.enum(['verified', 'pending', 'expired']).default('verified'),
  }).optional(),
  permit: z.object({
    permit_number: z.string(),
    permit_type: z.string().optional(),
    valid_until: z.string().optional(),
    status: z.enum(['verified', 'pending', 'expired']).default('verified'),
  }).optional(),
  fitness: z.object({
    cert_number: z.string(),
    valid_until: z.string().optional(),
    status: z.enum(['verified', 'pending', 'expired']).default('verified'),
  }).optional(),
});
export type VehicleDocumentCompliance = z.infer<typeof VehicleDocumentComplianceSchema>;

export const DriverDocumentComplianceSchema = z.object({
  aadhaar: z.object({
    doc_number: z.string(),
    status: z.enum(['verified', 'pending']).default('verified'),
  }).optional(),
  police_verification: z.object({
    cert_number: z.string(),
    police_station: z.string().optional(),
    valid_until: z.string().optional(),
    status: z.enum(['verified', 'pending', 'expired']).default('verified'),
  }).optional(),
  medical_fitness: z.object({
    cert_number: z.string(),
    doctor_name: z.string().optional(),
    doctor_reg: z.string().optional(),
    valid_until: z.string().optional(),
    status: z.enum(['verified', 'pending', 'expired']).default('verified'),
  }).optional(),
  driving_licence: z.object({
    license_number: z.string(),
    class: z.string().optional(),
    valid_until: z.string().optional(),
    status: z.enum(['verified', 'pending', 'expired']).default('verified'),
  }).optional(),
  contact_number: z.object({
    phone: z.string(),
    is_verified: z.boolean().default(true),
  }).optional(),
});
export type DriverDocumentCompliance = z.infer<typeof DriverDocumentComplianceSchema>;

export const BusSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  reg_no: z.string().min(3),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  capacity: z.number().int().nullable().optional(),
  default_route_id: z.string().uuid().nullable().optional(),
  tracking_source: TrackingSourceSchema.default('phone'),
  documents: VehicleDocumentComplianceSchema.optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type Bus = z.infer<typeof BusSchema>;

export const DriverSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  user_id: z.string().uuid(),
  licence_class: z.string(),
  licence_expiry: z.string().datetime({ offset: true }).nullable().optional(),
  licence_number_encrypted: z.string().optional(),
  address_encrypted: z.string().optional(),
  documents: DriverDocumentComplianceSchema.optional(),
  duty_status: z.enum(['on_duty', 'off_duty', 'on_leave']).default('on_duty'),
  created_at: z.string().datetime({ offset: true }),
});
export type Driver = z.infer<typeof DriverSchema>;

export const RouteStopSchema = z.object({
  id: z.string().uuid(),
  route_version_id: z.string().uuid(),
  sequence: z.number().int().min(1),
  name: z.string().min(2),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  planned_offset_min: z.number().int().nonnegative(),
});
export type RouteStop = z.infer<typeof RouteStopSchema>;

export const RouteVersionSchema = z.object({
  id: z.string().uuid(),
  route_id: z.string().uuid(),
  version_number: z.number().int().min(1),
  stops: z.array(RouteStopSchema),
  geometry: z.array(z.tuple([z.number(), z.number()])).optional(), // LineString coordinates [lng, lat]
  created_at: z.string().datetime({ offset: true }),
});
export type RouteVersion = z.infer<typeof RouteVersionSchema>;

export const RouteSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  code: z.string().min(2),
  name: z.string().min(2),
  current_version_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime({ offset: true }),
});
export type Route = z.infer<typeof RouteSchema>;

export const TripSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  route_id: z.string().uuid(),
  route_version_id: z.string().uuid(),
  bus_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  status: TripStatusSchema.default('scheduled'),
  planned_start: z.string().datetime({ offset: true }),
  planned_end: z.string().datetime({ offset: true }),
  actual_start: z.string().datetime({ offset: true }).nullable().optional(),
  actual_end: z.string().datetime({ offset: true }).nullable().optional(),
  distance_m: z.number().int().nullable().optional(),
  delayed: z.boolean().default(false),
  delay_reason: z.string().nullable().optional(),
  cancel_reason: z.string().nullable().optional(),
  closed_by: ClosedBySchema.nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
});
export type Trip = z.infer<typeof TripSchema>;

export const LatestBusLocationSchema = z.object({
  bus_id: z.string().uuid(),
  org_id: z.string().uuid(),
  trip_id: z.string().uuid().nullable().optional(),
  lat: z.number(),
  lng: z.number(),
  speed_kmh: z.number().nullable().optional(),
  heading_deg: z.number().nullable().optional(),
  accuracy_m: z.number().nullable().optional(),
  recorded_at: z.string().datetime({ offset: true }),
  received_at: z.string().datetime({ offset: true }),
  source: TrackingSourceSchema,
  battery_pct: z.number().int().nullable().optional(),
  status: BusStatusSchema,
  status_since: z.string().datetime({ offset: true }),
  slow_since: z.string().datetime({ offset: true }).nullable().optional(),
  rev: z.string(), // BigInt serialized as string for JSON safety
});
export type LatestBusLocation = z.infer<typeof LatestBusLocationSchema>;

export const AlertSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  type: z.string(),
  severity: SeveritySchema,
  status: AlertStatusSchema.default('open'),
  bus_id: z.string().uuid().nullable().optional(),
  driver_id: z.string().uuid().nullable().optional(),
  trip_id: z.string().uuid().nullable().optional(),
  dedupe_key: z.string(),
  message: z.string(),
  data: z.record(z.unknown()).nullable().optional(),
  opened_at: z.string().datetime({ offset: true }),
  acknowledged_by: z.string().uuid().nullable().optional(),
  acknowledged_at: z.string().datetime({ offset: true }).nullable().optional(),
  resolved_by: z.string().uuid().nullable().optional(),
  resolved_at: z.string().datetime({ offset: true }).nullable().optional(),
  auto_resolved: z.boolean().default(false),
});
export type Alert = z.infer<typeof AlertSchema>;
