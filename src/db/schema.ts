import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  ais140GateOutcome: text('ais140_gate_outcome').notNull().default('A_PHONE_GPS'), // A_PHONE_GPS | B_AIS140_FITTED | C_AIS140_PROCURE
  deviceOwnershipPolicy: text('device_ownership_policy').notNull().default('HYBRID_COMPANY_AND_BYOD'),
  rawGpsRetentionDays: integer('raw_gps_retention_days').notNull().default(90),
  grievanceOfficerName: text('grievance_officer_name').notNull().default('Rajesh Sharma (Data Protection Officer)'),
  grievanceOfficerEmail: text('grievance_officer_email').notNull().default('dpo-privacy@deccantransit.in'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  organizationId: integer('organization_id')
    .references(() => organizations.id)
    .notNull(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull().default('Operations Supervisor'),
  role: text('role').notNull().default('supervisor'), // admin | supervisor | dispatcher | driver | viewer
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const buses = pgTable(
  'buses',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id)
      .notNull(),
    registrationNumber: text('registration_number').notNull().unique(),
    fleetCode: text('fleet_code').notNull(),
    depotName: text('depot_name').notNull().default('Pune Wakad Depot'),
    busModel: text('bus_model').notNull().default('Tata Starbus EV 12m'),
    capacity: integer('capacity').notNull().default(45),
    locationSourceType: text('location_source_type').notNull().default('ANDROID_COMPANION'), // ANDROID_COMPANION | AIS140_VLTD
    ais140DeviceImei: text('ais140_device_imei'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_buses_org').on(table.organizationId)]
);

export const drivers = pgTable(
  'drivers',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id)
      .notNull(),
    employeeCode: text('employee_code').notNull(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    licenseNumber: text('license_number').notNull(),
    preferredLanguage: text('preferred_language').notNull().default('Marathi / Hindi / English'),
    dpdpNoticeAccepted: boolean('dpdp_notice_accepted').notNull().default(true),
    dpdpConsentRecordedAt: timestamp('dpdp_consent_recorded_at', { withTimezone: true }).defaultNow().notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_drivers_org').on(table.organizationId)]
);

export const devices = pgTable(
  'devices',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id)
      .notNull(),
    deviceUid: text('device_uid').notNull().unique(),
    assignedBusId: integer('assigned_bus_id').references(() => buses.id),
    ownershipType: text('ownership_type').notNull().default('COMPANY_ISSUED'), // COMPANY_ISSUED | DRIVER_PERSONAL
    manufacturer: text('manufacturer').notNull().default('Xiaomi'),
    model: text('model').notNull().default('Redmi 12 5G'),
    osVersion: text('os_version').notNull().default('Android 14 (HyperOS)'),
    appVersion: text('app_version').notNull().default('2.0.4-prod'),
    batteryPct: integer('battery_pct').notNull().default(88),
    isCharging: boolean('is_charging').notNull().default(true),
    batteryOptIgnored: boolean('battery_opt_ignored').notNull().default(true),
    oemAutostartEnabled: boolean('oem_autostart_enabled').notNull().default(true),
    keepAwakeHudActive: boolean('keep_awake_hud_active').notNull().default(true),
    permissionState: text('permission_state').notNull().default('FOREGROUND_SERVICE_LOCATION'),
    mdmEnrolled: boolean('mdm_enrolled').notNull().default(true),
    wakeupPingsSent: integer('wakeup_pings_sent').notNull().default(0),
    lastWakeupPingAt: timestamp('last_wakeup_ping_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [index('idx_devices_org').on(table.organizationId)]
);

export const routes = pgTable(
  'routes',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id)
      .notNull(),
    routeCode: text('route_code').notNull(),
    name: text('name').notNull(),
    originName: text('origin_name').notNull(),
    destinationName: text('destination_name').notNull(),
    distanceKm: doublePrecision('distance_km').notNull().default(24.5),
    scheduledDurationMin: integer('scheduled_duration_min').notNull().default(65),
    stopsJson: text('stops_json').notNull(), // JSON array of { name, lat, lng, sequence, scheduledOffsetMin }
    polylineJson: text('polyline_json').notNull(), // JSON array of [lng, lat] coordinates
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [index('idx_routes_org').on(table.organizationId)]
);

export const trips = pgTable(
  'trips',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id)
      .notNull(),
    tripCode: text('trip_code').notNull().unique(),
    busId: integer('bus_id')
      .references(() => buses.id)
      .notNull(),
    driverId: integer('driver_id')
      .references(() => drivers.id)
      .notNull(),
    deviceId: integer('device_id')
      .references(() => devices.id)
      .notNull(),
    routeId: integer('route_id')
      .references(() => routes.id)
      .notNull(),
    status: text('status').notNull().default('active'), // scheduled | active | completed | cancelled
    scheduledStartAt: timestamp('scheduled_start_at', { withTimezone: true }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    checklistMounted: boolean('checklist_mounted').notNull().default(true),
    checklistCharging: boolean('checklist_charging').notNull().default(true),
    checklistGpsFixed: boolean('checklist_gps_fixed').notNull().default(true),
    spoofFlagCount: integer('spoof_flag_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_trips_org_status').on(table.organizationId, table.status),
    index('idx_trips_bus').on(table.busId),
  ]
);

