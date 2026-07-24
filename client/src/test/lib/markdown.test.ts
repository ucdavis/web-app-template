import { describe, expect, it } from 'vitest';

import {
  htmlToMarkdown,
  isSafeMarkdownUrl,
  normalizeMarkdown,
} from '@/lib/markdown.ts';

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

  it('rejects protocol-relative urls while allowing relative paths', () => {
    expect(isSafeMarkdownUrl('//evil.com')).toBe(false);
    expect(isSafeMarkdownUrl('/programs')).toBe(true);
    expect(isSafeMarkdownUrl('#details')).toBe(true);
    expect(isSafeMarkdownUrl('./details')).toBe(true);
    expect(isSafeMarkdownUrl('../details')).toBe(true);
    expect(
      htmlToMarkdown(
        '<p><a href="//evil.com/path">Unsafe link</a></p><img alt="Logo" src="//evil.com/logo.png">'
      )
    ).toBe('Unsafe link\n\nLogo');
  });

  it('converts horizontal rules to markdown separators', () => {
    expect(htmlToMarkdown('<p>Above</p><hr><p>Below</p>')).toBe(
      'Above\n\n---\n\nBelow'
    );
  });

  it('preserves hard breaks while trimming other line-end whitespace', () => {
    expect(htmlToMarkdown('<p>Line one<br>Line two</p>')).toBe(
      'Line one  \nLine two'
    );
    expect(normalizeMarkdown('Hard break  \nSpace \nTab\t\n\n\nNext')).toBe(
      'Hard break  \nSpace\nTab\n\nNext'
    );
  });

  it('escapes markdown syntax in pasted plain text', () => {
    expect(
      htmlToMarkdown(
        '<p>*literal* _value_ `code` [label]</p><p><span>*nested*</span></p><p># Heading</p><p>- item</p><p>&gt; quote</p><p>1. item</p>'
      )
    ).toBe(
      '\\*literal\\* \\_value\\_ \\`code\\` \\[label\\]\n\n\\*nested\\*\n\n\\# Heading\n\n\\- item\n\n\\> quote\n\n1\\. item'
    );
  });

  it('uses longer inline code fences when code contains backticks', () => {
    const backtick = String.fromCharCode(96);
    const doubleBacktick = backtick.repeat(2);

    expect(
      htmlToMarkdown(
        '<p><code>npm ' + backtick + 'run' + backtick + ' build</code></p>'
      )
    ).toBe(
      doubleBacktick +
        'npm ' +
        backtick +
        'run' +
        backtick +
        ' build' +
        doubleBacktick
    );
    expect(
      htmlToMarkdown(
        '<p><code>' + backtick + 'template' + backtick + '</code></p>'
      )
    ).toBe(
      doubleBacktick +
        ' ' +
        backtick +
        'template' +
        backtick +
        ' ' +
        doubleBacktick
    );
  });
});
