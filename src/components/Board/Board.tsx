import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ArrowRightLeft, Copy, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import type { BoardItem, WorkspaceItem } from '../../lib/workspaceTypes';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { LinkCard } from '../Card/LinkCard';
import { TodoBoardContent } from '../Widgets/TodoBoard';
import { WeatherWidget } from '../Widgets/WeatherWidget';
import { ClockWidget } from '../Widgets/ClockWidget';

interface Props {
  workspaceId: string;
  board: BoardItem;
  workspaces: WorkspaceItem[];
}

export function Board({ workspaceId, board, workspaces }: Props) {
  const { removeBoard, renameBoard, addLink, removeLink, renameLink, transferBoard, transferLink, setBoardColor, updateNoteContent, updateTodos, duplicateBoard, toggleBoardHeader } =
    useWorkspaceStore();
  const textMode = useSettingsStore((s) => s.textMode);
  const boardOpacity = useSettingsStore((s) => s.boardOpacity);
  const boardRadius = useSettingsStore((s) => s.boardRadius);
  const glassBlur = useSettingsStore((s) => s.glassBlur);
  const glassSaturation = useSettingsStore((s) => s.glassSaturation);
  const grainIntensity = useSettingsStore((s) => s.grainIntensity);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [boardContextMenu, setBoardContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [boardMenuFlipped, setBoardMenuFlipped] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const boardRef = useRef<HTMLElement | null>(null);
  const contextRef = useRef<HTMLDivElement | null>(null);
  const renameRef = useRef<HTMLInputElement | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: `board-drop-${board.id}`,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!boardRef.current) return;
      if (!boardRef.current.contains(event.target as Node)) {
        setShowForm(false);
      }
    };

    if (showForm) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showForm]);

  // Close board context menu on outside click
  useEffect(() => {
    if (!boardContextMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setBoardContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [boardContextMenu]);

  // Flip board menu upward if near bottom
  useEffect(() => {
    if (!boardContextMenu || !contextRef.current) return;

    const menuRect = contextRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;

    if (boardContextMenu.y + menuRect.height > viewportH - 8) {
      setBoardMenuFlipped(true);
    } else {
      setBoardMenuFlipped(false);
    }
  }, [boardContextMenu]);

  // Focus rename input
  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  const mergedRef = (node: HTMLElement | null) => {
    boardRef.current = node;
    setNodeRef(node);
  };

  const handleSave = () => {
    if (!title.trim() || !url.trim()) return;

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    addLink(workspaceId, board.id, title.trim(), normalizedUrl);
    setTitle('');
    setUrl('');
    setShowForm(false);
  };

  const handleBoardNameContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBoardContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleTransfer = (targetWorkspaceId: string) => {
    setBoardContextMenu(null);
    transferBoard(workspaceId, targetWorkspaceId, board.id);
  };

  const handleStartRename = () => {
    setBoardContextMenu(null);
    setRenameValue(board.name);
    setIsRenaming(true);
  };

  const handleCommitRename = () => {
    if (renameValue.trim()) {
      renameBoard(workspaceId, board.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCommitRename();
    if (e.key === 'Escape') setIsRenaming(false);
  };

  const handleDeleteBoard = () => {
    setBoardContextMenu(null);
    removeBoard(workspaceId, board.id);
  };

  const handleDuplicate = () => {
    setBoardContextMenu(null);
    duplicateBoard(workspaceId, board.id);
  };

  const handleAddLink = () => {
    setBoardContextMenu(null);
    setShowForm(true);
  };

  // Other workspaces to transfer to (exclude current)
  const otherWorkspaces = workspaces.filter((ws) => ws.id !== workspaceId);

  // Memoize board style to avoid recalculating on every render
  const boardStyle = useMemo((): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      borderRadius: `${boardRadius}px`,
      backdropFilter: `blur(${glassBlur}px) saturate(${glassSaturation}%)`,
      WebkitBackdropFilter: `blur(${glassBlur}px) saturate(${glassSaturation}%)`,
      border: '1px solid rgba(255, 255, 255, 0.2)',
    };
    if (board.color === 'clear') {
      baseStyle.background = `rgba(255, 255, 255, 0.08)`;
      baseStyle.border = '1px solid rgba(255, 255, 255, 0.15)';
    } else if (board.color) {
      const hex = board.color;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      baseStyle.background = `rgba(${r}, ${g}, ${b}, ${boardOpacity})`;
      baseStyle.borderColor = `${board.color}aa`;
    } else {
      baseStyle.background = `rgba(250, 248, 244, ${boardOpacity})`;
    }
    if (textMode === 'light' || board.color === 'clear') baseStyle.color = '#fff';
    else if (textMode === 'dark') baseStyle.color = '#111';
    else if (board.color) baseStyle.color = '#fff';
    return baseStyle;
  }, [boardRadius, glassBlur, glassSaturation, boardOpacity, textMode, board.color]);

  return (
    <section
      ref={mergedRef}
      className={`td-board-panel ${isOver ? 'is-over' : ''} ${showForm ? 'is-form-open' : ''}`}
      style={boardStyle}
      onContextMenu={handleBoardNameContextMenu}
    >
      {/* Grain overlay */}
      {grainIntensity > 0 && (
        <div className="td-board-grain" style={{ opacity: grainIntensity / 100 }} />
      )}

      {/* Drag handle bar */}
      <div className="td-board-drag-bar" />

      {(board.type !== 'clock' && board.type !== 'weather' && !board.hideHeader) && (
        <div className="td-board-top">
          {isRenaming ? (
            <input
              ref={renameRef}
              className="td-board-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleCommitRename}
              onKeyDown={handleRenameKeyDown}
              spellCheck={false}
            />
          ) : (
            <>
              <span
                className="td-board-name-label"
                title="Right-click for options"
              >
                {board.name}
              </span>
              {board.type !== 'note' && board.type !== 'todo' && board.links.length > 0 && (
                <span className="f-board-count">{board.links.length}</span>
              )}
            </>
          )}
        </div>
      )}

      {board.type === 'note' ? (
        <textarea
          className="td-note-textarea"
          value={board.noteContent || ''}
          onChange={(e) => updateNoteContent(workspaceId, board.id, e.target.value)}
          placeholder="Write your note here..."
          spellCheck={false}
        />
      ) : board.type === 'todo' ? (
        <TodoBoardContent
          todos={board.todos || []}
          onChange={(todos) => updateTodos(workspaceId, board.id, todos)}
        />
      ) : board.type === 'weather' ? (
        <WeatherWidget />
      ) : board.type === 'clock' ? (
        <ClockWidget />
      ) : (
        <div className="td-board-links">
          {board.links.length === 0 ? (
            <div className="td-board-empty">
              <span>Right-click to add links</span>
            </div>
          ) : (
            <SortableContext
              items={board.links.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {board.links.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  onDelete={() => removeLink(workspaceId, board.id, link.id)}
                  onRename={(newTitle) => renameLink(workspaceId, board.id, link.id, newTitle)}
                  onTransfer={(toWsId, toBoardId) => transferLink(workspaceId, board.id, link.id, toWsId, toBoardId)}
                  transferTargets={otherWorkspaces.flatMap((ws) =>
                    ws.boards.map((b) => ({
                      workspaceId: ws.id,
                      workspaceName: ws.name,
                      boardId: b.id,
                      boardName: b.name,
                    }))
                  )}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}

      {showForm && board.type !== 'note' && (
        <div className="td-floating-add-panel">
          <div className="td-add-form">
            <input
              className="td-add-input"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <input
              className="td-add-input"
              placeholder="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              className="td-add-save"
              type="button"
              onClick={handleSave}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Board context menu — portaled to body */}
      {boardContextMenu &&
        createPortal(
          <div
            ref={contextRef}
            className="td-link-context-menu"
            style={
              boardMenuFlipped
                ? { bottom: window.innerHeight - boardContextMenu.y, left: boardContextMenu.x }
                : { top: boardContextMenu.y, left: boardContextMenu.x }
            }
          >
            {board.type !== 'clock' && board.type !== 'weather' && (
              <button
                className="td-link-context-item"
                type="button"
                onClick={handleAddLink}
              >
                <Plus size={13} strokeWidth={2} />
                <span>Add link</span>
              </button>
            )}
            {board.type !== 'clock' && board.type !== 'weather' && (
              <button
                className="td-link-context-item"
                type="button"
                onClick={handleStartRename}
              >
                <Pencil size={13} strokeWidth={2} />
                <span>Rename board</span>
              </button>
            )}
            {board.type !== 'clock' && board.type !== 'weather' && (
              <button
                className="td-link-context-item"
                type="button"
                onClick={() => {
                  toggleBoardHeader(workspaceId, board.id);
                  setBoardContextMenu(null);
                }}
              >
                {board.hideHeader ? <Eye size={13} strokeWidth={2} /> : <EyeOff size={13} strokeWidth={2} />}
                <span>{board.hideHeader ? 'Show header' : 'Hide header'}</span>
              </button>
            )}
            <div className="td-context-divider" />
            <div className="td-context-section-label">Color</div>
            <div className="td-board-color-picks">
              {['', 'clear', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map((c) => (
                <button
                  key={c}
                  className={`td-board-color-dot ${board.color === c || (!board.color && c === '') ? 'is-active' : ''}`}
                  type="button"
                  style={{ background: c === 'clear' ? 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))' : c || 'rgba(250,248,244,0.92)', border: c === 'clear' ? '2px dashed rgba(255,255,255,0.5)' : undefined }}
                  onClick={() => {
                    setBoardColor(workspaceId, board.id, c || undefined);
                    setBoardContextMenu(null);
                  }}
                  title={c || 'Default'}
                />
              ))}
            </div>
            <button
              className="td-link-context-item"
              type="button"
              onClick={handleDuplicate}
            >
              <Copy size={13} strokeWidth={2} />
              <span>Duplicate board</span>
            </button>
            {otherWorkspaces.length > 0 && (
              <>
                <div className="td-context-divider" />
                {otherWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    className="td-link-context-item"
                    type="button"
                    onClick={() => handleTransfer(ws.id)}
                  >
                    <ArrowRightLeft size={13} strokeWidth={2} />
                    <span>Transfer to {ws.name}</span>
                  </button>
                ))}
              </>
            )}
            <div className="td-context-divider" />
            <button
              className="td-link-context-item td-link-context-delete"
              type="button"
              onClick={handleDeleteBoard}
            >
              <Trash2 size={13} strokeWidth={2} />
              <span>Delete board</span>
            </button>
          </div>,
          document.body
        )}
    </section>
  );
}
