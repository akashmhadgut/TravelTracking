import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProblemException } from '@fleet/contracts';

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

const inMemoryTrips: any[] = [
  {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a10',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    route_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c2001',
    route_version_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c3001',
    bus_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a01',
    driver_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4d0001',
    status: 'in_progress',
    planned_start: '2026-10-26T05:00:00Z',
    planned_end: '2026-10-26T07:00:00Z',
    actual_start: '2026-10-26T05:05:00Z',
    actual_end: null,
    distance_m: 14250,
    delayed: false,
    delay_reason: null,
    cancel_reason: null,
    closed_by: null,
  },
];

export async function tripRoutes(fastify: FastifyInstance) {
  // GET /v1/trips — List trips with filter
  fastify.get('/v1/trips', async () => {
    return {
      items: inMemoryTrips,
      total: inMemoryTrips.length,
    };
  });

  // POST /v1/trips — Schedule trip (Section 6.3)
  fastify.post(
    '/v1/trips',
    {
      schema: { body: CreateTripBodySchema },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof CreateTripBodySchema>;

      const newTrip = {
        id: '0192f0a1-7c3e-7c11-9d0a-' + Math.random().toString(36).substring(2, 14),
        org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
        route_id: body.route_id,
        route_version_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c3001',
        bus_id: body.bus_id,
        driver_id: body.driver_id,
        status: 'scheduled',
        planned_start: body.planned_start,
        planned_end: body.planned_end,
        actual_start: null,
        actual_end: null,
        distance_m: 0,
        delayed: false,
        delay_reason: null,
        cancel_reason: null,
        closed_by: null,
      };

      inMemoryTrips.push(newTrip);
      return reply.status(201).send({ trip: newTrip });
    }
  );

  // POST /v1/driver/trips/:id/start — Driver begins trip (Section 6.3 & 9.6)
  fastify.post('/v1/driver/trips/:id/start', async (request) => {
    const { id } = request.params as { id: string };
    const trip = inMemoryTrips.find((t) => t.id === id);

    if (!trip) {
      throw new ProblemException({
        status: 404,
        code: 'trip.not_found',
        title: 'Trip Not Found',
        detail: `Trip ${id} does not exist.`,
      });
    }

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

    trip.status = 'in_progress';
    trip.actual_start = new Date().toISOString();
    return { trip };
  });

  // POST /v1/driver/trips/:id/end — Driver ends trip
  fastify.post('/v1/driver/trips/:id/end', async (request) => {
    const { id } = request.params as { id: string };
    const trip = inMemoryTrips.find((t) => t.id === id);

    if (!trip) {
      throw new ProblemException({
        status: 404,
        code: 'trip.not_found',
        title: 'Trip Not Found',
        detail: `Trip ${id} does not exist.`,
      });
    }

    trip.status = 'completed';
    trip.actual_end = new Date().toISOString();
    trip.closed_by = 'driver';
    return { trip };
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
      const trip = inMemoryTrips.find((t) => t.id === id);

      if (!trip) {
        throw new ProblemException({
          status: 404,
          code: 'trip.not_found',
          title: 'Trip Not Found',
          detail: `Trip ${id} does not exist.`,
        });
      }

      trip.status = 'completed';
      trip.actual_end = new Date().toISOString();
      trip.closed_by = 'admin';
      trip.cancel_reason = reason;

      return { trip };
    }
  );

  // GET /v1/trips/:id/replay — Downsampled replay points & timeline (Section 10.3)
  fastify.get('/v1/trips/:id/replay', async (request) => {
    const { id } = request.params as { id: string };
    const trip = inMemoryTrips.find((t) => t.id === id);

    if (!trip) {
      throw new ProblemException({
        status: 404,
        code: 'trip.not_found',
        title: 'Trip Not Found',
        detail: `Trip ${id} does not exist.`,
      });
    }

    // Downsampled points along route corridor for scrubber player
    const replayPoints = [
      { lat: 18.5204, lng: 73.8567, speed_kmh: 30, recorded_at: '2026-10-26T05:05:00Z' },
      { lat: 18.5245, lng: 73.8590, speed_kmh: 42, recorded_at: '2026-10-26T05:10:00Z' },
      { lat: 18.5290, lng: 73.8610, speed_kmh: 0, recorded_at: '2026-10-26T05:15:00Z' },
      { lat: 18.5350, lng: 73.8650, speed_kmh: 38, recorded_at: '2026-10-26T05:20:00Z' },
    ];

    return {
      trip_id: id,
      distance_m: trip.distance_m,
      points: replayPoints,
      stop_events: [
        { name: 'Swargate Terminal', arrived_at: '2026-10-26T05:05:00Z', departed_at: '2026-10-26T05:07:00Z' },
        { name: 'Shivajinagar Station', arrived_at: '2026-10-26T05:15:00Z', departed_at: '2026-10-26T05:17:00Z' },
      ],
      alerts: [],
    };
  });
}
