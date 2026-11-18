import type { Role } from './types';

/** Mirrors backend/src/common/permissions.ts. The backend is the source of truth — this only drives the UI. */
export const P = {
  SITES_MANAGE: 'sites:manage',
  USERS_MANAGE: 'users:manage',
  LOGS_VIEW: 'logs:view',
  CONTENT_READ: 'content:read',
  CONTENT_WRITE: 'content:write',
  CONTENT_PUBLISH: 'content:publish',
  CONTENT_DELETE: 'content:delete',
  SETTINGS_MANAGE: 'settings:manage',
  LEADS_UPDATE: 'leads:update',
  LEADS_DELETE: 'leads:delete',
  LEADS_EXPORT: 'leads:export',
  PROFILE_SELF: 'profile:self',
} as const;
export type Permission = (typeof P)[keyof typeof P];

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};
