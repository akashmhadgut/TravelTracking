import { create } from 'zustand';
import { apiFetch, ProblemError, type ProblemDetails } from '../services/apiClient';

export type UserRole = 'super_admin' | 'fleet_manager' | 'supervisor' | 'driver';

export interface AuthUser {
  id: string;
  org_id: string;
  org_name: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ProblemDetails | null;
  clearError: () => void;
  login: (email: string, pass: string) => Promise<void>;
  driverLogin: (phone: string, pin: string) => Promise<void>;
  logout: () => void;
  switchRoleDirect: (role: UserRole) => void;
}

const DEFAULT_USERS: Record<UserRole, AuthUser> = {
  super_admin: {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1001',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    org_name: 'City Express Transit Pvt Ltd',
    name: 'Vasant Kulkarni',
    email: 'admin@fleetcommand.io',
    role: 'super_admin',
    permissions: ['*'],
  },
  fleet_manager: {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1002',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    org_name: 'City Express Transit Pvt Ltd',
    name: 'Priya Sharma',
    email: 'manager@fleetcommand.io',
    role: 'fleet_manager',
    permissions: ['buses.*', 'drivers.*', 'routes.*', 'trips.*', 'alerts.read', 'reports.*'],
  },
  supervisor: {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1003',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    org_name: 'City Express Transit Pvt Ltd',
    name: 'Amit Deshmukh',
    email: 'supervisor@fleetcommand.io',
    role: 'supervisor',
    permissions: ['live_map.read', 'trips.read', 'alerts.acknowledge'],
  },
  driver: {
    id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4e0001',
    org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
    org_name: 'City Express Transit Pvt Ltd',
    name: 'Ganesh Jadhav',
    phone: '+919822001122',
    role: 'driver',
    permissions: ['trips.execute', 'location.broadcast'],
  },
};

// Check local storage for initial state
const storedUser = localStorage.getItem('fleet_user');
const storedToken = localStorage.getItem('fleet_token');

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : DEFAULT_USERS.fleet_manager,
  token: storedToken || 'ey-demo-jwt-token',
  isAuthenticated: true, // Default authenticated to Fleet Manager for immediate review, but can logout to test login screen
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email: string, pass: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{
        access_token: string;
        user: AuthUser;
      }>('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });

      localStorage.setItem('fleet_token', data.access_token);
      localStorage.setItem('fleet_user', JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      if (err instanceof ProblemError) {
        set({ error: err.problem, isLoading: false });
      } else {
        set({
          error: {
            type: 'urn:fleet:error:network',
            title: 'Connection Error',
            status: 0,
            detail: 'Unable to reach authentication server.',
            code: 'network.offline',
          },
          isLoading: false,
        });
      }
      throw err;
    }
  },

  driverLogin: async (phone: string, pin: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{
        access_token: string;
        driver: AuthUser;
      }>('/v1/auth/driver/login', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          pin,
          platform: 'android',
          app_version: '1.0.0',
        }),
      });

      localStorage.setItem('fleet_token', data.access_token);
      localStorage.setItem('fleet_user', JSON.stringify(data.driver));

      set({
        user: data.driver,
        token: data.access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      if (err instanceof ProblemError) {
        set({ error: err.problem, isLoading: false });
      } else {
        set({
          error: {
            type: 'urn:fleet:error:network',
            title: 'Connection Error',
            status: 0,
            detail: 'Unable to reach driver authentication service.',
            code: 'network.offline',
          },
          isLoading: false,
        });
      }
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('fleet_token');
    localStorage.removeItem('fleet_user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  switchRoleDirect: (role: UserRole) => {
    const newUser = DEFAULT_USERS[role];
    localStorage.setItem('fleet_token', `ey-demo-jwt-${role}`);
    localStorage.setItem('fleet_user', JSON.stringify(newUser));
    set({
      user: newUser,
      token: `ey-demo-jwt-${role}`,
      isAuthenticated: true,
      error: null,
    });
  },
}));