// Section 5: Keep latest_bus_locations (one row per bus) separate from append-only trip_locations history
export const latestBusLocations = pgTable(
  'latest_bus_locations',
  {
    busId: integer('bus_id')
      .references(() => buses.id)
      .primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id)
      .notNull(),
    tripId: integer('trip_id').references(() => trips.id),
    deviceId: integer('device_id').references(() => devices.id),
    source: text('source').notNull().default('ANDROID_FOREGROUND_GPS'), // ANDROID_FOREGROUND_GPS | AIS140_VLTD | SIMULATOR
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    accuracyM: doublePrecision('accuracy_m').notNull().default(6.5),
    speedKmh: doublePrecision('speed_kmh').notNull().default(0),
    headingDeg: doublePrecision('heading_deg').notNull().default(0),
    trackingStatus: text('tracking_status').notNull().default('fresh'), // fresh | stale | offline | not_started | not_on_trip
    batteryPct: integer('battery_pct').notNull().default(85),
    isCharging: boolean('is_charging').notNull().default(true),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_latest_locations_org').on(table.organizationId, table.trackingStatus)]
);

// Section 5: Append-only trip_locations history with deduplication on client_point_id
export const tripLocations = pgTable(
  'trip_locations',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id)
      .notNull(),
    clientPointId: text('client_point_id').notNull(),
    tripId: integer('trip_id')
      .references(() => trips.id)
      .notNull(),
    busId: integer('bus_id')
      .references(() => buses.id)
      .notNull(),
    deviceId: integer('device_id')
      .references(() => devices.id)
      .notNull(),
    source: text('source').notNull().default('ANDROID_FOREGROUND_GPS'),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    accuracyM: doublePrecision('accuracy_m').notNull(),
    speedKmh: doublePrecision('speed_kmh').notNull().default(0),
    headingDeg: doublePrecision('heading_deg').notNull().default(0),
    isMockLocation: boolean('is_mock_location').notNull().default(false),
    batteryPct: integer('battery_pct').notNull().default(85),
    isCharging: boolean('is_charging').notNull().default(true),
    networkType: text('network_type').notNull().default('4G_LTE'),
    partitionMonth: text('partition_month').notNull().default('2026-10'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_trip_locations_client_point_id').on(table.clientPointId),
    index('idx_trip_locations_bus_time').on(table.organizationId, table.busId, table.recordedAt),
    index('idx_trip_locations_trip_time').on(table.tripId, table.recordedAt),
  ]
);

// Section 5: Quarantined points (mock-location flagged or impossible movement > 120 km/h)
export const quarantinedLocations = pgTable(
  'quarantined_locations',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id)
      .notNull(),
    clientPointId: text('client_point_id').notNull(),
    tripId: integer('trip_id').references(() => trips.id),
    busId: integer('bus_id').references(() => buses.id),
    deviceId: integer('device_id').references(() => devices.id),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    accuracyM: doublePrecision('accuracy_m').notNull(),
    reportedSpeedKmh: doublePrecision('reported_speed_kmh').notNull().default(0),
    impliedSpeedKmh: doublePrecision('implied_speed_kmh').notNull().default(0),
    isMockFlagged: boolean('is_mock_flagged').notNull().default(false),
    reasonCode: text('reason_code').notNull(), // REJECTED_SPOOFING_MOCK_LOCATION | REJECTED_IMPOSSIBLE_SPEED_JUMP | REJECTED_CLOCK_SKEW | REJECTED_LOW_ACCURACY
    reasonDetail: text('reason_detail').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_quarantined_org_time').on(table.organizationId, table.receivedAt)]
);

export const alerts = pgTable(
  'alerts',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id)
      .notNull(),
    busId: integer('bus_id').references(() => buses.id),
    tripId: integer('trip_id').references(() => trips.id),
    deviceId: integer('device_id').references(() => devices.id),
    alertType: text('alert_type').notNull(), // STALE_BUS | OFFLINE_BUS | MISSED_TRIP_START | POSSIBLE_LOCATION_SPOOFING | PHONE_UNPLUGGED_LOW_BATTERY | DRIVER_INCIDENT
    severity: text('severity').notNull().default('warning'), // critical | warning | info
    title: text('title').notNull(),
    message: text('message').notNull(),
    status: text('status').notNull().default('open'), // open | acknowledged | resolved
    acknowledgedBy: text('acknowledged_by'),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_alerts_org_status').on(table.organizationId, table.status, table.createdAt)]
);

// Section 7: Append-only audit trail for logins, security events, user/role changes, trip changes, exports, config edits
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id)
      .notNull(),
    actorEmail: text('actor_email').notNull(),
    actorRole: text('actor_role').notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    detailsJson: text('details_json').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_audit_org_time').on(table.organizationId, table.createdAt)]
);

// Section 4: Postgres-backed background jobs table (status sweeps, exports, retention)
export const backgroundJobs = pgTable(
  'background_jobs',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .references(() => organizations.id)
      .notNull(),
    jobName: text('job_name').notNull(), // STATUS_SWEEP_15S | MISSED_TRIP_CHECK | CSV_EXPORT | RETENTION_PARTITION_CHECK
    status: text('status').notNull().default('completed'),
    payloadJson: text('payload_json').notNull().default('{}'),
    resultSummary: text('result_summary').notNull(),
    durationMs: integer('duration_ms').notNull().default(12),
    ranAt: timestamp('ran_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_jobs_org_time').on(table.organizationId, table.ranAt)]
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  buses: many(buses),
  drivers: many(drivers),
  devices: many(devices),
  routes: many(routes),
  trips: many(trips),
}));
