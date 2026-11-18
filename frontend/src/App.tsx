import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, createRoutesFromElements, Navigate, Outlet, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/auth/AuthProvider';
import { TooltipProvider } from '@/components/ui/controls';
import { GuestRoute, ProtectedRoute, RoleGuard } from '@/auth/guards';
import { AppLayout } from '@/components/layout/AppLayout';
import { FullPageLoader } from '@/components/layout/FullPageLoader';
import { Skeleton } from '@/components/ui/data';
import { P } from '@/lib/permissions';
import { ForbiddenPage, NotFoundInline, NotFoundPage } from '@/pages/ErrorPages';
import { LoginPage } from '@/pages/auth/LoginPage';
import { VerifyOtpPage } from '@/pages/auth/VerifyOtpPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const PagesListPage = lazy(() => import('@/pages/cms/PagesListPage'));
const PageEditorPage = lazy(() => import('@/pages/cms/PageEditorPage'));
const BlogsListPage = lazy(() => import('@/pages/cms/BlogsListPage'));
const BlogEditorPage = lazy(() => import('@/pages/cms/BlogEditorPage'));
const FormsPage = lazy(() => import('@/pages/cms/FormsPage'));
const FormBuilderPage = lazy(() => import('@/pages/cms/FormBuilderPage'));
const LeadsPage = lazy(() => import('@/pages/cms/LeadsPage'));
const MediaPage = lazy(() => import('@/pages/cms/MediaPage'));
const SocialPage = lazy(() => import('@/pages/cms/SocialPage'));
const SeoPage = lazy(() => import('@/pages/cms/SeoPage'));
const SitesPage = lazy(() => import('@/pages/SitesPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const ActivityLogsPage = lazy(() => import('@/pages/ActivityLogsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const PlaygroundPage = lazy(() => import('@/pages/PlaygroundPage'));

function PageFallback() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading page">
      <Skeleton className="h-28 w-full rounded-card" />
      <Skeleton className="h-96 w-full rounded-card" />
    </div>
  );
}

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageFallback />}>{children}</Suspense>;

/** Providers that need router context (navigation inside auth handlers). */
function Root() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Suspense fallback={<FullPageLoader />}>
          <Outlet />
        </Suspense>
        <Toaster position="top-right" richColors closeButton toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }} />
      </TooltipProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Root />}>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      {/* Token reset (from email) and the forced first-login change share this route. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<S><DashboardPage /></S>} />
          <Route path="/pages" element={<S><PagesListPage /></S>} />
          <Route path="/pages/:id" element={<S><PageEditorPage /></S>} />
          <Route path="/blogs" element={<S><BlogsListPage /></S>} />
          <Route path="/blogs/new" element={<S><BlogEditorPage /></S>} />
          <Route path="/blogs/:id" element={<S><BlogEditorPage /></S>} />
          <Route path="/forms" element={<S><FormsPage /></S>} />
          <Route path="/forms/new" element={<S><FormBuilderPage /></S>} />
          <Route path="/forms/:id" element={<S><FormBuilderPage /></S>} />
          <Route path="/leads" element={<S><LeadsPage /></S>} />
          <Route path="/media" element={<S><MediaPage /></S>} />
          <Route path="/social" element={<S><SocialPage /></S>} />
          <Route path="/seo" element={<S><SeoPage /></S>} />
          <Route path="/sites" element={<RoleGuard permission={P.SITES_MANAGE}><S><SitesPage /></S></RoleGuard>} />
          <Route path="/users" element={<RoleGuard permission={P.USERS_MANAGE}><S><UsersPage /></S></RoleGuard>} />
          <Route path="/activity-logs" element={<RoleGuard permission={P.LOGS_VIEW}><S><ActivityLogsPage /></S></RoleGuard>} />
          <Route path="/api-playground" element={<RoleGuard permission={P.SETTINGS_MANAGE}><S><PlaygroundPage /></S></RoleGuard>} />
          <Route path="/profile" element={<S><ProfilePage /></S>} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundInline />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Route>,
  ),
);
