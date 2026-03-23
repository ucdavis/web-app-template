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
  tableActions?: TableActionsRenderer<TData>;
}

export const DataTable = <TData extends object>({
  columns,
  data,
  filterPlaceholder = 'Search all columns...',
  globalFilter = 'right',
  initialState,
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
                      ? ' 🔼'
                      : header.column.getIsSorted() === 'desc'
                        ? ' 🔽'
                        : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {/* (Optional) Pagination controls */}
        <div className="flex justify-end space-x-2 py-2">
          <button
            className="btn btn-xs"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </button>
          <button
            className="btn btn-xs"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
