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
  login: (identifier: string, pass: string) => Promise<void>;
  driverLogin: (phone: string, pin: string) => Promise<void>;
  logout: () => void;
}

// Check local storage for initial state
const storedUser = typeof window !== 'undefined' ? localStorage.getItem('fleet_user') : null;
const storedToken = typeof window !== 'undefined' ? localStorage.getItem('fleet_token') : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken || null,
  isAuthenticated: Boolean(storedToken && storedUser),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (identifier: string, pass: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{
        access_token: string;
        user: AuthUser;
      }>('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, email: identifier, password: pass }),
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
        driver: {
          id: string;
          name: string;
          phone: string;
          role?: UserRole;
        };
      }>('/v1/auth/driver/login', {
        method: 'POST',
        body: JSON.stringify({ phone, pin }),
      });

      const driverUser: AuthUser = {
        id: data.driver.id,
        org_id: '0192f0a1-7c3e-7c11-9d0a-5e2b6f4c1000',
        org_name: 'Deccan City Transit Corporation',
        name: data.driver.name,
        phone: data.driver.phone,
        role: 'driver',
        permissions: ['trips.active', 'ingest.locations'],
      };

      localStorage.setItem('fleet_token', data.access_token);
      localStorage.setItem('fleet_user', JSON.stringify(driverUser));

      set({
        user: driverUser,
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

  logout: () => {
    localStorage.removeItem('fleet_token');
    localStorage.removeItem('fleet_user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
    apiFetch('/v1/auth/logout', { method: 'POST' }).catch(() => {});
  },
}));
