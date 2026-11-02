import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProblemException } from '@fleet/contracts';
import { query, isDbConnected } from '../../db.js';

const CreateTripBodySchema = z.object({
  route_id: z.string().uuid(),
  bus_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  planned_start: z.string().datetime({ offset: true }),
  planned_end: z.string().datetime({ offset: true }).optional(),
});

const ForceCloseBodySchema = z.object({
  reason: z.string().min(5),
});

// In-Memory store for scheduled corporate cab trips
const inMemoryTrips: any[] = [];

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
            b.id as bus_id, b.reg_no as bus_reg, b.model as bus_model,
            d.id as driver_id, u.name as driver_name, u.phone as driver_phone,
            r.id as route_id, r.code as route_code, r.name as route_name
          FROM trips t
          JOIN buses b ON b.id = t.bus_id
          JOIN drivers d ON d.id = t.driver_id
          JOIN users u ON u.id = d.user_id
          JOIN routes r ON r.id = t.route_id
          WHERE t.org_id = $1
          ORDER BY t.created_at DESC
          LIMIT 50;
        `, [defaultOrgId]);

        if (res.rows.length > 0) {
          return { items: res.rows, total: res.rows.length };
        }
      } catch (err) {
        fastify.log.error(err, 'Failed to fetch trips from database, using fallback in-memory');
      }
    }

    return { items: inMemoryTrips, total: inMemoryTrips.length };
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
      const tripId = '0192f0a1-7c3e-7c11-9d0a-' + Math.random().toString(16).slice(2, 14);

      const newTripItem = {
        id: tripId,
        org_id: defaultOrgId,
        bus_id: body.bus_id,
        driver_id: body.driver_id,
        route_id: body.route_id,
        status: 'scheduled',
        planned_start: body.planned_start,
        planned_end: body.planned_end,
        distance_m: 24000,
        delayed: false,
        created_at: new Date().toISOString(),
        bus_reg: (body as any).bus_reg || 'EV Vehicle',
        bus_model: (body as any).bus_model || 'EV Sedan',
        driver_name: (body as any).driver_name || 'Assigned Driver',
        driver_phone: (body as any).driver_phone || '',
        route_code: (body as any).route_code || 'CUSTOM-CORRIDOR',
        route_name: (body as any).route_name || 'Custom Corridor',
        passengers: (request.body as any).passengers || [],
        shift: (request.body as any).shift || 'General Shift',
      };

      if (dbOnline) {
        try {
          // Check if route version exists or fetch default version
          const rvRes = await query(`
            SELECT id FROM route_versions WHERE route_id = $1 LIMIT 1
          `, [body.route_id]);

          let routeVersionId = rvRes.rows[0]?.id;
          if (!routeVersionId) {
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
            VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, $8, 0, false)
            RETURNING *;
          `, [
            tripId, defaultOrgId, body.route_id, routeVersionId, body.bus_id, body.driver_id,
            body.planned_start, body.planned_end
          ]);

          inMemoryTrips.unshift(newTripItem);
          return reply.status(201).send({ trip: insertRes.rows[0] });
        } catch (err: any) {
          if (err.code === '23505') {
            throw new ProblemException({
              status: 409,
              code: 'trip.concurrent_active_trip',
              title: 'Conflict',
              detail: 'This car or driver already has an in-progress trip. Complete or cancel the active trip first.',
            });
          }
          fastify.log.warn(err, 'Failed to insert trip into DB, adding to in-memory');
        }
      }

      inMemoryTrips.unshift(newTripItem);
      return reply.status(201).send({ trip: newTripItem });
    }
  );

  // PUT /v1/trips/:id — Edit trip date, time, driver, or vehicle schedule
  fastify.put('/v1/trips/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const dbOnline = await isDbConnected();

    const tripIdx = inMemoryTrips.findIndex((t) => t.id === id);
    const existing = tripIdx >= 0 ? inMemoryTrips[tripIdx] : null;

    const updatedTrip = {
      ...existing,
      id: id || existing?.id || `0192f0a1-${Date.now()}`,
      planned_start: body.planned_start || existing?.planned_start || new Date().toISOString(),
      planned_end: body.planned_end || existing?.planned_end || new Date(Date.now() + 3600000).toISOString(),
      status: body.status || existing?.status || 'scheduled',
      bus_id: body.bus_id || existing?.bus_id,
      bus_reg: body.bus_reg || existing?.bus_reg,
      bus_model: body.bus_model || existing?.bus_model,
      driver_id: body.driver_id || existing?.driver_id,
      driver_name: body.driver_name || existing?.driver_name,
      driver_phone: body.driver_phone || existing?.driver_phone,
      route_id: body.route_id || existing?.route_id,
      route_code: body.route_code || existing?.route_code,
      route_name: body.route_name || existing?.route_name,
      passengers: body.passengers || existing?.passengers || [],
      shift: body.shift || existing?.shift || 'General Shift',
    };

    if (dbOnline) {
      try {
        await query(
          `UPDATE trips 
           SET planned_start = $1, planned_end = $2, status = $3, updated_at = now()
           WHERE id = $4;`,
          [updatedTrip.planned_start, updatedTrip.planned_end, updatedTrip.status, id]
        );
      } catch (err) {
        fastify.log.error(err, 'Failed to update trip in PostgreSQL');
      }
    }

    if (tripIdx >= 0) {
      inMemoryTrips[tripIdx] = updatedTrip;
    } else {
      inMemoryTrips.unshift(updatedTrip);
    }

    return reply.send({ trip: updatedTrip });
  });

  // DELETE /v1/trips/:id — Cancel/delete a scheduled trip
  fastify.delete('/v1/trips/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const dbOnline = await isDbConnected();

    if (dbOnline) {
      try {
        await query(`DELETE FROM trips WHERE id = $1;`, [id]);
      } catch (err) {
        fastify.log.error(err, 'Failed to delete trip in DB');
      }
    }

    const idx = inMemoryTrips.findIndex((t) => t.id === id);
    if (idx >= 0) {
      inMemoryTrips.splice(idx, 1);
    }

    return reply.send({ success: true, id });
  });

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

  // GET /v1/driver/today - Today's assigned car, route and trip details (Section 7.3 & 9.9)
  fastify.get('/v1/driver/today', async (request, reply) => {
    const queryParams = (request.query as any) || {};
    const reqPhone = queryParams.phone ? String(queryParams.phone).replace(/[\s-+]/g, '') : '';
    const reqDriverId = queryParams.driver_id ? String(queryParams.driver_id) : '';

    const dbOnline = await isDbConnected();

    if (dbOnline) {
      try {
        let sql = `
          SELECT 
            t.id as trip_id, t.status, t.planned_start, t.planned_end, t.actual_start,
            b.id as bus_id, b.reg_no, b.make, b.model, b.capacity,
            r.id as route_id, r.code as route_code, r.name as route_name, r.origin, r.destination,
            d.id as driver_id, u.name as driver_name, u.phone as driver_phone
          FROM trips t
          JOIN buses b ON b.id = t.bus_id
          JOIN routes r ON r.id = t.route_id
          JOIN drivers d ON d.id = t.driver_id
          JOIN users u ON u.id = d.user_id
          WHERE t.status IN ('scheduled', 'in_progress')
        `;
        const params: any[] = [];
        if (reqDriverId) {
          params.push(reqDriverId);
          sql += ` AND d.id = $${params.length}`;
        } else if (reqPhone) {
          params.push(reqPhone);
          sql += ` AND (u.phone LIKE '%' || $${params.length} OR REPLACE(u.phone, ' ', '') LIKE '%' || $${params.length})`;
        }
        sql += ` ORDER BY t.planned_start ASC LIMIT 1;`;

        const tripRes = await query(sql, params);

        if (tripRes.rows.length > 0) {
          const row = tripRes.rows[0];
          return {
            driver: { id: row.driver_id, name: row.driver_name, phone: row.driver_phone },
            car: { id: row.bus_id, reg_no: row.reg_no, make: row.make, model: row.model, capacity: row.capacity || 4 },
            bus: { id: row.bus_id, reg_no: row.reg_no, make: row.make, model: row.model, capacity: row.capacity || 4 },
            route: {
              id: row.route_id,
              code: row.route_code,
              name: row.route_name,
              origin: row.origin || 'Swargate Metro Station, Gate 2, Pune',
              destination: row.destination || 'Megapolis Circle, Hinjewadi Phase 3 TechZone',
              pickup_point: { name: row.origin || 'Swargate Metro Hub, Gate 2', lat: 18.5018, lng: 73.8586, time: '08:30 IST' },
              drop_point: { name: row.destination || 'Megapolis Circle, Hinjewadi Phase 3', lat: 18.5790, lng: 73.7010, time: '09:20 IST' },
            },
            trip: {
              id: row.trip_id,
              status: row.status,
              planned_start: row.planned_start,
              planned_end: row.planned_end,
              actual_start: row.actual_start,
            },
            riders: [
              { name: 'Pooja Kulkarni', emp_id: 'INFY-9021', phone: '+919822114400', pickup: 'Swargate Gate 2', status: 'pending' },
              { name: 'Amit Deshmukh', emp_id: 'TCS-4412', phone: '+919822332211', pickup: 'Shivajinagar Chowk', status: 'pending' },
              { name: 'Sneha Patil', emp_id: 'WIP-8871', phone: '+919822556677', pickup: 'Aundh Bremen Circle', status: 'pending' },
            ],
          };
        }
      } catch (err) {
        fastify.log.warn(err, 'Failed to query today trips from PostgreSQL');
      }
    }

    // Match in-memory trips
    let matchedTrip = inMemoryTrips.find((t) => {
      if (reqDriverId && t.driver_id === reqDriverId) return true;
      if (reqPhone) {
        const cleanTPhone = (t.driver_phone || '').replace(/[\s-+]/g, '');
        return cleanTPhone.includes(reqPhone) || reqPhone.includes(cleanTPhone);
      }
      return false;
    });

    if (!matchedTrip) {
      return reply.send({
        trip: null,
        active: false,
        detail: 'No active scheduled trip found for this driver.',
      });
    }

    const matched = matchedTrip;

    return {
      driver: { id: matched.driver_id, name: matched.driver_name, phone: matched.driver_phone },
      car: {
        id: matched.bus_id,
        reg_no: matched.bus_reg || '',
        make: 'Tata Motors',
        model: matched.bus_model || '',
        capacity: 4,
      },
      bus: {
        id: matched.bus_id,
        reg_no: matched.bus_reg || '',
        make: 'Tata Motors',
        model: matched.bus_model || '',
        capacity: 4,
      },
      route: {
        id: matched.route_id,
        code: matched.route_code || '',
        name: matched.route_name || '',
        origin: matched.stops?.[0] || 'Origin',
        destination: matched.stops?.[matched.stops?.length - 1] || 'Destination',
        pickup_point: { name: matched.stops?.[0] || 'Origin', lat: 18.5018, lng: 73.8586, time: 'IST' },
        drop_point: { name: matched.stops?.[matched.stops?.length - 1] || 'Destination', lat: 18.5790, lng: 73.7010, time: 'IST' },
      },
      trip: {
        id: matched.id,
        status: matched.status || 'scheduled',
        planned_start: matched.planned_start,
        planned_end: matched.planned_end,
      },
      riders: (matched.passengers || []).map((p: any) => ({
        name: p.name,
        phone: p.phone,
        status: 'pending',
      })),
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

    const baseTime = Date.now() - 3600000;
    const waypointSteps = [
      { lat: 18.5018, lng: 73.8586, speed_kmh: 0 },
      { lat: 18.5065, lng: 73.8562, speed_kmh: 22 },
      { lat: 18.5120, lng: 73.8530, speed_kmh: 34 },
      { lat: 18.5175, lng: 73.8510, speed_kmh: 40 },
      { lat: 18.5220, lng: 73.8490, speed_kmh: 45 },
      { lat: 18.5280, lng: 73.8465, speed_kmh: 38 },
      { lat: 18.5314, lng: 73.8446, speed_kmh: 15 },
      { lat: 18.5360, lng: 73.8390, speed_kmh: 42 },
      { lat: 18.5420, lng: 73.8310, speed_kmh: 52 },
      { lat: 18.5480, lng: 73.8230, speed_kmh: 48 },
      { lat: 18.5540, lng: 73.8150, speed_kmh: 50 },
      { lat: 18.5580, lng: 73.8075, speed_kmh: 30 },
      { lat: 18.5630, lng: 73.7980, speed_kmh: 55 },
      { lat: 18.5690, lng: 73.7850, speed_kmh: 58 },
      { lat: 18.5740, lng: 73.7720, speed_kmh: 62 },
      { lat: 18.5790, lng: 73.7600, speed_kmh: 55 },
      { lat: 18.5830, lng: 73.7500, speed_kmh: 48 },
      { lat: 18.5870, lng: 73.7440, speed_kmh: 35 },
      { lat: 18.5913, lng: 73.7389, speed_kmh: 0 },
    ];

    const fallbackPoints = waypointSteps.map((step, idx) => ({
      lat: step.lat,
      lng: step.lng,
      speed_kmh: step.speed_kmh,
      heading_deg: 310,
      accuracy_m: 4.5,
      recorded_at: new Date(baseTime + idx * 90000).toISOString(),
    }));

    return {
      trip_id: id,
      distance_m: 24200,
      points: fallbackPoints,
      stop_events: [
        { name: 'Depot Origin (Swargate Central)', arrived_at: new Date(baseTime).toISOString(), departed_at: new Date(baseTime + 60000).toISOString() },
        { name: 'Midway Halt (Shivajinagar Station)', arrived_at: new Date(baseTime + 540000).toISOString(), departed_at: new Date(baseTime + 660000).toISOString() },
        { name: 'Terminal Destination (Hinjawadi IT Park)', arrived_at: new Date(baseTime + 1620000).toISOString(), departed_at: new Date(baseTime + 1620000).toISOString() },
      ],
    };
  });
}
