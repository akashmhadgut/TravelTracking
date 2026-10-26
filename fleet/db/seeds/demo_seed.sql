-- Demo Seed Data: 100 Buses, Routes, Drivers & Trips
-- Engineering Specification v1.0 Section 3

-- Insert Demo Organization
INSERT INTO organizations (id, name, settings)
VALUES (
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
  'Deccan City Transit Corporation',
  '{
    "speed_limit_kmh": 80,
    "retention_days": 90,
    "fresh_s": 60,
    "offline_s": 300,
    "interval_moving_s": 10,
    "interval_still_s": 30
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert Admin & Supervisor Users
INSERT INTO users (id, org_id, role, name, email, phone, status)
VALUES
(
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1001',
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
  'fleet_manager',
  'Vasant Kulkarni',
  'vasant.kulkarni@deccantransit.in',
  '+919822012345',
  'active'
),
(
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1002',
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
  'supervisor',
  'Anand Shinde',
  'anand.shinde@deccantransit.in',
  '+919822054321',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Insert Demo Routes
INSERT INTO routes (id, org_id, code, name, is_active)
VALUES
(
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c2001',
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
  'RT-501',
  'Swargate to Nigdi Express',
  true
),
(
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c2002',
  '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
  'RT-505',
  'Katraj to Hinjawadi IT Park',
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert 100 Buses & Latest Locations
DO $$
DECLARE
  i int;
  bus_uuid uuid;
  driver_uuid uuid;
  user_uuid uuid;
  reg text;
  base_lat double precision := 18.5204;
  base_lng double precision := 73.8567;
BEGIN
  FOR i IN 1..100 LOOP
    bus_uuid := ('0192f0a1-7c3e-7c11-9d0a-5e2b6f4c' || lpad(to_hex(i), 4, '0'))::uuid;
    driver_uuid := ('0192f0a1-7c3e-7c11-9d0a-5e2b6f4d' || lpad(to_hex(i), 4, '0'))::uuid;
    user_uuid := ('0192f0a1-7c3e-7c11-9d0a-5e2b6f4e' || lpad(to_hex(i), 4, '0'))::uuid;
    reg := 'MH-12-DT-' || lpad(i::text, 4, '0');

    -- Create Driver User
    INSERT INTO users (id, org_id, role, name, email, phone, status)
    VALUES (
      user_uuid,
      '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
      'driver',
      'Driver ' || i,
      ('driver' || i || '@deccantransit.in')::citext,
      '+9198' || lpad(i::text, 8, '0'),
      'active'
    ) ON CONFLICT (id) DO NOTHING;

    -- Create Driver Record
    INSERT INTO drivers (id, org_id, user_id, licence_class, duty_status)
    VALUES (
      driver_uuid,
      '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
      user_uuid,
      'HMV-Passenger',
      'on_duty'
    ) ON CONFLICT (id) DO NOTHING;

    -- Create Bus
    INSERT INTO buses (id, org_id, reg_no, make, model, capacity, default_route_id, tracking_source, is_active)
    VALUES (
      bus_uuid,
      '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
      reg,
      'Tata Motors',
      'Starbus Ultra EV',
      45,
      '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c2001',
      'phone',
      true
    ) ON CONFLICT (id) DO NOTHING;

    -- Create Latest Bus Location
    INSERT INTO latest_bus_locations (
      bus_id,
      org_id,
      lat,
      lng,
      speed_kmh,
      heading_deg,
      accuracy_m,
      recorded_at,
      received_at,
      source,
      battery_pct,
      status,
      status_since,
      rev
    )
    VALUES (
      bus_uuid,
      '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
      base_lat + (sin(i) * 0.08),
      base_lng + (cos(i) * 0.08),
      CASE WHEN (i % 3) = 0 THEN 0 ELSE (25 + (i % 35)) END,
      (i * 35) % 360,
      6.0 + (i % 4),
      now(),
      now(),
      'phone',
      60 + (i % 40),
      CASE WHEN (i % 10) = 0 THEN 'offline'::bus_status
           WHEN (i % 5) = 0 THEN 'stale'::bus_status
           WHEN (i % 3) = 0 THEN 'stopped'::bus_status
           ELSE 'moving'::bus_status
      END,
      now(),
      nextval('live_rev_seq')
    ) ON CONFLICT (bus_id) DO UPDATE SET
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      speed_kmh = EXCLUDED.speed_kmh,
      status = EXCLUDED.status,
      rev = nextval('live_rev_seq');
  END LOOP;
END $$;
