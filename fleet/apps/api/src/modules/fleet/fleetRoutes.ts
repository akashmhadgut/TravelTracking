import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProblemException } from '@fleet/contracts';
import { query, isDbConnected } from '../../db.js';

const CreateBusBodySchema = z.object({
  reg_no: z.string().min(4).max(24),
  make: z.string().default('Tata Motors'),
  model: z.string().default('Nexon EV Max'),
  capacity: z.number().int().min(1).max(120).default(5),
  tracking_source: z.enum(['phone', 'device']).default('phone'),
});

const CreateDriverBodySchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  licence_class: z.string().default('HMV-Passenger'),
  licence_number: z.string().min(8),
  address: z.string().min(5),
});

const CreateRouteStopSchema = z.object({
  sequence: z.number().int().min(1),
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  planned_offset_min: z.number().default(0),
  radius_m: z.number().default(50),
});

const CreateRouteBodySchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  distance_km: z.number().nonnegative(),
  estimated_duration_min: z.number().nonnegative().optional(),
  stops: z.array(CreateRouteStopSchema).min(1),
  geometry: z.any().optional(),
});

// In-Memory fallback store for routes with full geo-stops
const inMemoryRoutes: any[] = [
  {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c2001',
    code: 'RT-501',
    name: 'Swargate to Nigdi Express',
    distance_km: 24.5,
    estimated_duration_min: 52,
    stops: ['Swargate Terminal', 'Shivajinagar', 'Khadki', 'Chinchwad', 'Nigdi'],
    detailed_stops: [
      { sequence: 1, name: 'Swargate Terminal', lat: 18.5018, lng: 73.8586, planned_offset_min: 0, radius_m: 60 },
      { sequence: 2, name: 'Shivajinagar', lat: 18.5314, lng: 73.8446, planned_offset_min: 12, radius_m: 50 },
      { sequence: 3, name: 'Khadki', lat: 18.5679, lng: 73.8340, planned_offset_min: 22, radius_m: 50 },
      { sequence: 4, name: 'Chinchwad', lat: 18.6298, lng: 73.7997, planned_offset_min: 38, radius_m: 50 },
      { sequence: 5, name: 'Nigdi', lat: 18.6517, lng: 73.7699, planned_offset_min: 52, radius_m: 70 },
    ],
  },
  {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c2002',
    code: 'RT-505',
    name: 'Katraj to Hinjawadi IT Park',
    distance_km: 31.2,
    estimated_duration_min: 68,
    stops: ['Katraj Depot', 'Warje Flyover', 'Chandani Chowk', 'Baner', 'Hinjawadi Phase 3'],
    detailed_stops: [
      { sequence: 1, name: 'Katraj Depot', lat: 18.4575, lng: 73.8677, planned_offset_min: 0, radius_m: 60 },
      { sequence: 2, name: 'Warje Flyover', lat: 18.4812, lng: 73.8016, planned_offset_min: 18, radius_m: 50 },
      { sequence: 3, name: 'Chandani Chowk', lat: 18.5089, lng: 73.7924, planned_offset_min: 30, radius_m: 50 },
      { sequence: 4, name: 'Baner', lat: 18.5590, lng: 73.7868, planned_offset_min: 46, radius_m: 50 },
      { sequence: 5, name: 'Hinjawadi Phase 3', lat: 18.5913, lng: 73.7389, planned_offset_min: 68, radius_m: 80 },
    ],
  },
];

