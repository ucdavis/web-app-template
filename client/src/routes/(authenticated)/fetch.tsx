import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { fetchJson } from '../../lib/api.ts';
import { DataTable } from '../../shared/dataTable.tsx';
import { ColumnDef } from '@tanstack/react-table';

// this route is at `/` and protected by the (authenticated) layout route
export const Route = createFileRoute('/(authenticated)/fetch')({
  component: Dashboard,
});

interface Forecast {
  date: string;
  summary: string;
  temperatureC: number;
  temperatureF: number;
}

const columns: ColumnDef<Forecast>[] = [
  {
    accessorKey: 'date',
    cell: (info) => info.getValue(),
    header: 'Date',
  },
  {
    accessorKey: 'temperatureC',
    cell: (info) => info.getValue(),
    header: 'Temp. (C)',
  },
  {
    accessorKey: 'temperatureF',
    cell: (info) => info.getValue(),
    header: 'Temp. (F)',
  },
  {
    accessorKey: 'summary',
    cell: (info) => info.getValue(),
    header: 'Summary',
  },
];

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
      <DataTable
        columns={columns}
        data={weatherQuery.data}
        initialState={{ pagination: { pageSize: 5 } }}
      />
    );

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Homepage Link */}
      <div className="absolute top-4 left-4 z-10">
        <Link className="btn btn-ghost btn-sm" to="/">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          Home
        </Link>
      </div>

      <div className="w-full max-w-1/2 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Weather forecast
          </h1>
          <p className="text-gray-600 mb-6">
            This component demonstrates fetching data from the server.
          </p>
          {contents}
        </div>
      </div>
    </div>
  );
}
