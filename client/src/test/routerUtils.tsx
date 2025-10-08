import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen.ts';
import { render } from '@testing-library/react';

export interface RenderRouteOptions {
  /** Initial entries for the memory history */
  initialEntries?: string[];
  /** Initial route path to navigate to */
  initialPath?: string;
  /** Custom QueryClient instance (optional) */
  queryClient?: QueryClient;
}

export interface RenderRouteResult {
  /** Function to cleanup the QueryClient after test */
  cleanup: () => void;
  /** The QueryClient instance used */
  queryClient: QueryClient;
  /** The router instance */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: any;
}

/**
 * Utility function to render routes with TanStack Router and React Query setup
 * This provides a consistent testing environment for route components
 */
export function renderRoute(
  options: RenderRouteOptions = {}
): RenderRouteResult {
  const {
    initialPath = '/',
    initialEntries = [initialPath],
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
        queries: {
          retry: false, // Disable retries in tests
        },
      },
    }),
  } = options;

  const router = createRouter({
    context: { queryClient },
    history: createMemoryHistory({ initialEntries }),
    routeTree,
  });

  const { unmount } = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return {
    cleanup: () => {
      queryClient.clear();
      unmount();
    },
    queryClient,
    router,
  };
}
