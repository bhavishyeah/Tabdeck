import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import RGL, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Plus, Search, StickyNote } from 'lucide-react';
import { Board } from '../components/Board/Board';
import { Clock } from '../components/Widgets/Clock';
import { Toolbar } from '../components/UI/Toolbar';
import { Toast } from '../components/UI/Toast';
import { WorkspaceTabs } from '../components/UI/WorkspaceTabs';
import { importBookmarkFolder, MAX_BOARDS_PER_WORKSPACE } from '../lib/bookmarkImport';
import { storeVideoBlob, deleteVideoBlob, getVideoBlob } from '../lib/videoStorage';
import { useUiStore } from '../store/useUiStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import '../styles/global.css';

const ReactGridLayout = WidthProvider(RGL);

const WORKSPACE_STORE_KEY = 'tabdeck-workspaces';
const LEGACY_BOARD_STORE_KEY = 'tabdeck-board-store';
const QUICK_SAVE_BOARD_KEY = 'tabdeck-quick-save-board-id';

type ImportedSavedLink = {
  id?: string;
  title?: string;
  url?: string;
  favicon?: string;
  createdAt?: number;
  updatedAt?: number;
};

type ImportedSavedBoard = {
  id?: string;
  name?: string;
  color?: string;
  links?: ImportedSavedLink[];
  createdAt?: number;
  updatedAt?: number;
};

type ImportedSavedBoardStore = {
  state?: {
    boards?: ImportedSavedBoard[];
  };
};

function storageSet(items: Record<string, unknown>) {
  return new Promise<void>((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve();
    });
  });
}

function storageGet(keys: string[]) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(result as Record<string, unknown>);
    });
  });
}

function storageGetAll() {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    chrome.storage.local.get(null, (result) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(result as Record<string, unknown>);
    });
  });
}

function normalizeImportedBoardStore(raw: unknown): ImportedSavedBoardStore | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ImportedSavedBoardStore;
    } catch {
      return null;
    }
  }

  if (typeof raw === 'object') {
    return raw as ImportedSavedBoardStore;
  }

  return null;
}

function getBookmarkSubTree(id: string) {
  return new Promise<chrome.bookmarks.BookmarkTreeNode[]>((resolve, reject) => {
    chrome.bookmarks.getSubTree(id, (nodes) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(nodes);
    });
  });
}

