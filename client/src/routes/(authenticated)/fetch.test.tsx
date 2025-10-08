import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen.ts';
import { describe } from 'node:test';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

const server = setupServer();

function renderFetchRoute() {
  // TODO: move into shared
  const queryClient = new QueryClient();
  const router = createRouter({
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ['/fetch'] }),
    routeTree,
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return { queryClient, router };
}

// TODO: move into shared
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('fetch route', () => {
  it('renders weather data returned by the API', async () => {
    // arrange
    // todo: use types
    const forecasts = [
      {
        date: '2024-07-04',
        summary: 'Sunny',
        temperatureC: 25,
      },
    ];

    let weatherRequestCount = 0;
    let userRequestCount = 0;
    server.use(
      http.get('/api/weatherforecast', () => {
        weatherRequestCount += 1;
        return HttpResponse.json(forecasts);
      }),
      http.get('/api/user/me', () => {
        userRequestCount += 1;
        return HttpResponse.json({ id: 'user-1' });
      })
    );

    // act
    const { queryClient } = renderFetchRoute();

    // Assert the rendered output
    try {
      expect(await screen.findByText('Weather forecast')).toBeInTheDocument();
      expect(await screen.findByText('Sunny')).toBeInTheDocument();
      expect(weatherRequestCount).toBe(1);
      expect(userRequestCount).toBe(1);
    } finally {
      queryClient.clear();
    }
  });
});
