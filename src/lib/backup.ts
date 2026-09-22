/**
 * backup — a local safety net for workspace data.
 *
 * Keeps a rolling snapshot of the workspace store in chrome.storage.local
 * (separate from the live 'frontly-workspaces' key) so a user can recover from
 * an accidental wipe, a bad import, or a corrupted state. This is deliberately
 * LOCAL-only and independent of cross-device sync.
 *
 * We keep the two most recent snapshots ("current" + "previous") so a restore
 * itself can be undone once.
 */
import type { WorkspaceItem } from './workspaceTypes';

const BACKUP_KEY = 'frontly-backup';

export interface BackupSnapshot {
  _ts: number;
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string;
}

interface BackupStore {
  current?: BackupSnapshot;
  previous?: BackupSnapshot;
}

function available(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
  } catch {
    return false;
  }
}

function getStore(): Promise<BackupStore> {
  if (!available()) return Promise.resolve({});
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(BACKUP_KEY, (res) => {
        if (chrome.runtime.lastError) { resolve({}); return; }
        resolve((res?.[BACKUP_KEY] as BackupStore) ?? {});
      });
    } catch {
      resolve({});
    }
  });
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Save a snapshot (debounced). Strips only video wallpapers (raw blobs live in
 * IndexedDB and can't be JSON-serialised); image/live wallpapers are kept.
 */
export function saveBackup(workspaces: WorkspaceItem[], activeWorkspaceId: string): void {
  if (!available()) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const snapshot: BackupSnapshot = {
      _ts: Date.now(),
      workspaces: workspaces.map((w) => ({ ...w, videoWallpaper: null })),
      activeWorkspaceId,
    };
    const store = await getStore();
    const next: BackupStore = { current: snapshot, previous: store.current };
    try {
      chrome.storage.local.set({ [BACKUP_KEY]: next }, () => { void chrome.runtime.lastError; });
    } catch {
      // Non-fatal — backup is best-effort.
    }
    saveTimer = null;
  }, 4000);
}

/** The most recent snapshot, or null. */
export async function getLatestBackup(): Promise<BackupSnapshot | null> {
  const store = await getStore();
  return store.current ?? null;
}

/**
 * Restore the latest snapshot. Before overwriting, the current live state is
 * pushed into "previous" so this restore can itself be reverted once.
 */
export async function restoreLatestBackup(
  currentWorkspaces: WorkspaceItem[],
  currentActiveId: string
): Promise<BackupSnapshot | null> {
  const store = await getStore();
  const snap = store.current;
  if (!snap) return null;

  // Preserve the pre-restore live state as the new "previous".
  const preRestore: BackupSnapshot = {
    _ts: Date.now(),
    workspaces: currentWorkspaces.map((w) => ({ ...w, videoWallpaper: null })),
    activeWorkspaceId: currentActiveId,
  };
  try {
    chrome.storage.local.set(
      { [BACKUP_KEY]: { current: store.current, previous: preRestore } as BackupStore },
      () => { void chrome.runtime.lastError; }
    );
  } catch {
    // ignore
  }
  return snap;
}

/** Human-readable relative age of the latest backup, e.g. "3 min ago". */
export function formatBackupAge(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
