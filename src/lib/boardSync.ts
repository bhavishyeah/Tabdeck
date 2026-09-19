/**
 * boardSync — optional cross-device sync of workspaces/boards via
 * chrome.storage.sync (phase B).
 *
 * This is opt-in and OFF by default. Board data is far larger than settings,
 * so we:
 *   - Strip heavy fields (image + video wallpapers) before syncing. These stay
 *     device-local. The lightweight `liveWallpaper` enum is kept.
 *   - Serialise to JSON and split across multiple sync items ("chunks"),
 *     because a single sync item is capped at ~8 KB.
 *   - Refuse to sync (and report) when the payload would exceed a safe budget,
 *     since sync total is ~100 KB / ~512 items.
 *   - Use last-write-wins by timestamp, mirroring settingsSync.
 *
 * chrome.storage.sync limits (for reference):
 *   QUOTA_BYTES               = 102,400   (~100 KB total)
 *   QUOTA_BYTES_PER_ITEM      = 8,192     (~8 KB per item)
 *   MAX_ITEMS                 = 512
 */
import type { WorkspaceItem } from './workspaceTypes';

/** Sync item keys. */
const META_KEY = 'frontly-ws-meta';
const CHUNK_PREFIX = 'frontly-ws-chunk-';
/** localStorage key mirroring the timestamp of the last board write applied here. */
const BOARD_TS_KEY = 'frontly-ws-ts';

/**
 * Bytes of JSON string per chunk. Kept comfortably under the 8 KB per-item
 * cap to leave room for the key name and JSON quoting overhead.
 */
const CHUNK_SIZE = 6000;
/**
 * Refuse to sync above this many bytes of stripped JSON. Leaves headroom below
 * the ~100 KB total so settings-sync and future keys still fit.
 */
const MAX_PAYLOAD_BYTES = 80_000;

export interface BoardSyncMeta {
  _ts: number;
  /** Number of chunk items the payload was split into. */
  count: number;
}

export interface SyncStripped {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string;
}

export type BoardPushResult =
  | { ok: true; bytes: number; chunks: number }
  | { ok: false; reason: 'unavailable' | 'too-large' | 'error'; bytes?: number };

function syncAvailable(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.sync;
  } catch {
    return false;
  }
}

export function getBoardTs(): number {
  const raw = localStorage.getItem(BOARD_TS_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function setBoardTs(ts: number): void {
  localStorage.setItem(BOARD_TS_KEY, String(ts));
}

/**
 * Remove device-local heavy fields (image/video wallpapers) from a workspace
 * snapshot so only the shareable structure is synced.
 */
export function stripForSync(workspaces: WorkspaceItem[], activeWorkspaceId: string): SyncStripped {
  const stripped = workspaces.map((w) => ({
    ...w,
    wallpaper: null,
    videoWallpaper: null,
  }));
  return { workspaces: stripped, activeWorkspaceId };
}

/** Split a string into fixed-size pieces. */
function chunkString(str: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    out.push(str.slice(i, i + size));
  }
  return out;
}

/**
 * Push board data to sync. Returns a result describing success or the reason
 * it was skipped so the UI can surface an actionable message.
 */
export async function pushBoards(
  workspaces: WorkspaceItem[],
  activeWorkspaceId: string
): Promise<BoardPushResult> {
  if (!syncAvailable()) return { ok: false, reason: 'unavailable' };

  const stripped = stripForSync(workspaces, activeWorkspaceId);
  const json = JSON.stringify(stripped);
  const bytes = new Blob([json]).size;

  if (bytes > MAX_PAYLOAD_BYTES) {
    return { ok: false, reason: 'too-large', bytes };
  }

  const chunks = chunkString(json, CHUNK_SIZE);
  const ts = Date.now();

  // Build the write set: meta + each chunk. Clear any stale higher-index chunks
  // from a previous, larger payload by reading the old meta first.
  const items: Record<string, unknown> = {
    [META_KEY]: { _ts: ts, count: chunks.length } satisfies BoardSyncMeta,
  };
  chunks.forEach((c, i) => { items[`${CHUNK_PREFIX}${i}`] = c; });

  try {
    const prev = await getMeta();
    const staleKeys: string[] = [];
    if (prev && prev.count > chunks.length) {
      for (let i = chunks.length; i < prev.count; i++) staleKeys.push(`${CHUNK_PREFIX}${i}`);
    }

    await new Promise<void>((resolve, reject) => {
      chrome.storage.sync.set(items, () => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve();
      });
    });
    // Stamp only after the write actually succeeded (see settingsSync rationale).
    setBoardTs(ts);

    if (staleKeys.length) {
      await new Promise<void>((resolve) => {
        chrome.storage.sync.remove(staleKeys, () => { void chrome.runtime.lastError; resolve(); });
      });
    }

    return { ok: true, bytes, chunks: chunks.length };
  } catch {
    return { ok: false, reason: 'error', bytes };
  }
}

