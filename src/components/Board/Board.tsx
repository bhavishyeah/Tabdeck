import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus, Trash2 } from 'lucide-react';
import type { BoardItem } from '../../lib/workspaceTypes';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { LinkCard } from '../Card/LinkCard';

interface Props {
  workspaceId: string;
  board: BoardItem;
}

export function Board({ workspaceId, board }: Props) {
  const { removeBoard, renameBoard, addLink, removeLink } = useWorkspaceStore();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [showForm, setShowForm] = useState(false);
  const boardRef = useRef<HTMLElement | null>(null);

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

  return (
    <section
      ref={mergedRef}
      className={`td-board-panel ${isOver ? 'is-over' : ''} ${showForm ? 'is-form-open' : ''}`}
    >
      <div className="td-board-top">
        <input
          className="td-board-name"
          value={board.name}
          onChange={(e) => renameBoard(workspaceId, board.id, e.target.value)}
          spellCheck={false}
        />

        <div className="td-board-top-actions">
          <button
            className={`td-board-icon ${showForm ? 'is-active' : ''}`}
            type="button"
            onClick={() => setShowForm((v) => !v)}
            title="Add link"
            aria-label="Add link"
          >
            <Plus size={20} strokeWidth={2.4} />
          </button>

          <button
            className="td-board-icon"
            type="button"
            onClick={() => removeBoard(workspaceId, board.id)}
            title="Delete board"
            aria-label="Delete board"
          >
            <Trash2 size={19} strokeWidth={2.3} />
          </button>
        </div>
      </div>

      <div className="td-board-links">
        {board.links.length === 0 ? (
          <div className="td-board-empty">Drop here</div>
        ) : (
          board.links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              onDelete={() => removeLink(workspaceId, board.id, link.id)}
            />
          ))
        )}
      </div>

      {showForm && (
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
    </section>
  );
}