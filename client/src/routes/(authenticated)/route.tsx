import {
  createFileRoute,
  Outlet,
  ParsedLocation,
} from '@tanstack/react-router';
import { RouterContext } from '../../main.tsx';
import { meQueryOptions } from '../../queries/user.ts';

export const Route = createFileRoute('/(authenticated)')({
  beforeLoad: async ({
    context,
    location,
  }: {
    context: RouterContext;
    location: ParsedLocation;
  }) => {
    try {
      console.log('Loading (authenticated) route:', location.href);
      await context.queryClient.ensureQueryData(meQueryOptions());
      console.log('(authenticated) route loaded successfully');
    } catch (error) {
      console.error('Error loading (authenticated) route:', error);
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
