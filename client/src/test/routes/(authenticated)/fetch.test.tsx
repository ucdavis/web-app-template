import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mswUtils.ts';
import { renderRoute } from '@/test/routerUtils.tsx';

describe('fetch route', () => {
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
