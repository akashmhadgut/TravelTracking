import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from fleet/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('[DB Migrate] ERROR: DATABASE_URL or POSTGRES_URL environment variable is missing.');
  console.error('[DB Migrate] Please provide a valid PostgreSQL connection string in fleet/.env');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('[DB Migrate] Connected to PostgreSQL successfully.');

    // 1. Check & Enable Extensions
    console.log('[DB Migrate] Ensuring PostGIS and citext extensions exist...');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    await client.query('CREATE EXTENSION IF NOT EXISTS citext;');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // 2. Run Initial Schema Migration
    const schemaPath = path.resolve(__dirname, 'migrations/001_initial_schema.sql');
    console.log(`[DB Migrate] Applying initial schema from ${path.basename(schemaPath)}...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('[DB Migrate] Schema tables, partitioned trip_locations, and sequences applied successfully.');

    // 3. Run Demo Seed Data
    const seedPath = path.resolve(__dirname, 'seeds/demo_seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log(`[DB Migrate] Seeding demo fleet from ${path.basename(seedPath)}...`);
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSql);
      console.log('[DB Migrate] Demo seed applied.');
    }

    // 4. Verify counts
    const busCountRes = await client.query('SELECT count(*) FROM buses;');
    const locationCountRes = await client.query('SELECT count(*) FROM latest_bus_locations;');
    console.log(`[DB Migrate] SUCCESS! Verified ${busCountRes.rows[0].count} buses and ${locationCountRes.rows[0].count} live tracked locations.`);

  } catch (err: any) {
    console.error('[DB Migrate] Migration failed:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();

