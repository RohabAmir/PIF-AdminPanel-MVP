import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/api';
import { useSite } from '@/site/SiteProvider';

/** Site-scoped query: key = ['site', siteId, ...key]. */
export function useSiteQuery<T>(key: unknown[], fn: () => Promise<T>, opts?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>) {
  const { siteId } = useSite();
  return useQuery<T>({ queryKey: ['site', siteId, ...key], queryFn: fn, enabled: !!siteId && (opts?.enabled ?? true), ...opts });
}

/** Mutation with toast feedback and invalidation of site-scoped keys. */
export function useSiteMutation<TVars, TData = unknown>(
  fn: (v: TVars) => Promise<TData>,
  { success, invalidate = [], onSuccess, onError }: { success?: string | ((d: TData, v: TVars) => string); invalidate?: unknown[][]; onSuccess?: (d: TData, v: TVars) => void; onError?: (e: unknown) => void } = {},
) {
  const qc = useQueryClient();
  const { siteId } = useSite();
  return useMutation<TData, unknown, TVars>({
    mutationFn: fn,
    onSuccess: async (d, v) => {
      if (success) toast.success(typeof success === 'function' ? success(d, v) : success);
      await Promise.all(invalidate.map((k) => qc.invalidateQueries({ queryKey: ['site', siteId, ...k] })));
      onSuccess?.(d, v);
    },
    onError: (e) => {
      if (onError) onError(e);
      else toast.error(errorMessage(e));
    },
  });
}
