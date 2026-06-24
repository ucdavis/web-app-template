import { fetchJson, HttpError } from '@/lib/api.ts';
import { type CsvColumn } from '@/lib/csv.ts';
import { DataTable } from '@/shared/dataTable.tsx';
import { ExportDataButton } from '@/shared/exportDataButton.tsx';
import {
  PeopleDetailsPanel,
  type PeopleLookupResponse,
  type PeopleSearchResult,
  yesNo,
} from '@/shared/peopleLookupDetails.tsx';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useMemo,
  useState,
} from 'react';

export const Route = createFileRoute('/(authenticated)/people-lookup')({
  beforeLoad: () => {
    throw redirect({ to: '/' });
  },
  component: PeopleLookup,
});

type PeopleLookupSearchType =
  | 'email'
  | 'employeeId'
  | 'iamId'
  | 'kerb'
  | 'lastName'
  | 'ppsaDeptCode'
  | 'ppsId'
  | 'studentId';

interface PeopleLookupRequest {
  searchText: string;
  searchType: PeopleLookupSearchType;
}

interface PeopleLookupSearchOption {
  label: string;
  placeholder: string;
  sensitive?: boolean;
  value: PeopleLookupSearchType;
}

const standardSearchOptions: PeopleLookupSearchOption[] = [
  {
    label: 'Email',
    placeholder: 'Paste emails or Outlook text',
    value: 'email',
  },
  {
    label: 'Kerberos ID',
    placeholder: 'Paste Kerberos IDs separated by spaces, commas, or lines',
    value: 'kerb',
  },
  {
    label: 'IAM ID',
    placeholder: 'Paste IAM IDs',
    value: 'iamId',
  },
  {
    label: 'Last Name',
    placeholder: 'Paste last names',
    value: 'lastName',
  },
  {
    label: 'PPSA Department Code',
    placeholder: 'Paste PPSA department codes',
    value: 'ppsaDeptCode',
  },
];

const sensitiveSearchOptions: PeopleLookupSearchOption[] = [
  {
    label: 'Employee ID',
    placeholder: 'Paste employee IDs',
    sensitive: true,
    value: 'employeeId',
  },
  {
    label: 'Student ID',
    placeholder: 'Paste student IDs',
    sensitive: true,
    value: 'studentId',
  },
  {
    label: 'PPS ID',
    placeholder: 'Paste PPS IDs',
    sensitive: true,
    value: 'ppsId',
  },
];

const defaultSearchType: PeopleLookupSearchType = 'email';
const detectedLineLimit = 6;

const searchTypeLengthHints: Partial<Record<PeopleLookupSearchType, number[]>> =
  {
    employeeId: [8],
    iamId: [10],
    ppsId: [7],
    studentId: [9],
  };

const emailDetectionRegex = /\b[\w%+.-]+@[\d.a-z-]+\.[a-z]{2,}\b/i;
const tokenDetectionRegex =
  /[\w%+.-]+@[\d.a-z-]+\.[a-z]{2,}|[\da-z-]+/gi;

const standardCsvColumns: CsvColumn<PeopleSearchResult>[] = [
  { header: 'Search', key: 'searchValue' },
  { header: 'Found', key: 'found' },
  { header: 'Kerb Id', key: 'kerbId' },
  { header: 'IAM Id', key: 'iamId' },
  { header: 'Email', key: 'email' },
  { header: 'Full Name', key: 'fullName' },
  { header: 'Pronouns', key: 'pronouns' },
  { header: 'First Name', key: 'firstName' },
  { header: 'Last Name', key: 'lastName' },
  { header: 'Employee', key: 'isEmployee' },
  { header: 'Student', key: 'isStudent' },
  { header: 'Faculty', key: 'isFaculty' },
  { header: 'Staff', key: 'isStaff' },
  { header: 'HS Employee', key: 'isHsEmployee' },
  { header: 'External', key: 'isExternal' },
  { header: 'Roles', key: 'expandedAffiliation' },
  { header: 'Dept(s)', key: 'departments' },
  { header: 'Title(s)', key: 'title' },
  { header: 'Work Phone', key: 'workPhone' },
  { header: 'Errors', key: 'errorMessage' },
];

const sensitiveCsvColumns: CsvColumn<PeopleSearchResult>[] = [
  { header: 'Official Full Name', key: 'officialFullName' },
  { header: 'Mothra Id', key: 'mothraId' },
  { header: 'PPS Id', key: 'ppsId' },
  { header: 'Employee Id', key: 'employeeId' },
  { header: 'Student Id', key: 'studentId' },
  { header: 'Banner PIDM', key: 'bannerPidm' },
  { header: 'Other Emails', key: 'otherEmails' },
  { header: 'Reports To', key: 'reportsToIamId' },
  { header: 'Exception', key: 'exceptionMessage' },
];

