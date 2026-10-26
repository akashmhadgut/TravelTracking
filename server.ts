import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';
import * as dotenv from 'dotenv';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  IngestBatchRequestSchema,
  CreateBusSchema,
  CreateDriverSchema,
  CreateTripSchema,
  CreateRouteSchema,
  SwapSpareDeviceSchema,
  ToggleEntityActiveSchema,
  DriverIncidentSchema,
  generateOpenApiSpec,
} from './src/shared/contracts.ts';
import { canRoleMutate } from './src/shared/gpsEngine.ts';
import {
  getLiveFleetSnapshot,
  getTripHistoryPoints,
  ingestLocationBatch,
  runStatusSweepJob,
  runFleetSimulationStep,
  createBusWithSetup,
  createDriverRecord,
  createOrStartTripRecord,
  createRouteWithStops,
  swapOrRegisterDevice,
  toggleEntityActiveState,
  updateTripLifecycle,
  acknowledgeAlertById,
  reportDriverIncidentToControl,
  sendManualWakeupPingToDevice,
  generateFleetCsvReport,
  getOrCreateUser,
} from './src/db/repository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  app.use(express.json({ limit: '1mb' }));

  // Socket.IO Real-Time Organization Rooms & Reconnect Snapshot Resync (Section 4 & 11)
  io.on('connection', async (socket) => {
    const orgId = Number(
      socket.handshake.auth?.organizationId || socket.handshake.query?.organizationId || 1
    );
    const role = String(socket.handshake.auth?.role || 'supervisor');
    const roomName = `org:${orgId}`;
    socket.join(roomName);

    try {
      const snapshot = await getLiveFleetSnapshot(orgId, role);
      socket.emit('fleet:snapshot', snapshot);
    } catch (err) {
      console.error('Socket initial snapshot error:', err);
    }

    socket.on('fleet:request_resync', async (payload) => {
      const targetOrg = Number(payload?.organizationId || orgId);
      const targetRole = String(payload?.role || role);
      try {
        const snapshot = await getLiveFleetSnapshot(targetOrg, targetRole);
        socket.emit('fleet:snapshot', snapshot);
      } catch (err) {
        console.error('Socket resync error:', err);
      }
    });
  });

  // OpenAPI 3.1 Specification
  app.get('/v1/openapi.json', (_req, res) => {
    res.json(generateOpenApiSpec());
  });

  // Sync authenticated Firebase user with PostgreSQL users table
  app.post('/v1/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || 'operator-deccan-01';
      const email = req.user?.email || 'vasant.kulkarni@deccantransit.in';
      const orgId = req.organizationId || 1;
      const userRecord = await getOrCreateUser(uid, email, orgId);
      res.json({ user: userRecord });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
  });

  // Section 11: GET /v1/live/buses returns an authorized organization snapshot with RBAC PII masking
  app.get('/v1/live/buses', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orgId = req.organizationId || 1;
      const role = req.operatorRole || 'supervisor';
      const snapshot = await getLiveFleetSnapshot(orgId, role);
      res.json(snapshot);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch live fleet snapshot' });
    }
  });

  // Trip location history for replay scrubber
  app.get('/v1/buses/:busId/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orgId = req.organizationId || 1;
      const busId = Number.parseInt(req.params.busId, 10);
      if (Number.isNaN(busId)) {
        return res.status(400).json({ error: 'Invalid busId' });
      }
      const points = await getTripHistoryPoints(orgId, busId);
      res.json({ busId, count: points.length, points });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch trip history' });
    }
  });

  // Section 11: POST /v1/ingest/locations accepts authenticated batches up to 200 points
  app.post('/v1/ingest/locations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const parsed = IngestBatchRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        });
      }

      const orgId = req.organizationId || 1;
      const outcome = await ingestLocationBatch(orgId, parsed.data);

      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);

      res.json({
        version: 'v1',
        deviceUid: parsed.data.deviceUid,
        tripId: parsed.data.tripId,
        ...outcome,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to ingest location batch' });
    }
  });

  // Create Bus (Fleet CRUD)
  app.post('/v1/buses', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!canRoleMutate(req.operatorRole || 'supervisor', 'FLEET_CRUD')) {
        return res.status(403).json({ error: 'RBAC_FORBIDDEN: Viewer role cannot modify fleet records' });
      }
      const parsed = CreateBusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid bus input' });
      }
      const orgId = req.organizationId || 1;
      const email = req.user?.email || 'vasant.kulkarni@deccantransit.in';
      const bus = await createBusWithSetup(orgId, email, parsed.data);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.status(201).json({ bus });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create bus' });
    }
  });

  // Enroll Driver with DPDP Act 2023 consent
  app.post('/v1/drivers', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!canRoleMutate(req.operatorRole || 'supervisor', 'FLEET_CRUD')) {
        return res.status(403).json({ error: 'RBAC_FORBIDDEN: Viewer role cannot enroll drivers' });
      }
      const parsed = CreateDriverSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid driver input' });
      }
      const orgId = req.organizationId || 1;
      const email = req.user?.email || 'vasant.kulkarni@deccantransit.in';
      const driver = await createDriverRecord(orgId, email, parsed.data);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.status(201).json({ driver });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create driver' });
    }
  });

  // Create Route & Stops Corridor
  app.post('/v1/routes', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!canRoleMutate(req.operatorRole || 'supervisor', 'FLEET_CRUD')) {
        return res.status(403).json({ error: 'RBAC_FORBIDDEN: Viewer role cannot create routes' });
      }
      const parsed = CreateRouteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid route input' });
      }
      const orgId = req.organizationId || 1;
      const email = req.user?.email || 'vasant.kulkarni@deccantransit.in';
      const route = await createRouteWithStops(orgId, email, parsed.data);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.status(201).json({ route });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create route' });
    }
  });

  // Same-Day Spare Phone Swap & Device Binding (Section 9)
  app.post('/v1/devices/swap', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!canRoleMutate(req.operatorRole || 'supervisor', 'FLEET_CRUD')) {
        return res.status(403).json({ error: 'RBAC_FORBIDDEN: Viewer role cannot swap devices' });
      }
      const parsed = SwapSpareDeviceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid device swap input' });
      }
      const orgId = req.organizationId || 1;
      const email = req.user?.email || 'vasant.kulkarni@deccantransit.in';
      const device = await swapOrRegisterDevice(orgId, email, parsed.data);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.status(201).json({ device });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to swap spare device' });
    }
  });

  // Soft-Deactivate / Reactivate Business Record (Section 5)
  app.patch('/v1/entities/active', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!canRoleMutate(req.operatorRole || 'supervisor', 'FLEET_CRUD')) {
        return res.status(403).json({ error: 'RBAC_FORBIDDEN: Viewer role cannot deactivate records' });
      }
      const parsed = ToggleEntityActiveSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid toggle payload' });
      }
      const orgId = req.organizationId || 1;
      const email = req.user?.email || 'vasant.kulkarni@deccantransit.in';
      await toggleEntityActiveState(orgId, email, parsed.data);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to toggle active state' });
    }
  });

  // Dispatch Trip
  app.post('/v1/trips', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!canRoleMutate(req.operatorRole || 'supervisor', 'DISPATCH_TRIP')) {
        return res.status(403).json({ error: 'RBAC_FORBIDDEN: Viewer role cannot dispatch trips' });
      }
      const parsed = CreateTripSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid trip input' });
      }
      const orgId = req.organizationId || 1;
      const email = req.user?.email || 'vasant.kulkarni@deccantransit.in';
      const trip = await createOrStartTripRecord(orgId, email, parsed.data);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.status(201).json({ trip });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create trip' });
    }
  });

  // Start / Complete Trip from Driver App or Operations Console
  app.patch('/v1/trips/:tripId/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const tripId = Number.parseInt(req.params.tripId, 10);
      const newStatus = req.body?.status === 'completed' ? 'completed' : 'active';
      const orgId = req.organizationId || 1;
      const email = req.user?.email || 'vasant.kulkarni@deccantransit.in';
      const updated = await updateTripLifecycle(orgId, tripId, newStatus, email);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.json({ trip: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update trip status' });
    }
  });

  // Acknowledge Alert
  app.post('/v1/alerts/:alertId/acknowledge', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!canRoleMutate(req.operatorRole || 'supervisor', 'ACKNOWLEDGE_ALERT')) {
        return res.status(403).json({ error: 'RBAC_FORBIDDEN: Viewer role cannot acknowledge alerts' });
      }
      const alertId = Number.parseInt(req.params.alertId, 10);
      const orgId = req.organizationId || 1;
      const email = req.user?.email || 'vasant.kulkarni@deccantransit.in';
      const alert = await acknowledgeAlertById(orgId, alertId, email);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.json({ alert });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to acknowledge alert' });
    }
  });

  // Driver Incident Reporting
  app.post('/v1/incidents', requireAuth, async (req: AuthRequest, res) => {
    try {
      const parsed = DriverIncidentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid incident report' });
      }
      const orgId = req.organizationId || 1;
      const alert = await reportDriverIncidentToControl(orgId, parsed.data);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.status(201).json({ alert });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to report incident' });
    }
  });

  // OEM High-Priority FCM Ping-to-Wake (Xiaomi / Vivo / Oppo / Realme background recovery)
  app.post('/v1/devices/:deviceId/wakeup', requireAuth, async (req: AuthRequest, res) => {
    try {
      const deviceId = Number.parseInt(req.params.deviceId, 10);
      const orgId = req.organizationId || 1;
      const device = await sendManualWakeupPingToDevice(orgId, deviceId);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.json({ device });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to trigger device wakeup' });
    }
  });

  // Trigger 15-Second Status Sweep Manually or via Job Runner
  app.post('/v1/jobs/status-sweep', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orgId = req.organizationId || 1;
      const sweepResult = await runStatusSweepJob(orgId);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.json(sweepResult);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Status sweep failed' });
    }
  });

  // Section 6 & 12: 100-Bus Load & Outage Simulator
  app.post('/v1/simulator/run', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orgId = req.organizationId || 1;
      const mode = req.body?.mode || 'LIVE_STEP';
      const result = await runFleetSimulationStep(orgId, mode);
      const snapshot = await getLiveFleetSnapshot(orgId, req.operatorRole || 'supervisor');
      io.to(`org:${orgId}`).emit('fleet:snapshot', snapshot);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Simulator step failed' });
    }
  });

  // Multi-Report CSV Export with Audit Logging
  app.get('/v1/exports/locations.csv', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orgId = req.organizationId || 1;
      const email = req.user?.email || 'vasant.kulkarni@deccantransit.in';
      const reportType = String(req.query.type || 'fleet');
      const csv = await generateFleetCsvReport(orgId, email, reportType);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="fleetcommand_${reportType}_report.csv"`
      );
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to export CSV' });
    }
  });

  // Direct Archive Downloads for Mobile Driver App & Deploy Kit
  app.get('/v1/downloads/:filename', (req, res) => {
    const allowed = ['mobile-driver-app.tar.gz', 'deploy-bundle.tar.gz'];
    const filename = req.params.filename;
    if (!allowed.includes(filename)) {
      return res.status(404).json({ error: 'Archive not found' });
    }
    const filePath = path.resolve(__dirname, 'public', 'downloads', filename);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`FleetCommand server + Socket.IO listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
