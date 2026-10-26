import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'super_admin',
  'fleet_manager',
  'supervisor',
  'driver',
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const TripStatusSchema = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);
export type TripStatus = z.infer<typeof TripStatusSchema>;

export const BusStatusSchema = z.enum([
  'moving',
  'stopped',
  'stale',
  'offline',
  'not_on_trip',
]);
export type BusStatus = z.infer<typeof BusStatusSchema>;

export const AlertStatusSchema = z.enum([
  'open',
  'acknowledged',
  'resolved',
]);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

export const SeveritySchema = z.enum([
  'info',
  'warning',
  'critical',
]);
export type Severity = z.infer<typeof SeveritySchema>;

export const TrackingSourceSchema = z.enum([
  'phone',
  'device',
]);
export type TrackingSource = z.infer<typeof TrackingSourceSchema>;

export const PlatformSchema = z.enum([
  'android',
  'ios',
]);
export type Platform = z.infer<typeof PlatformSchema>;

export const ClosedBySchema = z.enum([
  'driver',
  'admin',
  'system',
]);
export type ClosedBy = z.infer<typeof ClosedBySchema>;
