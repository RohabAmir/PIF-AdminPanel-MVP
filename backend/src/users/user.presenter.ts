import type { Site, User, UserSite } from '@prisma/client';
import { ROLE_PERMISSIONS } from '../common/permissions';

export type UserWithSites = User & { sites: (UserSite & { site: Site })[] };

export const USER_SITES_INCLUDE = {
  sites: { include: { site: true }, orderBy: { site: { name: 'asc' } } },
} as const;

export function presentSite(s: Site) {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    domain: s.domain,
    logoUrl: s.logoUrl,
    primaryColor: s.primaryColor,
    isActive: s.isActive,
  };
}

/** Public shape of a user — never includes hashes, lockout counters or token versions. */
export function presentUser(u: UserWithSites) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    mustChangePassword: u.mustChangePassword,
    avatarColor: u.avatarColor,
    lastLoginAt: u.lastLoginAt,
    tempPasswordExpiresAt: u.tempPasswordExpiresAt,
    lockedUntil: u.lockedUntil && u.lockedUntil > new Date() ? u.lockedUntil : null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    sites: u.sites.map((us) => presentSite(us.site)),
  };
}

export function presentMe(u: UserWithSites, allSites?: Site[]) {
  const base = presentUser(u);
  return {
    ...base,
    // Super Admins work on every website, so the site switcher lists them all.
    sites: allSites ? allSites.map(presentSite) : base.sites.filter((s) => s.isActive),
    permissions: [...ROLE_PERMISSIONS[u.role]],
  };
}
