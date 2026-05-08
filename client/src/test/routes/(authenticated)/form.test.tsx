import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mswUtils.ts';
import { renderRoute } from '@/test/routerUtils.tsx';

describe('form route', () => {
  it('submits the contact profile example with Zod-validated values', async () => {
    mockCurrentUser();

    const { cleanup } = renderRoute({ initialPath: '/form' });

    try {
      expect(
        await screen.findByText('TanStack Form with Zod validation')
      ).toBeInTheDocument();

      fireEvent.input(screen.getByPlaceholderText('Enter first name'), {
        target: { value: 'Ada' },
      });
      fireEvent.input(screen.getByPlaceholderText('Enter last name'), {
        target: { value: 'Lovelace' },
      });
      fireEvent.input(screen.getByPlaceholderText('person@example.edu'), {
        target: { value: 'ada@example.edu' },
      });

      fireEvent.click(
        screen.getByRole('button', { name: 'Save Contact Profile' })
      );

      expect(await screen.findByText(/"firstName": "Ada"/)).toBeInTheDocument();
      expect(screen.getByText(/"lastName": "Lovelace"/)).toBeInTheDocument();
      expect(screen.getByText(/"role": "User"/)).toBeInTheDocument();
    } finally {
      cleanup();
    }
  });

  it('renders Zod errors and submits the project request example', async () => {
    mockCurrentUser();

    const { cleanup } = renderRoute({ initialPath: '/form' });

    try {
      await screen.findByText('Project Request');

      fireEvent.click(
        screen.getByRole('button', { name: 'Submit Project Request' })
      );

      expect(
        await screen.findByText('Project name must be at least 3 characters')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Confirm the request is ready to send')
      ).toBeInTheDocument();

      fireEvent.input(
        screen.getByPlaceholderText('Research portal refresh'),
        {
          target: { value: 'Farm enrollment portal' },
        }
      );
      fireEvent.input(screen.getByPlaceholderText('owner@example.edu'), {
        target: { value: 'owner@example.edu' },
      });
      fireEvent.input(screen.getByPlaceholderText('The team needs...'), {
        target: {
          value:
            'The team needs an authenticated portal for enrollment review.',
        },
      });
      fireEvent.click(
        screen.getByRole('checkbox', {
          name: 'I have reviewed the request details',
        })
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Submit Project Request' })
      );

      expect(
        await screen.findByText(/"projectName": "Farm enrollment portal"/)
      ).toBeInTheDocument();
      expect(screen.getByText(/"acceptedTerms": true/)).toBeInTheDocument();
    } finally {
      cleanup();
    }
  });
});

function mockCurrentUser() {
  server.use(
    http.get('/api/user/me', () =>
      HttpResponse.json({
        email: 'signed-in@example.com',
        id: 'user-1',
        name: 'Taylor',
        roles: [],
      })
    )
  );
}
