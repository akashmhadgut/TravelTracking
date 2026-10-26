import { drizzle } from 'drizzle-orm/node-postgres';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 15000,
    });

    // Prevent unhandled pool-level idle disconnect events from crashing the process or polluting stderr
    global._postgresPool.on('error', () => {
      // Pool automatically discards terminated idle clients and reconnects lazily on the next query
    });
  }
  return global._postgresPool;
};

export const pool = createPool();

export const db = drizzle(pool, { schema });

// Section 4: Kysely query builder instance sharing the same pg Pool for explicit transactions
export interface KyselyDatabase {
  latest_bus_locations: {
    bus_id: number;
    organization_id: number;
    trip_id: number | null;
    device_id: number | null;
    source: string;
    latitude: number;
    longitude: number;
    accuracy_m: number;
    speed_kmh: number;
    heading_deg: number;
    tracking_status: string;
    battery_pct: number;
    is_charging: boolean;
    recorded_at: Date;
    received_at: Date;
  };
  trip_locations: {
    id?: number;
    organization_id: number;
    client_point_id: string;
    trip_id: number;
    bus_id: number;
    device_id: number;
    source: string;
    latitude: number;
    longitude: number;
    accuracy_m: number;
    speed_kmh: number;
    heading_deg: number;
    is_mock_location: boolean;
    battery_pct: number;
    is_charging: boolean;
    network_type: string;
    partition_month: string;
    recorded_at: Date;
    received_at: Date;
  };
}

export const kyselyDb = new Kysely<KyselyDatabase>({
  dialect: new PostgresDialect({
    pool,
  }),
});
