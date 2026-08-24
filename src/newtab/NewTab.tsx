import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import RGL from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { CheckSquare, Clock as ClockIcon, CloudSun, LayoutGrid, Plus, Search, StickyNote } from 'lucide-react';
import { Board } from '../components/Board/Board';
import { Toolbar } from '../components/UI/Toolbar';
import { Toast } from '../components/UI/Toast';
import { Onboarding } from '../components/UI/Onboarding';
import { SettingsButton, applyFontCSS, applyGlassCSS } from '../components/UI/Settings';
import { useSettingsStore } from '../store/useSettingsStore';
import { WorkspaceTabs } from '../components/UI/WorkspaceTabs';
import { importBookmarkFolder, MAX_BOARDS_PER_WORKSPACE } from '../lib/bookmarkImport';
import { storeVideoBlob, deleteVideoBlob, getVideoBlob } from '../lib/videoStorage';
import { pushState, undo, redo } from '../lib/undoManager';
import { useUiStore } from '../store/useUiStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useGridDimensions } from '../lib/useGridDimensions';
import '../styles/global.css';

// Old grid system constants for migration
const OLD_COLS = 172;

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
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('tabdeck-onboarding-done');
  });
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const appSettings = useSettingsStore();
  const grid = useGridDimensions();

  // Apply all CSS settings on mount and whenever they change
  useEffect(() => {
    applyFontCSS(appSettings.fontFamily, appSettings.fontSize);
    applyGlassCSS(
      appSettings.glassBlur, appSettings.glassSaturation, appSettings.glassTint,
      appSettings.toolbarBlur, appSettings.toolbarSaturation, appSettings.toolbarTint,
      appSettings.toolbarOpacity, appSettings.toolbarRadius, appSettings.toolbarGrain
    );
  }, [
    appSettings.fontFamily,
    appSettings.fontSize,
    appSettings.glassBlur,
    appSettings.glassSaturation,
    appSettings.glassTint,
    appSettings.toolbarBlur,
    appSettings.toolbarSaturation,
    appSettings.toolbarTint,
    appSettings.toolbarOpacity,
    appSettings.toolbarRadius,
    appSettings.toolbarGrain,
  ]);

  // Auto-close toolbar timer
  useEffect(() => {
    if (!appSettings.autoCloseToolbar || !toolbarOpen) return;
    const timer = setTimeout(() => setToolbarOpen(false), appSettings.autoCloseToolbar * 1000);
    return () => clearTimeout(timer);
  }, [toolbarOpen, appSettings.autoCloseToolbar]);

  // Auto-lock layout timer
  useEffect(() => {
    if (!appSettings.autoLock) return;
    const timer = setTimeout(() => setLayoutLocked(true), appSettings.autoLock * 1000);
    const reset = () => clearTimeout(timer);
    // Reset on any interaction
    document.addEventListener('mousedown', reset, { once: true });
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', reset); };
  }, [layoutLocked, appSettings.autoLock]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  // Keyboard shortcuts + zoom prevention
  useEffect(() => {
    const state = useWorkspaceStore.getState();
    pushState({ workspaces: state.workspaces, activeWorkspaceId: state.activeWorkspaceId });

    const unsub = useWorkspaceStore.subscribe((state) => {
      pushState({ workspaces: state.workspaces, activeWorkspaceId: state.activeWorkspaceId });
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;

      // Prevent zoom
      if (ctrl && !alt && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault();
      }

      // Ctrl+Z — undo
      if (ctrl && !alt && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        const prev = undo() as any;
        if (prev) useWorkspaceStore.setState({ workspaces: prev.workspaces, activeWorkspaceId: prev.activeWorkspaceId });
      }

      // Ctrl+Y — redo
      if (ctrl && !alt && !e.shiftKey && e.code === 'KeyY') {
        e.preventDefault();
        const next = redo() as any;
        if (next) useWorkspaceStore.setState({ workspaces: next.workspaces, activeWorkspaceId: next.activeWorkspaceId });
      }

      // Ctrl+B — new bookmark board
      if (ctrl && !alt && !e.shiftKey && e.code === 'KeyB') {
        e.preventDefault();
        const ws = useWorkspaceStore.getState().getActiveWorkspace();
        if (ws && ws.boards.length < MAX_BOARDS_PER_WORKSPACE) useWorkspaceStore.getState().addBoard(ws.id);
      }

      // Ctrl+M — toggle toolbar
      if (ctrl && !alt && e.code === 'KeyM') {
        e.preventDefault();
        setToolbarOpen((v) => !v);
      }

      // Alt shortcuts (work regardless of toolbar state)
      if (alt && !ctrl && !e.shiftKey) {
        const ws = useWorkspaceStore.getState().getActiveWorkspace();
        const canAdd = ws && ws.boards.length < MAX_BOARDS_PER_WORKSPACE;

        switch (e.code) {
          case 'KeyN': // Note
            e.preventDefault();
            if (canAdd && ws) useWorkspaceStore.getState().addNoteBoard(ws.id);
            break;
          case 'KeyW': // Weather
            e.preventDefault();
            if (canAdd && ws) {
              useWorkspaceStore.getState().addBoard(ws.id, 'Weather');
              setTimeout(() => {
                const s = useWorkspaceStore.getState();
                const w = s.getActiveWorkspace();
                const last = w?.boards[w.boards.length - 1];
                if (last?.name === 'Weather') {
                  useWorkspaceStore.setState((st) => ({
                    workspaces: st.workspaces.map((wk) =>
                      wk.id === ws.id ? { ...wk, boards: wk.boards.map((b) => b.id === last.id ? { ...b, type: 'weather' as const } : b) } : wk
                    ),
                  }));
                }
              }, 50);
            }
            break;
          case 'KeyT': // Todo
            e.preventDefault();
            if (canAdd && ws) useWorkspaceStore.getState().addTodoBoard(ws.id);
            break;
          case 'KeyC': // Clock
            e.preventDefault();
            if (canAdd && ws) useWorkspaceStore.getState().addClockBoard(ws.id);
            break;
          case 'KeyL': // Lock/unlock
            e.preventDefault();
            setLayoutLocked((v) => !v);
            break;
          case 'KeyS': // Focus search
            e.preventDefault();
            (document.querySelector('.td-search-input') as HTMLInputElement)?.focus();
            break;
          case 'KeyE': // Export JSON
            e.preventDefault();
            handleExport();
            break;
          case 'KeyI': // Import JSON
            e.preventDefault();
            (document.querySelector('input[accept="application/json"]') as HTMLInputElement)?.click();
            break;
          case 'KeyP': // Wallpaper
            e.preventDefault();
            (document.querySelector('input[accept="image/*,video/mp4,video/webm"]') as HTMLInputElement)?.click();
            break;
          case 'KeyX': // Wipe everything
            e.preventDefault();
            if (confirm('Clear ALL boards, links, and wallpapers from this workspace? Cannot be undone.')) {
              const wsId = useWorkspaceStore.getState().activeWorkspaceId;
              useWorkspaceStore.setState((s) => ({
                workspaces: s.workspaces.map((w) =>
                  w.id === wsId ? { ...w, boards: [], wallpaper: null, videoWallpaper: null, updatedAt: Date.now() } : w
                ),
              }));
              showToast('Workspace cleared', 'info');
            }
            break;
        }
        return;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      unsub();
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

  // Pure 24px grid system — each row = 24px, each link = 1 row, board name = 1 row
  // h = 1 (name) + linkCount, or just linkCount if header hidden

  // Default board width in grid units
  const DEFAULT_W = 14; // 14 × 24px = 336px

  const getContentH = (linkCount: number, hideHeader?: boolean) => {
    const headerRows = hideHeader ? 0 : 1;
    return Math.max(headerRows + linkCount, 3);
  };

  const gridLayout = useMemo(() => {
    if (!activeWorkspace) return [];

    return visibleBoards.map((board, index) => {
      // Always calculate height from actual content
      const contentH = getContentH(board.links.length, board.hideHeader);

      if (board.layout) {
        // Migrate old 172-col layouts to new column count
        const needsMigration = board.layout.w > grid.cols || board.layout.x + board.layout.w > grid.cols + 5;
        const x = needsMigration ? Math.round(board.layout.x * grid.cols / OLD_COLS) : board.layout.x;
        const w = needsMigration ? Math.round(board.layout.w * grid.cols / OLD_COLS) : board.layout.w;

        return {
          i: board.id,
          x: Math.min(x, grid.cols - w),
          y: board.layout.y,
          w: Math.max(w, 4),
          h: contentH,
          minW: 4,
        };
      }

      // Default: spread boards in rows
      const boardsPerRow = Math.floor(grid.cols / (DEFAULT_W + 1));
      const col = index % Math.max(boardsPerRow, 1);
      const row = Math.floor(index / Math.max(boardsPerRow, 1));

      return {
        i: board.id,
        x: col * (DEFAULT_W + 1),
        y: row * (contentH + 1),
        w: DEFAULT_W,
        h: contentH,
        minW: 4,
      };
    });
  }, [activeWorkspace, visibleBoards, grid.cols]);

  const handleGridLayoutChange = (layout: RGL.Layout[]) => {
    if (!activeWorkspace) return;

    const layouts = layout.map((item) => ({
      id: item.i,
      x: item.x,
      y: item.y,
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

    if (!confirm('Clear ALL boards, links, notes, and wallpapers from this workspace? This cannot be undone.')) {
      return;
    }

    if (activeWorkspace.videoWallpaper) {
      await deleteVideoBlob(activeWorkspace.videoWallpaper).catch(() => {});
    }

    setWorkspaceWallpaper(activeWorkspace.id, null);
    setVideoWallpaper(activeWorkspace.id, null);
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
      setVideoObjectUrl(null);
    }

    // Clear all boards
    useWorkspaceStore.setState((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === activeWorkspace.id ? { ...w, boards: [], wallpaper: null, videoWallpaper: null, updatedAt: Date.now() } : w
      ),
    }));

    showToast('Workspace cleared', 'info');
  };

  if (!activeWorkspace) return null;

  const hasVideoWallpaper = !!videoObjectUrl;
  const wallpaperUrl = hasVideoWallpaper ? undefined : (activeWorkspace.wallpaper || '/tabdeck.png');

  return (
    <div
      className={`td-page ${appSettings.textMode === 'light' ? 'td-text-light' : appSettings.textMode === 'dark' ? 'td-text-dark' : ''}`}
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

      {showOnboarding && (
        <Onboarding
          onComplete={() => {
            localStorage.setItem('tabdeck-onboarding-done', '1');
            setShowOnboarding(false);
          }}
        />
      )}

      <div className="td-topbar" style={{ justifyContent: appSettings.toolbarPosition === 'center' ? 'center' : appSettings.toolbarPosition === 'right' ? 'flex-end' : 'flex-start' }}>
        {/* Logo toggle button — always visible */}
        <button
          className="td-logo-btn"
          type="button"
          onClick={() => setToolbarOpen((v) => !v)}
          title="Toggle toolbar"
          aria-label="Toggle toolbar"
        >
          <img src="/icons/icon128.png" alt="TabDeck" />
        </button>

        {/* Toolbar row — slides in/out */}
        <div className={`td-topbar-row ${toolbarOpen ? 'is-open' : ''}`}>
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

            {/* Widgets dropdown */}
            <div className="td-widgets-wrapper">
              <button
                className="td-create-board-btn"
                type="button"
                onClick={() => setWidgetsOpen((v) => !v)}
                title="Widgets"
                aria-label="Widgets"
              >
                <LayoutGrid size={16} strokeWidth={2.2} />
              </button>

              {widgetsOpen && (
                <div className="td-widgets-dropdown">
                  <button
                    className="td-link-context-item"
                    type="button"
                    onClick={() => {
                      setWidgetsOpen(false);
                      if (activeWorkspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) { showToast('Workspace full', 'error'); return; }
                      useWorkspaceStore.getState().addNoteBoard(activeWorkspace.id);
                    }}
                  >
                    <StickyNote size={14} strokeWidth={2} />
                    <span>Note</span>
                  </button>
                  <button
                    className="td-link-context-item"
                    type="button"
                    onClick={() => {
                      setWidgetsOpen(false);
                      if (activeWorkspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) { showToast('Workspace full', 'error'); return; }
                      useWorkspaceStore.getState().addTodoBoard(activeWorkspace.id);
                    }}
                  >
                    <CheckSquare size={14} strokeWidth={2} />
                    <span>Todo List</span>
                  </button>
                  <button
                    className="td-link-context-item"
                    type="button"
                    onClick={() => {
                      setWidgetsOpen(false);
                      if (activeWorkspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) { showToast('Workspace full', 'error'); return; }
                      useWorkspaceStore.getState().addBoard(activeWorkspace.id, 'Weather');
                      setTimeout(() => {
                        const state = useWorkspaceStore.getState();
                        const ws = state.getActiveWorkspace();
                        const lastBoard = ws?.boards[ws.boards.length - 1];
                        if (lastBoard && lastBoard.name === 'Weather') {
                          useWorkspaceStore.setState((s) => ({
                            workspaces: s.workspaces.map((w) =>
                              w.id === activeWorkspace.id
                                ? { ...w, boards: w.boards.map((b) => b.id === lastBoard.id ? { ...b, type: 'weather' as const } : b) }
                                : w
                            ),
                          }));
                        }
                      }, 50);
                    }}
                  >
                    <CloudSun size={14} strokeWidth={2} />
                    <span>Weather</span>
                  </button>
                  <button
                    className="td-link-context-item"
                    type="button"
                    onClick={() => {
                      setWidgetsOpen(false);
                      if (activeWorkspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) { showToast('Workspace full', 'error'); return; }
                      useWorkspaceStore.getState().addClockBoard(activeWorkspace.id);
                    }}
                  >
                    <ClockIcon size={14} strokeWidth={2} />
                    <span>Clock</span>
                  </button>
                </div>
              )}
            </div>

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
              onClick={() => {
                setLayoutLocked((v) => {
                  showToast(!v ? 'Layout locked' : 'Layout unlocked', 'info');
                  return !v;
                });
              }}
              title={layoutLocked ? 'Unlock layout' : 'Lock layout'}
              aria-label={layoutLocked ? 'Unlock layout' : 'Lock layout'}
            >
              {layoutLocked ? '🔒' : '🔓'}
            </button>
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
          <RGL
            className="td-board-grid"
            layout={gridLayout}
            cols={grid.cols}
            rowHeight={24}
            width={grid.width}
            margin={[0, 0]}
            containerPadding={[0, 0]}
            isDraggable={!layoutLocked}
            isResizable={!layoutLocked}
            isBounded={true}
            compactType={null}
            preventCollision={true}
            autoSize={false}
            style={{ height: grid.height, width: grid.width }}
            draggableHandle=".td-board-drag-bar"
            onDragStop={handleGridLayoutChange}
            onResizeStop={handleGridLayoutChange}
            resizeHandles={['e']}
            resizeHandle={<span className="f-resize-bar" />}
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
          </RGL>
        </DndContext>
      )}

      <SettingsButton onResetOnboarding={() => {
        localStorage.removeItem('tabdeck-onboarding-done');
        setShowOnboarding(true);
      }} />
    </div>
  );
}
