const blockTags = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DIV',
  'FIGURE',
  'FOOTER',
  'FORM',
  'HEADER',
  'HR',
  'MAIN',
  'NAV',
  'P',
  'SECTION',
  'TABLE',
]);

const ignoredTags = new Set([
  'HEAD',
  'META',
  'NOSCRIPT',
  'SCRIPT',
  'STYLE',
  'TITLE',
]);

export const markdownExample = `# Program description

Use this field for rich, readable content that will be stored as Markdown.

## Highlights

- Paste from Microsoft Word, Google Docs, or a web page
- Use the toolbar if Markdown syntax is unfamiliar
- Check the preview before submitting

> Keep the source portable while still giving users familiar formatting tools.

[Learn more about Markdown](https://www.markdownguide.org/)`;

export function htmlToMarkdown(html: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  return normalizeMarkdown(nodesToMarkdown([...document.body.childNodes]));
}

export function normalizeMarkdown(markdown: string) {
  return markdown
    .replaceAll('\r\n', '\n')
    .replaceAll(/[\t ]+\n/g, '\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
}

export function isSafeMarkdownUrl(url: string) {
  const trimmedUrl = url.trim();

  if (
    trimmedUrl.startsWith('/') ||
    trimmedUrl.startsWith('#') ||
    trimmedUrl.startsWith('./') ||
    trimmedUrl.startsWith('../')
  ) {
    return true;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

function nodesToMarkdown(nodes: Node[]) {
  return nodes.map((node) => nodeToMarkdown(node)).join('');
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return cleanInlineText(node.textContent ?? '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as Element;
  const tagName = element.tagName;

  if (ignoredTags.has(tagName)) {
    return '';
  }

  if (/^H[1-6]$/.test(tagName)) {
    const depth = Number(tagName.slice(1));
    return `${'#'.repeat(depth)} ${childrenToInlineMarkdown(element)}\n\n`;
  }

  if (tagName === 'BR') {
    return '  \n';
  }

  if (tagName === 'P') {
    return block(childrenToInlineMarkdown(element));
  }

  if (tagName === 'STRONG' || tagName === 'B') {
    return wrapInline('**', childrenToInlineMarkdown(element));
  }

  if (tagName === 'EM' || tagName === 'I') {
    return wrapInline('*', childrenToInlineMarkdown(element));
  }

  if (tagName === 'CODE') {
    return `\`${(element.textContent ?? '').replaceAll('`', '\\`')}\``;
  }

  if (tagName === 'PRE') {
    return `\`\`\`\n${(element.textContent ?? '').trim()}\n\`\`\`\n\n`;
  }

  if (tagName === 'A') {
    return linkToMarkdown(element);
  }

  if (tagName === 'UL' || tagName === 'OL') {
    return listToMarkdown(element, tagName === 'OL');
  }

  if (tagName === 'BLOCKQUOTE') {
    return blockquoteToMarkdown(element);
  }

  if (tagName === 'TABLE') {
    return tableToMarkdown(element);
  }

  if (tagName === 'IMG') {
    return imageToMarkdown(element);
  }

  const markdown = nodesToMarkdown([...element.childNodes]);
  return blockTags.has(tagName) ? block(markdown) : markdown;
}

function childrenToInlineMarkdown(element: Element) {
  return normalizeInline(nodesToMarkdown([...element.childNodes]));
}

function cleanInlineText(text: string) {
  return text.replaceAll(/\s+/g, ' ');
}

function normalizeInline(text: string) {
  return text.replaceAll(/[\t ]{2,}/g, ' ').trim();
}

function block(markdown: string) {
  const normalizedMarkdown = normalizeInline(markdown);
  return normalizedMarkdown ? `${normalizedMarkdown}\n\n` : '';
}

function wrapInline(marker: string, content: string) {
  return content ? `${marker}${content}${marker}` : '';
}

function linkToMarkdown(element: Element) {
  const label = childrenToInlineMarkdown(element);
  const href = element.getAttribute('href') ?? '';

  if (!label) {
    return '';
  }

  return isSafeMarkdownUrl(href) ? `[${label}](${href.trim()})` : label;
}

function imageToMarkdown(element: Element) {
  const alt = element.getAttribute('alt')?.trim();
  const src = element.getAttribute('src')?.trim();

  if (!alt || !src || src.startsWith('data:') || !isSafeMarkdownUrl(src)) {
    return alt ?? '';
  }

  return `![${alt}](${src})`;
}

function listToMarkdown(element: Element, isOrdered: boolean) {
  const items = [...element.children].filter((child) => child.tagName === 'LI');

  return `${items
    .map((item, index) => {
      const marker = isOrdered ? `${index + 1}.` : '-';
      return `${marker} ${childrenToInlineMarkdown(item)}`;
    })
    .join('\n')}\n\n`;
}

function blockquoteToMarkdown(element: Element) {
  const quote = normalizeMarkdown(nodesToMarkdown([...element.childNodes]));

  if (!quote) {
    return '';
  }

  return `${quote
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')}\n\n`;
}

function tableToMarkdown(element: Element) {
  const rows = [...element.querySelectorAll('tr')]
    .map((row) =>
      [...row.children].map((cell) =>
        normalizeInline(cell.textContent ?? '').replaceAll('|', String.raw`\|`)
      )
    )
    .filter((cells) => cells.length > 0);

  if (rows.length === 0) {
    return '';
  }

  const columnCount = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? '')
  );
  const [header, ...bodyRows] = normalizedRows;
  const separator = Array.from({ length: columnCount }, () => '---');

  return `${[header, separator, ...bodyRows]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n')}\n\n`;
}
