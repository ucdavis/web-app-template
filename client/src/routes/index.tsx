import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/')({
  component: App,
});

interface Forecast {
  date: string;
  summary: string;
  temperatureC: number;
  temperatureF: number;
}

function App() {
  const [forecasts, setForecasts] = useState<Forecast[]>();

  useEffect(() => {
    populateWeatherData();
  }, []);

  const contents =
    forecasts === undefined ? (
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
            {forecasts.map((forecast, index) => (
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

  async function populateWeatherData() {
    const response = await fetch('api/weatherforecast');
    const data = await response.json();
    setForecasts(data);
  }
}
