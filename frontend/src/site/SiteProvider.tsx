import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setActiveSiteHeader } from '@/lib/api';
import type { SiteSummary } from '@/lib/types';
import { useAuth } from '@/auth/AuthProvider';

interface SiteContextValue {
  sites: SiteSummary[];
  site: SiteSummary | null;
  siteId: string | null;
  setSite: (id: string) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);
const storageKey = (userId: string) => `pif.activeSite.${userId}`;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Active website for every CMS screen. Persisted per user; sent as the X-Site-Id header. */
export function SiteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const sites = useMemo(() => user?.sites ?? [], [user]);
  const [selected, setSelected] = useState<string | null>(() => (user ? readStored(storageKey(user.id)) : null));

  const site = sites.find((s) => s.id === selected) ?? sites[0] ?? null;
  // Set synchronously so the very first query of a render already carries the right header.
  setActiveSiteHeader(site?.id ?? null);

  const setSite = useCallback(
    (id: string) => {
      if (!user || id === site?.id) return;
      try {
        localStorage.setItem(storageKey(user.id), id);
      } catch {
        /* private mode — selection simply isn't remembered */
      }
      setActiveSiteHeader(id);
      // Drop cached data of the previous site so nothing stale is ever shown.
      qc.removeQueries({ queryKey: ['site'] });
      setSelected(id);
    },
    [qc, site?.id, user],
  );

  const value = useMemo(() => ({ sites, site, siteId: site?.id ?? null, setSite }), [sites, site, setSite]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
  return ctx;
}

/** Query key helper: every CMS query is keyed by the active site. */
export function useSiteKey() {
  const { siteId } = useSite();
  return useCallback((...parts: unknown[]) => ['site', siteId, ...parts] as const, [siteId]);
}
