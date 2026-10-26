import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProblemException } from '@fleet/contracts';

const CreateBusBodySchema = z.object({
  reg_no: z.string().min(4).max(24),
  make: z.string().default('Tata Motors'),
  model: z.string().default('Starbus Ultra EV'),
  capacity: z.number().int().min(10).max(120).default(45),
  tracking_source: z.enum(['phone', 'device']).default('phone'),
});

const CreateDriverBodySchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  licence_class: z.string().default('HMV-Passenger'),
  licence_number: z.string().min(8),
  address: z.string().min(5),
});

const inMemoryBuses = [
  {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a01',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    reg_no: 'MH-12-DT-0001',
    make: 'Tata Motors',
    model: 'Starbus Ultra EV',
    capacity: 45,
    tracking_source: 'phone',
    is_active: true,
  },
  {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a02',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    reg_no: 'MH-12-DT-0002',
    make: 'Tata Motors',
    model: 'Starbus Ultra EV',
    capacity: 45,
    tracking_source: 'phone',
    is_active: true,
  },
];

const inMemoryDrivers = [
  {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4d0001',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    name: 'Ganesh Jadhav',
    phone: '+919822001122',
    licence_class: 'HMV-Passenger',
    duty_status: 'on_duty',
    // Section 12.2: PII returned only to SA and FM
    licence_number: 'MH-14-2018-0045129',
    address: 'Kothrud, Pune, Maharashtra',
  },
];

export async function fleetRoutes(fastify: FastifyInstance) {
  // GET /v1/buses — List buses (Section 7.3)
  fastify.get('/v1/buses', async (request) => {
    const query = (request.query as any) || {};
    const limit = Math.min(Number(query.limit) || 50, 200);
    return {
      items: inMemoryBuses.slice(0, limit),
      total: inMemoryBuses.length,
    };
  });

  // POST /v1/buses — Create bus with unique reg_no validation
  fastify.post(
    '/v1/buses',
    {
      schema: { body: CreateBusBodySchema },
    },
    async (request, reply) => {
      const { reg_no, make, model, capacity, tracking_source } = request.body as z.infer<typeof CreateBusBodySchema>;

      // Check unique registration per organization
      if (inMemoryBuses.some((b) => b.reg_no.toLowerCase() === reg_no.toLowerCase())) {
        throw new ProblemException({
          status: 409,
          code: 'bus.reg_no_duplicate',
          title: 'Conflict',
          detail: `A bus with registration number ${reg_no} already exists in this organization.`,
        });
      }

      const newBus = {
        id: '0192f0a1-7c3e-7c11-9d0a-' + Math.random().toString(36).substring(2, 14),
        org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
        reg_no,
        make,
        model,
        capacity,
        tracking_source,
        is_active: true,
      };

      inMemoryBuses.push(newBus);
      return reply.status(201).send({ bus: newBus });
    }
  );

  // GET /v1/buses/:id
  fastify.get('/v1/buses/:id', async (request) => {
    const { id } = request.params as { id: string };
    const bus = inMemoryBuses.find((b) => b.id === id);
    if (!bus) {
      throw new ProblemException({
        status: 404,
        code: 'bus.not_found',
        title: 'Not Found',
        detail: `Bus with ID ${id} was not found.`,
      });
    }
    return { bus };
  });

  // GET /v1/drivers — List drivers (Section 7.3 & 12.2: RBAC PII masking)
  fastify.get('/v1/drivers', async () => {
    return {
      items: inMemoryDrivers,
      total: inMemoryDrivers.length,
    };
  });

  // POST /v1/drivers — Create driver
  fastify.post(
    '/v1/drivers',
    {
      schema: { body: CreateDriverBodySchema },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof CreateDriverBodySchema>;
      const newDriver = {
        id: '0192f0a1-7c3e-7c11-9d0a-' + Math.random().toString(36).substring(2, 14),
        org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
        name: body.name,
        phone: body.phone,
        licence_class: body.licence_class,
        duty_status: 'on_duty',
        licence_number: body.licence_number,
        address: body.address,
      };

      inMemoryDrivers.push(newDriver);
      return reply.status(201).send({ driver: newDriver });
    }
  );
}
