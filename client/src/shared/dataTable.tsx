'use no memo';

import type { ReactNode } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  InitialTableState,
  type Table,
  useReactTable,
} from '@tanstack/react-table';

type TableActionsRenderer<TData extends object> =
  | ReactNode
  | ((table: Table<TData>) => ReactNode);

interface DataTableProps<TData extends object> {
  columns: ColumnDef<TData>[];
  data: TData[];
  filterPlaceholder?: string;
  globalFilter?: 'left' | 'right' | 'none'; // Controls the position of the search box
  initialState?: InitialTableState; // Optional initial state for the table, use for stuff like setting page size or sorting
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string | undefined;
  tableActions?: TableActionsRenderer<TData>;
}

export const DataTable = <TData extends object>({
  columns,
  data,
  filterPlaceholder = 'Search all columns...',
  globalFilter = 'right',
  initialState,
  onRowClick,
  rowClassName,
  tableActions,
}: DataTableProps<TData>) => {
  // see note in https://tanstack.com/table/latest/docs/installation#react-table.  Added "use no memo" just to be safe but it's unnecessary.
  // once tanstack updates their docs and makes sure it works w/ react compiler (even though we aren't using it yet), we can remove this comment
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(), // basic rendering
    getFilteredRowModel: getFilteredRowModel(), // enable filtering feature
    getPaginationRowModel: getPaginationRowModel(), // enable pagination calculations
    getSortedRowModel: getSortedRowModel(), // enable sorting feature
    initialState: {
      ...initialState,
    },
  });

  const filterControl =
    globalFilter === 'none' ? null : (
      <label className="input input-bordered flex items-center gap-2 w-full max-w-sm">
        <svg
          className="h-[1em] opacity-50"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </g>
        </svg>
        <input
          className="grow"
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          placeholder={filterPlaceholder}
          type="text"
          value={table.getState().globalFilter ?? ''}
        />
        {table.getState().globalFilter && (
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => table.setGlobalFilter('')}
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
        )}
      </label>
    );

  const resolvedTableActions =
    typeof tableActions === 'function' ? tableActions(table) : tableActions;

  const totalRowCount = data.length;
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const currentPageRowCount = table.getRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();
  const firstVisibleRow = filteredRowCount === 0 ? 0 : pageIndex * pageSize + 1;
  const lastVisibleRow = Math.min(
    pageIndex * pageSize + currentPageRowCount,
    filteredRowCount
  );
  const isFiltered = filteredRowCount !== totalRowCount;
  const pageSizeOptions = Array.from(new Set([pageSize, 10, 25, 50, 100])).sort(
    (a, b) => a - b
  );
  const toolbarItems =
    globalFilter === 'left'
      ? [filterControl, resolvedTableActions]
      : [resolvedTableActions, filterControl];
  const hasToolbar = toolbarItems.some(Boolean);

  return (
    <div className="space-y-4">
      {hasToolbar && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {toolbarItems.map((item, index) =>
            item ? <div key={index}>{item}</div> : null
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        {' '}
        {/* enables horizontal scroll on small screens */}
        <table className="table table-zebra w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    className="cursor-pointer"
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler?.()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {/* Add sort indicator if column is sorted */}
                    {header.column.getIsSorted() === 'asc'
                      ? ' (asc)'
                      : header.column.getIsSorted() === 'desc'
                        ? ' (desc)'
                        : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const resolvedRowClassName = [
                onRowClick ? 'cursor-pointer' : undefined,
                rowClassName?.(row.original),
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <tr
                  className={resolvedRowClassName || undefined}
                  key={row.id}
                  onClick={(event) => {
                    if (!onRowClick) {
                      return;
                    }

                    const target = event.target as HTMLElement;
                    if (target.closest('a, button, input, select, textarea')) {
                      return;
                    }

                    onRowClick(row.original);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-col gap-3 border-t border-base-300 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-base-content/70">
            <div>
              Showing {firstVisibleRow}-{lastVisibleRow} of {filteredRowCount}{' '}
              {isFiltered
                ? `filtered rows from ${totalRowCount} total`
                : 'rows'}
            </div>
            <div>
              Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <span className="text-base-content/70">Rows</span>
              <select
                className="select select-bordered select-xs w-20"
                onChange={(event) =>
                  table.setPageSize(Number(event.target.value))
                }
                value={pageSize}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <div className="join">
              <button
                aria-label="First page"
                className="btn btn-xs join-item"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.setPageIndex(0)}
                type="button"
              >
                First
              </button>
              <button
                aria-label="Previous page"
                className="btn btn-xs join-item"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                type="button"
              >
                Prev
              </button>
              <button
                aria-label="Next page"
                className="btn btn-xs join-item"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                type="button"
              >
                Next
              </button>
              <button
                aria-label="Last page"
                className="btn btn-xs join-item"
                disabled={!table.getCanNextPage()}
                onClick={() => table.setPageIndex(Math.max(pageCount - 1, 0))}
                type="button"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
