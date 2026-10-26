-- Fleet Management & Live Bus Tracking Database Schema v1.0
-- Compliant with Engineering Specification v1.0 Section 4

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Enums
DO $$ BEGIN
  CREATE TYPE user_role    AS ENUM ('super_admin', 'fleet_manager', 'supervisor', 'driver');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE trip_status  AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE bus_status   AS ENUM ('moving', 'stopped', 'stale', 'offline', 'not_on_trip');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('open', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE severity     AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{
    "speed_limit_kmh": 80,
    "retention_days": 90,
    "fresh_s": 60,
    "offline_s": 300,
    "interval_moving_s": 10,
    "interval_still_s": 30
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  role user_role NOT NULL DEFAULT 'supervisor',
  name text NOT NULL,
  email citext NOT NULL,
  phone text,
  password_hash text,
  pin_hash text,
  status text NOT NULL DEFAULT 'active',
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);

-- 3. Auth Sessions & Refresh Tokens
CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  installation_id uuid,
  refresh_token_hash text NOT NULL,
  family_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Installations (One per mobile install)
CREATE TABLE IF NOT EXISTS installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  model text,
  os_version text,
  app_version text,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  licence_class text NOT NULL DEFAULT 'LMV-Commercial',
  licence_expiry timestamptz,
  licence_number_encrypted text,
  address_encrypted text,
  duty_status text NOT NULL DEFAULT 'on_duty',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- 6. Routes & Route Versions
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  current_version_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

CREATE TABLE IF NOT EXISTS route_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id),
  version_number int NOT NULL,
  geometry geography(LineString, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, version_number)
);

CREATE TABLE IF NOT EXISTS route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_version_id uuid NOT NULL REFERENCES route_versions(id) ON DELETE CASCADE,
  sequence int NOT NULL,
  name text NOT NULL,
  location geography(Point, 4326) NOT NULL,
  planned_offset_min int NOT NULL DEFAULT 0,
  UNIQUE (route_version_id, sequence)
);

-- 7. Buses
CREATE TABLE IF NOT EXISTS buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  reg_no text NOT NULL,
  make text,
  model text,
  capacity int,
  default_route_id uuid REFERENCES routes(id),
  tracking_source text NOT NULL DEFAULT 'phone' CHECK (tracking_source IN ('phone', 'device')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, reg_no)
);

-- 8. Driver Assignments
CREATE TABLE IF NOT EXISTS driver_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  bus_id uuid NOT NULL REFERENCES buses(id),
  route_id uuid REFERENCES routes(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Trip Templates (Recurrence for 14-day generator job)
CREATE TABLE IF NOT EXISTS trip_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  route_id uuid NOT NULL REFERENCES routes(id),
  default_bus_id uuid REFERENCES buses(id),
  default_driver_id uuid REFERENCES drivers(id),
  weekday_mask int NOT NULL DEFAULT 127, -- Mon-Sun bitmask
  departure_time time NOT NULL,
  expected_duration_min int NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Trips
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  route_id uuid NOT NULL REFERENCES routes(id),
  route_version_id uuid NOT NULL REFERENCES route_versions(id),
  bus_id uuid NOT NULL REFERENCES buses(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  status trip_status NOT NULL DEFAULT 'scheduled',
  planned_start timestamptz NOT NULL,
  planned_end timestamptz NOT NULL,
  actual_start timestamptz,
  actual_end timestamptz,
  distance_m int,
  delayed boolean NOT NULL DEFAULT false,
  delay_reason text,
  cancel_reason text,
  closed_by text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_trip_per_bus ON trips (bus_id) WHERE status = 'in_progress';
CREATE UNIQUE INDEX IF NOT EXISTS one_active_trip_per_driver ON trips (driver_id) WHERE status = 'in_progress';

-- 11. Monotonic Revision Sequence for Real-time Resync
CREATE SEQUENCE IF NOT EXISTS live_rev_seq START WITH 1;

-- 12. Latest Bus Locations (Exactly one row per bus)
CREATE TABLE IF NOT EXISTS latest_bus_locations (
  bus_id uuid PRIMARY KEY REFERENCES buses(id),
  org_id uuid NOT NULL REFERENCES organizations(id),
  trip_id uuid REFERENCES trips(id),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  speed_kmh real,
  heading_deg real,
  accuracy_m real,
  recorded_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'phone',
  battery_pct smallint,
  status bus_status NOT NULL DEFAULT 'not_on_trip',
  status_since timestamptz NOT NULL DEFAULT now(),
  slow_since timestamptz,
  rev bigint NOT NULL DEFAULT nextval('live_rev_seq')
);

CREATE INDEX IF NOT EXISTS idx_latest_bus_org_status ON latest_bus_locations(org_id, status);

-- 13. Partitioned Trip Locations (Append-only history, partitioned by month)
CREATE TABLE IF NOT EXISTS trip_locations (
  bus_id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES organizations(id),
  trip_id uuid REFERENCES trips(id),
  client_point_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  speed_kmh real,
  heading_deg real,
  accuracy_m real,
  source text NOT NULL DEFAULT 'phone',
  flags smallint NOT NULL DEFAULT 0, -- bit 1 = low_accuracy
  PRIMARY KEY (bus_id, recorded_at, client_point_id)
) PARTITION BY RANGE (recorded_at);

CREATE INDEX IF NOT EXISTS idx_trip_locations_trip_time ON trip_locations (trip_id, recorded_at);

-- Default and initial monthly partitions
CREATE TABLE IF NOT EXISTS trip_locations_default PARTITION OF trip_locations DEFAULT;
CREATE TABLE IF NOT EXISTS trip_locations_2026_10 PARTITION OF trip_locations
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS trip_locations_2026_11 PARTITION OF trip_locations
  FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

-- 14. Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  type text NOT NULL,
  severity severity NOT NULL,
  status alert_status NOT NULL DEFAULT 'open',
  bus_id uuid REFERENCES buses(id),
  driver_id uuid REFERENCES drivers(id),
  trip_id uuid REFERENCES trips(id),
  dedupe_key text NOT NULL,
  message text NOT NULL,
  data jsonb,
  opened_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid REFERENCES users(id),
  acknowledged_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  auto_resolved boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS one_open_alert_per_key ON alerts (org_id, dedupe_key) WHERE status <> 'resolved';
CREATE INDEX IF NOT EXISTS idx_alerts_org_status ON alerts (org_id, status, opened_at);

-- 15. Alert Rules
CREATE TABLE IF NOT EXISTS alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (org_id, type)
);

-- 16. Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  trip_id uuid NOT NULL REFERENCES trips(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  kind text NOT NULL,
  note text NOT NULL,
  photo_file_id uuid,
  location geography(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 17. Files / Documents
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  entity_type text NOT NULL, -- bus, driver, incident
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size int NOT NULL,
  storage_path text NOT NULL,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 18. Quarantined Points (Rejected suspicious fixes for audit)
CREATE TABLE IF NOT EXISTS quarantined_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  trip_id uuid REFERENCES trips(id),
  client_point_id uuid NOT NULL,
  reason text NOT NULL,
  raw_point jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 19. Driver DPDP Consents
CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  installation_id uuid REFERENCES installations(id),
  consent_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

-- 20. Audit Logs (Append-Only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  actor_id uuid REFERENCES users(id),
  actor_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 21. Idempotency Keys (For offline outbox replays)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Row-Level Security (RLS) Setup
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE latest_bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: In production RLS policies evaluate `org_id = current_setting('app.org_id', true)::uuid`
