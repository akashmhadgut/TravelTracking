import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { Server as SocketIOServer } from 'socket.io';
import * as dotenv from 'dotenv';
import { ProblemException } from '@fleet/contracts';
import {
  IngestBatchRequestSchema,
  IngestBatchResponseSchema,
  LatestBusLocation,
} from '@fleet/contracts';
import { authRoutes } from './modules/auth/authRoutes.js';
import { fleetRoutes } from './modules/fleet/fleetRoutes.js';
import { tripRoutes } from './modules/trips/tripRoutes.js';
import { alertRoutes } from './modules/alerts/alertRoutes.js';
import { reportRoutes } from './modules/reports/reportRoutes.js';
import { adminRoutes } from './modules/admin/adminRoutes.js';
import { query, isDbConnected } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPathCandidates = [
  path.resolve(__dirname, '../../../apps/web/dist'),
  path.resolve(__dirname, '../../web/dist'),
  path.resolve(process.cwd(), 'fleet/apps/web/dist'),
  path.resolve(process.cwd(), 'apps/web/dist'),
];
const distPath = distPathCandidates.find((p) => fs.existsSync(p)) || path.resolve(__dirname, '../../web/dist');

dotenv.config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          orgId: (req as any).orgId,
        };
      },
    },
  },
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Register security & utility plugins
await fastify.register(cors, {
  origin: true,
  credentials: true,
});

await fastify.register(helmet, {
  contentSecurityPolicy: false, // Managed per web app
});

await fastify.register(rateLimit, {
  max: 300,
  timeWindow: '1 minute',
});

// Register Core Domain Route Modules (Section 2.4 & 7.3)
await fastify.register(authRoutes);
await fastify.register(fleetRoutes);
await fastify.register(tripRoutes);
await fastify.register(alertRoutes);
await fastify.register(reportRoutes);
await fastify.register(adminRoutes);

// RFC 9457 Global Error Handler (Section 1.3 & 7.1)
fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof ProblemException) {
    return reply.status(error.status).header('content-type', 'application/problem+json').send(error.toJSON());
  }

  if (error.validation) {
    return reply.status(400).header('content-type', 'application/problem+json').send({
      type: 'urn:fleet:error:validation_error',
      title: 'Bad Request',
      status: 400,
      detail: 'The payload failed schema validation',
      code: 'validation.failed',
      invalidParams: error.validation.map((v) => ({
        name: v.instancePath || 'body',
        reason: v.message || 'Invalid value',
      })),
    });
  }

  request.log.error(error);
  return reply.status(500).header('content-type', 'application/problem+json').send({
    type: 'urn:fleet:error:internal_server_error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected internal error occurred',
    code: 'system.internal_error',
  });
});

