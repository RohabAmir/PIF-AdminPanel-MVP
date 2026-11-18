import { Role } from '@prisma/client';
import { hasPermission, Permission, ROLE_PERMISSIONS } from './permissions';

describe('RBAC matrix', () => {
  const can = (r: Role, p: Permission) => hasPermission(r, p);

  it('only Super Admin manages sites, users and reads logs', () => {
    for (const p of [Permission.SITES_MANAGE, Permission.USERS_MANAGE, Permission.LOGS_VIEW]) {
      expect(can(Role.SUPER_ADMIN, p)).toBe(true);
      expect(can(Role.ADMIN, p)).toBe(false);
      expect(can(Role.EDITOR, p)).toBe(false);
      expect(can(Role.VIEWER, p)).toBe(false);
    }
  });

  it('matches the documented CMS matrix', () => {
    expect(Object.values(Role).every((r) => can(r, Permission.CONTENT_READ))).toBe(true);
    expect(can(Role.EDITOR, Permission.CONTENT_WRITE)).toBe(true);
    expect(can(Role.VIEWER, Permission.CONTENT_WRITE)).toBe(false);
    expect(can(Role.EDITOR, Permission.CONTENT_PUBLISH)).toBe(false);
    expect(can(Role.ADMIN, Permission.CONTENT_PUBLISH)).toBe(true);
    expect(can(Role.EDITOR, Permission.SETTINGS_MANAGE)).toBe(false);
    expect(can(Role.EDITOR, Permission.LEADS_UPDATE)).toBe(true);
    expect(can(Role.EDITOR, Permission.LEADS_EXPORT)).toBe(false);
    expect(can(Role.ADMIN, Permission.LEADS_DELETE)).toBe(true);
  });

  it('every role can manage its own profile', () => {
    for (const r of Object.values(Role))
      expect(ROLE_PERMISSIONS[r]).toContain(Permission.PROFILE_SELF);
  });
});
