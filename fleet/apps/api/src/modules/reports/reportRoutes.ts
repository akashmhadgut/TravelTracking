import { FastifyInstance } from 'fastify';
import { ProblemException } from '@fleet/contracts';

const VALID_REPORT_TYPES = [
  'trip_summary',
  'distance_per_bus',
  'bus_utilization',
  'driver_history',
  'delays_and_stops',
  'gps_availability',
];

export async function reportRoutes(fastify: FastifyInstance) {
  // GET /v1/reports/:type — Multi-Report query (Section 11)
  fastify.get('/v1/reports/:type', async (request) => {
    const { type } = request.params as { type: string };

    if (!VALID_REPORT_TYPES.includes(type)) {
      throw new ProblemException({
        status: 400,
        code: 'report.invalid_type',
        title: 'Invalid Report Type',
        detail: `Report type must be one of: ${VALID_REPORT_TYPES.join(', ')}`,
      });
    }

    // Mock dataset matching Section 11 specifications
    if (type === 'trip_summary') {
      return {
        type,
        data: [
          {
            trip_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a10',
            bus_reg: 'MH-12-DT-0001',
            driver_name: 'Ganesh Jadhav',
            route_code: 'RT-501',
            status: 'completed',
            distance_km: 24.5,
            delay_minutes: 5,
            planned_start: '2026-10-26T05:00:00Z',
            actual_start: '2026-10-26T05:05:00Z',
          },
        ],
      };
    }

    if (type === 'gps_availability') {
      return {
        type,
        data: [
          {
            bus_reg: 'MH-12-DT-0001',
            points_received: 720,
            points_expected: 720,
            availability_pct: 100.0,
            weak_fixes_count: 2,
          },
        ],
      };
    }

    return {
      type,
      data: [],
      message: `Report for ${type} computed successfully.`,
    };
  });

  // POST /v1/reports/:type/exports — Background export job (Section 11)
  fastify.post('/v1/reports/:type/exports', async (request) => {
    const { type } = request.params as { type: string };

    if (!VALID_REPORT_TYPES.includes(type)) {
      throw new ProblemException({
        status: 400,
        code: 'report.invalid_type',
        title: 'Invalid Report Type',
        detail: `Report type must be one of: ${VALID_REPORT_TYPES.join(', ')}`,
      });
    }

    const exportId = 'exp-' + Date.now();
    return {
      export_id: exportId,
      status: 'queued',
      message: 'Export job initiated. Download link will be available once streaming finishes.',
      download_url: `/v1/exports/${exportId}`,
    };
  });

  // GET /v1/exports/:id
  fastify.get('/v1/exports/:id', async (request) => {
    const { id } = request.params as { id: string };
    return {
      export_id: id,
      status: 'completed',
      download_url: `https://storage.deccantransit.in/exports/${id}.csv?signed=true`,
      expires_in_hours: 24,
    };
  });
}
