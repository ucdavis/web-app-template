import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { RouterContext } from '../main.tsx';
import { AnalyticsListener } from '@/shared/analytics/AnalyticsListener.tsx';

const RootLayout = () => (
  <>
    <AnalyticsListener />
    <Outlet />
    <ReactQueryDevtools buttonPosition="top-right" />
    <TanStackRouterDevtools position="bottom-right" />
  </>
);

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => <div>404 - Not Found!</div>,
});
