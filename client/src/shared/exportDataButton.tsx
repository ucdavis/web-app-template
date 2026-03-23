import { type CsvColumn, downloadExcelCsv, toExcelCsv } from '@/lib/csv.ts';

interface ExportDataButtonProps<T> {
  className?: string;
  columns: CsvColumn<T>[];
  data: T[];
  filename: string;
  label?: string;
}

export function ExportDataButton<T>({
  className = '',
  columns,
  data,
  filename,
  label = 'Export',
}: ExportDataButtonProps<T>) {
  const handleExport = () => {
    const csv = toExcelCsv(data, columns);
    downloadExcelCsv(csv, filename);
  };

  return (
    <button
      className={`btn btn-sm ${className}`.trim()}
      onClick={handleExport}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 16V4m0 12 4-4m-4 4-4-4M5 20h14"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
      {label}
    </button>
  );
}
