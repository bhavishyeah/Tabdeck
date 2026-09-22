/**
 * Minimal, dependency-free Markdown → HTML renderer for the Note widget.
 *
 * Security: the input is HTML-escaped FIRST, so no raw HTML from note content
 * can execute. Only a small, known set of inline/block constructs are then
 * re-introduced as safe tags. Links are restricted to http/https/mailto.
 *
 * Supported: # headings (1–3), **bold**, *italic*, `code`, - / * bullet lists,
 * 1. ordered lists, [ ] / [x] task checkboxes, > blockquote, --- rule,
 * autolinked bare URLs, and [text](url) links.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only allow safe link schemes. */
function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^(https?:\/\/|mailto:)/i.test(u)) return u;
  // Bare domain → assume https
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(u)) return `https://${u}`;
  return null;
}

function renderInline(text: string): string {
  // text is already HTML-escaped. Apply inline formatting.
  let out = text;

  // [label](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const href = safeHref(url);
    if (!href) return label;
    return `<a href="${href}" target="_blank" rel="noreferrer noopener">${label}</a>`;
  });

  // Autolink bare http(s) URLs that weren't already turned into anchors.
  out = out.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+)/g, (_m, pre: string, url: string) => {
    const href = safeHref(url);
    if (!href) return pre + url;
    return `${pre}<a href="${href}" target="_blank" rel="noreferrer noopener">${url}</a>`;
  });

  // `inline code`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // *italic* (avoid matching the ** already consumed)
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');

  return out;
}

export function renderMarkdown(src: string): string {
  const escaped = escapeHtml(src);
  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];

  let listType: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (listType) { html.push(`</${listType}>`); listType = null; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) { closeList(); continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { closeList(); html.push('<hr />'); continue; }

    // Headings (#, ##, ###)
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const level = h[1].length;
      html.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    const q = /^&gt;\s?(.*)$/.exec(line);
    if (q) { closeList(); html.push(`<blockquote>${renderInline(q[1])}</blockquote>`); continue; }

    // Task checkbox: - [ ] / - [x]
    const task = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
    if (task) {
      if (listType !== 'ul') { closeList(); html.push('<ul class="f-md-tasks">'); listType = 'ul'; }
      const checked = task[1].toLowerCase() === 'x';
      html.push(
        `<li class="f-md-task"><span class="f-md-check ${checked ? 'is-checked' : ''}"></span>${renderInline(task[2])}</li>`
      );
      continue;
    }

    // Unordered list
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (listType !== 'ul') { closeList(); html.push('<ul>'); listType = 'ul'; }
      html.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }

    // Ordered list
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (listType !== 'ol') { closeList(); html.push('<ol>'); listType = 'ol'; }
      html.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }

    // Paragraph
    closeList();
    html.push(`<p>${renderInline(line)}</p>`);
  }

  closeList();
  return html.join('');
}
