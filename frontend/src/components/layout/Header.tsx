import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Globe, LogOut, Menu as MenuIcon, UserCircle } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import { ROLE_LABEL } from '@/lib/permissions';
import { Avatar } from '@/components/ui/data';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu';

function SiteMark({ name, color, logoUrl }: { name: string; color: string; logoUrl: string | null }) {
  if (logoUrl) return <img src={logoUrl} alt="" className="h-6 w-6 rounded-md object-cover" />;
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white" style={{ backgroundColor: color }} aria-hidden>
      {name[0]?.toUpperCase()}
    </span>
  );
}

export function SiteSwitcher() {
  const { sites, site, setSite } = useSite();
  if (!site) return null;
  return (
    <Menu>
      <MenuTrigger
        className="flex max-w-[210px] items-center gap-2 rounded-lg border border-accent-border bg-white px-2.5 py-1.5 text-left hover:bg-accent-soft sm:max-w-[260px]"
        aria-label={`Active website: ${site.name}. Switch website`}
        data-testid="site-switcher"
      >
        <SiteMark name={site.name} color={site.primaryColor} logoUrl={site.logoUrl} />
        <span className="min-w-0">
          <span className="block text-[10px] font-medium uppercase leading-none tracking-wide text-muted">Website</span>
          <span className="block truncate text-[0.8125rem] font-semibold text-accent">{site.name}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </MenuTrigger>
      <MenuContent align="start" className="w-64">
        <MenuLabel>Switch website</MenuLabel>
        {sites.map((s) => (
          <MenuItem key={s.id} onSelect={() => setSite(s.id)}>
            <SiteMark name={s.name} color={s.primaryColor} logoUrl={s.logoUrl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{s.name}</span>
              <span className="block truncate text-[11px] text-muted">{s.domain ?? s.slug}{!s.isActive && ' · inactive'}</span>
            </span>
            {s.id === site.id && <Check className="h-4 w-4 text-primary" aria-label="Selected" />}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

export function Header({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-line bg-white px-4 sm:px-5">
      <button type="button" onClick={onOpenMobile} className="rounded-md p-1.5 text-accent hover:bg-accent-soft lg:hidden" aria-label="Open menu" aria-controls="app-sidebar">
        <MenuIcon className="h-5 w-5" />
      </button>
      <SiteSwitcher />
      <div className="ml-auto flex items-center gap-2">
        <Menu>
          <MenuTrigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-accent-soft" aria-label="Account menu" data-testid="user-menu">
            <Avatar name={user.name} color={user.avatarColor} />
            <span className="hidden text-left md:block">
              <span className="block text-[0.8125rem] font-semibold leading-tight text-ink">{user.name}</span>
              <span className="block text-[11px] leading-tight text-muted">{ROLE_LABEL[user.role]}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-muted md:block" aria-hidden />
          </MenuTrigger>
          <MenuContent>
            <div className="px-2.5 py-2">
              <p className="truncate text-[0.8125rem] font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
            <MenuSeparator />
            <MenuItem icon={<UserCircle />} onSelect={() => navigate('/profile')}>
              My profile
            </MenuItem>
            {user.role === 'SUPER_ADMIN' && (
              <MenuItem icon={<Globe />} onSelect={() => navigate('/sites')}>
                Manage websites
              </MenuItem>
            )}
            <MenuSeparator />
            <MenuItem icon={<LogOut />} danger onSelect={() => void logout()}>
              <span data-testid="logout">Sign out</span>
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </header>
  );
}

