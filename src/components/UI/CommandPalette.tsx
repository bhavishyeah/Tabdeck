import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, CornerDownLeft, ArrowUp, ArrowDown, LayoutGrid, Link as LinkIcon } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getFaviconUrl } from '../../lib/favicon';

interface Props {
  open: boolean;
  onClose: () => void;
}

type LinkResult = {
  kind: 'link';
  id: string;
  title: string;
  url: string;
  favicon?: string;
  workspaceId: string;
  workspaceName: string;
  boardName: string;
  score: number;
};

type BoardResult = {
  kind: 'board';
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
  score: number;
};

type Result = LinkResult | BoardResult;

/**
 * Lightweight fuzzy score. Returns a higher number for better matches,
 * or -1 when the query does not match at all.
 * - exact substring at start scores highest
 * - substring anywhere scores middle
 * - subsequence (chars in order) scores lowest
 */
function fuzzyScore(text: string, query: string): number {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  const idx = t.indexOf(q);
  if (idx === 0) return 1000 - t.length;
  if (idx > 0) return 600 - idx;

  // subsequence check
  let ti = 0;
  let matched = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti);
    if (found === -1) return -1;
    ti = found + 1;
    matched++;
  }
  return matched === q.length ? 200 - t.length : -1;
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // focus after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim();
    const out: Result[] = [];

    for (const ws of workspaces) {
      for (const board of ws.boards) {
        // Board name result (link boards only — widgets aren't navigable targets for links)
        if (q) {
          const bScore = fuzzyScore(board.name, q);
          if (bScore >= 0 && (!board.type || board.type === 'links')) {
            out.push({
              kind: 'board',
              id: board.id,
              title: board.name,
              workspaceId: ws.id,
              workspaceName: ws.name,
              score: bScore - 50, // rank boards slightly below exact link matches
            });
          }
        }

        for (const link of board.links) {
          if (!q) {
            out.push({
              kind: 'link',
              id: link.id,
              title: link.title,
              url: link.url,
              favicon: link.favicon,
              workspaceId: ws.id,
              workspaceName: ws.name,
              boardName: board.name,
              score: 0,
            });
            continue;
          }
          const titleScore = fuzzyScore(link.title, q);
          const urlScore = fuzzyScore(link.url, q) - 100; // url matches rank below title
          const score = Math.max(titleScore, urlScore);
          if (score >= 0) {
            out.push({
              kind: 'link',
              id: link.id,
              title: link.title,
              url: link.url,
              favicon: link.favicon,
              workspaceId: ws.id,
              workspaceName: ws.name,
              boardName: board.name,
              score,
            });
          }
        }
      }
    }

    // Sort by score desc; for empty query keep insertion order (recent-ish)
    if (q) out.sort((a, b) => b.score - a.score);
    return out.slice(0, 50);
  }, [workspaces, query]);

  // Derived: a safe active index that's always in range, even if results shrank.
  const safeIndex = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  // Keep the active row scrolled into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${safeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex]);

  const openResult = (result: Result) => {
    if (result.kind === 'link') {
      const newTab = useSettingsStore.getState().openLinksNewTab;
      if (newTab) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = result.url;
      }
      onClose();
    } else {
      // Jump to the workspace containing the board
      setActiveWorkspace(result.workspaceId);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[safeIndex];
      if (r) openResult(r);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="f-cmdk-backdrop" onMouseDown={onClose}>
      <div className="f-cmdk" onMouseDown={(e) => e.stopPropagation()}>
        <div className="f-cmdk-input-row">
          <Search size={16} strokeWidth={2} className="f-cmdk-search-icon" />
          <input
            ref={inputRef}
            className="f-cmdk-input"
            placeholder="Search links and boards across all workspaces…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            spellCheck={false}
          />
          <kbd className="f-cmdk-esc">esc</kbd>
        </div>

        <div className="f-cmdk-results" ref={listRef}>
          {results.length === 0 ? (
            <div className="f-cmdk-empty">
              {query.trim() ? 'No matches' : 'Start typing to search'}
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.kind}-${r.id}`}
                data-idx={i}
                type="button"
                className={`f-cmdk-item ${i === safeIndex ? 'is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => openResult(r)}
              >
                <span className="f-cmdk-item-icon">
                  {r.kind === 'link' ? (
                    <img
                      src={r.favicon?.trim() || getFaviconUrl(r.url, 32)}
                      alt=""
                      width={16}
                      height={16}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                  ) : (
                    <LayoutGrid size={15} strokeWidth={2} />
                  )}
                </span>
                <span className="f-cmdk-item-body">
                  <span className="f-cmdk-item-title">{r.title}</span>
                  <span className="f-cmdk-item-sub">
                    {r.kind === 'link' ? (
                      <><LinkIcon size={9} strokeWidth={2} /> {r.workspaceName} · {r.boardName}</>
                    ) : (
                      <>Board · {r.workspaceName}</>
                    )}
                  </span>
                </span>
                {i === safeIndex && (
                  <span className="f-cmdk-item-enter"><CornerDownLeft size={13} strokeWidth={2} /></span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="f-cmdk-footer">
          <span className="f-cmdk-hint"><ArrowUp size={11} /><ArrowDown size={11} /> navigate</span>
          <span className="f-cmdk-hint"><CornerDownLeft size={11} /> open</span>
          <span className="f-cmdk-hint"><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
