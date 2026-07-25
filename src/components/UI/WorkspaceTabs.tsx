import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import type { WorkspaceItem } from '../../lib/workspaceTypes';

interface Props {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string;
  onSelect: (workspaceId: string) => void;
  onAdd: () => void;
  onRename: (workspaceId: string, name: string) => void;
  onDelete: (workspaceId: string) => void;
}

export function WorkspaceTabs({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    workspaceId: string;
    x: number;
    y: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextRef = useRef<HTMLDivElement | null>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

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

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitRename();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, workspaceId: string) => {
    e.preventDefault();
    setContextMenu({ workspaceId, x: e.clientX, y: e.clientY });
  };

  const handleStartRename = () => {
    if (!contextMenu) return;
    const ws = workspaces.find((w) => w.id === contextMenu.workspaceId);
    if (ws) {
      setEditingId(ws.id);
      setEditValue(ws.name);
    }
    setContextMenu(null);
  };

  const handleDelete = () => {
    if (!contextMenu) return;

    if (workspaces.length <= 1) {
      setContextMenu(null);
      return;
    }

    onDelete(contextMenu.workspaceId);
    setContextMenu(null);
  };

  const handleShareWorkspace = () => {
    if (!contextMenu) return;

    const ws = workspaces.find((w) => w.id === contextMenu.workspaceId);
    if (!ws) return;

    const exportData = JSON.stringify(ws, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `tabdeck-workspace-${ws.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setContextMenu(null);
  };

  return (
    <>
      <div className="td-workspace-tabs" role="tablist" aria-label="Workspaces">
        {workspaces.map((workspace) => {
          const isActive = workspace.id === activeWorkspaceId;
          const isEditing = editingId === workspace.id;

          return isEditing ? (
            <input
              key={workspace.id}
              ref={inputRef}
              className="td-workspace-tab-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              maxLength={20}
            />
          ) : (
            <button
              key={workspace.id}
              className={`td-workspace-tab ${isActive ? 'is-active' : ''}`}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onSelect(workspace.id)}
              onContextMenu={(e) => handleContextMenu(e, workspace.id)}
              data-tooltip={`${workspace.name} — right-click for options`}
            >
              {workspace.name}
            </button>
          );
        })}

        <button
          className="td-workspace-add"
          type="button"
          onClick={onAdd}
          title="Create workspace"
          aria-label="Create workspace"
        >
          <Plus size={16} strokeWidth={2.4} />
        </button>
      </div>

      {/* Context menu portaled to body */}
      {contextMenu &&
        createPortal(
          <div
            ref={contextRef}
            className="td-link-context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="td-link-context-item"
              type="button"
              onClick={handleStartRename}
            >
              <Pencil size={13} strokeWidth={2} />
              <span>Rename workspace</span>
            </button>
            <button
              className="td-link-context-item"
              type="button"
              onClick={handleShareWorkspace}
            >
              <Download size={13} strokeWidth={2} />
              <span>Export workspace</span>
            </button>
            <div className="td-context-divider" />
            <button
              className="td-link-context-item td-link-context-delete"
              type="button"
              onClick={handleDelete}
              disabled={workspaces.length <= 1}
            >
              <Trash2 size={13} strokeWidth={2} />
              <span>Delete workspace</span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
