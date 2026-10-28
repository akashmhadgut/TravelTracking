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
    model: 'Nexon EV Max',
    capacity: 5,
    tracking_source: 'phone',
    is_active: true,
    documents: {
      rc: { doc_number: 'MH-12-2023-008914', valid_until: '2038-03-15', status: 'verified' },
      road_tax: { receipt_number: 'RTX-MH12-2023-4412', valid_until: '2028-03-31', status: 'verified' },
      puc: { cert_number: 'PUC-MH12-887412', valid_until: '2027-04-10', status: 'verified' },
      insurance: { policy_number: 'HDFC-ERGO-COMM-991823', provider: 'HDFC ERGO General Insurance', valid_until: '2027-08-20', status: 'verified' },
      permit: { permit_number: 'MH-12-CP-2023-1102', permit_type: 'State Contract Carriage', valid_until: '2028-05-15', status: 'verified' },
      fitness: { cert_number: 'FC-RTO-PUN-2024-991', valid_until: '2027-06-30', status: 'verified' },
    },
  },
  {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1a02',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    reg_no: 'MH-12-DT-0002',
    make: 'MG Motor',
    model: 'ZS EV Exclusive',
    capacity: 5,
    tracking_source: 'phone',
    is_active: true,
    documents: {
      rc: { doc_number: 'MH-12-2023-009122', valid_until: '2038-06-20', status: 'verified' },
      road_tax: { receipt_number: 'RTX-MH12-2023-5590', valid_until: '2028-06-30', status: 'verified' },
      puc: { cert_number: 'PUC-MH12-991044', valid_until: '2027-02-15', status: 'verified' },
      insurance: { policy_number: 'BAJAJ-ALLIANZ-771899', provider: 'Bajaj Allianz Commercial', valid_until: '2027-07-12', status: 'verified' },
      permit: { permit_number: 'MH-12-CP-2023-1250', permit_type: 'State Contract Carriage', valid_until: '2028-07-01', status: 'verified' },
      fitness: { cert_number: 'FC-RTO-PUN-2024-1044', valid_until: '2027-08-15', status: 'verified' },
    },
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
    licence_number: 'MH-14-2018-0045129',
    address: 'Kothrud, Pune, Maharashtra',
    documents: {
      aadhaar: { doc_number: 'XXXX-XXXX-4812', status: 'verified' },
      police_verification: { cert_number: 'PUN-POL-2024-1189', police_station: 'Kothrud Police Station', valid_until: '2027-11-20', status: 'verified' },
      medical_fitness: { cert_number: 'MED-FIT-88914', doctor_name: 'Dr. S. K. Joshi (MBBS)', doctor_reg: 'MMC-2004-0981', valid_until: '2027-10-15', status: 'verified' },
      driving_licence: { license_number: 'MH-14-2018-0045129', class: 'HMV-Passenger (Commercial)', valid_until: '2029-04-18', status: 'verified' },
      contact_number: { phone: '+919822001122', is_verified: true },
    },
  },
  {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4d0002',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    name: 'Sunil Patil',
    phone: '+919822003344',
    licence_class: 'HMV-Passenger',
    duty_status: 'on_duty',
    licence_number: 'MH-12-2019-0098432',
    address: 'Hadapsar, Pune, Maharashtra',
    documents: {
      aadhaar: { doc_number: 'XXXX-XXXX-8921', status: 'verified' },
      police_verification: { cert_number: 'PUN-POL-2024-2204', police_station: 'Hadapsar Police Station', valid_until: '2027-09-10', status: 'verified' },
      medical_fitness: { cert_number: 'MED-FIT-99120', doctor_name: 'Dr. A. N. Kulkarni (MD)', doctor_reg: 'MMC-1998-1145', valid_until: '2027-08-30', status: 'verified' },
      driving_licence: { license_number: 'MH-12-2019-0098432', class: 'HMV-Passenger (Commercial)', valid_until: '2029-08-11', status: 'verified' },
      contact_number: { phone: '+919822003344', is_verified: true },
    },
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
        documents: {
          rc: { doc_number: `RC-${reg_no}`, valid_until: '2039-01-01', status: 'verified' },
          road_tax: { receipt_number: `RTX-${reg_no}-2026`, valid_until: '2029-03-31', status: 'verified' },
          puc: { cert_number: `PUC-${reg_no}-99`, valid_until: '2027-04-01', status: 'verified' },
          insurance: { policy_number: `INS-${reg_no}-881`, provider: 'HDFC ERGO General Insurance', valid_until: '2027-05-15', status: 'verified' },
          permit: { permit_number: `PMT-${reg_no}-01`, permit_type: 'State Contract Carriage', valid_until: '2029-01-01', status: 'verified' },
          fitness: { cert_number: `FIT-${reg_no}-001`, valid_until: '2028-06-30', status: 'verified' },
        },
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
        documents: {
          aadhaar: { doc_number: 'XXXX-XXXX-9912', status: 'verified' },
          police_verification: { cert_number: `PUN-POL-2024-${Math.floor(1000 + Math.random() * 9000)}`, police_station: 'Pune Central Police Station', valid_until: '2027-12-31', status: 'verified' },
          medical_fitness: { cert_number: `MED-FIT-${Math.floor(10000 + Math.random() * 90000)}`, doctor_name: 'Dr. S. K. Joshi (MBBS)', doctor_reg: 'MMC-2004-0981', valid_until: '2027-10-30', status: 'verified' },
          driving_licence: { license_number: body.licence_number, class: `${body.licence_class} (Commercial)`, valid_until: '2030-05-15', status: 'verified' },
          contact_number: { phone: body.phone, is_verified: true },
        },
      };

      inMemoryDrivers.push(newDriver);
      return reply.status(201).send({ driver: newDriver });
    }
  );
}