export function NewTab() {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    addWorkspace,
    renameWorkspace,
    removeWorkspace,
    addBoard,
    importBoard,
    updateBoardLayouts,
    moveLink,
    setWorkspaceWallpaper,
    setVideoWallpaper,
    getActiveWorkspace,
  } = useWorkspaceStore();

  const activeWorkspace = getActiveWorkspace();
  const { showToast } = useUiStore();
  const [search, setSearch] = useState('');
  const [quickSaveBoardId, setQuickSaveBoardId] = useState('');
  const [layoutLocked, setLayoutLocked] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  // Prevent browser zoom + keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent zoom
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault();
      }

      // Ctrl+B — create new board
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'b') {
        e.preventDefault();
        const ws = useWorkspaceStore.getState().getActiveWorkspace();
        if (ws && ws.boards.length < MAX_BOARDS_PER_WORKSPACE) {
          useWorkspaceStore.getState().addBoard(ws.id);
        }
      }

      // Ctrl+Shift+B — create new note
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        const ws = useWorkspaceStore.getState().getActiveWorkspace();
        if (ws && ws.boards.length < MAX_BOARDS_PER_WORKSPACE) {
          useWorkspaceStore.getState().addNoteBoard(ws.id);
        }
      }

      // Ctrl+M — toggle layout lock
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        setLayoutLocked((v) => !v);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    storageGet([QUICK_SAVE_BOARD_KEY])
      .then((result) => {
        if (typeof result[QUICK_SAVE_BOARD_KEY] === 'string') {
          setQuickSaveBoardId(result[QUICK_SAVE_BOARD_KEY] as string);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;

    const effectiveQuickSaveBoardId =
      quickSaveBoardId || activeWorkspace.boards[0]?.id || '';

    if (!effectiveQuickSaveBoardId) return;

    storageSet({
      [QUICK_SAVE_BOARD_KEY]: effectiveQuickSaveBoardId,
    }).catch(() => {});
  }, [quickSaveBoardId, activeWorkspace]);

  useEffect(() => {
    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local') return;

      const next = changes[QUICK_SAVE_BOARD_KEY]?.newValue;
      if (typeof next === 'string') {
        setQuickSaveBoardId(next);
      }
    };

    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => chrome.storage.onChanged.removeListener(onStorageChanged);
  }, []);

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

    if (activeId === overId) return;

    // Find which board the dragged link belongs to
    const fromBoardId = findBoardIdByLinkId(activeId);
    if (!fromBoardId) return;

    // Determine the target board
    let toBoardId: string | undefined;
    if (overId.startsWith('board-drop-')) {
      toBoardId = overId.replace('board-drop-', '');
    } else {
      toBoardId = findBoardIdByLinkId(overId);
    }

    if (!toBoardId) return;

    // Same board — reorder
    if (fromBoardId === toBoardId) {
      const board = activeWorkspace.boards.find((b) => b.id === fromBoardId);
      if (!board) return;
      const fromIndex = board.links.findIndex((l) => l.id === activeId);
      const toIndex = board.links.findIndex((l) => l.id === overId);
      if (fromIndex !== -1 && toIndex !== -1) {
        useWorkspaceStore.getState().reorderLinks(activeWorkspace.id, fromBoardId, fromIndex, toIndex);
      }
      return;
    }

    // Different board — move
    moveLink(activeWorkspace.id, activeId, overId, fromBoardId, toBoardId);
  };

  // Generate layout for react-grid-layout (172×85 hyper-dense grid)
  // Cell: 6×6px, margin: [4,4]. Zero leftover pixels.
  // Width: 172×6 + 171×4 = 1716px. Height: 85×6 + 84×4 = 846px.
  // Board w:34 = 336px. Board h:23 = 226px (fits 7 links).
  const MAX_ROWS = 85;
  const CELL = 6;
  const GAP = 4;
  const HEADER_PX = 45;
  const LINK_PX = 26;

  const getContentH = (linkCount: number) => {
    const contentPx = HEADER_PX + linkCount * LINK_PX;
    // Convert px to grid units: h units = ceil(contentPx / (CELL + GAP))
    return Math.max(Math.ceil(contentPx / (CELL + GAP)), 5);
  };

  const gridLayout = useMemo(() => {
    if (!activeWorkspace) return [];

    return visibleBoards.map((board, index) => {
      const contentH = getContentH(board.links.length);

      if (board.layout) {
        return {
          i: board.id,
          x: board.layout.x,
          y: board.layout.y,
          w: board.layout.w,
          h: board.layout.h,
          minW: 10,
          minH: 5,
        };
      }

      // Default: 5 boards per row (w:34 each, 5×34 = 170 out of 172)
      const col = index % 5;
      const row = Math.floor(index / 5);

      return {
        i: board.id,
        x: col * 34 + (col > 0 ? col * 0 : 0),
        y: row * (contentH + 2),
        w: 34,
        h: contentH,
        minW: 10,
        minH: 5,
      };
    });
  }, [activeWorkspace, visibleBoards]);

  const handleGridLayoutChange = (layout: RGL.Layout[]) => {
    if (!activeWorkspace) return;

    const layouts = layout.map((item) => ({
      id: item.i,
      x: item.x,
      y: Math.min(item.y, MAX_ROWS - item.h),
      w: item.w,
      h: item.h,
    }));

    updateBoardLayouts(activeWorkspace.id, layouts);
  };

