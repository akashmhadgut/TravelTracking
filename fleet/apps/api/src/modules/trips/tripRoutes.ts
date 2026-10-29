import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProblemException } from '@fleet/contracts';
import { query, isDbConnected } from '../../db.js';

const CreateTripBodySchema = z.object({
  route_id: z.string().uuid(),
  bus_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  planned_start: z.string().datetime({ offset: true }),
  planned_end: z.string().datetime({ offset: true }),
});

const ForceCloseBodySchema = z.object({
  reason: z.string().min(5),
});

export async function tripRoutes(fastify: FastifyInstance) {
  const defaultOrgId = '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000';

  // GET /v1/trips — List trips with route and bus details (Section 7.3)
  fastify.get('/v1/trips', async () => {
    const dbOnline = await isDbConnected();
    if (dbOnline) {
      try {
        const res = await query(`
          SELECT 
            t.id, t.org_id, t.status, t.planned_start, t.planned_end, t.actual_start, t.actual_end,
            t.distance_m, t.delayed, t.delay_reason, t.closed_by,
            b.reg_no as bus_reg, b.model as bus_model,
            u.name as driver_name,
            r.code as route_code, r.name as route_name
          FROM trips t
          JOIN buses b ON b.id = t.bus_id
          JOIN drivers d ON d.id = t.driver_id
          JOIN users u ON u.id = d.user_id
          JOIN routes r ON r.id = t.route_id
          WHERE t.org_id = $1
          ORDER BY t.created_at DESC
          LIMIT 50;
        `, [defaultOrgId]);

        return { items: res.rows, total: res.rows.length };
      } catch (err) {
        fastify.log.error(err, 'Failed to fetch trips from database');
      }
    }

    return { items: [], total: 0 };
  });

  // POST /v1/trips — Schedule or dispatch a trip (Section 6.3)
  fastify.post(
    '/v1/trips',
    {
      schema: { body: CreateTripBodySchema },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof CreateTripBodySchema>;
      const dbOnline = await isDbConnected();

      if (dbOnline) {
        try {
          // Check if route version exists or fetch default version
          const rvRes = await query(`
            SELECT id FROM route_versions WHERE route_id = $1 LIMIT 1
          `, [body.route_id]);

          let routeVersionId = rvRes.rows[0]?.id;
          if (!routeVersionId) {
            // Create default route version if not present
            const newRv = await query(`
              INSERT INTO route_versions (id, route_id, version_number)
              VALUES (gen_random_uuid(), $1, 1)
              RETURNING id;
            `, [body.route_id]);
            routeVersionId = newRv.rows[0].id;
          }

          const insertRes = await query(`
            INSERT INTO trips (
              id, org_id, route_id, route_version_id, bus_id, driver_id, status,
              planned_start, planned_end, distance_m, delayed
            )
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'scheduled', $6, $7, 0, false)
            RETURNING *;
          `, [
            defaultOrgId, body.route_id, routeVersionId, body.bus_id, body.driver_id,
            body.planned_start, body.planned_end
          ]);

          const trip = insertRes.rows[0];
          return reply.status(201).send({ trip });
        } catch (err: any) {
          if (err.code === '23505') { // Unique index violation: one_active_trip_per_bus or driver
            throw new ProblemException({
              status: 409,
              code: 'trip.concurrent_active_trip',
              title: 'Conflict',
              detail: 'This bus or driver already has an in-progress trip. Complete or cancel the active trip first.',
            });
          }
          throw err;
        }
      }

      throw new ProblemException({
        status: 503,
        code: 'db.unavailable',
        title: 'Database Unavailable',
        detail: 'Cannot dispatch trip without database connection.',
      });
    }
  );

  // GET /v1/driver/config - Client cadence configuration (Section 7.3 & 9.4)
  fastify.get('/v1/driver/config', async () => {
    return {
      moving_interval_s: 10,
      stationary_interval_s: 30,
      heading_turn_deg: 25,
      displacement_m: 150,
      min_app_version: '1.0.0',
      server_time: new Date().toISOString(),
    };
  });

  // GET /v1/driver/today - Today's assigned bus, route and trips (Section 7.3 & 9.9)
  fastify.get('/v1/driver/today', async () => {
    const dbOnline = await isDbConnected();
    const defaultDriverId = '0192f0a1-7c3e-7c11-9d0a-5e2b6f4d0001';

    if (dbOnline) {
      try {
        const tripRes = await query(`
          SELECT 
            t.id as trip_id, t.status, t.planned_start, t.planned_end, t.actual_start,
            b.id as bus_id, b.reg_no, b.make, b.model, b.capacity,
            r.id as route_id, r.code as route_code, r.name as route_name, r.origin, r.destination,
            d.id as driver_id, u.name as driver_name
          FROM trips t
          JOIN buses b ON b.id = t.bus_id
          JOIN routes r ON r.id = t.route_id
          JOIN drivers d ON d.id = t.driver_id
          JOIN users u ON u.id = d.user_id
          WHERE t.status IN ('scheduled', 'in_progress')
          ORDER BY t.planned_start ASC
          LIMIT 1;
        `);

        if (tripRes.rows.length > 0) {
          const row = tripRes.rows[0];
          return {
            driver: { id: row.driver_id, name: row.driver_name },
            bus: { id: row.bus_id, reg_no: row.reg_no, make: row.make, model: row.model, capacity: row.capacity },
            route: { id: row.route_id, code: row.route_code, name: row.route_name, origin: row.origin, destination: row.destination },
            trip: { id: row.trip_id, status: row.status, planned_start: row.planned_start, planned_end: row.planned_end, actual_start: row.actual_start },
          };
        }
      } catch (err) {
        fastify.log.warn(err, 'Failed to query today trips from PostgreSQL');
      }
    }

    return {
      driver: { id: defaultDriverId, name: 'Ganesh Jadhav' },
      bus: { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c0001', reg_no: 'MH 12 QN 4821', make: 'Tata', model: 'Starbus Ultra EV', capacity: 42 },
      route: { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c0002', code: 'RT-505', name: 'Hadapsar to Hinjewadi Phase 3', origin: 'Hadapsar Bus Station', destination: 'Megapolis Hinjewadi' },
      trip: { id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a10', status: 'scheduled', planned_start: new Date().toISOString(), planned_end: new Date(Date.now() + 7200000).toISOString() },
    };
  });

  // GET /v1/driver/active-trip - Reconnection recovery (Section 7.3 & 9.6)
  fastify.get('/v1/driver/active-trip', async () => {
    const dbOnline = await isDbConnected();
    if (dbOnline) {
      try {
        const tripRes = await query(`
          SELECT 
            t.id as trip_id, t.status, t.planned_start, t.actual_start,
            b.id as bus_id, b.reg_no,
            r.id as route_id, r.name as route_name
          FROM trips t
          JOIN buses b ON b.id = t.bus_id
          JOIN routes r ON r.id = t.route_id
          WHERE t.status = 'in_progress'
          LIMIT 1;
        `);
        if (tripRes.rows.length > 0) {
          const row = tripRes.rows[0];
          return { active: true, trip: row };
        }
      } catch {}
    }
    return { active: false, trip: null };
  });

  // POST /v1/driver/incidents - Report Breakdown, Accident, Medical, Delay (Section 7.3 & 9.9)
  fastify.post('/v1/driver/incidents', async (request) => {
    const body = request.body as any;
    const dbOnline = await isDbConnected();
    const incidentId = '0192f0a1-8a01-7d22-8b31-' + Math.random().toString(36).substring(2, 14);

    if (dbOnline && body.trip_id) {
      try {
        await query(`
          INSERT INTO alerts (id, org_id, type, severity, status, bus_id, driver_id, trip_id, dedupe_key, message, data)
          VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9, $10)
          ON CONFLICT (org_id, dedupe_key) WHERE status <> 'resolved' DO NOTHING;
        `, [
          incidentId,
          '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
          body.kind || 'driver_incident',
          body.kind === 'accident' || body.kind === 'medical' ? 'critical' : 'warning',
          body.bus_id || '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c0001',
          body.driver_id || '0192f0a1-7c3e-7c11-9d0a-5e2b6f4d0001',
          body.trip_id,
          `incident:${body.trip_id}:${Date.now()}`,
          `[DRIVER REPORT] ${body.kind?.toUpperCase() || 'INCIDENT'}: ${body.note || 'No notes'}`,
          JSON.stringify(body),
        ]);
      } catch (err) {
        fastify.log.warn(err, 'Failed to insert driver incident alert');
      }
    }

    return {
      status: 'acknowledged',
      incident_id: incidentId,
      received_at: new Date().toISOString(),
    };
  });

  // POST /v1/driver/trips/:id/start — Driver begins trip (Section 6.3 & 9.6)
  fastify.post('/v1/driver/trips/:id/start', async (request) => {
    const { id } = request.params as { id: string };
    const dbOnline = await isDbConnected();

    if (dbOnline) {
      const tripRes = await query('SELECT * FROM trips WHERE id = $1', [id]);
      if (tripRes.rows.length === 0) {
        throw new ProblemException({
          status: 404,
          code: 'trip.not_found',
          title: 'Trip Not Found',
          detail: `Trip ${id} does not exist.`,
        });
      }

      const trip = tripRes.rows[0];
      if (trip.status === 'in_progress') {
        return { trip, message: 'Trip already in progress (idempotent)' };
      }

      if (trip.status === 'completed' || trip.status === 'cancelled') {
        throw new ProblemException({
          status: 409,
          code: 'trip.invalid_transition',
          title: 'Invalid State Transition',
          detail: `Cannot start a trip that is already ${trip.status}.`,
        });
      }

      const updateRes = await query(`
        UPDATE trips
        SET status = 'in_progress', actual_start = now()
        WHERE id = $1
        RETURNING *;
      `, [id]);

      // Update bus latest location status to 'stopped' or 'moving'
      await query(`
        UPDATE latest_bus_locations
        SET trip_id = $1, status = 'stopped', status_since = now(), rev = nextval('live_rev_seq')
        WHERE bus_id = $2;
      `, [id, trip.bus_id]);

      return { trip: updateRes.rows[0] };
    }

    return { message: 'Database offline' };
  });

  // POST /v1/driver/trips/:id/end — Driver ends trip with PostGIS distance calculation (Section 6.3)
  fastify.post('/v1/driver/trips/:id/end', async (request) => {
    const { id } = request.params as { id: string };
    const dbOnline = await isDbConnected();

    if (dbOnline) {
      // 1. PostGIS distance sum query ignoring weak fixes and jitter (<5m) (§6.3)
      const distRes = await query(`
        SELECT COALESCE(SUM(d), 0)::int as distance_m FROM (
          SELECT ST_Distance(
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(LAG(lng) OVER w, LAG(lat) OVER w), 4326)::geography) AS d
          FROM trip_locations
          WHERE trip_id = $1 AND (flags & 1) = 0
          WINDOW w AS (ORDER BY recorded_at)
        ) s WHERE d >= 5;
      `, [id]);

      const distanceM = distRes.rows[0]?.distance_m || 0;

      // 2. Complete trip record
      const updateRes = await query(`
        UPDATE trips
        SET status = 'completed', actual_end = now(), distance_m = $1, closed_by = 'driver'
        WHERE id = $2
        RETURNING *;
      `, [distanceM, id]);

      // 3. Reset latest bus location trip reference
      if (updateRes.rows.length > 0) {
        const trip = updateRes.rows[0];
        await query(`
          UPDATE latest_bus_locations
          SET trip_id = null, status = 'not_on_trip', status_since = now(), rev = nextval('live_rev_seq')
          WHERE bus_id = $1;
        `, [trip.bus_id]);

        return { trip: updateRes.rows[0], distance_m: distanceM };
      }
    }

    throw new ProblemException({
      status: 404,
      code: 'trip.not_found',
      title: 'Trip Not Found',
      detail: `Trip ${id} does not exist.`,
    });
  });

  // POST /v1/trips/:id/force-close — Admin force close with mandatory reason (Section 6.3)
  fastify.post(
    '/v1/trips/:id/force-close',
    {
      schema: { body: ForceCloseBodySchema },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { reason } = request.body as z.infer<typeof ForceCloseBodySchema>;
      const dbOnline = await isDbConnected();

      if (dbOnline) {
        const updateRes = await query(`
          UPDATE trips
          SET status = 'completed', actual_end = now(), closed_by = 'admin', cancel_reason = $1
          WHERE id = $2
          RETURNING *;
        `, [reason, id]);

        if (updateRes.rows.length > 0) {
          const trip = updateRes.rows[0];
          await query(`
            UPDATE latest_bus_locations
            SET trip_id = null, status = 'not_on_trip', rev = nextval('live_rev_seq')
            WHERE bus_id = $1;
          `, [trip.bus_id]);

          return { trip: updateRes.rows[0] };
        }
      }

      throw new ProblemException({
        status: 404,
        code: 'trip.not_found',
        title: 'Trip Not Found',
        detail: `Trip ${id} does not exist.`,
      });
    }
  );

  // GET /v1/trips/:id/replay — Breadcrumb trail from partitioned trip_locations (Section 10.3)
  fastify.get('/v1/trips/:id/replay', async (request) => {
    const { id } = request.params as { id: string };
    const dbOnline = await isDbConnected();

    if (dbOnline) {
      try {
        const tripRes = await query('SELECT * FROM trips WHERE id = $1', [id]);
        const trip = tripRes.rows[0];

        const ptsRes = await query(`
          SELECT lat, lng, speed_kmh, heading_deg, accuracy_m, recorded_at
          FROM trip_locations
          WHERE trip_id = $1 AND (flags & 1) = 0
          ORDER BY recorded_at ASC
          LIMIT 5000;
        `, [id]);

        return {
          trip_id: id,
          distance_m: trip?.distance_m || 0,
          points: ptsRes.rows,
          stop_events: [
            { name: 'Depot Origin', arrived_at: trip?.planned_start, departed_at: trip?.actual_start || trip?.planned_start },
            { name: 'Terminal Destination', arrived_at: trip?.actual_end || trip?.planned_end, departed_at: trip?.actual_end || trip?.planned_end },
          ],
        };
      } catch (err) {
        fastify.log.error(err, 'Failed to fetch replay points');
      }
    }

    return { trip_id: id, distance_m: 0, points: [], stop_events: [] };
  });
}
