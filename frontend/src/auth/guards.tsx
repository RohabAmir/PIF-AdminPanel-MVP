import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '@/components/layout/FullPageLoader';
import type { Permission } from '@/lib/permissions';
import type { Role } from '@/lib/types';
import { useAuth } from './AuthProvider';

/** Requires a session. No protected content renders until the session is restored. */
export function ProtectedRoute() {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'anonymous' || !user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }
  if (user.mustChangePassword) return <Navigate to="/reset-password" replace />;
  return <Outlet />;
}

/** Auth screens bounce signed-in users to the dashboard. */
export function GuestRoute() {
  const { status, user } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated' && user) {
    return <Navigate to={user.mustChangePassword ? '/reset-password' : '/dashboard'} replace />;
  }
  return <Outlet />;
}

/** Route-level permission check: shows the 403 page instead of the screen. */
export function RoleGuard({ permission, roles, children }: { permission?: Permission; roles?: Role[]; children: ReactNode }) {
  const { can, user } = useAuth();
  const allowed = (!permission || can(permission)) && (!roles || (user && roles.includes(user.role)));
  if (!allowed) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

/** Hides UI the user may not use. UX only — the API enforces every permission. */
export function PermissionGate({ permission, children, fallback = null }: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useAuth();
  return <>{can(permission) ? children : fallback}</>;
}
