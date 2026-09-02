type SavedLink = {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt?: number;
  updatedAt?: number;
};

type SavedBoard = {
  id: string;
  name: string;
  color?: string;
  links: SavedLink[];
  createdAt?: number;
  updatedAt?: number;
};

type SavedWorkspace = {
  id: string;
  name: string;
  boards: SavedBoard[];
  wallpaper?: string | null;
  createdAt?: number;
  updatedAt?: number;
};

type PersistedWorkspaceStore = {
  state?: {
    workspaces?: SavedWorkspace[];
    activeWorkspaceId?: string;
  };
  version?: number;
};

type LegacyBoardStore = {
  state?: {
    boards?: SavedBoard[];
  };
};

const WORKSPACE_STORE_KEY = 'frontly-workspaces';
const LEGACY_BOARD_STORE_KEY = 'frontly-board-store';
const QUICK_SAVE_BOARD_KEY = 'frontly-quick-save-board-id';
const DEBUG_KEY = 'frontly-last-quick-save-debug';

// Old TabDeck key names — checked once for migration
const OLD_WORKSPACE_KEY = 'tabdeck-workspaces';
const OLD_BOARD_KEY = 'tabdeck-board-store';
const OLD_QUICK_SAVE_KEY = 'tabdeck-quick-save-board-id';
const MIGRATION_DONE_KEY = 'frontly-migrated-from-tabdeck';

/**
 * One-time migration: copy tabdeck-* chrome.storage keys to frontly-* equivalents.
 * Runs at the start of saveCurrentTab so it covers users who never opened a new tab
 * after the rename (e.g. users who only use the keyboard shortcut).
 */
async function runBackgroundMigrationIfNeeded() {
  const flagResult = await chrome.storage.local.get(MIGRATION_DONE_KEY);
  if (flagResult[MIGRATION_DONE_KEY]) return;

  const oldData = await chrome.storage.local.get([OLD_WORKSPACE_KEY, OLD_BOARD_KEY, OLD_QUICK_SAVE_KEY]);
  const toWrite: Record<string, unknown> = { [MIGRATION_DONE_KEY]: true };
  const toRemove: string[] = [];

  if (oldData[OLD_WORKSPACE_KEY] !== undefined) {
    const existing = await chrome.storage.local.get(WORKSPACE_STORE_KEY);
    if (!existing[WORKSPACE_STORE_KEY]) {
      toWrite[WORKSPACE_STORE_KEY] = oldData[OLD_WORKSPACE_KEY];
    }
    toRemove.push(OLD_WORKSPACE_KEY);
  }
  if (oldData[OLD_BOARD_KEY] !== undefined) {
    const existing = await chrome.storage.local.get(LEGACY_BOARD_STORE_KEY);
    if (!existing[LEGACY_BOARD_STORE_KEY]) {
      toWrite[LEGACY_BOARD_STORE_KEY] = oldData[OLD_BOARD_KEY];
    }
    toRemove.push(OLD_BOARD_KEY);
  }
  if (oldData[OLD_QUICK_SAVE_KEY] !== undefined) {
    const existing = await chrome.storage.local.get(QUICK_SAVE_BOARD_KEY);
    if (!existing[QUICK_SAVE_BOARD_KEY]) {
      toWrite[QUICK_SAVE_BOARD_KEY] = oldData[OLD_QUICK_SAVE_KEY];
    }
    toRemove.push(OLD_QUICK_SAVE_KEY);
  }

  await chrome.storage.local.set(toWrite);
  if (toRemove.length > 0) await chrome.storage.local.remove(toRemove);
}

function now() {
  return Date.now();
}

function normalizeWorkspaceStore(raw: unknown): PersistedWorkspaceStore | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as PersistedWorkspaceStore;
    } catch {
      return null;
    }
  }

  if (typeof raw === 'object') {
    return raw as PersistedWorkspaceStore;
  }

  return null;
}

function normalizeLegacyBoardStore(raw: unknown): LegacyBoardStore | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as LegacyBoardStore;
    } catch {
      return null;
    }
  }

  if (typeof raw === 'object') {
    return raw as LegacyBoardStore;
  }

  return null;
}

function migrateLegacyBoardsToWorkspaceStore(raw: unknown): PersistedWorkspaceStore | null {
  const legacy = normalizeLegacyBoardStore(raw);
  const boards = legacy?.state?.boards;

  if (!Array.isArray(boards) || boards.length === 0) return null;

  const workspaceId = crypto.randomUUID();
  const ts = now();

  return {
    state: {
      workspaces: [
        {
          id: workspaceId,
          name: 'Home',
          boards: boards.map((board) => ({
            id: String(board.id ?? crypto.randomUUID()),
            name: board.name ?? 'New Board',
            color: board.color ?? '',
            links: Array.isArray(board.links)
              ? board.links.map((link) => ({
                  id: String(link.id ?? crypto.randomUUID()),
                  title: link.title ?? link.url ?? 'Untitled',
                  url: link.url,
                  favicon: link.favicon ?? '',
                  createdAt: link.createdAt ?? ts,
                  updatedAt: link.updatedAt ?? ts,
                }))
              : [],
            createdAt: board.createdAt ?? ts,
            updatedAt: board.updatedAt ?? ts,
          })),
          wallpaper: null,
          createdAt: ts,
          updatedAt: ts,
        },
      ],
      activeWorkspaceId: workspaceId,
    },
    version: 0,
  };
}

