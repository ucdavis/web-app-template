import { fetchJson } from '../lib/api.ts';
import { useQuery } from '@tanstack/react-query';

export type User = { email: string; id: string; name: string; roles: string[] };

export const meQueryOptions = () => ({
  queryFn: async (): Promise<User> => {
    return await fetchJson<User>('/api/user/me');
  },
  queryKey: ['users', 'me'] as const,
  staleTime: 5 * 60_000, // 5 minutes
});

export const useMeQuery = () => {
  return useQuery(meQueryOptions());
};
