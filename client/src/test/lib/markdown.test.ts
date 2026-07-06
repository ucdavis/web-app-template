import { describe, expect, it } from 'vitest';

import { htmlToMarkdown, isSafeMarkdownUrl } from '@/lib/markdown.ts';

describe('markdown utilities', () => {
  it('converts common rich text html to markdown', () => {
    const markdown = htmlToMarkdown(`
      <h2>Program details</h2>
      <p><strong>Open</strong> until <em>Friday</em>.</p>
      <ul><li>First item</li><li>Second item</li></ul>
      <p><a href="https://example.com/apply">Apply now</a></p>
    `);

    expect(markdown).toContain('## Program details');
    expect(markdown).toContain('**Open** until *Friday*.');
    expect(markdown).toContain('- First item\n- Second item');
    expect(markdown).toContain('[Apply now](https://example.com/apply)');
  });

  it('drops unsafe link targets while keeping the label', () => {
    const markdown = htmlToMarkdown(
      '<p><a href="javascript:alert(1)">Unsafe link</a></p>'
    );

    expect(markdown).toBe('Unsafe link');
    expect(isSafeMarkdownUrl('javascript:alert(1)')).toBe(false);
  });
});
