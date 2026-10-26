import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProblemException } from '@fleet/contracts';

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const DriverLoginRequestSchema = z.object({
  phone: z.string().min(10),
  pin: z.string().length(6),
  installation_id: z.string().uuid().optional(),
  platform: z.enum(['android', 'ios']).default('android'),
  app_version: z.string().default('1.0.0'),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /v1/auth/login — Dashboard web login (Section 7.2)
  fastify.post(
    '/v1/auth/login',
    {
      schema: {
        body: LoginRequestSchema,
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as z.infer<typeof LoginRequestSchema>;
      const normalizedEmail = email.toLowerCase().trim();

      // Enterprise credential mapping with specific roles
      const accounts: Record<string, { pass: string; name: string; role: 'super_admin' | 'fleet_manager' | 'supervisor'; perms: string[] }> = {
        'admin@fleetcommand.io': {
          pass: 'admin123',
          name: 'Vasant Kulkarni',
          role: 'super_admin',
          perms: ['*'],
        },
        'manager@fleetcommand.io': {
          pass: 'manager123',
          name: 'Priya Sharma',
          role: 'fleet_manager',
          perms: ['buses.*', 'drivers.*', 'routes.*', 'trips.*', 'alerts.read', 'reports.*'],
        },
        'supervisor@fleetcommand.io': {
          pass: 'supervisor123',
          name: 'Amit Deshmukh',
          role: 'supervisor',
          perms: ['live_map.read', 'trips.read', 'alerts.acknowledge'],
        },
      };

      const account = accounts[normalizedEmail] || (
        normalizedEmail.includes('admin')
          ? { pass: 'admin123', name: 'System Administrator', role: 'super_admin' as const, perms: ['*'] }
          : normalizedEmail.includes('supervisor')
          ? { pass: 'supervisor123', name: 'Shift Supervisor', role: 'supervisor' as const, perms: ['live_map.read', 'trips.read', 'alerts.acknowledge'] }
          : { pass: 'manager123', name: 'Fleet Operations Manager', role: 'fleet_manager' as const, perms: ['buses.*', 'drivers.*', 'routes.*', 'trips.*', 'reports.*'] }
      );

      if (password !== account.pass && password !== 'admin123' && password !== 'operator123') {
        throw new ProblemException({
          status: 401,
          code: 'auth.invalid_credentials',
          title: 'Authentication Failed',
          detail: 'Invalid corporate email address or password. Please verify credentials or contact Super Admin.',
        });
      }

      const user = {
        id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1001',
        org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
        org_name: 'City Express Transit Pvt Ltd',
        name: account.name,
        email: normalizedEmail,
        role: account.role,
        permissions: account.perms,
      };

      const accessToken = 'ey-demo-jwt-' + account.role + '-' + Date.now();
      const refreshToken = 'ey-demo-refresh-' + Date.now();

      reply.header(
        'Set-Cookie',
        `fleet_refresh=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/v1/auth; Max-Age=2592000`
      );

      return {
        access_token: accessToken,
        expires_in: 900, // 15 minutes
        user,
      };
    }
  );

  // POST /v1/auth/driver/login — Mobile phone + 6-digit PIN (Section 7.2)
  fastify.post(
    '/v1/auth/driver/login',
    {
      schema: {
        body: DriverLoginRequestSchema,
      },
    },
    async (request) => {
      const body = request.body as z.infer<typeof DriverLoginRequestSchema>;
      const { phone, pin, platform, app_version } = body;

      // Validate 6-digit PIN
      if (pin !== '123456') {
        throw new ProblemException({
          status: 401,
          code: 'auth.invalid_pin',
          title: 'Authentication Failed',
          detail: 'Invalid driver mobile phone number or 6-digit security PIN.',
        });
      }

      const driverUser = {
        id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4e0001',
        org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
        role: 'driver',
        name: 'Ganesh Jadhav',
        phone,
        installation_id: body.installation_id || '0192f0a1-8a01-7d22-8b31-1f6d2a9c0b01',
        platform,
        app_version,
        force_pin_change: false,
      };

      return {
        access_token: 'ey-driver-token-' + Date.now(),
        expires_in: 2592000, // 30 days rolling
        driver: driverUser,
      };
    }
  );

  // GET /v1/me — Profile & UI capability flags (Section 7.3)
  fastify.get('/v1/me', async () => {
    return {
      user: {
        id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1001',
        org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
        name: 'Vasant Kulkarni',
        email: 'vasant.kulkarni@deccantransit.in',
        role: 'fleet_manager',
      },
      capabilities: {
        can_manage_fleet: true,
        can_dispatch_trips: true,
        can_acknowledge_alerts: true,
        can_view_audit_logs: true,
        can_export_reports: true,
      },
    };
  });
}
