import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { z } from 'zod';
import { useAppForm } from '@/shared/forms/formContext.tsx';

afterEach(cleanup);

function ExampleForm() {
  const form = useAppForm({
    defaultValues: { name: '', role: '' },
    validators: {
      onChange: z.object({
        name: z.string().min(2, 'Name must have two characters'),
        role: z.string(),
      }),
    },
  });

  return (
    <form>
      <form.AppField name="name">
        {(field) => <field.TextField label="Name" />}
      </form.AppField>
      <form.AppField name="role">
        {(field) => (
          <field.SelectField
            label="Role"
            options={[{ label: 'User', value: 'user' }]}
          />
        )}
      </form.AppField>
    </form>
  );
}

describe('shared form controls', () => {
  it('associates labels and validation errors with their controls', async () => {
    const user = userEvent.setup();
    render(<ExampleForm />);

    const name = screen.getByRole('textbox', { name: 'Name' });
    await user.type(name, 'x');
    await user.tab();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Name must have two characters');

    const role = screen.getByRole('combobox', { name: 'Role' });
    await user.selectOptions(role, 'user');
    expect(role).toHaveValue('user');

    await user.type(name, 'y');
    expect(name).not.toHaveAttribute('aria-invalid');
    expect(name).not.toHaveAttribute('aria-describedby');
  });

  it('uses distinct control IDs when forms share field names', () => {
    render(
      <>
        <ExampleForm />
        <ExampleForm />
      </>
    );
    const names = screen.getAllByRole('textbox', { name: 'Name' });
    expect(names[0].id).not.toBe(names[1].id);
  });
});
