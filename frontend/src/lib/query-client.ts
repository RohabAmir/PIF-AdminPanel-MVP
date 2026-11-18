import { QueryClient } from '@tanstack/react-query';
import { errorStatus } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retry only transient failures (network / 5xx), never 4xx.
      retry: (count, err) => {
        const s = errorStatus(err);
        return (s === undefined || s >= 500) && count < 2;
      },
    },
    mutations: { retry: false },
  },
});
