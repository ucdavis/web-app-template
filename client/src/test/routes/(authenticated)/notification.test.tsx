import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mswUtils.ts';
import { renderRoute } from '@/test/routerUtils.tsx';

describe('notification route', () => {
  it('renders the notification pipeline details and sends a notification email', async () => {
    let postedBody: Record<string, unknown> | undefined;

    server.use(
      http.get('/api/user/me', () =>
        HttpResponse.json({
          email: 'signed-in@example.com',
          id: 'user-1',
          name: 'Taylor',
          roles: [],
        })
      ),
      http.post('/api/notification/default', async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ to: 'preview@example.com' });
      })
    );

    const { cleanup } = renderRoute({ initialPath: '/notification' });

    try {
      expect(
        await screen.findByText(
          'Razor templates, MJML, and SMTP in one shared flow'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /server\.core\/Views\/Emails\/DefaultNotification_mjml\.cshtml/
        )
      ).toBeInTheDocument();

      fireEvent.input(screen.getByPlaceholderText('Enter subject'), {
        target: { value: 'Client test subject' },
      });
      fireEvent.input(screen.getByPlaceholderText('Enter email header'), {
        target: { value: 'Client test header' },
      });
      fireEvent.input(
        screen.getByPlaceholderText('Write the body of the notification email'),
        {
          target: { value: 'Client test message' },
        }
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Send Notification Email' })
      );

      expect(await screen.findByText('preview@example.com')).toBeInTheDocument();
      expect(postedBody).toMatchObject({
        header: 'Client test header',
        message: 'Client test message',
        subject: 'Client test subject',
        to: '',
      });
    } finally {
      cleanup();
    }
  });

  it('sends an explicit recipient when the to field is filled in', async () => {
    let postedBody: Record<string, unknown> | undefined;

    server.use(
      http.get('/api/user/me', () =>
        HttpResponse.json({
          email: 'signed-in@example.com',
          id: 'user-1',
          name: 'Taylor',
          roles: [],
        })
      ),
      http.post('/api/notification/default', async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ to: 'explicit@example.com' });
      })
    );

    const { cleanup } = renderRoute({ initialPath: '/notification' });

    try {
      await screen.findByText('Razor templates, MJML, and SMTP in one shared flow');

      fireEvent.input(
        screen.getByPlaceholderText('Leave blank to use the current user'),
        { target: { value: 'explicit@example.com' } }
      );
      fireEvent.input(screen.getByPlaceholderText('Enter subject'), {
        target: { value: 'Test subject' },
      });
      fireEvent.input(screen.getByPlaceholderText('Enter email header'), {
        target: { value: 'Test header' },
      });
      fireEvent.input(
        screen.getByPlaceholderText('Write the body of the notification email'),
        { target: { value: 'Test message' } }
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Send Notification Email' })
      );

      expect(await screen.findByText('explicit@example.com')).toBeInTheDocument();
      expect(postedBody).toMatchObject({
        to: 'explicit@example.com',
      });
    } finally {
      cleanup();
    }
  });

  it('surfaces API errors from the notification endpoint', async () => {
    server.use(
      http.get('/api/user/me', () =>
        HttpResponse.json({
          email: 'signed-in@example.com',
          id: 'user-1',
          name: 'Taylor',
          roles: [],
        })
      ),
      http.post(
        '/api/notification/default',
        () =>
          new HttpResponse(
            'The notification endpoint is only available in development.',
            {
              status: 404,
            }
          )
      )
    );

    const { cleanup } = renderRoute({ initialPath: '/notification' });

    try {
      await screen.findByText('Razor templates, MJML, and SMTP in one shared flow');

      fireEvent.click(
        screen.getByRole('button', { name: 'Send Notification Email' })
      );

      expect(
        await screen.findByText(
          'The notification endpoint is only available in development.'
        )
      ).toBeInTheDocument();
    } finally {
      cleanup();
    }
  });
});