function isBlockedUrl(url: string): boolean {
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:')
  );
}

async function notify(message: string) {
  try {
    await chrome.notifications.create({
      type: 'basic',
    iconUrl: 'icons/icon128.png',
      title: 'Frontly',
      message,
    });
  } catch (error) {
    console.warn('Frontly notification failed:', error);
  }
}

async function saveCurrentTab() {
  try {
    // Migrate old tabdeck-* keys if this is the first run after renaming
    await runBackgroundMigrationIfNeeded();

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.url) {
      await notify('No active tab found');
      return;
    }

    if (isBlockedUrl(tab.url)) {
      await notify('This page cannot be saved');
      return;
    }

    const title = tab.title?.trim() || tab.url;

    const result = await chrome.storage.local.get([
      WORKSPACE_STORE_KEY,
      LEGACY_BOARD_STORE_KEY,
      QUICK_SAVE_BOARD_KEY,
    ]);

    let parsedStore = normalizeWorkspaceStore(result[WORKSPACE_STORE_KEY]);

    if (!parsedStore) {
      parsedStore = migrateLegacyBoardsToWorkspaceStore(result[LEGACY_BOARD_STORE_KEY]);

      if (parsedStore) {
        await chrome.storage.local.set({
          [WORKSPACE_STORE_KEY]: JSON.stringify(parsedStore),
        });
      }
    }

    const workspaces = parsedStore?.state?.workspaces;

    if (!Array.isArray(workspaces) || workspaces.length === 0) {
      await chrome.storage.local.set({
        [DEBUG_KEY]: {
          reason: 'NO_WORKSPACES_FOUND',
          workspaceRaw: result[WORKSPACE_STORE_KEY] ?? null,
          legacyRaw: result[LEGACY_BOARD_STORE_KEY] ?? null,
        },
      });

      await notify('No boards found. Import or create a board first.');
      return;
    }

    const activeWorkspaceId =
      typeof parsedStore?.state?.activeWorkspaceId === 'string'
        ? parsedStore.state.activeWorkspaceId
        : '';

    const activeWorkspace =
      workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
      workspaces[0];

    if (!activeWorkspace || !Array.isArray(activeWorkspace.boards) || activeWorkspace.boards.length === 0) {
      await chrome.storage.local.set({
        [DEBUG_KEY]: {
          reason: 'NO_BOARDS_FOUND',
          activeWorkspaceId,
          activeWorkspace: activeWorkspace ?? null,
        },
      });

      await notify('No boards found. Create a board first.');
      return;
    }

    const quickSaveBoardId =
      typeof result[QUICK_SAVE_BOARD_KEY] === 'string'
        ? result[QUICK_SAVE_BOARD_KEY]
        : '';

    const matchedBoard = activeWorkspace.boards.find(
      (board) => board.id === quickSaveBoardId
    );
    const targetBoard = matchedBoard ?? activeWorkspace.boards[0];

    const alreadyExists = targetBoard.links.some(
      (link) => link.url === tab.url && link.title === title
    );

    const linkToInsert: SavedLink = {
      id: crypto.randomUUID(),
      title,
      url: tab.url,
      favicon: tab.favIconUrl || '',
      createdAt: now(),
      updatedAt: now(),
    };

    const nextWorkspaces = workspaces.map((workspace) => {
      if (workspace.id !== activeWorkspace.id) return workspace;

      return {
        ...workspace,
        updatedAt: now(),
        boards: workspace.boards.map((board) => {
          if (board.id !== targetBoard.id) return board;

          return {
            ...board,
            links: alreadyExists ? board.links : [linkToInsert, ...board.links],
            updatedAt: now(),
          };
        }),
      };
    });

    const nextStore: PersistedWorkspaceStore = {
      ...(parsedStore ?? {}),
      state: {
        ...(parsedStore?.state ?? {}),
        workspaces: nextWorkspaces,
        activeWorkspaceId: activeWorkspace.id,
      },
    };

    await chrome.storage.local.set({
      [WORKSPACE_STORE_KEY]: JSON.stringify(nextStore),
      [QUICK_SAVE_BOARD_KEY]: targetBoard.id,
      [DEBUG_KEY]: {
        ok: true,
        targetBoardId: targetBoard.id,
        targetBoardName: targetBoard.name,
        savedTitle: title,
        savedUrl: tab.url,
        alreadyExists,
      },
    });

    await notify(
      alreadyExists
        ? `Already saved in ${targetBoard.name}`
        : `Saved "${title}" to ${targetBoard.name}`
    );
  } catch (error) {
    console.error('Frontly quick save failed:', error);

    await chrome.storage.local.set({
      [DEBUG_KEY]: {
        ok: false,
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : String(error),
      },
    });

    await notify('Tab save failed');
  }
}

const FRONTLY_PAGE_URL = chrome.runtime.getURL('index.html');

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) => tab.url === FRONTLY_PAGE_URL);

  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true });
    if (typeof existing.windowId === 'number') {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    return;
  }

  await chrome.tabs.create({
    url: FRONTLY_PAGE_URL,
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  await chrome.storage.local.set({
    frontlyCommandDebug: {
      command,
      firedAt: Date.now(),
    },
  });

  if (command !== 'quick-save-tab') return;
  await saveCurrentTab();
});