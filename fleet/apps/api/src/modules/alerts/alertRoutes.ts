import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProblemException } from '@fleet/contracts';
import { query, isDbConnected } from '../../db.js';

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
    bus_reg: 'MH-12-DT-0002',
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
    const dbOnline = await isDbConnected();
    if (dbOnline) {
      try {
        const res = await query(`
          SELECT 
            a.id,
            a.org_id,
            a.type,
            a.severity,
            a.status,
            a.bus_id,
            COALESCE(b.reg_no, 'Unknown') as bus_reg,
            a.driver_id,
            a.trip_id,
            a.dedupe_key,
            a.message,
            a.data,
            a.opened_at,
            a.acknowledged_by,
            a.acknowledged_at,
            a.resolved_by,
            a.resolved_at,
            a.auto_resolved
          FROM alerts a
          LEFT JOIN buses b ON a.bus_id = b.id
          ORDER BY 
            CASE a.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
            a.opened_at DESC
          LIMIT 100;
        `);
        return {
          items: res.rows,
          total: res.rows.length,
        };
      } catch (err: any) {
        fastify.log.error(err, 'Failed to query alerts from PostgreSQL');
      }
    }

    return {
      items: inMemoryAlerts,
      total: inMemoryAlerts.length,
    };
  });

  // POST /v1/alerts/:id/acknowledge (Section 6.2)
  fastify.post('/v1/alerts/:id/acknowledge', async (request) => {
    const { id } = request.params as { id: string };
    const dbOnline = await isDbConnected();

    if (dbOnline) {
      const res = await query(
        `UPDATE alerts
         SET status = 'acknowledged', acknowledged_at = now()
         WHERE id = $1
         RETURNING *;`,
        [id]
      );

      if (res.rowCount === 0) {
        throw new ProblemException({
          status: 404,
          code: 'alert.not_found',
          title: 'Not Found',
          detail: `Alert ${id} not found.`,
        });
      }

      return { alert: res.rows[0] };
    }

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
      const { note } = request.body as { note: string };
      const dbOnline = await isDbConnected();

      if (dbOnline) {
        const res = await query(
          `UPDATE alerts
           SET status = 'resolved',
               resolved_at = now(),
               data = jsonb_set(COALESCE(data, '{}'::jsonb), '{resolution_note}', to_jsonb($2::text))
           WHERE id = $1
           RETURNING *;`,
          [id, note]
        );

        if (res.rowCount === 0) {
          throw new ProblemException({
            status: 404,
            code: 'alert.not_found',
            title: 'Not Found',
            detail: `Alert ${id} not found.`,
          });
        }

        return { alert: res.rows[0] };
      }

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
      alert.data = { ...(alert.data || {}), resolution_note: note };
      return { alert };
    }
  );
}
