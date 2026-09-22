import { useCallback, useEffect, useRef, useState } from 'react';
import { Rss, RefreshCw } from 'lucide-react';
import type { RssConfig } from '../../lib/workspaceTypes';

interface Props {
  config?: RssConfig;
}

interface FeedItem {
  title: string;
  link: string;
}

type FeedState = 'idle' | 'loading' | 'success' | 'error';

/** Parse RSS 2.0 or Atom XML into a flat item list. */
function parseFeed(xml: string, max: number): FeedItem[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) return [];

  const items: FeedItem[] = [];
  // RSS 2.0
  doc.querySelectorAll('item').forEach((node) => {
    const title = node.querySelector('title')?.textContent?.trim() ?? '';
    const link = node.querySelector('link')?.textContent?.trim() ?? '';
    if (title) items.push({ title, link });
  });
  // Atom (if no RSS items were found)
  if (items.length === 0) {
    doc.querySelectorAll('entry').forEach((node) => {
      const title = node.querySelector('title')?.textContent?.trim() ?? '';
      const linkEl = node.querySelector('link');
      const link = linkEl?.getAttribute('href') ?? linkEl?.textContent?.trim() ?? '';
      if (title) items.push({ title, link });
    });
  }
  return items.slice(0, max);
}

export function RssWidget({ config }: Props) {
  const url = config?.url?.trim();
  const count = config?.count ?? 6;
  const [items, setItems] = useState<FeedItem[]>([]);
  const [state, setState] = useState<FeedState>('idle');
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show the "scroll for more" hint on hover, then fade it out after 3s.
  const onHoverStart = () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setShowHint(true);
    hintTimer.current = setTimeout(() => setShowHint(false), 3000);
  };
  const onHoverEnd = () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setShowHint(false);
  };
  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!url) { setState('idle'); return; }
      setState('loading');
      try {
        const res = await fetch(url, signal ? { signal } : undefined);
        const text = await res.text();
        const parsed = parseFeed(text, count);
        if (signal?.aborted) return;
        setItems(parsed);
        setState(parsed.length ? 'success' : 'error');
      } catch {
        if (!signal?.aborted) setState('error');
      }
    },
    [url, count]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    // load() sets a 'loading' state then fetches; this mirrors the accepted
    // pattern in WeatherWidget. The synchronous setState is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  if (!url) {
    return (
      <div className="f-rss f-rss--empty">
        <Rss size={18} strokeWidth={1.5} style={{ opacity: 0.5 }} />
        <span>Add a feed URL in widget settings.</span>
      </div>
    );
  }

  if (state === 'loading') {
    return <div className="f-rss f-rss--state"><RefreshCw size={14} strokeWidth={2} className="f-rss-spin" /> Loading…</div>;
  }

  if (state === 'error') {
    return (
      <div className="f-rss f-rss--state">
        <span>Couldn't load feed</span>
        <button type="button" className="f-rss-retry" onClick={() => load()}>
          <RefreshCw size={12} strokeWidth={2} /> Retry
        </button>
      </div>
    );
  }

  // More than the 4 visible-by-default rows means the list scrolls.
  const scrollable = items.length > 4;

  return (
    <div
      className={`f-rss ${scrollable ? 'is-scrollable' : ''}`}
      onMouseEnter={scrollable ? onHoverStart : undefined}
      onMouseLeave={scrollable ? onHoverEnd : undefined}
    >
      <ul className="f-rss-list">
        {items.map((item, i) => (
          <li key={i} className="f-rss-item">
            {item.link ? (
              <a href={item.link} target="_blank" rel="noreferrer noopener" title={item.title}>{item.title}</a>
            ) : (
              <span title={item.title}>{item.title}</span>
            )}
          </li>
        ))}
      </ul>
      {scrollable && showHint && <div className="f-rss-more" aria-hidden="true" />}
    </div>
  );
}
