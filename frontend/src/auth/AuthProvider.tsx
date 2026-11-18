import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, refreshSession, setActiveSiteHeader, setSessionExpiredHandler, tokenStore, type SessionResponse } from '@/lib/api';
import type { Me } from '@/lib/types';
import type { Permission } from '@/lib/permissions';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  user: Me | null;
  setSession: (s: SessionResponse) => void;
  setUser: (u: Me) => void;
  reloadUser: () => Promise<void>;
  logout: (opts?: { silent?: boolean; everywhere?: boolean }) => Promise<void>;
  can: (p: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const CHANNEL = 'pif-admin-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<Me | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const channel = useRef<BroadcastChannel | null>(null);
  const locationRef = useRef(location);
  locationRef.current = location;

  const clearLocal = useCallback(() => {
    tokenStore.set(null);
    setActiveSiteHeader(null);
    setUserState(null);
    setStatus('anonymous');
    qc.clear();
  }, [qc]);

  // Restore the session from the httpOnly refresh cookie on first load.
  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then((s) => {
        if (cancelled) return;
        setUserState(s.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Session expiry mid-use (refresh failed): back to login, remembering where the user was.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearLocal();
      toast.error('Your session has expired. Please sign in again.', { id: 'session-expired' });
      const here = locationRef.current;
      navigate(`/login?returnTo=${encodeURIComponent(here.pathname + here.search)}`, { replace: true });
    });
    return () => setSessionExpiredHandler(null);
  }, [clearLocal, navigate]);

  // Logging out in one tab logs out every tab.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    channel.current = ch;
    ch.onmessage = (e: MessageEvent<{ type: string }>) => {
      if (e.data?.type === 'logout') {
        clearLocal();
        navigate('/login', { replace: true });
      }
    };
    return () => ch.close();
  }, [clearLocal, navigate]);

  const setSession = useCallback((s: SessionResponse) => {
    tokenStore.set(s.accessToken);
    setUserState(s.user);
    setStatus('authenticated');
  }, []);

  const reloadUser = useCallback(async () => {
    const { data } = await api.get<Me>('/auth/me');
    setUserState(data);
  }, []);

  const logout = useCallback(
    async (opts?: { silent?: boolean; everywhere?: boolean }) => {
      try {
        if (opts?.everywhere) await api.post('/auth/logout-all');
        else await api.post('/auth/logout');
      } catch {
        /* the local session is cleared regardless */
      }
      channel.current?.postMessage({ type: 'logout' });
      clearLocal();
      if (!opts?.silent) toast.success(opts?.everywhere ? 'Signed out of all sessions.' : 'You have been signed out.');
      navigate('/login', { replace: true });
    },
    [clearLocal, navigate],
  );

  const can = useCallback((p: Permission) => !!user?.permissions.includes(p), [user]);

  const value = useMemo(
    () => ({ status, user, setSession, setUser: setUserState, reloadUser, logout, can }),
    [status, user, setSession, reloadUser, logout, can],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