// Initialize Socket.IO with HTTP Server
const io = new SocketIOServer(fastify.server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Per-organization coalesced buffer (Section 8.2: 1000ms coalescer)
const coalescedUpdates = new Map<string, Map<string, any>>();

function queueBusUpdate(orgId: string, point: any) {
  if (!coalescedUpdates.has(orgId)) {
    coalescedUpdates.set(orgId, new Map());
  }
  coalescedUpdates.get(orgId)!.set(point.bus_id, point);
}

// 1-second interval to flush batch to connected Socket.IO clients
setInterval(() => {
  for (const [orgId, busMap] of coalescedUpdates.entries()) {
    if (busMap.size > 0) {
      const items = Array.from(busMap.values());
      busMap.clear();
      io.to(`org:${orgId}`).emit('bus.batch', { v: 1, items });
    }
  }
}, 1000);

// In-Memory state for Walk-Through / MVP Demonstration

// Authentic Pune Transit Drivers Pool for Supervisor Dispatch & Telemetry
const PUNE_DRIVERS_POOL = [
  { name: 'Ganesh Jadhav', phone: '+91 98220 01122', license: 'MH-14-2018-0045129', rating: 4.9, duty_status: 'on_duty' },
  { name: 'Sunil Patil', phone: '+91 98220 03344', license: 'MH-12-2019-0098432', rating: 4.8, duty_status: 'on_duty' },
  { name: 'Ramesh More', phone: '+91 98220 05566', license: 'MH-14-2020-0012876', rating: 4.7, duty_status: 'on_duty' },
  { name: 'Sachin Gaikwad', phone: '+91 98220 07788', license: 'MH-12-2021-0065412', rating: 4.9, duty_status: 'on_duty' },
  { name: 'Nitin Deshmukh', phone: '+91 98220 09911', license: 'MH-14-2017-0032190', rating: 4.8, duty_status: 'on_duty' },
  { name: 'Santosh Pawar', phone: '+91 98220 02233', license: 'MH-12-2019-0081234', rating: 4.6, duty_status: 'on_duty' },
  { name: 'Ajay Shinde', phone: '+91 98220 04455', license: 'MH-14-2020-0077881', rating: 4.9, duty_status: 'on_duty' },
  { name: 'Prakash Jagtap', phone: '+91 98220 06677', license: 'MH-12-2018-0055443', rating: 4.8, duty_status: 'on_duty' },
  { name: 'Deepak Bhosale', phone: '+91 98220 08899', license: 'MH-14-2021-0022334', rating: 4.7, duty_status: 'on_duty' },
  { name: 'Mahendra Kadam', phone: '+91 98220 01144', license: 'MH-12-2019-0044556', rating: 4.9, duty_status: 'on_duty' },
  { name: 'Vilas Thorat', phone: '+91 98220 02255', license: 'MH-14-2018-0099887', rating: 4.8, duty_status: 'on_duty' },
  { name: 'Manoj Mane', phone: '+91 98220 03366', license: 'MH-12-2020-0066778', rating: 4.7, duty_status: 'on_duty' },
  { name: 'Yogesh Kulkarni', phone: '+91 98220 04477', license: 'MH-14-2019-0033221', rating: 4.9, duty_status: 'on_duty' },
  { name: 'Rajesh Salunkhe', phone: '+91 98220 05588', license: 'MH-12-2021-0011223', rating: 4.8, duty_status: 'on_duty' },
  { name: 'Pandurang Shirole', phone: '+91 98220 06699', license: 'MH-14-2017-0088776', rating: 4.8, duty_status: 'on_duty' },
  { name: 'Amol Chavan', phone: '+91 98220 07711', license: 'MH-12-2020-0044332', rating: 4.9, duty_status: 'on_duty' },
];

const supervisorInstructions: Array<{
  id: string;
  org_id: string;
  bus_id: string;
  bus_reg: string;
  driver_id?: string;
  driver_name: string;
  driver_phone?: string;
  supervisor_name: string;
  category: string;
  message: string;
  priority: 'normal' | 'urgent';
  sent_at: string;
  status: 'sent' | 'delivered' | 'acknowledged';
  ack_reply?: string;
  ack_at?: string;
}> = [
  {
    id: 'inst-seed-01',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    bus_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c0021',
    bus_reg: 'MH-12-DT-0033',
    driver_name: 'Sunil Patil',
    driver_phone: '+91 98220 03344',
    supervisor_name: 'Anand Shinde (Supervisor)',
    category: 'stop_inquiry',
    message: 'Stationary alert: Stopped near Baner Chowk > 15m. Please report reason.',
    priority: 'normal',
    sent_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    status: 'acknowledged',
    ack_reply: 'Heavy traffic at Baner junction signal. Resuming route in 2 mins.',
    ack_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

const vehicleCleanlinessStore = new Map<string, {
  bus_id: string;
  status: 'clean' | 'needs_cleaning' | 'in_progress';
  interior_clean: boolean;
  exterior_clean: boolean;
  sanitized: boolean;
  ac_fresh: boolean;
  inspected_by: string;
  inspected_at: string;
  notes?: string;
}>();

function enrichBusWithSupervisorData(bus: any, index: number) {
  const driverProfile = PUNE_DRIVERS_POOL[index % PUNE_DRIVERS_POOL.length]!;
  const carNum = parseInt(bus.reg_no?.replace(/\D/g, '') || String(index + 1), 10);
  const driver = PUNE_DRIVERS_POOL[(carNum - 1) % PUNE_DRIVERS_POOL.length] || driverProfile;

  const isStopped = bus.status === 'stopped';
  const stoppedReasons = [
    'Signal / Traffic Halt at Baner Junction',
    'Passenger Boarding & Luggage Stowing',
    'Mandatory Driver 15-min Scheduled Rest Break',
    'Unscheduled Halt - Route Inspection Due',
    'Pending Vehicle Cleanliness Verification',
  ];

  const cleanlinessStates: Array<'clean' | 'needs_cleaning' | 'in_progress'> = ['clean', 'clean', 'clean', 'clean', 'needs_cleaning', 'in_progress'];
  const storedCleanliness = vehicleCleanlinessStore.get(bus.bus_id);
  const cleanliness = storedCleanliness ? storedCleanliness.status : (cleanlinessStates[carNum % cleanlinessStates.length] || 'clean');

  return {
    ...bus,
    reg_no: bus.reg_no || ('MH-12-DT-' + String(index + 1).padStart(4, '0')),
    make: bus.make || 'Tata Motors',
    model: bus.model || (index % 3 === 0 ? 'Tigor EV Sedan' : index % 3 === 1 ? 'Nexon EV Max' : 'XUV400 EV Pro'),
    driver_id: bus.driver_id || ('0192f0a1-7c3e-7c11-9d0a-5e2b6f4d' + String(index + 1).padStart(4, '0')),
    driver_name: bus.driver_name && !bus.driver_name.startsWith('Driver ') ? bus.driver_name : driver.name,
    driver_phone: bus.driver_phone || driver.phone,
    driver_license: bus.driver_license || driver.license,
    driver_status: bus.driver_status || driver.duty_status,
    driver_rating: driver.rating,
    cleanliness_status: cleanliness,
    stopped_reason: isStopped ? (bus.stopped_reason || stoppedReasons[carNum % stoppedReasons.length]) : undefined,
  };
}

let currentMonotonicRev = 1000n;
const demoBuses: LatestBusLocation[] = [
  {
    bus_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a01',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    trip_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a10',
    lat: 18.5228,
    lng: 73.8478,
    speed_kmh: 38.5,
    heading_deg: 35,
    accuracy_m: 5.5,
    recorded_at: new Date().toISOString(),
    received_at: new Date().toISOString(),
    source: 'phone',
    battery_pct: 88,
    status: 'moving',
    status_since: new Date().toISOString(),
    slow_since: null,
    rev: String(++currentMonotonicRev),
  },
  {
    bus_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a02',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    trip_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a20',
    lat: 18.5175,
    lng: 73.8450,
    speed_kmh: 0.0,
    heading_deg: 35,
    accuracy_m: 6.0,
    recorded_at: new Date().toISOString(),
    received_at: new Date().toISOString(),
    source: 'phone',
    battery_pct: 72,
    status: 'stopped',
    status_since: new Date().toISOString(),
    slow_since: new Date().toISOString(),
    rev: String(++currentMonotonicRev),
  },
];

// Socket.IO Room Joining & Resync Protocol (Section 8.1 & 8.3)
io.on('connection', (socket) => {
  const orgId = String(socket.handshake.auth?.orgId || '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000');
  socket.join(`org:${orgId}`);

  // Send server.hello on connect
  socket.emit('server.hello', {
    v: 1,
    server_time: new Date().toISOString(),
    current_rev: String(currentMonotonicRev),
  });
});

// REST Endpoints (Section 7.3)

// GET /v1/time — Server time for app clock correction (Section 5.1 & 7.3)
fastify.get('/v1/time', async () => {
  return {
    server_time: new Date().toISOString(),
    epoch_ms: Date.now(),
  };
});

// GET /v1/live/buses — Snapshot with snapshot_rev (Section 7.3 & 8.3)
fastify.get('/v1/live/buses', async () => {
  const dbOnline = await isDbConnected();
  if (dbOnline) {
    try {
      const revRes = await query("SELECT last_value FROM live_rev_seq");
      const currentRev = revRes.rows[0]?.last_value ? String(revRes.rows[0].last_value) : String(currentMonotonicRev);
      const rowsRes = await query(`
        SELECT 
          l.bus_id, l.org_id, l.trip_id, l.lat, l.lng, l.speed_kmh, l.heading_deg, l.accuracy_m,
          l.recorded_at, l.received_at, l.source, l.battery_pct, l.status, l.status_since, l.slow_since,
          l.rev::text as rev,
          b.reg_no, b.make, b.model
        FROM latest_bus_locations l
        JOIN buses b ON b.id = l.bus_id
        WHERE l.org_id = $1
        ORDER BY b.reg_no ASC
      `, ['0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000']);

      if (rowsRes.rows.length > 0) {
        const enriched = rowsRes.rows.map((row, idx) => enrichBusWithSupervisorData(row, idx));
        return {
          snapshot_rev: currentRev,
          buses: enriched,
          count: enriched.length,
        };
      }
    } catch (err) {
      fastify.log.warn(err, 'Failed to fetch snapshot from PostgreSQL, falling back to in-memory');
    }
  }

  const fallback100: LatestBusLocation[] = [];
  const baseLat = 18.5204;
  const baseLng = 73.8567;
  for (let i = 1; i <= 100; i++) {
    const isStopped = i % 3 === 0;
    const isStale = i % 5 === 0;
    const isOffline = i % 10 === 0;
    const status = isOffline ? 'offline' : isStale ? 'stale' : isStopped ? 'stopped' : 'moving';
    const bus: any = {
      bus_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c' + i.toString(16).padStart(4, '0'),
      org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
      lat: baseLat + Math.sin(i) * 0.08,
      lng: baseLng + Math.cos(i) * 0.08,
      speed_kmh: status === 'stopped' ? 0 : 25 + (i % 35),
      heading_deg: (i * 35) % 360,
      accuracy_m: 5.0 + (i % 3),
      recorded_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      source: 'phone',
      battery_pct: 65 + (i % 35),
      status,
      status_since: new Date(Date.now() - (i * 2 + 5) * 60 * 1000).toISOString(),
      slow_since: isStopped ? new Date(Date.now() - (i * 2 + 5) * 60 * 1000).toISOString() : null,
      rev: String(currentMonotonicRev + BigInt(i)),
    };
    fallback100.push(enrichBusWithSupervisorData(bus, i - 1) as any);
  }

  return {
    snapshot_rev: String(currentMonotonicRev),
    buses: fallback100,
    count: fallback100.length,
  };
});

// POST /v1/ingest/locations — Authenticated batch ingestion (Section 5)
fastify.post(
  '/v1/ingest/locations',
  {
    schema: {
      body: IngestBatchRequestSchema,
      response: {
        200: IngestBatchResponseSchema,
      },
    },
  },
  async (request) => {
    const batch = request.body;
    const now = Date.now();
    const results: any[] = [];
    const dbOnline = await isDbConnected();
    let defaultOrgId = '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000';
    let defaultBusId = '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c0001';

    if (dbOnline && batch.trip_id) {
      try {
        const tripRes = await query('SELECT bus_id, org_id FROM trips WHERE id = $1', [batch.trip_id]);
        if (tripRes.rows.length > 0) {
          defaultBusId = tripRes.rows[0].bus_id;
          defaultOrgId = tripRes.rows[0].org_id;
        }
      } catch {}
    }

    // Pure validation per point (Section 5.2)
    for (const p of batch.points) {
      const recTime = new Date(p.recorded_at).getTime();

      // Rule: Future time > 60s
      if (recTime > now + 60_000) {
        results.push({ id: p.id, outcome: 'rejected', reason: 'time_future' });
        continue;
      }
      // Rule: Too old > 24h
      if (recTime < now - 86_400_000) {
        results.push({ id: p.id, outcome: 'rejected', reason: 'time_stale' });
        continue;
      }
      // Rule: Coordinates valid
      if (isNaN(p.lat) || isNaN(p.lng) || p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
        results.push({ id: p.id, outcome: 'rejected', reason: 'coord_invalid' });
        continue;
      }
      // Rule: Speed impossible jump
      if (p.speed_kmh && p.speed_kmh > 200) {
        results.push({ id: p.id, outcome: 'rejected', reason: 'speed_impossible' });
        continue;
      }

      // Check weak fix (accuracy > 100m)
      const isLowAccuracy = p.accuracy_m !== null && p.accuracy_m !== undefined && p.accuracy_m > 100;

      results.push({
        id: p.id,
        outcome: 'accepted',
        flag: isLowAccuracy ? 'low_accuracy' : undefined,
      });

      if (dbOnline) {
        try {
          // 1. Insert history into partitioned trip_locations (§5.3)
          await query(`
            INSERT INTO trip_locations (
              bus_id, org_id, trip_id, client_point_id, recorded_at, received_at,
              lat, lng, speed_kmh, heading_deg, accuracy_m, source, flags
            ) VALUES ($1, $2, $3, $4, $5, now(), $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (bus_id, recorded_at, client_point_id) DO NOTHING
          `, [
            defaultBusId, defaultOrgId, batch.trip_id, p.id, p.recorded_at,
            p.lat, p.lng, p.speed_kmh ?? 0, p.heading_deg ?? 0, p.accuracy_m ?? 8, 'phone', isLowAccuracy ? 1 : 0
          ]);

          // 2. Atomic conditional upsert into latest_bus_locations (§5.3)
          if (!isLowAccuracy) {
            const upsertRes = await query(`
              INSERT INTO latest_bus_locations AS l
                (bus_id, org_id, trip_id, lat, lng, speed_kmh, heading_deg, accuracy_m,
                 recorded_at, received_at, source, battery_pct, status, status_since, rev)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), nextval('live_rev_seq'))
              ON CONFLICT (bus_id) DO UPDATE SET
                trip_id = EXCLUDED.trip_id, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
                speed_kmh = EXCLUDED.speed_kmh, heading_deg = EXCLUDED.heading_deg,
                accuracy_m = EXCLUDED.accuracy_m, recorded_at = EXCLUDED.recorded_at,
                received_at = EXCLUDED.received_at, source = EXCLUDED.source, battery_pct = EXCLUDED.battery_pct,
                status = EXCLUDED.status,
                status_since = CASE WHEN l.status = EXCLUDED.status THEN l.status_since ELSE now() END,
                rev = nextval('live_rev_seq')
              WHERE EXCLUDED.recorded_at > l.recorded_at
              RETURNING *, rev::text;
            `, [
              defaultBusId, defaultOrgId, batch.trip_id, p.lat, p.lng, p.speed_kmh ?? 0, p.heading_deg ?? 0, p.accuracy_m ?? 8,
              p.recorded_at, 'phone', batch.health.battery_pct, (p.speed_kmh ?? 0) >= 5 ? 'moving' : 'stopped'
            ]);

            if (upsertRes.rows.length > 0) {
              const row = upsertRes.rows[0];
              queueBusUpdate(defaultOrgId, row);
            }
          }
        } catch (dbErr) {
          fastify.log.error(dbErr, 'Database write failed during point ingestion');
        }
      } else {
        // Fallback update to in-memory demo bus
        if (!isLowAccuracy) {
          const targetBus = demoBuses[0]!;
          targetBus.lat = p.lat;
          targetBus.lng = p.lng;
          targetBus.speed_kmh = p.speed_kmh ?? 0;
          targetBus.heading_deg = p.heading_deg ?? 0;
          targetBus.accuracy_m = p.accuracy_m ?? 8;
          targetBus.recorded_at = p.recorded_at;
          targetBus.received_at = new Date().toISOString();
          targetBus.battery_pct = batch.health.battery_pct;
          targetBus.status = (p.speed_kmh ?? 0) >= 5 ? 'moving' : 'stopped';
          targetBus.rev = String(++currentMonotonicRev);

          queueBusUpdate(targetBus.org_id, targetBus);
        }
      }
    }

    return {
      server_time: new Date().toISOString(),
      results,
      config: {
        interval_moving_s: 10,
        interval_still_s: 30,
      },
      min_app_version: '1.0.0',
    };
  }
);


// Supervisor Communication & Driver Dispatch Endpoints
fastify.post('/v1/supervisor/instruction', async (request, reply) => {
  const body = (request.body as any) || {};
  const orgId = body.org_id || '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000';
  const inst = {
    id: 'inst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    org_id: orgId,
    bus_id: body.bus_id,
    bus_reg: body.bus_reg || 'Vehicle',
    driver_id: body.driver_id,
    driver_name: body.driver_name || 'Assigned Driver',
    driver_phone: body.driver_phone,
    supervisor_name: body.supervisor_name || 'Anand Shinde (Supervisor)',
    category: body.category || 'stop_inquiry',
    message: body.message,
    priority: (body.priority || 'normal') as 'normal' | 'urgent',
    sent_at: new Date().toISOString(),
    status: 'delivered' as const,
  };
  supervisorInstructions.unshift(inst);
  io.to('org:' + orgId).emit('driver.instruction', inst);
  return reply.status(201).send({ instruction: inst });
});

fastify.get('/v1/supervisor/instructions', async (request) => {
  const q = (request.query as any) || {};
  let items = supervisorInstructions;
  if (q.bus_id) {
    items = items.filter((i) => i.bus_id === q.bus_id);
  }
  return { items, total: items.length };
});

fastify.post('/v1/driver/instruction/:id/ack', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { reply: ackReply } = (request.body as any) || {};
  const inst = supervisorInstructions.find((i) => i.id === id);
  if (!inst) {
    return reply.status(404).send({ error: 'Instruction not found' });
  }
  inst.status = 'acknowledged';
  inst.ack_reply = ackReply || 'Acknowledged by driver';
  inst.ack_at = new Date().toISOString();
  io.to('org:' + inst.org_id).emit('driver.instruction_ack', inst);
  return { instruction: inst };
});

fastify.post('/v1/supervisor/cleanliness', async (request) => {
  const body = (request.body as any) || {};
  const report = {
    bus_id: body.bus_id,
    status: (body.status || 'clean') as 'clean' | 'needs_cleaning' | 'in_progress',
    interior_clean: Boolean(body.interior_clean ?? true),
    exterior_clean: Boolean(body.exterior_clean ?? true),
    sanitized: Boolean(body.sanitized ?? true),
    ac_fresh: Boolean(body.ac_fresh ?? true),
    inspected_by: body.inspected_by || 'Anand Shinde (Supervisor)',
    inspected_at: new Date().toISOString(),
    notes: body.notes || '',
  };
  vehicleCleanlinessStore.set(body.bus_id, report);
  io.to('org:0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000').emit('vehicle.cleanliness_updated', report);
  return { report };
});

fastify.get('/v1/supervisor/cleanliness', async () => {
  return { reports: Array.from(vehicleCleanlinessStore.values()) };
});

// GET /v1/healthz
fastify.get('/v1/healthz', async () => ({ status: 'ok', uptime: process.uptime() }));

// Production Static Frontend Hosting (Serves Web Dashboard SPA directly)
if (fs.existsSync(distPath)) {
  await fastify.register(fastifyStatic, {
    root: distPath,
    prefix: '/',
  });

  fastify.setNotFoundHandler((request, reply) => {
    if (
      request.url.startsWith('/v1') ||
      request.url.startsWith('/socket.io') ||
      request.url.startsWith('/assets')
    ) {
      return reply.status(404).send({ error: 'Endpoint Not Found' });
    }
    return reply.sendFile('index.html');
  });
}

const PORT = Number(process.env.PORT) || 3000;
await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`[FleetAPI] Server & Socket.IO running at http://0.0.0.0:${PORT}`);
