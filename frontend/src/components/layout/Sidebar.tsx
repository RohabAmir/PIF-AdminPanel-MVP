import { NavLink } from 'react-router-dom';
import { ChevronsLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import mark from '@/assets/brand/sidebar-logo.svg';
import strip from '@/assets/brand/sidebar-strip.svg';
import { NAV } from './nav';

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: Props) {
  const { can } = useAuth();
  const { site } = useSite();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || can(i.permission)) }))
    .filter((g) => g.items.length)
    .filter((g) => !g.siteScoped || site);

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-sidebar/50 lg:hidden" onClick={onCloseMobile} aria-hidden />}
      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar font-menu transition-[transform,width] duration-200',
          collapsed ? 'lg:w-[72px]' : 'lg:w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-white/10 px-4">
          <NavLink to="/dashboard" className={cn('flex flex-1 items-center justify-center', collapsed && 'lg:mx-auto')} onClick={onCloseMobile} aria-label="PIF Admin Panel — dashboard">
            {/* Original sidebar treatment: the four-mark logo strip; the single mark when collapsed. */}
            <img src={strip} alt="" className={cn('h-6 w-auto', collapsed && 'lg:hidden')} />
            <img src={mark} alt="" className={cn('hidden h-8 w-8', collapsed && 'lg:block')} />
          </NavLink>
          <button type="button" className="rounded-md p-1 text-sidebar-text hover:text-white lg:hidden" onClick={onCloseMobile} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g.label ?? 'main'} className="mb-4">
              {g.label && (
                <p className={cn('mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-text/60', collapsed && 'lg:hidden')}>
                  {g.siteScoped && site ? site.name : g.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {g.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.6px] font-medium transition-colors',
                          collapsed && 'lg:justify-center lg:px-0',
                          isActive ? 'bg-white/10 text-white' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-[#B79CF0]' : '')} aria-hidden />
                          <span className={cn('truncate', collapsed && 'lg:sr-only')}>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-white/10 p-3 lg:block">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-sidebar-text hover:bg-sidebar-hover hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronsLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>
    </>
  );
}
