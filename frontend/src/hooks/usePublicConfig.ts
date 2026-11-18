import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PublicConfig } from '@/lib/types';

export function usePublicConfig() {
  return useQuery({
    queryKey: ['public-config'],
    queryFn: async () => (await api.get<PublicConfig>('/meta/config')).data,
    staleTime: Infinity,
  });
}
