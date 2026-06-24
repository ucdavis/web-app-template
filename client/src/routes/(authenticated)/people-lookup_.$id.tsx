import {
  PeopleDetailsPanel,
  type PeopleLookupResponse,
} from '@/shared/peopleLookupDetails.tsx';
import { fetchJson, HttpError } from '@/lib/api.ts';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/(authenticated)/people-lookup_/$id')({
  component: PeopleLookupDetail,
});

function PeopleLookupDetail() {
  const { id } = Route.useParams();
  const decodedId = decodeURIComponent(id);
  const detailQuery = useQuery({
    queryFn: ({ signal }) =>
      fetchJson<PeopleLookupResponse>(
        `/api/peoplelookup/detail/${encodeURIComponent(decodedId)}`,
        {},
        signal
      ),
    queryKey: ['people-lookup', 'detail', decodedId],
    staleTime: 5 * 60_000,
  });

  const result = detailQuery.data?.results[0];
  const error =
    detailQuery.error instanceof HttpError
      ? String(detailQuery.error.body || detailQuery.error.message)
      : detailQuery.error?.message;

  return (
    <div className="min-h-screen bg-base-100">
      <div className="absolute top-4 left-4 z-10">
        <Link className="btn btn-ghost btn-sm" to="/">
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          Lookup
        </Link>
      </div>

      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-2">
            <h1 className="text-4xl font-bold">Person Details</h1>
            <p className="text-base-content/70">
              Lookup details for{' '}
              <span className="font-medium">{decodedId}</span>
            </p>
          </header>

          {detailQuery.isLoading ? (
            <div className="flex items-center gap-3 rounded-lg border border-base-300 bg-base-100 p-6">
              <span className="loading loading-spinner loading-md"></span>
              <span>Loading person details...</span>
            </div>
          ) : null}

          {error ? (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          ) : null}

          {result && !result.found ? (
            <div className="alert alert-warning">
              <span>
                User not found
                {result.errorMessage ? `: ${result.errorMessage}` : '.'}
              </span>
            </div>
          ) : null}

          {result ? (
            <section className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="card-title text-2xl">
                      {result.fullName || result.searchValue || decodedId}
                    </h2>
                    {result.email ? (
                      <p className="text-base-content/70">{result.email}</p>
                    ) : null}
                  </div>
                  {result.kerbId ? (
                    <Link
                      className="btn btn-outline btn-sm"
                      params={{ id: result.kerbId }}
                      to="/people-lookup/$id"
                    >
                      Canonical Link
                    </Link>
                  ) : null}
                </div>

                <div className="mt-4">
                  <PeopleDetailsPanel
                    allowSensitiveInfo={
                      detailQuery.data?.allowSensitiveInfo ?? false
                    }
                    result={result}
                  />
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
