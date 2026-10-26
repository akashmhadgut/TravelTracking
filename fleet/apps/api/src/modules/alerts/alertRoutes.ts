import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProblemException } from '@fleet/contracts';

const ResolveAlertSchema = z.object({
  note: z.string().min(3),
});

const inMemoryAlerts: any[] = [
  {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c5001',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    type: 'location_stale',
    severity: 'warning',
    status: 'open',
    bus_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a02',
    dedupe_key: 'stale:0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a02',
    message: 'Bus has stopped transmitting updates for > 60 seconds.',
    data: { last_fix_age_s: 75, last_battery: 72 },
    opened_at: '2026-10-26T05:25:00Z',
    acknowledged_by: null,
    acknowledged_at: null,
    resolved_by: null,
    resolved_at: null,
    auto_resolved: false,
  },
];

export async function alertRoutes(fastify: FastifyInstance) {
  // GET /v1/alerts — List alerts (Section 7.3)
  fastify.get('/v1/alerts', async () => {
    return {
      items: inMemoryAlerts,
      total: inMemoryAlerts.length,
    };
  });

  // POST /v1/alerts/:id/acknowledge (Section 6.2)
  fastify.post('/v1/alerts/:id/acknowledge', async (request) => {
    const { id } = request.params as { id: string };
    const alert = inMemoryAlerts.find((a) => a.id === id);

    if (!alert) {
      throw new ProblemException({
        status: 404,
        code: 'alert.not_found',
        title: 'Not Found',
        detail: `Alert ${id} not found.`,
      });
    }

    alert.status = 'acknowledged';
    alert.acknowledged_at = new Date().toISOString();
    return { alert };
  });

  // POST /v1/alerts/:id/resolve — Resolve with mandatory note (Section 6.2 & 7.3)
  fastify.post(
    '/v1/alerts/:id/resolve',
    {
      schema: { body: ResolveAlertSchema },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const alert = inMemoryAlerts.find((a) => a.id === id);

      if (!alert) {
        throw new ProblemException({
          status: 404,
          code: 'alert.not_found',
          title: 'Not Found',
          detail: `Alert ${id} not found.`,
        });
      }

      alert.status = 'resolved';
      alert.resolved_at = new Date().toISOString();
      return { alert };
    }
  );
}
