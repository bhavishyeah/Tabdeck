import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowRightLeft, Pencil, Trash2 } from 'lucide-react';
import type { LinkCardType } from '../../lib/types';
import { getFaviconUrl } from '../../lib/favicon';
import { useSettingsStore } from '../../store/useSettingsStore';

interface TransferTarget {
  workspaceId: string;
  workspaceName: string;
  boardId: string;
  boardName: string;
}

interface Props {
  link: LinkCardType;
  onDelete: () => void;
  onRename: (title: string) => void;
  /** Save edits to title and/or url. */
  onEdit: (patch: { title: string; url: string }) => void;
  onTransfer: (toWorkspaceId: string, toBoardId: string) => void;
  transferTargets: TransferTarget[];
}

export function LinkCard({ link, onDelete, onRename, onEdit, onTransfer, transferTargets }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [menuFlipped, setMenuFlipped] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editPos, setEditPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const contextRef = useRef<HTMLDivElement | null>(null);
  const renameRef = useRef<HTMLInputElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
    position: 'relative',
  };

  const [faviconFailed, setFaviconFailed] = useState(false);

  // Generate a letter fallback from the domain
  const getLetterFallback = () => {
    try {
      const hostname = new URL(link.url).hostname.replace('www.', '');
      return hostname.charAt(0).toUpperCase();
    } catch {
      return link.title.charAt(0).toUpperCase() || '?';
    }
  };

  const fallbackSrc = getFaviconUrl(link.url, 32);
  const iconSrc = link.favicon?.trim() ? link.favicon : fallbackSrc;

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  // Flip menu upward if near bottom of viewport
  useEffect(() => {
    if (!contextMenu || !contextRef.current) return;

    const menuRect = contextRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;

    if (contextMenu.y + menuRect.height > viewportH - 8) {
      setMenuFlipped(true);
    } else {
      setMenuFlipped(false);
    }
  }, [contextMenu]);

  // Focus rename input
  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDelete = () => {
    setContextMenu(null);
    onDelete();
  };

  const handleStartRename = () => {
    setContextMenu(null);
    setRenameValue(link.title);
    setIsRenaming(true);
  };

  const handleCommitRename = () => {
    if (renameValue.trim() && renameValue.trim() !== link.title) {
      onRename(renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCommitRename();
    if (e.key === 'Escape') setIsRenaming(false);
  };

  const handleStartEdit = () => {
    setContextMenu(null);
    setEditTitle(link.title);
    setEditUrl(link.url);
    // Anchor the edit panel to the link row, clamped to the viewport.
    const rect = rowRef.current?.getBoundingClientRect();
    const W = 260;
    const H = 150;
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect ? rect.left : vw / 2 - W / 2;
    let top = rect ? rect.bottom + 6 : 80;
    if (left + W > vw - pad) left = Math.max(pad, vw - W - pad);
    if (left < pad) left = pad;
    if (top + H > vh - pad && rect) top = Math.max(pad, rect.top - H - 6);
    setEditPos({ top, left });
    setIsEditing(true);
  };

  const handleCommitEdit = () => {
    const t = editTitle.trim();
    const u = editUrl.trim();
    if (!t || !u) { setIsEditing(false); return; }
    if (t !== link.title || u !== link.url) {
      onEdit({ title: t, url: u });
    }
    setIsEditing(false);
  };

  // When the URL field is pasted into and the title is still empty/unchanged,
  // auto-fill a readable title from the pasted URL's hostname.
  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (!pasted) return;
    const titleUntouched = !editTitle.trim() || editTitle.trim() === link.title;
    if (!titleUntouched) return;
    try {
      const withScheme = /^https?:\/\//i.test(pasted) ? pasted : `https://${pasted}`;
      const host = new URL(withScheme).hostname.replace(/^www\./, '');
      const name = host.split('.')[0];
      if (name) setEditTitle(name.charAt(0).toUpperCase() + name.slice(1));
    } catch {
      // Not a parseable URL — leave the title as-is.
    }
  };

  // Close the edit panel on outside click.
  useEffect(() => {
    if (!isEditing) return;
    const onDown = (e: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        handleCommitEdit();
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editTitle, editUrl]);

  return (
    <>
      <div
        ref={(node) => { setNodeRef(node); rowRef.current = node; }}
        style={style}
        className={`td-link-row ${isDragging ? 'is-dragging' : ''}`}
        {...attributes}
        onContextMenu={handleContextMenu}
      >
        {/* Favicon — drag activator */}
        <div
          ref={setActivatorNodeRef}
          className="td-link-drag-area"
          {...listeners}
        >
          {faviconFailed ? (
            <span className="f-favicon-letter">{getLetterFallback()}</span>
          ) : (
            <img
              className="td-link-favicon"
              src={iconSrc}
              alt=""
              draggable={false}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied === 'true') {
                  setFaviconFailed(true);
                  return;
                }
                img.dataset.fallbackApplied = 'true';
                img.src = fallbackSrc;
              }}
            />
          )}
        </div>

        {/* Link title — clickable to open URL, or inline rename */}
        {isRenaming ? (
          <input
            ref={renameRef}
            className="td-link-rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleCommitRename}
            onKeyDown={handleRenameKeyDown}
            maxLength={80}
          />
        ) : (
          <a
            className="td-link-name"
            href={link.url}
            target={useSettingsStore.getState().openLinksNewTab ? '_blank' : '_self'}
            rel="noreferrer"
            title={link.title}
          >
            {link.title}
          </a>
        )}
      </div>

      {/* Context menu portaled to body */}
      {contextMenu &&
        createPortal(
          <div
            ref={contextRef}
            className="td-link-context-menu"
            style={
              menuFlipped
                ? { bottom: window.innerHeight - contextMenu.y, left: contextMenu.x }
                : { top: contextMenu.y, left: contextMenu.x }
            }
          >
            <button
              className="td-link-context-item"
              type="button"
              onClick={handleStartRename}
            >
              <Pencil size={13} strokeWidth={2} />
              <span>Rename</span>
            </button>
            <button
              className="td-link-context-item"
              type="button"
              onClick={handleStartEdit}
            >
              <Pencil size={13} strokeWidth={2} />
              <span>Edit link</span>
            </button>
            {transferTargets.length > 0 && (
              <>
                <div className="td-context-divider" />
                <div className="td-context-section-label">Transfer to workspace</div>
                <div className="td-context-scroll">
                  {transferTargets.map((target) => (
                    <button
                      key={`${target.workspaceId}-${target.boardId}`}
                      className="td-link-context-item"
                      type="button"
                      onClick={() => {
                        setContextMenu(null);
                        onTransfer(target.workspaceId, target.boardId);
                      }}
                    >
                      <ArrowRightLeft size={12} strokeWidth={2} />
                      <span>{target.workspaceName} / {target.boardName}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="td-context-divider" />
            <button
              className="td-link-context-item td-link-context-delete"
              type="button"
              onClick={handleDelete}
            >
              <Trash2 size={13} strokeWidth={2} />
              <span>Delete bookmark</span>
            </button>
          </div>,
          document.body
        )}

      {/* Edit-link panel portaled to body */}
      {isEditing &&
        createPortal(
          <div
            ref={editRef}
            className="td-link-edit-panel"
            style={{ position: 'fixed', top: editPos.top, left: editPos.left, width: 260 }}
          >
            <label className="td-link-edit-label">Title</label>
            <input
              className="td-link-edit-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCommitEdit(); if (e.key === 'Escape') setIsEditing(false); }}
              autoFocus
            />
            <label className="td-link-edit-label">URL</label>
            <input
              className="td-link-edit-input"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              onPaste={handleUrlPaste}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCommitEdit(); if (e.key === 'Escape') setIsEditing(false); }}
              placeholder="https://..."
            />
            <div className="td-link-edit-actions">
              <button className="td-link-edit-cancel" type="button" onClick={() => setIsEditing(false)}>Cancel</button>
              <button className="td-link-edit-save" type="button" onClick={handleCommitEdit}>Save</button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