function getMeta(): Promise<BoardSyncMeta | null> {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(META_KEY, (result) => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        const meta = result?.[META_KEY] as BoardSyncMeta | undefined;
        resolve(meta && typeof meta._ts === 'number' && typeof meta.count === 'number' ? meta : null);
      });
    } catch {
      resolve(null);
    }
  });
}

/** Pull and reassemble board data from sync, or null if none / unavailable / corrupt. */
export async function pullBoards(): Promise<{ _ts: number; data: SyncStripped } | null> {
  if (!syncAvailable()) return null;

  const meta = await getMeta();
  if (!meta || meta.count <= 0) return null;

  const chunkKeys = Array.from({ length: meta.count }, (_, i) => `${CHUNK_PREFIX}${i}`);
  const chunks = await new Promise<Record<string, unknown> | null>((resolve) => {
    try {
      chrome.storage.sync.get(chunkKeys, (result) => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(result ?? null);
      });
    } catch {
      resolve(null);
    }
  });
  if (!chunks) return null;

  let json = '';
  for (let i = 0; i < meta.count; i++) {
    const part = chunks[`${CHUNK_PREFIX}${i}`];
    if (typeof part !== 'string') return null; // missing chunk → treat as corrupt
    json += part;
  }

  try {
    const data = JSON.parse(json) as SyncStripped;
    if (!data || !Array.isArray(data.workspaces)) return null;
    return { _ts: meta._ts, data };
  } catch {
    return null;
  }
}

/** Remove all board sync items (used when the user turns sync off). */
export async function clearBoardSync(): Promise<void> {
  if (!syncAvailable()) return;
  const meta = await getMeta();
  const keys = [META_KEY];
  if (meta) {
    for (let i = 0; i < meta.count; i++) keys.push(`${CHUNK_PREFIX}${i}`);
  }
  await new Promise<void>((resolve) => {
    chrome.storage.sync.remove(keys, () => { void chrome.runtime.lastError; resolve(); });
  });
}

/**
 * Subscribe to remote board changes. Fires only when the incoming timestamp
 * beats the local one. The callback is responsible for calling pullBoards().
 * Returns an unsubscribe function.
 */
export function subscribeBoards(onRemoteNewer: (ts: number) => void): () => void {
  if (!syncAvailable()) return () => {};
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== 'sync') return;
    const change = changes[META_KEY];
    if (!change || !change.newValue) return;
    const meta = change.newValue as BoardSyncMeta;
    if (!meta || typeof meta._ts !== 'number') return;
    if (meta._ts <= getBoardTs()) return;
    setBoardTs(meta._ts);
    onRemoteNewer(meta._ts);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

/** Merge synced (wallpaper-less) workspaces with local wallpapers preserved. */
export function mergeWithLocalWallpapers(
  incoming: WorkspaceItem[],
  local: WorkspaceItem[]
): WorkspaceItem[] {
  const localById = new Map(local.map((w) => [w.id, w]));
  return incoming.map((w) => {
    const existing = localById.get(w.id);
    return {
      ...w,
      // Keep this device's heavy wallpaper data; sync never carries it.
      wallpaper: existing?.wallpaper ?? null,
      videoWallpaper: existing?.videoWallpaper ?? null,
    };
  });
}
