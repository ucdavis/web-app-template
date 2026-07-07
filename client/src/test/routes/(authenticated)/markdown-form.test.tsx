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
});
