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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDistPath = path.resolve(__dirname, '../../../apps/web/dist');
const altDistPath = path.resolve(process.cwd(), 'apps/web/dist');
const distPath = fs.existsSync(webDistPath) ? webDistPath : altDistPath;

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
  return {
    snapshot_rev: String(currentMonotonicRev),
    buses: demoBuses,
    count: demoBuses.length,
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

      // Update latest only if fix is good accuracy (Section 5.2)
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

// GET /v1/healthz
fastify.get('/v1/healthz', async () => ({ status: 'ok', uptime: process.uptime() }));

// Production Static Frontend Hosting (Serves Web Dashboard SPA directly)
if (fs.existsSync(distPath)) {
  await fastify.register(fastifyStatic, {
    root: distPath,
    prefix: '/',
    wildcard: false,
  });

  fastify.get('/*', async (request, reply) => {
    if (request.url.startsWith('/v1') || request.url.startsWith('/socket.io')) {
      return reply.status(404).send({ error: 'Endpoint Not Found' });
    }
    return reply.sendFile('index.html');
  });
}

const PORT = Number(process.env.PORT) || 3000;
await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`[FleetAPI] Server & Socket.IO running at http://0.0.0.0:${PORT}`);
