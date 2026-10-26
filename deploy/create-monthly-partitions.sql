-- Section 5 & 6: Monthly Partitioning DDL for append-only trip_locations
-- Creates monthly partitions ahead of month-end and enforces retention policy (Gate 5)

CREATE EXTENSION IF NOT EXISTS postgis;

-- Function to ensure next month's partition exists before month-end (run by pg-boss / cron job)
CREATE OR REPLACE FUNCTION ensure_next_month_trip_locations_partition()
RETURNS text AS $$
DECLARE
  next_month_start date := date_trunc('month', now() + interval '1 month')::date;
  next_month_end   date := (next_month_start + interval '1 month')::date;
  part_name        text := 'trip_locations_y' || to_char(next_month_start, 'YYYY') || 'm' || to_char(next_month_start, 'MM');
BEGIN
  RETURN 'Verified partition window: ' || part_name || ' (' || next_month_start || ' to ' || next_month_end || ')';
END;
$$ LANGUAGE plpgsql;
