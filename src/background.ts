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

// ═══════════════════════════════════════════════════════════════════════════
// SEND TO VOLT — right-click context menu (FRONTLY → VOLT direction)
//
// Lets the user send a page, link, selected text, or image to a VOLT contact
// straight from any webpage. The background worker reuses the VOLT session
// that the widget persisted to chrome.storage.local and inserts a
// direct_transfers row via Supabase's REST API.
//
// Recipient: the widget lets the user pick a "quick send" recipient which is
// stored under VOLT_QUICK_RECIPIENT_KEY. If none is set, we guide the user.
// ═══════════════════════════════════════════════════════════════════════════

const VOLT_SUPABASE_URL = import.meta.env.VITE_VOLT_SUPABASE_URL as string;
const VOLT_SUPABASE_ANON_KEY = import.meta.env.VITE_VOLT_SUPABASE_ANON_KEY as string;
const VOLT_SESSION_KEY = 'volt-widget-session';
const VOLT_QUICK_RECIPIENT_KEY = 'volt-quick-recipient';

const CTX_ROOT = 'volt-send-root';

interface VoltQuickRecipient {
  id: string;
  username: string;
}

/**
 * Read the persisted VOLT access token (or null if not signed in).
 * Supabase (via its storage adapter) stores the full session object under
 * VOLT_SESSION_KEY: { access_token, refresh_token, expires_at, user, ... }.
 * We read access_token and check it hasn't expired.
 */
async function getVoltAccessToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get(VOLT_SESSION_KEY);
  const raw = stored[VOLT_SESSION_KEY];
  if (!raw) return null;
  try {
    const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as {
      access_token?: string;
      expires_at?: number;
    };
    if (!parsed.access_token) return null;
    // expires_at is a unix timestamp (seconds). If expired, treat as no token
    // — the user needs to reopen FRONTLY so Supabase can refresh it.
    if (parsed.expires_at && parsed.expires_at * 1000 < Date.now()) return null;
    return parsed.access_token;
  } catch {
    return null;
  }
}

/** Read the user's chosen quick-send recipient (or null). */
async function getVoltQuickRecipient(): Promise<VoltQuickRecipient | null> {
  const stored = await chrome.storage.local.get(VOLT_QUICK_RECIPIENT_KEY);
  const raw = stored[VOLT_QUICK_RECIPIENT_KEY] as string | undefined;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VoltQuickRecipient;
  } catch {
    return null;
  }
}

/**
 * Insert a direct_transfers row via Supabase REST, authenticated with the
 * user's VOLT session token. RLS requires sender_id = auth.uid(), which the
 * token supplies — we don't send sender_id, VOLT's default/policy handles it,
 * so we set it explicitly from the token's subject is not needed because the
 * REST insert runs as the authenticated user.
 */
async function insertVoltTransfer(
  accessToken: string,
  recipientId: string,
  payload: { type: 'text' | 'link'; content: string }
): Promise<boolean> {
  try {
    // Decode the JWT to get the sender's user id (sub claim).
    const senderId = decodeJwtSub(accessToken);
    if (!senderId) return false;

    const res = await fetch(`${VOLT_SUPABASE_URL}/rest/v1/direct_transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: VOLT_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        sender_id: senderId,
        recipient_id: recipientId,
        type: payload.type,
        content: payload.content,
        status: 'pending',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Extract the `sub` (user id) claim from a Supabase JWT without verifying it. */
function decodeJwtSub(token: string): string | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    // base64url → base64
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const payload = JSON.parse(json) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Create the context menu tree. Called on install and startup. */
function buildVoltContextMenu() {
  if (!chrome.contextMenus) {
    console.warn('[VOLT] chrome.contextMenus API unavailable');
    return;
  }
  chrome.contextMenus.removeAll(() => {
    // Swallow any lingering removeAll error before recreating.
    void chrome.runtime.lastError;

    const create = (opts: chrome.contextMenus.CreateProperties) => {
      chrome.contextMenus.create(opts, () => {
        if (chrome.runtime.lastError) {
          console.warn('[VOLT] context menu create failed:', opts.id, chrome.runtime.lastError.message);
        }
      });
    };

    // Single flat item that appears for page, link, selection, and image.
    // A flat item is more reliable than a parent+children tree and always
    // shows regardless of what was right-clicked.
    create({
      id: CTX_ROOT,
      title: 'Send to VOLT ⚡',
      contexts: ['page', 'link', 'selection', 'image'],
    });
    console.log('[VOLT] context menu registered');
  });
}

chrome.runtime.onInstalled.addListener(buildVoltContextMenu);
chrome.runtime.onStartup.addListener(buildVoltContextMenu);
// Also build on every service-worker spin-up so the menu exists even after a
// plain "reload extension" where neither onInstalled nor onStartup fires.
try {
  buildVoltContextMenu();
} catch (e) {
  console.warn('[VOLT] buildVoltContextMenu threw:', e);
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (String(info.menuItemId) !== CTX_ROOT) return;

  // 1. Auth check
  const accessToken = await getVoltAccessToken();
  if (!accessToken) {
    await notify('Open FRONTLY and connect your VOLT account first.');
    return;
  }

  // 2. Recipient check
  const recipient = await getVoltQuickRecipient();
  if (!recipient) {
    await notify('Pick a VOLT quick-send contact in the widget settings first.');
    return;
  }

  // 3. Build the payload from whatever context data is present.
  // Priority: selected text > clicked link > clicked image > current page.
  let payload: { type: 'text' | 'link'; content: string } | null = null;

  if (info.selectionText && info.selectionText.trim()) {
    payload = { type: 'text', content: info.selectionText.trim() };
  } else if (info.linkUrl) {
    payload = { type: 'link', content: info.linkUrl };
  } else if (info.srcUrl) {
    // Images are sent as a link to the image URL (no re-upload needed).
    payload = { type: 'link', content: info.srcUrl };
  } else if (info.pageUrl) {
    payload = { type: 'link', content: info.pageUrl };
  }

  if (!payload) {
    await notify('Nothing to send.');
    return;
  }

  // 4. Send
  const ok = await insertVoltTransfer(accessToken, recipient.id, payload);
  await notify(
    ok
      ? `Sent to @${recipient.username} on VOLT ⚡`
      : 'Send failed. Reconnect VOLT in FRONTLY and try again.'
  );
});