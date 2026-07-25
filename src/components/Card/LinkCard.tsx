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
  onTransfer: (toWorkspaceId: string, toBoardId: string) => void;
  transferTargets: TransferTarget[];
}

export function LinkCard({ link, onDelete, onRename, onTransfer, transferTargets }: Props) {
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
  const contextRef = useRef<HTMLDivElement | null>(null);
  const renameRef = useRef<HTMLInputElement | null>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
    position: 'relative',
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

  return (
    <>
      <div
        ref={setNodeRef}
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
          <img
            className="td-link-favicon"
            src={iconSrc}
            alt=""
            draggable={false}
            referrerPolicy="no-referrer"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackApplied === 'true') {
                img.style.opacity = '0';
                return;
              }
              img.dataset.fallbackApplied = 'true';
              img.src = fallbackSrc;
            }}
          />
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
    </>
  );
}