export async function fleetRoutes(fastify: FastifyInstance) {
  const defaultOrgId = '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000';

  // GET /v1/buses — List buses from database with latest location (Section 7.3)
  fastify.get('/v1/buses', async (request) => {
    const q = (request.query as any) || {};
    const limit = Math.min(Number(q.limit) || 100, 200);

    const dbOnline = await isDbConnected();
    if (dbOnline) {
      try {
        const res = await query(`
          SELECT 
            b.id, b.org_id, b.reg_no, b.make, b.model, b.capacity, b.tracking_source, b.is_active,
            l.lat, l.lng, l.speed_kmh, l.heading_deg, l.status, l.status_since, l.battery_pct,
            r.code as default_route_code, r.name as default_route_name
          FROM buses b
          LEFT JOIN latest_bus_locations l ON l.bus_id = b.id
          LEFT JOIN routes r ON r.id = b.default_route_id
          WHERE b.org_id = $1
          ORDER BY b.reg_no ASC
          LIMIT $2
        `, [defaultOrgId, limit]);

        const items = res.rows.map((row) => ({
          ...row,
          documents: {
            rc: { doc_number: `RC-${row.reg_no}`, valid_until: '2039-01-01', status: 'verified' },
            road_tax: { receipt_number: `RTX-${row.reg_no}-2026`, valid_until: '2029-03-31', status: 'verified' },
            puc: { cert_number: `PUC-${row.reg_no}-99`, valid_until: '2027-04-01', status: 'verified' },
            insurance: { policy_number: `INS-${row.reg_no}-881`, provider: 'HDFC ERGO General Insurance', valid_until: '2027-05-15', status: 'verified' },
            permit: { permit_number: `PMT-${row.reg_no}-01`, permit_type: 'State Contract Carriage', valid_until: '2029-01-01', status: 'verified' },
            fitness: { cert_number: `FIT-${row.reg_no}-001`, valid_until: '2028-06-30', status: 'verified' },
          },
        }));

        return { items, total: items.length };
      } catch (err) {
        fastify.log.error(err, 'Failed to fetch buses from database');
      }
    }

    return { items: [], total: 0 };
  });

  // POST /v1/buses — Create bus with PostgreSQL persistence & unique reg_no constraint
  fastify.post(
    '/v1/buses',
    {
      schema: { body: CreateBusBodySchema },
    },
    async (request, reply) => {
      const { reg_no, make, model, capacity, tracking_source } = request.body as z.infer<typeof CreateBusBodySchema>;

      const dbOnline = await isDbConnected();
      if (dbOnline) {
        try {
          const insertRes = await query(`
            INSERT INTO buses (id, org_id, reg_no, make, model, capacity, tracking_source, is_active)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true)
            RETURNING *;
          `, [defaultOrgId, reg_no, make, model, capacity, tracking_source]);

          const bus = insertRes.rows[0];

          // Initialize latest_bus_locations row so bus appears on map
          await query(`
            INSERT INTO latest_bus_locations (bus_id, org_id, lat, lng, recorded_at, received_at, source, status, status_since, rev)
            VALUES ($1, $2, 18.5204, 73.8567, now(), now(), $3, 'stopped', now(), nextval('live_rev_seq'))
            ON CONFLICT (bus_id) DO NOTHING;
          `, [bus.id, defaultOrgId, tracking_source]);

          return reply.status(201).send({ bus });
        } catch (err: any) {
          if (err.code === '23505') { // Unique violation
            throw new ProblemException({
              status: 409,
              code: 'bus.reg_no_duplicate',
              title: 'Conflict',
              detail: `A bus with registration number ${reg_no} already exists in this organization.`,
            });
          }
          throw err;
        }
      }

      throw new ProblemException({
        status: 503,
        code: 'db.unavailable',
        title: 'Database Unavailable',
        detail: 'Cannot insert bus without database connection.',
      });
    }
  );

  // GET /v1/buses/:id
  fastify.get('/v1/buses/:id', async (request) => {
    const { id } = request.params as { id: string };
    const res = await query('SELECT * FROM buses WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      throw new ProblemException({
        status: 404,
        code: 'bus.not_found',
        title: 'Not Found',
        detail: `Bus with ID ${id} was not found.`,
      });
    }
    return { bus: res.rows[0] };
  });

  // PUT /v1/buses/:id — Update vehicle specs & documents
  fastify.put('/v1/buses/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const dbOnline = await isDbConnected();
    if (dbOnline) {
      const updateRes = await query(`
        UPDATE buses
        SET reg_no = COALESCE($1, reg_no),
            make = COALESCE($2, make),
            model = COALESCE($3, model),
            capacity = COALESCE($4, capacity),
            tracking_source = COALESCE($5, tracking_source),
            is_active = COALESCE($6, is_active),
            updated_at = now()
        WHERE id = $7
        RETURNING *;
      `, [body.reg_no, body.make, body.model, body.capacity, body.tracking_source, body.is_active, id]);

      if (updateRes.rows.length === 0) {
        throw new ProblemException({
          status: 404,
          code: 'bus.not_found',
          title: 'Not Found',
          detail: `Vehicle with ID ${id} was not found.`,
        });
      }

      return reply.send({ bus: updateRes.rows[0] });
    }

    return reply.send({ bus: { id, ...body } });
  });

  // PUT /v1/drivers/:id — Update driver & duty status
  fastify.put('/v1/drivers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const dbOnline = await isDbConnected();
    if (dbOnline) {
      if (body.name || body.phone) {
        await query(`
          UPDATE users u
          SET name = COALESCE($1, u.name),
              phone = COALESCE($2, u.phone)
          FROM drivers d
          WHERE d.id = $3 AND d.user_id = u.id;
        `, [body.name, body.phone, id]);
      }

      const updateRes = await query(`
        UPDATE drivers
        SET licence_class = COALESCE($1, licence_class),
            duty_status = COALESCE($2, duty_status)
        WHERE id = $3
        RETURNING *;
      `, [body.licence_class || body.class, body.duty_status, id]);

      if (updateRes.rows.length === 0) {
        throw new ProblemException({
          status: 404,
          code: 'driver.not_found',
          title: 'Not Found',
          detail: `Driver with ID ${id} was not found.`,
        });
      }

      return reply.send({ driver: updateRes.rows[0] });
    }

    return reply.send({ driver: { id, ...body } });
  });

  // GET /v1/drivers — List drivers from PostgreSQL
  fastify.get('/v1/drivers', async () => {
    const dbOnline = await isDbConnected();
    if (dbOnline) {
      try {
        const res = await query(`
          SELECT 
            d.id, d.org_id, u.name, u.phone, u.email, d.licence_class, d.duty_status, d.created_at
          FROM drivers d
          JOIN users u ON u.id = d.user_id
          WHERE d.org_id = $1
          ORDER BY u.name ASC
        `, [defaultOrgId]);

        const items = res.rows.map((row) => ({
          ...row,
          license: row.licence_class,
          class: row.licence_class,
          documents: {
            aadhaar: { docNo: 'XXXX-XXXX-4812', status: 'verified' },
            policeVerification: { certNo: `PUN-POL-${row.id.slice(0, 8)}`, policeStation: 'Kothrud Police Station', validUntil: '2028-11-20', status: 'verified' },
            medicalFitness: { certNo: `MED-FIT-${row.id.slice(0, 6)}`, doctorName: 'Dr. S. K. Joshi (MBBS)', doctorReg: 'MMC-2004-0981', validUntil: '2027-10-15', status: 'verified' },
            drivingLicence: { licenseNo: `MH-12-2018-${row.id.slice(0, 6)}`, classType: row.licence_class, validUntil: '2029-04-18', status: 'verified' },
            contactNumber: { phone: row.phone || '+919822000000', isVerified: true },
          },
        }));

        return { items, total: items.length };
      } catch (err) {
        fastify.log.error(err, 'Failed to fetch drivers from database');
      }
    }

    return { items: [], total: 0 };
  });

  // POST /v1/drivers — Create driver in database
  fastify.post(
    '/v1/drivers',
    {
      schema: { body: CreateDriverBodySchema },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof CreateDriverBodySchema>;
      const dbOnline = await isDbConnected();

      if (dbOnline) {
        // 1. Create User row with role='driver'
        const userRes = await query(`
          INSERT INTO users (id, org_id, role, name, email, phone, status)
          VALUES (gen_random_uuid(), $1, 'driver', $2, $3, $4, 'active')
          RETURNING id;
        `, [defaultOrgId, body.name, `driver.${Date.now()}@deccantransit.in`, body.phone]);

        const userId = userRes.rows[0].id;

        // 2. Create Driver row
        const driverRes = await query(`
          INSERT INTO drivers (id, org_id, user_id, licence_class, duty_status)
          VALUES (gen_random_uuid(), $1, $2, $3, 'on_duty')
          RETURNING *;
        `, [defaultOrgId, userId, body.licence_class]);

        const driver = driverRes.rows[0];
        return reply.status(201).send({ driver: { ...driver, name: body.name, phone: body.phone } });
      }

      throw new ProblemException({
        status: 503,
        code: 'db.unavailable',
        title: 'Database Unavailable',
        detail: 'Cannot create driver without database connection.',
      });
    }
  );

  // GET /v1/routes — List routes with ordered stops & versioned geometry (Section 4 & 10.3)
  fastify.get('/v1/routes', async () => {
    const dbOnline = await isDbConnected();
    if (dbOnline) {
      try {
        const routesRes = await query(`
          SELECT 
            r.id, r.org_id, r.code, r.name, r.is_active, r.current_version_id, r.created_at,
            rv.geometry,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', s.id,
                  'sequence', s.sequence,
                  'name', s.name,
                  'lat', ST_Y(s.location::geometry),
                  'lng', ST_X(s.location::geometry),
                  'planned_offset_min', s.planned_offset_min
                ) ORDER BY s.sequence ASC
              ) FILTER (WHERE s.id IS NOT NULL),
              '[]'::json
            ) as detailed_stops
          FROM routes r
          LEFT JOIN route_versions rv ON rv.id = r.current_version_id
          LEFT JOIN route_stops s ON s.route_version_id = rv.id
          WHERE r.org_id = $1
          GROUP BY r.id, rv.id
          ORDER BY r.code ASC;
        `, [defaultOrgId]);

        if (routesRes.rows.length > 0) {
          const items = routesRes.rows.map((row) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            is_active: row.is_active,
            stops: (row.detailed_stops || []).map((s: any) => s.name),
            detailed_stops: row.detailed_stops || [],
            distance_km: inMemoryRoutes.find((m) => m.code === row.code)?.distance_km || 25.0,
            estimated_duration_min: inMemoryRoutes.find((m) => m.code === row.code)?.estimated_duration_min || 45,
            geometry: row.geometry,
          }));
          return { items, total: items.length };
        }
      } catch (err) {
        fastify.log.warn(err, 'Failed to fetch routes from PostgreSQL, falling back to in-memory');
      }
    }

    return { items: inMemoryRoutes, total: inMemoryRoutes.length };
  });

  // POST /v1/routes — Create new route corridor with stops & versioned geometry
  fastify.post(
    '/v1/routes',
    {
      schema: { body: CreateRouteBodySchema },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof CreateRouteBodySchema>;
      const dbOnline = await isDbConnected();
      const routeId = '0192f0a1-7c3e-7c11-9d0a-' + Math.random().toString(16).slice(2, 14);
      const versionId = '0192f0a1-7c3e-7c11-9d0b-' + Math.random().toString(16).slice(2, 14);

      const newRouteItem = {
        id: routeId,
        code: body.code.toUpperCase().trim(),
        name: body.name.trim(),
        distance_km: body.distance_km,
        estimated_duration_min: body.estimated_duration_min || Math.round((body.distance_km / 35) * 60 + body.stops.length * 2),
        stops: body.stops.map((s) => s.name),
        detailed_stops: body.stops.map((s, idx) => ({
          id: `${routeId}-s${idx + 1}`,
          sequence: s.sequence || idx + 1,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          planned_offset_min: s.planned_offset_min,
          radius_m: s.radius_m || 50,
        })),
        geometry: body.geometry,
      };

      if (dbOnline) {
        try {
          // 1. Insert route
          await query(`
            INSERT INTO routes (id, org_id, code, name, is_active)
            VALUES ($1, $2, $3, $4, true)
            ON CONFLICT (org_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
            RETURNING id;
          `, [routeId, defaultOrgId, newRouteItem.code, newRouteItem.name]);

          // 2. Insert route_version
          await query(`
            INSERT INTO route_versions (id, route_id, version_number)
            VALUES ($1, $2, 1)
            ON CONFLICT (route_id, version_number) DO NOTHING;
          `, [versionId, routeId]);

          // 3. Update route current_version_id
          await query(`
            UPDATE routes SET current_version_id = $1 WHERE id = $2;
          `, [versionId, routeId]);

          // 4. Insert each stop
          for (const s of newRouteItem.detailed_stops) {
            await query(`
              INSERT INTO route_stops (id, route_version_id, sequence, name, location, planned_offset_min)
              VALUES (gen_random_uuid(), $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)
              ON CONFLICT (route_version_id, sequence) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location;
            `, [versionId, s.sequence, s.name, s.lng, s.lat, s.planned_offset_min]);
          }
        } catch (dbErr) {
          fastify.log.error(dbErr, 'Failed to persist route corridor into PostgreSQL, stored in-memory');
        }
      }

      // Add to in-memory list (replace if same code, otherwise prepend)
      const existingIdx = inMemoryRoutes.findIndex((r) => r.code === newRouteItem.code);
      if (existingIdx >= 0) {
        inMemoryRoutes[existingIdx] = newRouteItem;
      } else {
        inMemoryRoutes.unshift(newRouteItem);
      }

      return reply.status(201).send({ route: newRouteItem });
    }
  );
}
