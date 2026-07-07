import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mswUtils.ts';
import { renderRoute } from '@/test/routerUtils.tsx';

describe('markdown form route', () => {
  it('regenerates the Markdig preview after toolbar formatting changes markdown', async () => {
    let latestMarkdown = '';

    server.use(
      http.get('/api/user/me', () => HttpResponse.json({ id: 'user-1' })),
      http.post('/api/markdown/preview', async ({ request }) => {
        const body = (await request.json()) as { markdown: string };
        latestMarkdown = body.markdown;

        return HttpResponse.json({
          html: body.markdown.includes('**Program** description')
            ? '<h1><strong>Program</strong> description</h1>'
            : '<h1>Program description</h1>',
        });
      })
    );

    const { cleanup } = renderRoute({ initialPath: '/markdown-form' });

    try {
      const textarea = await screen.findByLabelText(/markdown source/i);
      const start = (textarea as HTMLTextAreaElement).value.indexOf(
        'Program description'
      );

      (textarea as HTMLTextAreaElement).setSelectionRange(
        start,
        start + 'Program '.length
      );
      fireEvent.click(screen.getByRole('button', { name: 'Bold' }));

      await waitFor(() =>
        expect(latestMarkdown).toContain('**Program** description')
      );
      expect(
        await screen.findByText('Program', { selector: 'strong' })
      ).toBeInTheDocument();
    } finally {
      cleanup();
    }
  });

  it('debounces preview requests while keeping the previous preview visible', async () => {
    let latestMarkdown = '';
    let previewRequestCount = 0;

    server.use(
      http.get('/api/user/me', () => HttpResponse.json({ id: 'user-1' })),
      http.post('/api/markdown/preview', async ({ request }) => {
        const body = (await request.json()) as { markdown: string };
        latestMarkdown = body.markdown;
        previewRequestCount += 1;

        return HttpResponse.json({
          html:
            body.markdown === 'One two three'
              ? '<p>One two three</p>'
              : '<p>Program description</p>',
        });
      })
    );

    const { cleanup } = renderRoute({ initialPath: '/markdown-form' });

    try {
      const textarea = await screen.findByLabelText(/markdown source/i);

      await screen.findByText('Program description');
      const settledRequestCount = previewRequestCount;

      fireEvent.change(textarea, { target: { value: 'One' } });
      fireEvent.change(textarea, { target: { value: 'One two' } });
      fireEvent.change(textarea, { target: { value: 'One two three' } });

      expect(previewRequestCount).toBe(settledRequestCount);
      expect(screen.getByText('Program description')).toBeInTheDocument();

      await waitFor(() => expect(latestMarkdown).toBe('One two three'));
      expect(previewRequestCount).toBe(settledRequestCount + 1);
    } finally {
      cleanup();
    }
  });

  it('emails the current markdown', async () => {
    let emailedMarkdown = '';

    server.use(
      http.get('/api/user/me', () => HttpResponse.json({ id: 'user-1' })),
      http.post('/api/markdown/preview', async ({ request }) => {
        const body = (await request.json()) as { markdown: string };

        return HttpResponse.json({
          html: body.markdown.includes('Email **this**')
            ? '<p>Email <strong>this</strong></p>'
            : '<p>Preview</p>',
        });
      }),
      http.post('/api/notification/markdown', async ({ request }) => {
        const body = (await request.json()) as { markdown: string };
        emailedMarkdown = body.markdown;

        return HttpResponse.json({ to: 'person@example.com' });
      })
    );

    const { cleanup } = renderRoute({ initialPath: '/markdown-form' });

    try {
      const textarea = await screen.findByLabelText(/markdown source/i);
      fireEvent.change(textarea, { target: { value: 'Email **this**' } });
      fireEvent.click(screen.getByRole('button', { name: 'Email Markdown' }));

      await waitFor(() => expect(emailedMarkdown).toBe('Email **this**'));
      expect(
        await screen.findByText('Markdown email sent to person@example.com.')
      ).toBeInTheDocument();
    } finally {
      cleanup();
    }
  });
});
