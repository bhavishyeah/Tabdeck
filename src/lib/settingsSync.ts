/**
 * settingsSync — mirrors app settings across signed-in desktop Chrome
 * instances using chrome.storage.sync.
 *
 * Strategy: last-write-wins by timestamp.
 *  - Every local settings change is pushed to sync with a `_ts` stamp (debounced).
 *  - On startup the app pulls the sync copy; if it is newer than the local
 *    copy it is applied over local settings.
 *  - A live listener keeps a tab in step when another device writes.
 *
 * The settings payload is tiny (a few dozen scalar fields) so it always fits
 * well within the sync quota (8 KB per item / 100 KB total). No chunking needed.
 */
import type { AppSettings } from '../store/useSettingsStore';

/** Sync key — deliberately distinct from the local 'frontly-settings' key. */
export const SETTINGS_SYNC_KEY = 'frontly-settings-sync';
/** localStorage key holding the timestamp of the last locally-applied write. */
export const SETTINGS_TS_KEY = 'frontly-settings-ts';

export interface SyncedSettings {
  /** Milliseconds since epoch of the write that produced this payload. */
  _ts: number;
  settings: AppSettings;
}

/** True when running inside an extension with sync storage available. */
function syncAvailable(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.sync;
  } catch {
    return false;
  }
}

/**
 * Whether a Google account is attached to this Chrome profile, so cross-device
 * sync will actually propagate. Uses chrome.identity.getProfileUserInfo, which
 * does NOT trigger an OAuth prompt — it just reports the already-signed-in
 * account (or an empty email when signed out).
 *
 * Returns:
 *   'signed-in'    — an account is attached; sync will work
 *   'signed-out'   — no account attached; writes stay on this device
 *   'unsupported'  — identity API unavailable (e.g. dev/web build)
 */
export function getChromeAccountStatus(): Promise<'signed-in' | 'signed-out' | 'unsupported'> {
  return new Promise((resolve) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.getProfileUserInfo) {
        resolve('unsupported');
        return;
      }
      chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' } as chrome.identity.ProfileDetails, (info) => {
        if (chrome.runtime.lastError) { resolve('unsupported'); return; }
        resolve(info && info.email ? 'signed-in' : 'signed-out');
      });
    } catch {
      resolve('unsupported');
    }
  });
}

/** Read the timestamp of the last write applied to this device. */
export function getLocalTs(): number {
  const raw = localStorage.getItem(SETTINGS_TS_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

/** Record the timestamp of the write currently applied to this device. */
export function setLocalTs(ts: number): void {
  localStorage.setItem(SETTINGS_TS_KEY, String(ts));
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSettings: AppSettings | null = null;

/**
 * Push the given settings to sync (debounced). Also stamps the local
 * timestamp so a subsequent pull from the same device is not treated as newer.
 */
export function pushSettings(settings: AppSettings): void {
  if (!syncAvailable()) return;
  pendingSettings = settings;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const ts = Date.now();
    const payload: SyncedSettings = { _ts: ts, settings: pendingSettings as AppSettings };
    try {
      chrome.storage.sync.set({ [SETTINGS_SYNC_KEY]: payload }, () => {
        // Stamp the local timestamp only on a successful write, so a failed
        // write (quota/offline) doesn't advance our clock past a change we
        // never actually broadcast — which could cause us to ignore a valid
        // newer remote change later.
        if (chrome.runtime.lastError) return;
        setLocalTs(ts);
      });
    } catch {
      // Non-fatal.
    }
    pushTimer = null;
    pendingSettings = null;
  }, 600);
}

/** Fetch the synced settings payload, or null if none / unavailable. */
export function pullSettings(): Promise<SyncedSettings | null> {
  if (!syncAvailable()) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(SETTINGS_SYNC_KEY, (result) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        const payload = result?.[SETTINGS_SYNC_KEY] as SyncedSettings | undefined;
        if (payload && typeof payload._ts === 'number' && payload.settings) {
          resolve(payload);
        } else {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Subscribe to remote settings changes from other devices.
 * `onRemote` is called with the newer settings only when the incoming
 * timestamp beats the local one. Returns an unsubscribe function.
 */
export function subscribeSettings(onRemote: (settings: AppSettings, ts: number) => void): () => void {
  if (!syncAvailable()) return () => {};

  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== 'sync') return;
    const change = changes[SETTINGS_SYNC_KEY];
    if (!change || !change.newValue) return;
    const payload = change.newValue as SyncedSettings;
    if (!payload || typeof payload._ts !== 'number' || !payload.settings) return;
    if (payload._ts <= getLocalTs()) return; // not newer than what we have
    setLocalTs(payload._ts);
    onRemote(payload.settings, payload._ts);
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
