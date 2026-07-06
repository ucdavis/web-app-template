import { createFileRoute, Link } from '@tanstack/react-router';
import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  htmlToMarkdown,
  isSafeMarkdownUrl,
  markdownExample,
  normalizeMarkdown,
} from '@/lib/markdown.ts';

export const Route = createFileRoute('/(authenticated)/markdown-form')({
  component: MarkdownFormComponent,
});

type FormattingAction =
  | 'bold'
  | 'bullet'
  | 'code'
  | 'heading'
  | 'italic'
  | 'link'
  | 'numbered'
  | 'quote';

const toolbarActions: {
  action: FormattingAction;
  label: string;
  title: string;
}[] = [
  { action: 'heading', label: 'H2', title: 'Heading' },
  { action: 'bold', label: 'B', title: 'Bold' },
  { action: 'italic', label: 'I', title: 'Italic' },
  { action: 'link', label: 'Link', title: 'Link' },
  { action: 'bullet', label: '-', title: 'Bulleted list' },
  { action: 'numbered', label: '1.', title: 'Numbered list' },
  { action: 'quote', label: '>', title: 'Quote' },
  { action: 'code', label: '</>', title: 'Code block' },
];

function MarkdownFormComponent() {
  const [markdown, setMarkdown] = useState(markdownExample);
  const [status, setStatus] = useState(
    'Paste rich text from Word, Google Docs, or a web page to convert it.'
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preview = useMemo(() => renderMarkdown(markdown), [markdown]);

  function updateMarkdown(value: string) {
    setMarkdown(value);
    setStatus('Editing Markdown source.');
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Example form submitted. The Markdown is ready to send.');
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const html = event.clipboardData.getData('text/html');

    if (!html) {
      return;
    }

    const convertedMarkdown = htmlToMarkdown(html);

    if (!convertedMarkdown) {
      return;
    }

    event.preventDefault();
    replaceSelection(convertedMarkdown);
    setStatus('Converted pasted rich text to Markdown.');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    if (event.key.toLowerCase() === 'b') {
      event.preventDefault();
      applyFormatting('bold');
    }

    if (event.key.toLowerCase() === 'i') {
      event.preventDefault();
      applyFormatting('italic');
    }
  }

  function applyFormatting(action: FormattingAction) {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const { selectionEnd, selectionStart, value } = textarea;
    const selectedText = value.slice(selectionStart, selectionEnd);
    const replacement = formatSelection(action, selectedText);
    const nextValue = `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`;
    const actionTitle = toolbarActions.find(
      (item) => item.action === action
    )?.title;

    setMarkdown(nextValue);
    setStatus(`${actionTitle} formatting applied.`);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        selectionStart,
        selectionStart + replacement.length
      );
    });
  }

  function replaceSelection(replacement: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      setMarkdown((currentMarkdown) =>
        normalizeMarkdown(`${currentMarkdown}\n\n${replacement}`)
      );
      return;
    }

    const { selectionEnd, selectionStart, value } = textarea;
    const leadingBreak =
      selectionStart > 0 && !value.slice(0, selectionStart).endsWith('\n')
        ? '\n\n'
        : '';
    const trailingBreak =
      selectionEnd < value.length && !value.slice(selectionEnd).startsWith('\n')
        ? '\n\n'
        : '';
    const nextValue = `${value.slice(0, selectionStart)}${leadingBreak}${replacement}${trailingBreak}${value.slice(selectionEnd)}`;

    setMarkdown(nextValue);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        selectionStart + leadingBreak.length,
        selectionStart + leadingBreak.length + replacement.length
      );
    });
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="absolute top-4 left-4 z-10">
        <Link className="btn btn-ghost btn-sm" to="/">
          Home
        </Link>
      </div>

      <main className="container mx-auto px-4 py-16">
        <header className="mb-10 text-center">
          <h1 className="mb-4 text-5xl font-bold">Markdown Form Example</h1>
          <p className="mx-auto max-w-3xl text-xl text-base-content/70">
            Enter formatted content as Markdown, paste rich text to convert it,
            and verify the result in a live preview before submitting.
          </p>
        </header>

        <form onSubmit={submitForm}>
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body gap-5">
                <div>
                  <h2 className="card-title text-2xl">Content</h2>
                  <p className="mt-2 text-sm text-base-content/70">
                    Use the toolbar for common formatting, or paste rich text
                    directly into the editor.
                  </p>
                </div>

                <div
                  aria-label="Markdown formatting"
                  className="join flex flex-wrap"
                  role="toolbar"
                >
                  {toolbarActions.map((item) => (
                    <button
                      aria-label={item.title}
                      className={`btn btn-sm join-item ${item.action === 'bold' ? 'font-bold' : ''} ${
                        item.action === 'italic' ? 'italic' : ''
                      }`}
                      key={item.action}
                      onClick={() => applyFormatting(item.action)}
                      title={item.title}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <label className="form-control">
                  <span className="label">
                    <span className="label-text font-medium">
                      Markdown source
                    </span>
                    <span className="label-text-alt text-base-content/60">
                      Ctrl+B and Ctrl+I work here
                    </span>
                  </span>
                  <textarea
                    className="textarea textarea-bordered min-h-[32rem] w-full font-mono text-sm leading-6"
                    onChange={(event) => updateMarkdown(event.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    ref={textareaRef}
                    spellCheck
                    value={markdown}
                  />
                </label>

                <div className="flex flex-col gap-3 border-t border-base-300 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    aria-live="polite"
                    className="text-sm text-base-content/70"
                  >
                    {status}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setMarkdown(markdownExample);
                        setStatus('Example content restored.');
                      }}
                      type="button"
                    >
                      Reset Example
                    </button>
                    <button className="btn btn-primary" type="submit">
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <aside className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div>
                  <h2 className="card-title text-2xl">Preview</h2>
                  <p className="mt-2 text-sm text-base-content/70">
                    This preview renders a safe subset of Markdown without
                    injecting pasted HTML.
                  </p>
                </div>
                <div className="min-h-[32rem] rounded-box border border-base-300 bg-base-200/40 p-6">
                  {preview}
                </div>
              </div>
            </aside>
          </section>
        </form>
      </main>
    </div>
  );
}

function formatSelection(action: FormattingAction, selectedText: string) {
  const text = selectedText || fallbackText(action);

  if (action === 'bold') {
    return `**${text}**`;
  }

  if (action === 'italic') {
    return `*${text}*`;
  }

  if (action === 'link') {
    return `[${text}](https://example.com)`;
  }

  if (action === 'heading') {
    return prefixLines(text, '## ');
  }

  if (action === 'bullet') {
    return prefixLines(text, '- ');
  }

  if (action === 'numbered') {
    return text
      .split('\n')
      .map((line, index) => `${index + 1}. ${line || 'List item'}`)
      .join('\n');
  }

  if (action === 'quote') {
    return prefixLines(text, '> ');
  }

  return `\`\`\`\n${text}\n\`\`\``;
}

function fallbackText(action: FormattingAction) {
  if (action === 'heading') {
    return 'Heading';
  }

  if (action === 'link') {
    return 'Link text';
  }

  if (action === 'bullet' || action === 'numbered') {
    return 'List item';
  }

  if (action === 'quote') {
    return 'Quote';
  }

  if (action === 'code') {
    return 'Code sample';
  }

  return 'formatted text';
}

function prefixLines(text: string, prefix: string) {
  return text
    .split('\n')
    .map((line) => `${prefix}${line || fallbackText('bullet')}`)
    .join('\n');
}

function renderMarkdown(markdown: string) {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index]?.startsWith('```')) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }

      nodes.push(
        <pre
          className="my-4 overflow-x-auto rounded-box bg-neutral p-4 text-sm text-neutral-content"
          key={`code-${index}`}
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);

    if (heading) {
      nodes.push(
        renderHeading(
          heading[1].length,
          renderInlineMarkdown(heading[2], `heading-${index}`),
          `heading-${index}`
        )
      );
      index += 1;
      continue;
    }

    if (/^[*_-]{3,}$/.test(line.trim())) {
      nodes.push(<hr className="my-6 border-base-300" key={`hr-${index}`} />);
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableLines = [line];
      index += 2;

      while (index < lines.length && /^\|.+\|$/.test(lines[index] ?? '')) {
        tableLines.push(lines[index] ?? '');
        index += 1;
      }

      nodes.push(renderTable(tableLines, `table-${index}`));
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];

      while (index < lines.length && /^\s*>\s?/.test(lines[index] ?? '')) {
        quoteLines.push((lines[index] ?? '').replace(/^\s*>\s?/, ''));
        index += 1;
      }

      nodes.push(
        <blockquote
          className="my-4 border-l-4 border-primary pl-4 text-base-content/80"
          key={`quote-${index}`}
        >
          {renderMarkdown(quoteLines.join('\n'))}
        </blockquote>
      );
      continue;
    }

    if (/^\s*[*-]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];

      while (
        index < lines.length &&
        (ordered
          ? /^\s*\d+\.\s+/.test(lines[index] ?? '')
          : /^\s*[*-]\s+/.test(lines[index] ?? ''))
      ) {
        items.push((lines[index] ?? '').replace(/^\s*(?:[*-]|\d+\.)\s+/, ''));
        index += 1;
      }

      const ListTag = ordered ? 'ol' : 'ul';
      nodes.push(
        <ListTag
          className={`my-4 ml-6 space-y-1 ${ordered ? 'list-decimal' : 'list-disc'}`}
          key={`list-${index}`}
        >
          {items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`}>
              {renderInlineMarkdown(item, `item-${index}-${itemIndex}`)}
            </li>
          ))}
        </ListTag>
      );
      continue;
    }

    const paragraphLines = [line];
    index += 1;

    while (
      index < lines.length &&
      lines[index]?.trim() &&
      !isBlockStart(lines, index)
    ) {
      paragraphLines.push(lines[index] ?? '');
      index += 1;
    }

    nodes.push(
      <p className="my-4 leading-7" key={`paragraph-${index}`}>
        {renderInlineMarkdown(paragraphLines.join(' '), `paragraph-${index}`)}
      </p>
    );
  }

  return nodes.length > 0 ? (
    <div className="max-w-none text-base-content">{nodes}</div>
  ) : (
    <p className="text-base-content/60">The preview will appear here.</p>
  );
}

function renderHeading(level: number, content: ReactNode[], key: string) {
  const className = 'mt-6 mb-3 font-bold first:mt-0';

  if (level === 1) {
    return (
      <h1 className={`${className} text-4xl`} key={key}>
        {content}
      </h1>
    );
  }

  if (level === 2) {
    return (
      <h2 className={`${className} text-3xl`} key={key}>
        {content}
      </h2>
    );
  }

  if (level === 3) {
    return (
      <h3 className={`${className} text-2xl`} key={key}>
        {content}
      </h3>
    );
  }

  return (
    <h4 className={`${className} text-xl`} key={key}>
      {content}
    </h4>
  );
}

function isBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? '';
  return (
    line.startsWith('```') ||
    /^(#{1,6})\s+/.test(line) ||
    /^[*_-]{3,}$/.test(line.trim()) ||
    /^\s*>\s?/.test(line) ||
    /^\s*[*-]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    isTableStart(lines, index)
  );
}

function isTableStart(lines: string[], index: number) {
  const header = lines[index] ?? '';
  const separator = lines[index + 1] ?? '';

  return (
    /^\|.+\|$/.test(header) && /^\|(?:\s*:?-{3,}:?\s*\|)+$/.test(separator)
  );
}

function renderTable(tableLines: string[], key: string) {
  const rows = tableLines.map((line) =>
    line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim())
  );
  const [header, ...bodyRows] = rows;

  return (
    <div className="my-4 overflow-x-auto" key={key}>
      <table className="table table-sm">
        <thead>
          <tr>
            {header?.map((cell, index) => (
              <th key={`${key}-head-${index}`}>
                {renderInlineMarkdown(cell, `${key}-head-${index}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={`${key}-row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${key}-cell-${rowIndex}-${cellIndex}`}>
                  {renderInlineMarkdown(
                    cell,
                    `${key}-cell-${rowIndex}-${cellIndex}`
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+]\([^)]+\))/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(renderInlineToken(match[0], `${keyPrefix}-${match.index}`));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderInlineToken(token: string, key: string) {
  if (token.startsWith('`')) {
    return (
      <code className="rounded bg-base-300 px-1 py-0.5 text-sm" key={key}>
        {token.slice(1, -1)}
      </code>
    );
  }

  if (token.startsWith('**')) {
    return <strong key={key}>{token.slice(2, -2)}</strong>;
  }

  if (token.startsWith('*')) {
    return <em key={key}>{token.slice(1, -1)}</em>;
  }

  const link = /^\[([^\]]+)]\(([^)]+)\)$/.exec(token);

  if (link && isSafeMarkdownUrl(link[2])) {
    return (
      <a
        className="link link-primary"
        href={link[2]}
        key={key}
        rel="noopener noreferrer"
        target={
          link[2].startsWith('#') || link[2].startsWith('/')
            ? undefined
            : '_blank'
        }
      >
        {link[1]}
      </a>
    );
  }

  return token;
}
