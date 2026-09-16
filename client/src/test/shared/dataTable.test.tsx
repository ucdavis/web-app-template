import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DataTable } from '@/shared/dataTable.tsx';

afterEach(cleanup);

describe('data table keyboard controls', () => {
  it('sorts with the keyboard and exposes the sort direction', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={[{ accessorKey: 'name', header: 'Name' }]}
        data={[{ name: 'Zoe' }, { name: 'Ada' }]}
        globalFilter="none"
      />
    );

    await user.tab();
    expect(screen.getByRole('button', { name: 'Name' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('columnheader')).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    expect(
      within(screen.getAllByRole('row')[1]).getByRole('cell')
    ).toHaveTextContent('Ada');

    await user.keyboard(' ');
    expect(screen.getByRole('columnheader')).toHaveAttribute(
      'aria-sort',
      'descending'
    );
    expect(
      within(screen.getAllByRole('row')[1]).getByRole('cell')
    ).toHaveTextContent('Zoe');
  });

  it('provides named search and clear controls', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={[{ accessorKey: 'name', header: 'Name' }]}
        data={[{ name: 'Zoe' }, { name: 'Ada' }]}
      />
    );

    const search = screen.getByRole('textbox', { name: 'Search table' });
    await user.type(search, 'Ada');
    expect(screen.queryByRole('cell', { name: 'Zoe' })).not.toBeInTheDocument();
    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Clear table search' })
    ).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(search).toHaveValue('');
    expect(screen.getByRole('cell', { name: 'Zoe' })).toBeInTheDocument();
  });
});
