import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ArrowRightLeft, Copy, Eye, EyeOff, Pencil, Plus, Trash2, LayoutGrid, Columns, GripVertical, Maximize2 } from 'lucide-react';
import type { BoardItem, WorkspaceItem } from '../../lib/workspaceTypes';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { LinkCard } from '../Card/LinkCard';
import { getFaviconUrl } from '../../lib/favicon';
import { TodoBoardContent } from '../Widgets/TodoBoard';
import { WeatherWidget } from '../Widgets/WeatherWidget';
import { ClockWidget } from '../Widgets/ClockWidget';

interface Props {
  workspaceId: string;
  board: BoardItem;
  workspaces: WorkspaceItem[];
}

export function Board({ workspaceId, board, workspaces }: Props) {
  const { removeBoard, renameBoard, addLink, removeLink, renameLink, transferBoard, transferLink, setBoardColor, updateNoteContent, updateTodos, duplicateBoard, toggleBoardHeader, setBoardDisplayMode, setBoardIconSize, setBoardSections } =
    useWorkspaceStore();

  // Determine if this is a widget (clock, weather, note, todo) — must be before any hooks that use it
  const isWidget = board.type === 'clock' || board.type === 'weather' || board.type === 'note' || board.type === 'todo';

  const textMode = useSettingsStore((s) => s.textMode);
  const boardTextColor = useSettingsStore((s) => isWidget ? s.widgetTextColor : s.boardTextColor);
  const miscTextColor = useSettingsStore((s) => s.miscTextColor);

  // Use widget-specific or board-specific glass settings
  const boardOpacity = useSettingsStore((s) => isWidget ? s.widgetOpacity : s.boardOpacity);
  const boardRadius = useSettingsStore((s) => isWidget ? s.widgetRadius : s.boardRadius);
  const glassBlur = useSettingsStore((s) => isWidget ? s.widgetBlur : s.glassBlur);
  const glassSaturation = useSettingsStore((s) => isWidget ? s.widgetSaturation : s.glassSaturation);
  const grainIntensity = useSettingsStore((s) => isWidget ? s.widgetGrain : s.grainIntensity);
  const widgetColor = useSettingsStore((s) => s.widgetColor);
  const defaultDisplayMode = useSettingsStore((s) => s.defaultDisplayMode);
  const defaultIconSize = useSettingsStore((s) => s.defaultIconSize);
  const defaultShowSections = useSettingsStore((s) => s.defaultShowSections);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formPos, setFormPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 240 });
  const [boardContextMenu, setBoardContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const boardRef = useRef<HTMLElement | null>(null);
  const contextRef = useRef<HTMLDivElement | null>(null);
  const renameRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  // Auto-grow note widget: calculate required grid height from line count
  // Note content change — height auto-computed by grid layout
  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNoteContent(workspaceId, board.id, e.target.value);
  }, [workspaceId, board.id, updateNoteContent]);

  const { setNodeRef, isOver } = useDroppable({
    id: `board-drop-${board.id}`,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!boardRef.current) return;
      const target = event.target as Node;
      // Allow clicks inside the board or inside the portaled form
      if (boardRef.current.contains(target)) return;
      if (formRef.current && formRef.current.contains(target)) return;
      setShowForm(false);
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

  // Clamp context menu within viewport
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  useEffect(() => {
    if (!boardContextMenu || !contextRef.current) return;

    const menuRect = contextRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    let left = boardContextMenu.x;
    let top: number | undefined = boardContextMenu.y;
    let bottom: number | undefined;

    // Clamp right edge
    if (left + menuRect.width > vw - pad) {
      left = Math.max(pad, vw - menuRect.width - pad);
    }

    // Clamp bottom — flip upward if needed
    if (top + menuRect.height > vh - pad) {
      // Try flipping
      const flippedBottom = vh - boardContextMenu.y;
      if (flippedBottom + menuRect.height > vh - pad) {
        // Still overflows — just pin to top
        top = pad;
      } else {
        top = undefined;
        bottom = flippedBottom;
      }
    }

    setMenuPos({ top, bottom, left });
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
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const formW = Math.max(rect.width, 240);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Place below the board by default; flip above if not enough space
      let top = rect.bottom + 8;
      if (top + 140 > vh - 8) top = rect.top - 140 - 8;
      let left = rect.left;
      if (left + formW > vw - 8) left = Math.max(8, vw - formW - 8);
      setFormPos({ top, left, width: formW });
    }
    setShowForm(true);
  };

  // Other workspaces to transfer to (exclude current)
  const otherWorkspaces = workspaces.filter((ws) => ws.id !== workspaceId);

  // Memoize board style to avoid recalculating on every render
  const boardStyle = useMemo((): React.CSSProperties => {
    const mode = board.displayMode || defaultDisplayMode;

    // Floating mode — no background, no border, no glass
    if (mode === 'icons-floating') {
      return {
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        borderRadius: '0',
      };
    }

    const baseStyle: React.CSSProperties = {
      borderRadius: `${boardRadius}px`,
      backdropFilter: `blur(${glassBlur}px) saturate(${glassSaturation}%)`,
      WebkitBackdropFilter: `blur(${glassBlur}px) saturate(${glassSaturation}%)`,
      border: '1px solid rgba(255, 255, 255, 0.2)',
    };

    // Determine effective color:
    // Per-board color always wins (lets users override individual widgets).
    // If no per-board color, widgets fall back to the global widgetColor from settings.
    const effectiveColor = board.color || (isWidget ? widgetColor : undefined) || undefined;

    if (effectiveColor === 'clear') {
      baseStyle.background = `rgba(255, 255, 255, 0.08)`;
      baseStyle.border = '1px solid rgba(255, 255, 255, 0.15)';
    } else if (effectiveColor) {
      const hex = effectiveColor;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      baseStyle.background = `rgba(${r}, ${g}, ${b}, ${boardOpacity})`;
      baseStyle.borderColor = `${effectiveColor}aa`;
    } else {
      baseStyle.background = `rgba(250, 248, 244, ${boardOpacity})`;
    }
    // Text color: explicit user setting wins, then auto-logic, then default dark
    if (boardTextColor) {
      baseStyle.color = boardTextColor;
    } else if (textMode === 'light' || effectiveColor === 'clear') {
      baseStyle.color = '#fff';
    } else if (textMode === 'dark') {
      baseStyle.color = '#111';
    } else if (effectiveColor) {
      baseStyle.color = '#fff';
    } else {
      baseStyle.color = '#222'; // always set so form can inherit
    }
    return baseStyle;
  }, [boardRadius, glassBlur, glassSaturation, boardOpacity, textMode, board.color, isWidget, widgetColor, board.displayMode, defaultDisplayMode, boardTextColor]);

  return (
    <section
      ref={mergedRef}
      className={`td-board-panel ${isOver ? 'is-over' : ''} ${showForm ? 'is-form-open' : ''} ${(board.displayMode || defaultDisplayMode) === 'icons-floating' ? 'td-board-panel--floating' : ''}`}
      style={boardStyle}
      onContextMenu={handleBoardNameContextMenu}
    >
      {/* Grain overlay */}
      {grainIntensity > 0 && (
        <div className="td-board-grain" style={{ opacity: grainIntensity / 100 }} />
      )}

      {/* Drag handle bar */}
      <div className="td-board-drag-bar" />

      {(() => {
        const mode = board.displayMode || defaultDisplayMode;
        // All icon modes hide the header
        if (mode === 'icons-vertical' || mode === 'icons-horizontal' || mode === 'icons-floating') return false;
        if (board.type === 'clock' || board.type === 'weather') return false;
        if (board.hideHeader) return false;
        return true;
      })() && (
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
              {board.type === 'todo' && (board.todos || []).length > 0 && (
                <span className="f-board-count f-todo-header-count">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {(board.todos || []).filter((t) => t.done).length}/{(board.todos || []).length}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {board.type === 'note' ? (
        <textarea
          className="td-note-textarea"
          value={board.noteContent || ''}
          onChange={handleNoteChange}
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
      ) : (() => {
        // Link board — check display mode
        const mode = board.displayMode || defaultDisplayMode;
        const iconSz = board.iconSize || defaultIconSize;
        const sections = board.showSections ?? defaultShowSections;

        if (mode === 'icons-vertical' || mode === 'icons-horizontal' || mode === 'icons-floating') {
          // Icon-only modes
          const isHorizontal = mode === 'icons-horizontal' || mode === 'icons-floating';
          return (
            <div className={`f-icon-strip ${isHorizontal ? 'f-icon-strip--h' : 'f-icon-strip--v'} ${sections ? 'f-icon-strip--sections' : ''}`}>
              {board.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  className="f-icon-item"
                  title={link.title}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ width: iconSz, height: iconSz }}
                >
                  <img
                    src={getFaviconUrl(link.url, iconSz <= 16 ? 32 : iconSz <= 24 ? 48 : 128)}
                    alt=""
                    width={iconSz}
                    height={iconSz}
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = 'none';
                    }}
                  />
                </a>
              ))}
              {board.links.length === 0 && (
                <span className="f-icon-strip-empty" title="Right-click to add links">+</span>
              )}
            </div>
          );
        }

        // Default mode — full link list
        return (
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
        );
      })()}

      {showForm && (!board.type || board.type === 'links') &&
        createPortal(
          <div
            ref={formRef}
            className="td-floating-add-panel"
            style={{
              position: 'fixed',
              top: formPos.top,
              left: formPos.left,
              width: formPos.width,
              // Inherit the board's glass appearance
              background: boardStyle.background,
              backdropFilter: boardStyle.backdropFilter,
              WebkitBackdropFilter: boardStyle.WebkitBackdropFilter,
              borderRadius: boardStyle.borderRadius,
              border: boardStyle.border ?? '1px solid rgba(255,255,255,0.2)',
              color: miscTextColor || boardStyle.color,
              boxShadow: '0 14px 28px rgba(0,0,0,0.18)',
            }}
          >
            <div className="td-add-form">
              <input
                className="td-add-input"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { (e.currentTarget.nextElementSibling as HTMLInputElement)?.focus(); } if (e.key === 'Escape') setShowForm(false); }}
                autoFocus
              />
              <input
                className="td-add-input"
                placeholder="URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowForm(false); }}
              />
              <button
                className="td-add-save"
                type="button"
                onClick={handleSave}
              >
                Add
              </button>
            </div>
          </div>,
          document.body
        )
      }

      {/* Board context menu — portaled to body */}
      {boardContextMenu &&
        createPortal(
          <div
            ref={contextRef}
            className="td-link-context-menu"
            style={menuPos}
          >
            {(!board.type || board.type === 'links') && (
              <button
                className="td-link-context-item"
                type="button"
                onClick={handleAddLink}
              >
                <Plus size={13} strokeWidth={2} />
                <span>Add link</span>
              </button>
            )}
            {board.type !== 'clock' && board.type !== 'weather' && (board.displayMode || defaultDisplayMode) === 'default' && (
              <button
                className="td-link-context-item"
                type="button"
                onClick={handleStartRename}
              >
                <Pencil size={13} strokeWidth={2} />
                <span>Rename board</span>
              </button>
            )}
            {board.type !== 'clock' && board.type !== 'weather' && (board.displayMode || defaultDisplayMode) === 'default' && (
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
            {/* Display mode options — only for link boards */}
            {(!board.type || board.type === 'links') && (
              <>
                <div className="td-context-divider" />
                <div className="td-context-section-label">Display</div>
                {([
                  ['default', 'List', LayoutGrid],
                  ['icons-vertical', 'Icons vertical', GripVertical],
                  ['icons-horizontal', 'Icons horizontal', Columns],
                  ['icons-floating', 'Icons floating', Maximize2],
                ] as const).map(([mode, label, Icon]) => (
                  <button
                    key={mode}
                    className={`td-link-context-item ${(board.displayMode || defaultDisplayMode) === mode ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => {
                      setBoardDisplayMode(workspaceId, board.id, mode);
                      setBoardContextMenu(null);
                    }}
                  >
                    <Icon size={13} strokeWidth={2} />
                    <span>{label}</span>
                  </button>
                ))}
                {(board.displayMode || defaultDisplayMode) !== 'default' && (
                  <>
                    <div className="td-context-divider" />
                    <div className="td-context-section-label">Icon size</div>
                    <div className="td-settings-row" style={{ padding: '2px 8px 4px', gap: '3px' }}>
                      {([12, 24, 36, 48] as const).map((sz) => (
                        <button
                          key={sz}
                          className={`td-settings-pill ${(board.iconSize || defaultIconSize) === sz ? 'is-active' : ''}`}
                          type="button"
                          style={{ fontSize: '9px', padding: '3px 0' }}
                          onClick={() => {
                            setBoardIconSize(workspaceId, board.id, sz);
                            setBoardContextMenu(null);
                          }}
                        >
                          {sz}px
                        </button>
                      ))}
                    </div>
                    {((board.displayMode || defaultDisplayMode) === 'icons-horizontal' || (board.displayMode || defaultDisplayMode) === 'icons-floating') && (
                      <button
                        className={`td-link-context-item ${(board.showSections ?? defaultShowSections) ? 'is-active' : ''}`}
                        type="button"
                        onClick={() => {
                          setBoardSections(workspaceId, board.id, !(board.showSections ?? defaultShowSections));
                          setBoardContextMenu(null);
                        }}
                      >
                        <Columns size={13} strokeWidth={2} />
                        <span>Sections</span>
                      </button>
                    )}
                  </>
                )}
              </>
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
