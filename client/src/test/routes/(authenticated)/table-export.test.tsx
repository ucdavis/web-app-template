import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { downloadExcelCsv } from '@/lib/csv.ts';
import { server } from '@/test/mswUtils.ts';
import { renderRoute } from '@/test/routerUtils.tsx';

vi.mock('@/lib/csv.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/csv.ts')>();

  return {
    ...actual,
    downloadExcelCsv: vi.fn(),
  };
});

describe('table export route', () => {
  it('shows the filtered export action only when a filter is active', async () => {
    const forecasts = [
      {
        date: '2024-07-04',
        summary: 'Sunny',
        temperatureC: 25,
        temperatureF: 77,
      },
      {
        date: '2024-07-05',
        summary: 'Rainy',
        temperatureC: 16,
        temperatureF: 61,
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

    const { cleanup } = renderRoute({ initialPath: '/table-export' });

    try {
      expect(
        await screen.findByText('Weather forecast with export')
      ).toBeInTheDocument();
      expect(await screen.findByText('Sunny')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Export filtered' })
      ).not.toBeInTheDocument();

      fireEvent.input(screen.getByPlaceholderText('Search all columns...'), {
        target: { value: 'Sunny' },
      });

      expect(
        await screen.findByRole('button', { name: 'Export filtered' })
      ).toBeInTheDocument();
      expect(weatherRequestCount).toBe(1);
      expect(userRequestCount).toBe(1);
    } finally {
      cleanup();
    }
  });

  it('exports only filtered rows when the filtered export button is used', async () => {
    const forecasts = [
      {
        date: '2024-07-04',
        summary: 'Sunny',
        temperatureC: 25,
        temperatureF: 77,
      },
      {
        date: '2024-07-05',
        summary: 'Rainy',
        temperatureC: 16,
        temperatureF: 61,
      },
    ];

    server.use(
      http.get('/api/weatherforecast', () => HttpResponse.json(forecasts)),
      http.get('/api/user/me', () => HttpResponse.json({ id: 'user-1' }))
    );

    const downloadExcelCsvMock = vi.mocked(downloadExcelCsv);
    downloadExcelCsvMock.mockClear();

    const { cleanup } = renderRoute({ initialPath: '/table-export' });

    try {
      await screen.findByText('Weather forecast with export');
      await screen.findByText('Sunny');

      fireEvent.input(screen.getByPlaceholderText('Search all columns...'), {
        target: { value: 'Sunny' },
      });

      fireEvent.click(
        await screen.findByRole('button', { name: 'Export filtered' })
      );

      expect(downloadExcelCsvMock).toHaveBeenCalledTimes(1);

      const csv = downloadExcelCsvMock.mock.calls[0]?.[0];
      const filename = downloadExcelCsvMock.mock.calls[0]?.[1];

      expect(csv).toContain('Sunny');
      expect(csv).not.toContain('Rainy');
      expect(csv).toContain('07/04/2024');
      expect(filename).toBe('weather-forecast-filtered.csv');
    } finally {
      cleanup();
    }
  });
});
