import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mswUtils.ts';
import { renderRoute } from '@/test/routerUtils.tsx';

describe('fetch route', () => {
  it('renders the not-authorized state when the signed-in user is forbidden', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const consoleWarn = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    let weatherRequestCount = 0;

    server.use(
      http.get('/api/user/me', () => new HttpResponse(null, { status: 403 })),
      http.get('/api/weatherforecast', () => {
        weatherRequestCount += 1;
        return HttpResponse.json([]);
      })
    );

    let cleanup: () => void = () => undefined;

    try {
      ({ cleanup } = renderRoute({ initialPath: '/fetch' }));
      expect(
        await screen.findByRole('heading', { name: 'Access unavailable' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'You are signed in, but your account is not authorized to use this application.'
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Weather forecast' })
      ).not.toBeInTheDocument();
      expect(weatherRequestCount).toBe(0);
    } finally {
      consoleError.mockRestore();
      consoleWarn.mockRestore();
      cleanup();
    }
  });

  it('renders weather data returned by the API', async () => {
    // arrange
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
    const { cleanup } = renderRoute({ initialPath: '/fetch' });

    // Assert the rendered output
    try {
      expect(await screen.findByText('Weather forecast')).toBeInTheDocument();
      expect(await screen.findByText('Sunny')).toBeInTheDocument();
      expect(weatherRequestCount).toBe(1);
      expect(userRequestCount).toBe(1);
    } finally {
      cleanup();
    }
  });
});