function getDetailId(result: PeopleSearchResult) {
  return result.kerbId?.trim() ?? '';
}

function detectSearchTypeFromText(
  text: string,
  availableOptions: PeopleLookupSearchOption[]
) {
  const availableSearchTypes = new Set(
    availableOptions.map((option) => option.value)
  );
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, detectedLineLimit);

  if (lines.length === 0) {
    return null;
  }

  const sampleText = lines.join('\n');

  if (
    emailDetectionRegex.test(sampleText) &&
    availableSearchTypes.has('email')
  ) {
    return 'email';
  }

  const labeledSearchType = detectLabeledSearchType(
    sampleText,
    availableSearchTypes
  );

  if (labeledSearchType) {
    return labeledSearchType;
  }

  const tokens = lines.flatMap((line) => line.match(tokenDetectionRegex) ?? []);

  if (tokens.length === 0) {
    return null;
  }

  const numericSearchType = detectNumericSearchType(
    tokens,
    availableSearchTypes
  );

  if (numericSearchType) {
    return numericSearchType;
  }

  if (
    looksLikePpsaDepartmentCode(tokens) &&
    availableSearchTypes.has('ppsaDeptCode')
  ) {
    return 'ppsaDeptCode';
  }

  if (looksLikeLastNames(tokens) && availableSearchTypes.has('lastName')) {
    return 'lastName';
  }

  if (looksLikeKerbIds(tokens) && availableSearchTypes.has('kerb')) {
    return 'kerb';
  }

  return null;
}

function detectLabeledSearchType(
  text: string,
  availableSearchTypes: Set<PeopleLookupSearchType>
) {
  if (/\biam\b/i.test(text) && availableSearchTypes.has('iamId')) {
    return 'iamId';
  }

  if (
    /\b(emp|employee)\b/i.test(text) &&
    availableSearchTypes.has('employeeId')
  ) {
    return 'employeeId';
  }

  if (/\bstudent\b/i.test(text) && availableSearchTypes.has('studentId')) {
    return 'studentId';
  }

  if (/\bpps\b/i.test(text) && availableSearchTypes.has('ppsId')) {
    return 'ppsId';
  }

  if (
    /\b(dept|department|ppsa)\b/i.test(text) &&
    availableSearchTypes.has('ppsaDeptCode')
  ) {
    return 'ppsaDeptCode';
  }

  return null;
}

function detectNumericSearchType(
  tokens: string[],
  availableSearchTypes: Set<PeopleLookupSearchType>
) {
  const numericTokens = tokens.filter((token) => /^\d+$/.test(token));

  if (numericTokens.length === 0 || numericTokens.length < tokens.length / 2) {
    return null;
  }

  const sampleLengths = numericTokens.map((token) => token.length);
  const candidates = Object.entries(searchTypeLengthHints)
    .filter(([searchType]) =>
      availableSearchTypes.has(searchType as PeopleLookupSearchType)
    )
    .map(([searchType, lengths]) => ({
      matches: sampleLengths.filter((length) => lengths.includes(length))
        .length,
      searchType: searchType as PeopleLookupSearchType,
    }))
    .filter((candidate) => candidate.matches > 0)
    .sort((left, right) => right.matches - left.matches);

  if (candidates.length === 0) {
    return null;
  }

  if (
    candidates.length > 1 &&
    candidates[0].matches === candidates[1].matches
  ) {
    return null;
  }

  return candidates[0].searchType;
}

function looksLikePpsaDepartmentCode(tokens: string[]) {
  return (
    tokens.every((token) => /^[\da-z-]{2,20}$/i.test(token)) &&
    tokens.some((token) => /\d|-/.test(token))
  );
}

