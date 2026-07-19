import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Plus, Search } from 'lucide-react';
import { Board } from '../components/Board/Board';
import { Clock } from '../components/Widgets/Clock';
import { Toolbar } from '../components/UI/Toolbar';
import { Toast } from '../components/UI/Toast';
import { WorkspaceTabs } from '../components/UI/WorkspaceTabs';
import { bookmarkFolderToBoard } from '../lib/bookmarkImport';
import { useUiStore } from '../store/useUiStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import '../styles/global.css';

export function NewTab() {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    addWorkspace,
    addBoard,
    importBoard,
    moveLink,
    setWorkspaceWallpaper,
    getActiveWorkspace,
  } = useWorkspaceStore();

  const activeWorkspace = getActiveWorkspace();
  const { showToast } = useUiStore();
  const [search, setSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const visibleBoards = useMemo(() => {
    if (!activeWorkspace) return [];

    const query = search.trim().toLowerCase();
    if (!query) return activeWorkspace.boards;

    return activeWorkspace.boards
      .map((board) => {
        const boardMatch = board.name.toLowerCase().includes(query);
        if (boardMatch) return board;

        const filteredLinks = board.links.filter(
          (link) =>
            link.title.toLowerCase().includes(query) ||
            link.url.toLowerCase().includes(query)
        );

        return {
          ...board,
          links: filteredLinks,
        };
      })
      .filter(
        (board) =>
          board.name.toLowerCase().includes(query) || board.links.length > 0
      );
  }, [activeWorkspace, search]);

  const findBoardIdByLinkId = (linkId: string) => {
    return activeWorkspace?.boards.find((board) =>
      board.links.some((link) => link.id === linkId)
    )?.id;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!activeWorkspace) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const fromBoardId = findBoardIdByLinkId(activeId);
    if (!fromBoardId) return;

    let toBoardId: string | undefined;

    if (overId.startsWith('board-drop-')) {
      toBoardId = overId.replace('board-drop-', '');
    } else {
      toBoardId = findBoardIdByLinkId(overId);
    }

    if (!toBoardId) return;

    moveLink(activeWorkspace.id, activeId, overId, fromBoardId, toBoardId);
  };

  const handleImportBookmarks = async () => {
    if (!activeWorkspace) return;

    const tree = await chrome.bookmarks.getTree();
    const root = tree[0];
    if (!root?.children) return;

    let imported = 0;

    for (const node of root.children) {
      const board = bookmarkFolderToBoard(node);
      if (board) {
        importBoard(activeWorkspace.id, board as any);
        imported++;
      }
    }

    showToast(imported > 0 ? `Imported ${imported}` : 'No links', imported > 0 ? 'success' : 'info');
  };

  const handleExport = async () => {
    try {
      const data = await chrome.storage.local.get(null);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `tabdeck-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      showToast('Exported', 'success');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const handleImportBackup = (file?: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result;
        if (typeof result !== 'string') return;

        const parsed = JSON.parse(result);
        await chrome.storage.local.set(parsed);
        showToast('Imported', 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch {
        showToast('Invalid file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleWallpaper = (file?: File) => {
    if (!file || !activeWorkspace) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setWorkspaceWallpaper(activeWorkspace.id, result);
        showToast('Wallpaper updated', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  if (!activeWorkspace) return null;

  return (
    <div
      className="td-page"
      style={
        activeWorkspace.wallpaper
          ? {
              backgroundImage: `url(${activeWorkspace.wallpaper})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <Toast />

      <div className="td-topbar">
        <div className="td-topbar-left">
          <WorkspaceTabs
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelect={setActiveWorkspace}
            onAdd={() => addWorkspace(`Space ${workspaces.length + 1}`)}
          />
        </div>

        <div className="td-topbar-center">
          <button
            className="td-create-board-btn"
            type="button"
            onClick={() => addBoard(activeWorkspace.id)}
            title="Create board"
            aria-label="Create board"
          >
            <Plus size={18} strokeWidth={2.4} />
          </button>

          <div className="td-search-bar">
            <Search size={16} strokeWidth={2.2} />
            <input
              className="td-search-input"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="td-top-actions">
          <Clock />
          <Toolbar
            boards={activeWorkspace.boards as any}
            quickSaveBoardId=""
            setQuickSaveBoardId={() => {}}
            onImportBookmarks={handleImportBookmarks}
            onExport={handleExport}
            onImportJson={handleImportBackup}
            onWallpaper={handleWallpaper}
            onClearWallpaper={() => {
              setWorkspaceWallpaper(activeWorkspace.id, null);
              showToast('Wallpaper cleared', 'info');
            }}
          />
        </div>
      </div>

      {activeWorkspace.boards.length === 0 ? (
        <div className="td-empty-home">
          <button
            className="td-create-first"
            type="button"
            onClick={() => addBoard(activeWorkspace.id)}
          >
            Create first board
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <main className="td-board-grid">
            {visibleBoards.map((board) => (
              <Board
                key={board.id}
                workspaceId={activeWorkspace.id}
                board={board}
              />
            ))}
          </main>
        </DndContext>
      )}
    </div>
  );
}