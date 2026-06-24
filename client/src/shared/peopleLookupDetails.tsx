import { useState } from 'react';

export interface PeopleSearchResult {
  bannerPidm?: string | null;
  departments?: string | null;
  email?: string | null;
  employeeId?: string | null;
  errorMessage?: string | null;
  exceptionMessage?: string | null;
  expandedAffiliation?: string | null;
  firstName?: string | null;
  found: boolean;
  fullName?: string | null;
  iamId?: string | null;
  isEmployee: boolean;
  isExternal: boolean;
  isFaculty: boolean;
  isHsEmployee: boolean;
  isStaff: boolean;
  isStudent: boolean;
  kerbId?: string | null;
  lastName?: string | null;
  mothraId?: string | null;
  officialFullName?: string | null;
  otherEmails?: string | null;
  ppsId?: string | null;
  pronouns?: string | null;
  reportsToIamId?: string | null;
  searchValue?: string | null;
  studentId?: string | null;
  title?: string | null;
  workPhone?: string | null;
}

export interface PeopleLookupResponse {
  allowSensitiveInfo: boolean;
  message?: string | null;
  results: PeopleSearchResult[];
}

type DetailGroup =
  | 'contact'
  | 'diagnostics'
  | 'identity'
  | 'sensitive'
  | 'work';
type ResultBooleanKey =
  | 'isEmployee'
  | 'isExternal'
  | 'isFaculty'
  | 'isHsEmployee'
  | 'isStaff'
  | 'isStudent';

export const detailFields: Array<{
  group: DetailGroup;
  key: keyof PeopleSearchResult;
  label: string;
  sensitive?: boolean;
}> = [
  { group: 'identity', key: 'searchValue', label: 'Search' },
  { group: 'identity', key: 'kerbId', label: 'Kerb Id' },
  { group: 'identity', key: 'iamId', label: 'IAM Id' },
  {
    group: 'identity',
    key: 'officialFullName',
    label: 'Official Full Name',
    sensitive: true,
  },
  { group: 'identity', key: 'pronouns', label: 'Pronouns' },
  { group: 'identity', key: 'firstName', label: 'First Name' },
  { group: 'identity', key: 'lastName', label: 'Last Name' },
  { group: 'contact', key: 'email', label: 'Email' },
  {
    group: 'contact',
    key: 'otherEmails',
    label: 'Other Emails',
    sensitive: true,
  },
  { group: 'contact', key: 'workPhone', label: 'Work Phone' },
  { group: 'work', key: 'expandedAffiliation', label: 'Roles' },
  { group: 'work', key: 'departments', label: 'Dept(s)' },
  { group: 'work', key: 'title', label: 'Title(s)' },
  {
    group: 'sensitive',
    key: 'bannerPidm',
    label: 'Banner PIDM',
    sensitive: true,
  },
  {
    group: 'sensitive',
    key: 'employeeId',
    label: 'Employee Id',
    sensitive: true,
  },
  { group: 'sensitive', key: 'mothraId', label: 'Mothra Id', sensitive: true },
  { group: 'sensitive', key: 'ppsId', label: 'PPS Id', sensitive: true },
  {
    group: 'sensitive',
    key: 'reportsToIamId',
    label: 'Reports To',
    sensitive: true,
  },
  {
    group: 'sensitive',
    key: 'studentId',
    label: 'Student Id',
    sensitive: true,
  },
  { group: 'diagnostics', key: 'errorMessage', label: 'Errors' },
  {
    group: 'diagnostics',
    key: 'exceptionMessage',
    label: 'Exception',
    sensitive: true,
  },
];

const affiliationFields: Array<{
  key: ResultBooleanKey;
  label: string;
}> = [
  { key: 'isEmployee', label: 'Employee' },
  { key: 'isFaculty', label: 'Faculty' },
  { key: 'isStaff', label: 'Staff' },
  { key: 'isStudent', label: 'Student' },
  { key: 'isHsEmployee', label: 'HS Employee' },
  { key: 'isExternal', label: 'External' },
];

const detailGroupLabels: Record<DetailGroup, string> = {
  contact: 'Contact',
  diagnostics: 'Diagnostics',
  identity: 'Identity',
  sensitive: 'Sensitive Identifiers',
  work: 'Work Details',
};

const detailGroupOrder: DetailGroup[] = [
  'identity',
  'contact',
  'work',
  'sensitive',
  'diagnostics',
];

export function PeopleDetailsPanel({
  allowSensitiveInfo,
  result,
}: {
  allowSensitiveInfo: boolean;
  result: PeopleSearchResult;
}) {
  const visibleFields = detailFields
    .filter((field) => allowSensitiveInfo || !field.sensitive)
    .map((field) => ({
      ...field,
      value: formatValue(result[field.key]),
    }))
    .filter((field) => field.value !== '');
  const activeAffiliations = affiliationFields.filter(
    (field) => result[field.key]
  );
  const hasDetails = visibleFields.length > 0 || activeAffiliations.length > 0;

  if (!hasDetails) {
    return (
      <div className="rounded-lg border border-base-300 bg-base-200/40 p-4 text-sm text-base-content/70">
        No additional details are available for this person.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {activeAffiliations.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
            Affiliations
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeAffiliations.map((field) => (
              <span
                className="badge badge-primary badge-outline"
                key={field.key}
              >
                {field.label}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {detailGroupOrder.map((group) => {
        const fields = visibleFields.filter((field) => field.group === group);

        if (fields.length === 0) {
          return null;
        }

        return (
          <section className="space-y-2" key={group}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
              {detailGroupLabels[group]}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {fields.map((field) => (
                <DetailValue
                  key={field.key}
                  label={field.label}
                  value={field.value}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="group rounded-lg border border-base-300 bg-base-200/30 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-base-content/50">
            {label}
          </div>
          <div className="mt-1 break-words text-sm font-medium text-base-content">
            {value}
          </div>
        </div>
        <CopyValueButton label={label} value={value} />
      </div>
    </div>
  );
}

function CopyValueButton({ label, value }: { label: string; value: string }) {
  const [status, setStatus] = useState<'copied' | 'failed' | 'idle'>('idle');
  const title =
    status === 'copied'
      ? 'Copied'
      : status === 'failed'
        ? 'Copy failed'
        : `Copy ${label}`;

  const copy = async () => {
    try {
      await copyText(value);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <button
      aria-label={title}
      className="btn btn-ghost btn-xs btn-circle opacity-70 transition-opacity group-hover:opacity-100 focus:opacity-100"
      onBlur={() => setStatus('idle')}
      onClick={copy}
      onMouseLeave={() => setStatus('idle')}
      title={title}
      type="button"
    >
      {status === 'copied' ? (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 13l4 4L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V7Z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
          <path
            d="M16 5V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      )}
    </button>
  );
}

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';

  document.body.append(textArea);
  textArea.focus();
  textArea.select();

  try {
    if (!document.execCommand('copy')) {
      throw new Error('Copy command was unsuccessful.');
    }
  } finally {
    textArea.remove();
  }
}

export function yesNo(value: boolean | null | undefined) {
  return value ? 'Yes' : 'No';
}

export function formatValue(value: unknown) {
  if (typeof value === 'boolean') {
    return yesNo(value);
  }

  if (value === null || value === undefined || value === '') {
    return '';
  }

  return String(value);
}
