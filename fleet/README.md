# FleetCommand — Live Bus Tracking & Fleet Management

Production-grade monorepo implementation adhering strictly to **Fleet Tracking Engineering Specification v1.0 (Android & iOS)**.

---

## Architecture Overview

```
fleet/
├── apps/
│   ├── api/            # Fastify REST API, Ingestion handler & Socket.IO Gateway
│   ├── web/            # React 19 + MapLibre live dashboard with resync protocol
│   ├── driver/         # React Native / Expo cross-platform driver companion
│   └── simulator/      # 100-bus GPS replay load tool & p95 latency probe
├── packages/
│   ├── contracts/      # Shared Zod schemas, models, RFC 9457 problem details
│   └── tsconfig/       # Shared strict TypeScript configuration
└── db/
    └── migrations/     # Versioned SQL migrations (PostGIS, Range partitions, UUIDv7)
```

---

## Key Engineering Features Implemented

1. **Monorepo & Strict Contracts**:
   - Centralized validation across all API, Web, Driver, and Simulator apps using [`@fleet/contracts`](file:///c:/pixelpair/projects/TravelTracking/fleet/packages/contracts).
   - Strict TypeScript configuration (`noImplicitAny`, strict null checks).
   - RFC 9457 `application/problem+json` error envelope with stable machine codes.

2. **Database & Schema (§4)**:
   - Versioned SQL migration in [`db/migrations/001_initial_schema.sql`](file:///c:/pixelpair/projects/TravelTracking/fleet/db/migrations/001_initial_schema.sql).
   - PostgreSQL PostGIS extension for geography points and polylines.
   - Monthly range partitioning on `trip_locations` (`PARTITION BY RANGE (recorded_at)`).
   - Monotonic revision sequence `live_rev_seq` on `latest_bus_locations`.
   - Partial unique indexes (`one_active_trip_per_bus`, `one_open_alert_per_key`).

3. **Ingestion & Resync Engine (§5 & §8)**:
   - Fastify API with Zod validation in [`apps/api/src/server.ts`](file:///c:/pixelpair/projects/TravelTracking/fleet/apps/api/src/server.ts).
   - 1000ms server-side batch coalescer to avoid socket flooding.
   - Resync protocol: `server.hello` ➔ `snapshot_rev` ➔ event queue applying only `rev > stored_rev`.
   - Clock offset synchronization using server time.

4. **Driver Mobile App (§9)**:
   - React Native & Expo app in [`apps/driver/`](file:///c:/pixelpair/projects/TravelTracking/fleet/apps/driver).
   - SQLite WAL queue with offline retention for up to 24 hours.
   - Guided onboarding for Android foreground service and OEM battery optimization.
   - iOS background location modes with blue indicator compliance.

5. **Load Simulator & Latency Probe (§13.3)**:
   - Simulator tool in [`apps/simulator/src/simulator.ts`](file:///c:/pixelpair/projects/TravelTracking/fleet/apps/simulator/src/simulator.ts).
   - Probe client continuously tracking p50, p95, and p99 delivery latencies (target: p95 < 3s).

---

## Quick Start

### 1. Install Dependencies
```bash
cd fleet
npm install
```

### 2. Run API & Realtime Gateway
```bash
npm run dev:api
```

### 3. Run Web Dashboard
```bash
npm run dev:web
```

### 4. Run Driver Companion
```bash
npm run dev:driver
```

### 5. Run Simulator & Latency Probe
```bash
npm run dev:simulator
```
