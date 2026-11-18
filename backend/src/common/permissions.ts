import { Role } from '@prisma/client';

/** Fine-grained permissions. Roles map to permissions; guards only ever check permissions. */
export const Permission = {
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

export type Permission = (typeof Permission)[keyof typeof Permission];

const VIEWER: Permission[] = [Permission.CONTENT_READ, Permission.PROFILE_SELF];
const EDITOR: Permission[] = [...VIEWER, Permission.CONTENT_WRITE, Permission.LEADS_UPDATE];
const ADMIN: Permission[] = [
  ...EDITOR,
  Permission.CONTENT_PUBLISH,
  Permission.CONTENT_DELETE,
  Permission.SETTINGS_MANAGE,
  Permission.LEADS_DELETE,
  Permission.LEADS_EXPORT,
];
const SUPER_ADMIN: Permission[] = [
  ...ADMIN,
  Permission.SITES_MANAGE,
  Permission.USERS_MANAGE,
  Permission.LOGS_VIEW,
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN,
  ADMIN,
  EDITOR,
  VIEWER,
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
