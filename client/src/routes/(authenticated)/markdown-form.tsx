import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useRef,
  useState,
} from 'react';

import {
  htmlToMarkdown,
  markdownExample,
  normalizeMarkdown,
} from '@/lib/markdown.ts';
import { fetchJson } from '@/lib/api.ts';

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

type MarkdownPreviewResponse = {
  html: string;
};

function MarkdownFormComponent() {
  const [markdown, setMarkdown] = useState(markdownExample);
  const [status, setStatus] = useState(
    'Paste rich text from Word, Google Docs, or a web page to convert it.'
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewQuery = useQuery({
    queryFn: ({ signal }) =>
      fetchJson<MarkdownPreviewResponse>(
        '/api/markdown/preview',
        {
          body: JSON.stringify({ markdown }),
          method: 'POST',
        },
        signal
      ),
    queryKey: ['markdown-preview', markdown],
  });

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
                    This preview is rendered by the server with Markdig.
                  </p>
                </div>
                <div className="min-h-[32rem] rounded-box border border-base-300 bg-base-200/40 p-6">
                  <MarkdownPreview
                    html={previewQuery.data?.html}
                    isError={previewQuery.isError}
                    isPending={previewQuery.isPending}
                  />
                </div>
              </div>
            </aside>
          </section>
        </form>
      </main>
    </div>
  );
}

function MarkdownPreview({
  html,
  isError,
  isPending,
}: {
  html?: string;
  isError: boolean;
  isPending: boolean;
}) {
  if (isPending) {
    return <p className="text-base-content/60">Rendering preview...</p>;
  }

  if (isError) {
    return (
      <p className="text-error">
        The preview could not be rendered. Try again after checking the server.
      </p>
    );
  }

  if (!html) {
    return (
      <p className="text-base-content/60">The preview will appear here.</p>
    );
  }

  return (
    <div
      className="markdown-preview max-w-none text-base-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function formatSelection(action: FormattingAction, selectedText: string) {
  const text = selectedText || fallbackText(action);

  if (action === 'bold') {
    return toggleWrapper(text, '**');
  }

  if (action === 'italic') {
    return toggleWrapper(text, '*');
  }

  if (action === 'link') {
    const link = /^\[([^\]]+)]\(([^)]+)\)$/.exec(text);
    return link ? link[1] : `[${text}](https://example.com)`;
  }

  if (action === 'heading') {
    return toggleLinePrefix(text, '## ');
  }

  if (action === 'bullet') {
    return toggleLinePrefix(text, '- ');
  }

  if (action === 'numbered') {
    return hasLinePattern(text, /^\d+\.\s+/)
      ? removeLinePattern(text, /^\d+\.\s+/)
      : text
          .split('\n')
          .map((line, index) => `${index + 1}. ${line || 'List item'}`)
          .join('\n');
  }

  if (action === 'quote') {
    return toggleLinePrefix(text, '> ');
  }

  return text.startsWith('```\n') && text.endsWith('\n```')
    ? text.slice(4, -4)
    : `\`\`\`\n${text}\n\`\`\``;
}

function toggleWrapper(text: string, marker: string) {
  const { content, leadingWhitespace, trailingWhitespace } =
    splitBoundaryWhitespace(text);

  if (!content) {
    return text;
  }

  if (hasWrapper(content, marker)) {
    return `${leadingWhitespace}${content.slice(marker.length, -marker.length)}${trailingWhitespace}`;
  }

  return `${leadingWhitespace}${marker}${content}${marker}${trailingWhitespace}`;
}

function splitBoundaryWhitespace(text: string) {
  const leadingWhitespace = /^\s*/.exec(text)?.[0] ?? '';
  const trailingWhitespace = /\s*$/.exec(text)?.[0] ?? '';

  return {
    content: text.slice(
      leadingWhitespace.length,
      text.length - trailingWhitespace.length
    ),
    leadingWhitespace,
    trailingWhitespace,
  };
}

function hasWrapper(text: string, marker: string) {
  if (!text.startsWith(marker) || !text.endsWith(marker)) {
    return false;
  }

  return marker !== '*' || (!text.startsWith('**') && !text.endsWith('**'));
}

function toggleLinePrefix(text: string, prefix: string) {
  return hasLinePrefix(text, prefix)
    ? text
        .split('\n')
        .map((line) => (line ? line.slice(prefix.length) : line))
        .join('\n')
    : prefixLines(text, prefix);
}

function hasLinePrefix(text: string, prefix: string) {
  const populatedLines = text.split('\n').filter((line) => line.length > 0);
  return (
    populatedLines.length > 0 &&
    populatedLines.every((line) => line.startsWith(prefix))
  );
}

function hasLinePattern(text: string, pattern: RegExp) {
  const populatedLines = text.split('\n').filter((line) => line.length > 0);
  return (
    populatedLines.length > 0 &&
    populatedLines.every((line) => pattern.test(line))
  );
}

function removeLinePattern(text: string, pattern: RegExp) {
  return text
    .split('\n')
    .map((line) => line.replace(pattern, ''))
    .join('\n');
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
