import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { fetchJson } from '../../lib/api.ts';

// this route is at `/` and protected by the (authenticated) layout route
export const Route = createFileRoute('/(authenticated)/')({
  component: Dashboard,
});

interface Forecast {
  date: string;
  summary: string;
  temperatureC: number;
  temperatureF: number;
}

function Dashboard() {
  // usually you would define the query in a separate file but this is just a demo page
  const weatherQuery = useQuery({
    queryFn: () => fetchJson<Forecast[]>('/api/weatherforecast'),
    queryKey: ['weather'],
    staleTime: 5 * 60_000, // 5 minutes
  });

  const contents =
    weatherQuery.data === undefined ? (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 italic">
            Loading... Please refresh once the ASP.NET backend has started. See{' '}
            <a
              className="text-blue-600 hover:text-blue-800 underline"
              href="https://aka.ms/jspsintegrationreact"
            >
              https://aka.ms/jspsintegrationreact
            </a>{' '}
            for more details.
          </p>
        </div>
      </div>
    ) : (
      <div className="overflow-x-auto shadow-lg rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Temp. (C)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Temp. (F)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Summary
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {weatherQuery.data?.map((forecast, index) => (
              <tr
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                key={forecast.date}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {forecast.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {forecast.temperatureC}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {forecast.temperatureF}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {forecast.summary}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Weather forecast
      </h1>
      <p className="text-gray-600 mb-6">
        This component demonstrates fetching data from the server.
      </p>
      {contents}
    </div>
  );
}