function looksLikeLastNames(tokens: string[]) {
  return (
    tokens.every((token) => /^[a-z]['a-z-]{1,49}$/i.test(token)) &&
    tokens.some((token) => token.length > 10 || /^[A-Z]['a-z-]+$/.test(token))
  );
}

function looksLikeKerbIds(tokens: string[]) {
  return tokens.every((token) => /^[\da-z]{2,10}$/i.test(token));
}

function hasLookupIssue(result: PeopleSearchResult) {
  return (
    !result.found ||
    Boolean(result.errorMessage?.trim()) ||
    Boolean(result.exceptionMessage?.trim())
  );
}

function OpenDetailPageLink({
  className = 'btn btn-primary',
  kerbId,
}: {
  className?: string;
  kerbId: string;
}) {
  return (
    <Link
      className={className}
      params={{ id: kerbId }}
      rel="noopener noreferrer"
      target="_blank"
      to="/people-lookup/$id"
    >
      Open Detail Page
    </Link>
  );
}
export function PeopleLookup() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedSearchType, setSelectedSearchType] =
    useState<PeopleLookupSearchType>(defaultSearchType);
  const [singleLookup, setSingleLookup] = useState('');
  const [selectedResult, setSelectedResult] =
    useState<PeopleSearchResult | null>(null);

  const optionsQuery = useQuery({
    queryFn: ({ signal }) =>
      fetchJson<PeopleLookupResponse>('/api/peoplelookup/options', {}, signal),
    queryKey: ['people-lookup', 'options'],
    staleTime: 5 * 60_000,
  });

  const lookupMutation = useMutation({
    mutationFn: (value: PeopleLookupRequest) =>
      fetchJson<PeopleLookupResponse>('/api/peoplelookup/search', {
        body: JSON.stringify(value),
        method: 'POST',
      }),
  });

  const allowSensitiveInfo =
    lookupMutation.data?.allowSensitiveInfo ??
    optionsQuery.data?.allowSensitiveInfo ??
    false;
  const searchOptions = useMemo(
    () =>
      allowSensitiveInfo
        ? [...standardSearchOptions, ...sensitiveSearchOptions]
        : standardSearchOptions,
    [allowSensitiveInfo]
  );
  const activeSearchType = searchOptions.some(
    (option) => option.value === selectedSearchType
  )
    ? selectedSearchType
    : defaultSearchType;
  const selectedSearchOption =
    searchOptions.find((option) => option.value === activeSearchType) ??
    standardSearchOptions[0];
  const results = lookupMutation.data?.results ?? [];
  const searchTextValue = searchText.trim();
  const singleLookupValue = singleLookup.trim();
  const csvColumns = allowSensitiveInfo
    ? [...standardCsvColumns, ...sensitiveCsvColumns]
    : standardCsvColumns;

  const columns = useMemo<ColumnDef<PeopleSearchResult>[]>(
    () => [
      {
        accessorKey: 'searchValue',
        header: 'Search',
      },
      {
        accessorKey: 'found',
        cell: ({ getValue }) => yesNo(getValue<boolean>()),
        header: 'Found',
      },
      {
        accessorKey: 'kerbId',
        header: 'Kerb Id',
      },
      {
        accessorKey: 'iamId',
        header: 'IAM Id',
      },
      {
        accessorKey: 'email',
        header: 'Email',
      },
      {
        accessorKey: 'fullName',
        header: 'Full Name',
      },
      {
        accessorKey: 'isStudent',
        cell: ({ getValue }) => yesNo(getValue<boolean>()),
        header: 'Student',
      },
      {
        accessorKey: 'isFaculty',
        cell: ({ getValue }) => yesNo(getValue<boolean>()),
        header: 'Faculty',
      },
      {
        accessorKey: 'isStaff',
        cell: ({ getValue }) => yesNo(getValue<boolean>()),
        header: 'Staff',
      },
      {
        accessorKey: 'departments',
        header: 'Dept(s)',
      },
      {
        accessorKey: 'title',
        header: 'Title(s)',
      },
      {
        accessorKey: 'errorMessage',
        header: 'Errors',
      },
    ],
    []
  );

  const openSingleLookup = () => {
    if (!singleLookupValue) {
      return;
    }

    void navigate({
      params: { id: singleLookupValue },
      to: '/people-lookup/$id',
    });
  };

  const submitLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    lookupMutation.mutate({
      searchText: searchTextValue,
      searchType: activeSearchType,
    });
  };

  const detectSearchTypeForPaste = (
    event: ClipboardEvent<HTMLTextAreaElement>
  ) => {
    const detectedSearchType = detectSearchTypeFromText(
      event.clipboardData.getData('text'),
      searchOptions
    );

    if (detectedSearchType) {
      setSelectedSearchType(detectedSearchType);
    }
  };

  const submitSingleLookup = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    openSingleLookup();
  };

  const mutationError =
    lookupMutation.error instanceof HttpError
      ? String(lookupMutation.error.body || lookupMutation.error.message)
      : lookupMutation.error?.message;

  return (
    <div className="min-h-screen bg-base-100">
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="space-y-3">
            <h1 className="text-4xl font-bold">Bulk User Lookup</h1>
            <p className="max-w-3xl text-base-content/70">
              Choose what to search, paste the values, and submit the lookup.
              Email mode can accept Outlook text and will extract email
              addresses automatically.
            </p>
          </header>

          <section className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <form
                className="space-y-6"
                onKeyDown={(event) => {
                  if (event.ctrlKey && event.key === 'Enter') {
                    event.currentTarget.requestSubmit();
                  }
                }}
                onSubmit={submitLookup}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(16rem,0.34fr)_1fr]">
                  <label className="form-control w-full">
                    <span className="label-text mb-2 font-medium">
                      Search For
                    </span>
                    <select
                      className="select select-bordered w-full"
                      onChange={(event) =>
                        setSelectedSearchType(
                          event.target.value as PeopleLookupSearchType
                        )
                      }
                      value={activeSearchType}
                    >
                      {searchOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-control w-full">
                    <span className="label-text mb-2 font-medium">Values</span>
                    <textarea
                      className="textarea textarea-bordered min-h-36 w-full"
                      onChange={(event) => setSearchText(event.target.value)}
                      onPaste={detectSearchTypeForPaste}
                      placeholder={selectedSearchOption.placeholder}
                      value={searchText}
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="btn btn-primary"
                      disabled={lookupMutation.isPending || !searchTextValue}
                      type="submit"
                    >
                      {lookupMutation.isPending ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : null}
                      Lookup Users
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setSearchText('');
                        setSelectedSearchType(defaultSearchType);
                        lookupMutation.reset();
                        setSelectedResult(null);
                      }}
                      type="button"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-base-300 pt-3 sm:flex-row sm:items-center lg:border-t-0 lg:border-l lg:pl-4 lg:pt-0">
                    <span className="text-sm font-medium whitespace-nowrap text-base-content/70">
                      Single user
                    </span>
                    <div className="join w-full sm:w-auto">
                      <input
                        aria-label="Single user lookup"
                        className="input input-bordered join-item w-full sm:w-64"
                        onChange={(event) =>
                          setSingleLookup(event.target.value)
                        }
                        onKeyDown={submitSingleLookup}
                        placeholder="Kerberos ID or email"
                        type="text"
                        value={singleLookup}
                      />
                      <button
                        className="btn btn-outline join-item"
                        disabled={!singleLookupValue}
                        onClick={openSingleLookup}
                        type="button"
                      >
                        Open Details
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </section>

          {mutationError ? (
            <div className="alert alert-error">
              <span>{mutationError}</span>
            </div>
          ) : null}

          {lookupMutation.data?.message ? (
            <div className="alert alert-info">
              <span>{lookupMutation.data.message}</span>
            </div>
          ) : null}

          {lookupMutation.data ? (
            <section className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Results</h2>
                <p className="text-sm text-base-content/70">
                  Use the table search to filter visible rows, open Details for
                  the full row, or export all current results.
                </p>
              </div>

              <DataTable
                columns={columns}
                data={results}
                filterPlaceholder="Search results..."
                globalFilter="left"
                initialState={{ pagination: { pageSize: 25 } }}
                onRowClick={setSelectedResult}
                rowClassName={(result) =>
                  hasLookupIssue(result)
                    ? '[&>td]:!bg-error/15 [&>td]:text-base-content [&>td:first-child]:border-l-4 [&>td:first-child]:border-error hover:[&>td]:!bg-error/20'
                    : undefined
                }
                tableActions={(table) => {
                  const hasActiveFilter =
                    String(table.getState().globalFilter ?? '').trim() !== '';
                  const filteredRows = table
                    .getFilteredRowModel()
                    .rows.map((row) => row.original);

                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <ExportDataButton
                        columns={csvColumns}
                        data={results}
                        filename="people-lookup.csv"
                      />
                      {hasActiveFilter ? (
                        <ExportDataButton
                          columns={csvColumns}
                          data={filteredRows}
                          filename="people-lookup-filtered.csv"
                          label="Export filtered"
                        />
                      ) : null}
                    </div>
                  );
                }}
              />
            </section>
          ) : null}
        </div>
      </main>

      {selectedResult ? (
        <PersonDetailsModal
          allowSensitiveInfo={allowSensitiveInfo}
          onClose={() => setSelectedResult(null)}
          result={selectedResult}
        />
      ) : null}
    </div>
  );
}

function PersonDetailsModal({
  allowSensitiveInfo,
  onClose,
  result,
}: {
  allowSensitiveInfo: boolean;
  onClose: () => void;
  result: PeopleSearchResult;
}) {
  const detailKerbId = getDetailId(result);

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Person Details</h3>
            <p className="text-sm text-base-content/70">
              {result.fullName || result.searchValue || 'Lookup result'}
            </p>
          </div>
          <button
            aria-label="Close details"
            className="btn btn-ghost btn-sm btn-circle shrink-0"
            onClick={onClose}
            type="button"
          >
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <PeopleDetailsPanel
            allowSensitiveInfo={allowSensitiveInfo}
            result={result}
          />
        </div>

        <div className="modal-action">
          {detailKerbId ? <OpenDetailPageLink kerbId={detailKerbId} /> : null}
          <button className="btn" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
      <button
        aria-label="Close details overlay"
        className="modal-backdrop"
        onClick={onClose}
        type="button"
      />
    </div>
  );
}
