import { createFileRoute, Outlet } from '@tanstack/react-router';
import { RouterContext } from '../../main.tsx';
import { meQueryOptions } from '../../queries/user.ts';
import { UserProvider } from '@/shared/auth/UserContext.tsx';

export const Route = createFileRoute('/(authenticated)')({
  beforeLoad: async ({ context }: { context: RouterContext }) => {
    await context.queryClient.ensureQueryData(meQueryOptions());
  },
  component: () => (
    <UserProvider>
      <Outlet />
    </UserProvider>
  ),
});
