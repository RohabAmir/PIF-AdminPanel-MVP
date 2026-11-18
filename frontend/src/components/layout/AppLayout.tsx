import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Globe2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/auth/AuthProvider';
import { SiteProvider, useSite } from '@/site/SiteProvider';
import { EmptyState } from '@/components/ui/data';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const COLLAPSE_KEY = 'pif.sidebarCollapsed';
const SITE_FREE = ['/profile', '/sites', '/users', '/activity-logs'];

function Content() {
  const { site } = useSite();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const needsSite = !SITE_FREE.some((p) => pathname.startsWith(p));
  if (needsSite && !site) {
    return (
      <div className="card mt-2">
        <EmptyState
          icon={<Globe2 />}
          title="No websites assigned yet"
          description={
            user?.role === 'SUPER_ADMIN'
              ? 'Create your first website to start managing content.'
              : 'Ask a Super Admin to assign you to a website. Your profile is still available from the account menu.'
          }
        />
      </div>
    );
  }
  return <Outlet />;
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });

  return (
    <SiteProvider>
      <a href="#main" className="sr-only z-[100] rounded bg-white px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggle} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[72px]' : 'lg:pl-60')}>
        <Header onOpenMobile={() => setMobileOpen(true)} />
        <main id="main" className="flex-1 px-3 py-4 sm:px-5 sm:py-5" tabIndex={-1}>
          <Content />
        </main>
        <footer className="bg-white py-4 text-center text-xs text-muted shadow-footer">
          Copyright © {new Date().getFullYear()} <span className="font-semibold text-ink">PIF Admin Panel</span>. Demo project — all data is fictional.
        </footer>
      </div>
    </SiteProvider>
  );
}