const handleImportBookmarks = async (folderId?: string) => {
  if (!activeWorkspace) return;

  if (!folderId || typeof folderId !== 'string') {
    showToast('Select a valid bookmarks folder', 'error');
    return;
  }

  try {
    const nodes = await getBookmarkSubTree(folderId);
    const root = nodes?.[0];

    if (!root) {
      showToast('Bookmarks folder not found', 'error');
      return;
    }

    const { boards, overflow } = importBookmarkFolder(
      root,
      activeWorkspace.boards.length
    );

    if (boards.length === 0 && overflow.length === 0) {
      showToast('No bookmark links found in this folder', 'error');
      return;
    }

    // Import boards into current workspace
    for (const board of boards) {
      importBoard(activeWorkspace.id, board as any);
    }

    // If overflow, create a new workspace for them
    if (overflow.length > 0) {
      const overflowName = `Overflow (${root.title || 'Import'})`;
      addWorkspace(overflowName);

      // Small delay to let store update, then import overflow boards
      setTimeout(() => {
        const state = useWorkspaceStore.getState();
        const overflowWorkspace = state.workspaces.find(
          (ws) => ws.name === overflowName
        );
        if (overflowWorkspace) {
          for (const board of overflow) {
            state.importBoard(overflowWorkspace.id, board as any);
          }
        }
      }, 50);

      const totalImported = boards.reduce((sum, b) => sum + b.links.length, 0);
      const totalOverflow = overflow.reduce((sum, b) => sum + b.links.length, 0);
      showToast(
        `${totalImported} bookmarks here, ${totalOverflow} saved to "${overflowName}"`,
        'info'
      );
    } else {
      const totalImported = boards.reduce((sum, b) => sum + b.links.length, 0);
      showToast(`${totalImported} bookmarks imported`, 'success');
    }
  } catch (error) {
    console.error('Bookmarks import failed:', error);
    showToast('Bookmarks import failed', 'error');
  }
};

  const handleExport = async () => {
    try {
      const data = await storageGetAll();
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

        const parsed = JSON.parse(result) as Record<string, unknown>;

        const alreadyNewStore = parsed[WORKSPACE_STORE_KEY];
        const legacyBoardStore = normalizeImportedBoardStore(
          parsed[LEGACY_BOARD_STORE_KEY]
        );
        const legacyBoards = legacyBoardStore?.state?.boards ?? [];
        const importedQuickSaveBoardId =
          typeof parsed[QUICK_SAVE_BOARD_KEY] === 'string'
            ? (parsed[QUICK_SAVE_BOARD_KEY] as string)
            : '';

        const payloadToWrite: Record<string, unknown> = { ...parsed };

        if (!alreadyNewStore && legacyBoards.length > 0) {
          const now = Date.now();
          const workspaceId = crypto.randomUUID();

          const migratedBoards = legacyBoards.map((board) => ({
            id: String(board.id ?? crypto.randomUUID()),
            name: board.name ?? 'New Board',
            color: board.color ?? '',
            links: Array.isArray(board.links)
              ? board.links
                  .filter((link) => !!link?.url)
                  .map((link) => ({
                    id: String(link.id ?? crypto.randomUUID()),
                    title: link.title ?? link.url ?? 'Untitled',
                    url: link.url ?? '',
                    favicon: link.favicon ?? '',
                    createdAt: link.createdAt ?? now,
                    updatedAt: link.updatedAt ?? now,
                  }))
              : [],
            createdAt: board.createdAt ?? now,
            updatedAt: board.updatedAt ?? now,
          }));

          const migratedStore = {
            state: {
              workspaces: [
                {
                  id: workspaceId,
                  name: 'Home',
                  boards: migratedBoards,
                  wallpaper: null,
                  createdAt: now,
                  updatedAt: now,
                },
              ],
              activeWorkspaceId: workspaceId,
            },
            version: 0,
          };

          payloadToWrite[WORKSPACE_STORE_KEY] = JSON.stringify(migratedStore);

          if (!importedQuickSaveBoardId && migratedBoards[0]?.id) {
            payloadToWrite[QUICK_SAVE_BOARD_KEY] = migratedBoards[0].id;
          }
        }

        await storageSet(payloadToWrite);
        showToast('Imported', 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch {
        showToast('Invalid file', 'error');
      }
    };

    reader.readAsText(file);
  };

  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);

  // Load video wallpaper from IndexedDB on mount/workspace change
  useEffect(() => {
    if (!activeWorkspace?.videoWallpaper) {
      setVideoObjectUrl(null);
      return;
    }

    let url: string | null = null;

    getVideoBlob(activeWorkspace.videoWallpaper)
      .then((blob) => {
        if (blob) {
          url = URL.createObjectURL(blob);
          setVideoObjectUrl(url);
        }
      })
      .catch(() => setVideoObjectUrl(null));

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [activeWorkspace?.videoWallpaper]);

  const handleWallpaper = async (file?: File) => {
    if (!file || !activeWorkspace) return;

    // Video files → store in IndexedDB + create object URL for immediate playback
    if (file.type.startsWith('video/')) {
      try {
        const videoKey = `video-${activeWorkspace.id}`;
        await storeVideoBlob(videoKey, file);
        setVideoWallpaper(activeWorkspace.id, videoKey);
        // Create immediate object URL for playback
        const url = URL.createObjectURL(file);
        setVideoObjectUrl(url);
        showToast('Video wallpaper applied', 'success');
      } catch (err) {
        console.error('Failed to store video:', err);
        showToast('Failed to apply video wallpaper', 'error');
      }
      return;
    }

    // Image/GIF → store as data URL
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setWorkspaceWallpaper(activeWorkspace.id, result);
        setVideoObjectUrl(null);
        showToast('Wallpaper updated', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearWallpaper = async () => {
    if (!activeWorkspace) return;

    if (activeWorkspace.videoWallpaper) {
      await deleteVideoBlob(activeWorkspace.videoWallpaper).catch(() => {});
    }

    setWorkspaceWallpaper(activeWorkspace.id, null);
    setVideoWallpaper(activeWorkspace.id, null);
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
      setVideoObjectUrl(null);
    }
    showToast('Wallpaper cleared', 'info');
  };

  if (!activeWorkspace) return null;

  const hasVideoWallpaper = !!videoObjectUrl;
  const wallpaperUrl = hasVideoWallpaper ? undefined : (activeWorkspace.wallpaper || '/tabdeck.png');

  return (
    <div
      className="td-page"
      style={
        wallpaperUrl
          ? {
              backgroundImage: `url(${wallpaperUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { backgroundColor: '#0a0a0a' }
      }
    >
      {hasVideoWallpaper && (
        <video
          className="td-video-wallpaper"
          src={videoObjectUrl}
          autoPlay
          loop
          muted
          playsInline
        />
      )}
      <Toast />

      <div className="td-topbar">
        <div className="td-topbar-row">
          <div className="td-topbar-left">
            <WorkspaceTabs
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onSelect={setActiveWorkspace}
              onAdd={() => addWorkspace(`Space ${workspaces.length + 1}`)}
              onRename={renameWorkspace}
              onDelete={removeWorkspace}
            />
          </div>

          <div className="td-topbar-center">
            <button
              className="td-create-board-btn"
              type="button"
              onClick={() => {
                if (activeWorkspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) {
                  showToast('Workspace is full (max 10 boards)', 'error');
                  return;
                }
                addBoard(activeWorkspace.id);
              }}
              title="Create board (Ctrl+B)"
              aria-label="Create board"
            >
              <Plus size={18} strokeWidth={2.4} />
            </button>

            <button
              className="td-create-board-btn"
              type="button"
              onClick={() => {
                if (activeWorkspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) {
                  showToast('Workspace is full (max 10 boards)', 'error');
                  return;
                }
                useWorkspaceStore.getState().addNoteBoard(activeWorkspace.id);
              }}
              title="Create note (Ctrl+Shift+B)"
              aria-label="Create note"
            >
              <StickyNote size={16} strokeWidth={2.2} />
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
            <button
              className={`td-lock-btn ${layoutLocked ? 'is-locked' : ''}`}
              type="button"
              onClick={() => setLayoutLocked((v) => !v)}
              title={layoutLocked ? 'Unlock layout' : 'Lock layout'}
              aria-label={layoutLocked ? 'Unlock layout' : 'Lock layout'}
            >
              {layoutLocked ? '🔒' : '🔓'}
            </button>
            <Clock />
            <Toolbar
              boards={activeWorkspace.boards as any}
              quickSaveBoardId={quickSaveBoardId}
              setQuickSaveBoardId={setQuickSaveBoardId}
              onImportBookmarks={handleImportBookmarks}
              onExport={handleExport}
              onImportJson={handleImportBackup}
              onWallpaper={handleWallpaper}
              onClearWallpaper={handleClearWallpaper}
            />
          </div>
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
          <ReactGridLayout
            className="td-board-grid"
            layout={gridLayout}
            cols={172}
            rowHeight={6}
            maxRows={85}
            margin={[4, 4]}
            containerPadding={[0, 0]}
            isDraggable={!layoutLocked}
            isResizable={!layoutLocked}
            isBounded={true}
            compactType={null}
            preventCollision={true}
            draggableHandle=".td-board-drag-bar"
            onLayoutChange={handleGridLayoutChange}
          >
            {visibleBoards.map((board) => (
              <div key={board.id}>
                <Board
                  workspaceId={activeWorkspace.id}
                  board={board}
                  workspaces={workspaces}
                />
              </div>
            ))}
          </ReactGridLayout>
        </DndContext>
      )}
    </div>
  );
}