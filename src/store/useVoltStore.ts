/**
 * useVoltStore
 *
 * Manages the VOLT widget's connection to VOLT's Supabase project.
 * This is intentionally a separate Zustand store from useWorkspaceStore —
 * it owns runtime state (session, items, loading) while workspace store
 * owns widget placement/config.
 *
 * Architecture:
 *   FRONTLY (VOLT widget)
 *     └── voltSupabaseClient  ─── VOLT's Supabase project (anon key + RLS)
 *           ├── supabase.auth.signInWithPassword  (VOLT credentials)
 *           ├── direct_transfers (SELECT where recipient_id = me)
 *           └── Realtime subscription (Postgres Changes on direct_transfers)
 *
 * Session persistence:
 *   The Supabase session tokens are stored in chrome.storage.local (same
 *   place FRONTLY keeps workspace data). This survives new-tab opens and
 *   extension reloads. restoreSession() is called once on widget mount —
 *   it reads the tokens, hands them to Supabase via setSession(), and if
 *   they're still valid the user is silently re-authenticated. The session
 *   is cleared on explicit sign-out.
 */

import { create } from 'zustand';
import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase client — VOLT's project
// ---------------------------------------------------------------------------
const VOLT_SUPABASE_URL = import.meta.env.VITE_VOLT_SUPABASE_URL as string;
const VOLT_SUPABASE_ANON_KEY = import.meta.env.VITE_VOLT_SUPABASE_ANON_KEY as string;

/** Key used in chrome.storage.local to persist the session tokens */
const VOLT_SESSION_KEY = 'volt-widget-session';

// ---------------------------------------------------------------------------
// chrome.storage.local adapter for Supabase auth.
// Supabase fully supports an async (Promise-returning) storage interface, so
// we back it directly with chrome.storage.local. This lets Supabase own the
// entire session lifecycle — persistence, restore, and token refresh — with
// no manual setSession juggling. The session survives new-tab opens and
// extension reloads, and DB calls are always authorized with a fresh token.
// ---------------------------------------------------------------------------
const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(key);
    return (result[key] as string) ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string): Promise<void> => {
    await chrome.storage.local.remove(key);
  },
};

let voltClient: SupabaseClient | null = null;

function getVoltClient(): SupabaseClient {
  if (!voltClient) {
    if (!VOLT_SUPABASE_URL || !VOLT_SUPABASE_ANON_KEY) {
      throw new Error(
        'VOLT Supabase credentials not configured. Add VITE_VOLT_SUPABASE_URL and VITE_VOLT_SUPABASE_ANON_KEY to your .env file.'
      );
    }
    voltClient = createClient(VOLT_SUPABASE_URL, VOLT_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        storage: chromeStorageAdapter,
        storageKey: VOLT_SESSION_KEY,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return voltClient;
}

// ---------------------------------------------------------------------------
// Types — maps to VOLT's direct_transfers table
// FRONTLY only needs the fields it renders. It does not need to understand
// VOLT's full internal schema.
// ---------------------------------------------------------------------------
export interface VoltTransfer {
  id: string;
  type: 'text' | 'link' | 'image' | 'file' | 'audio';
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: 'pending' | 'delivered';
  created_at: string;
  sender_id: string;
  /** Populated client-side after fetching sender profile */
  sender_username?: string;
  sender_display_name?: string;
  /** Optional group context */
  group_name?: string | null;
}

export interface VoltProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

type AuthState = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
type DataState = 'idle' | 'loading' | 'ready' | 'error';

interface VoltState {
  // Auth
  authState: AuthState;
  authError: string | null;
  currentUser: VoltProfile | null;

  // Data
  dataState: DataState;
  dataError: string | null;
  transfers: VoltTransfer[];

  // Actions
  /** Called once on widget mount — silently restores a persisted session */
  restoreSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchTransfers: (maxItems?: number) => Promise<void>;
  deleteTransfer: (id: string) => Promise<void>;
  markDelivered: (id: string) => Promise<void>;
  /** Save an incoming transfer into the user's VOLT vault (clips table), then dismiss it. Returns true on success. */
  saveToVault: (transfer: VoltTransfer) => Promise<boolean>;
  /** Search VOLT users by username (for the quick-send recipient picker). */
  searchUsers: (query: string) => Promise<VoltProfile[]>;
  /** Persist the chosen quick-send recipient so the background context menu can use it. */
  setQuickRecipient: (recipient: VoltProfile | null) => Promise<void>;
  /** Read the current quick-send recipient. */
  getQuickRecipient: () => Promise<VoltProfile | null>;
  subscribeRealtime: (maxItems?: number) => () => void;
  /** Remove an item from local state immediately (optimistic) */
  removeLocal: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Sender profile cache — avoids re-fetching the same profile repeatedly
// ---------------------------------------------------------------------------
const profileCache = new Map<string, VoltProfile>();

async function fetchProfile(client: SupabaseClient, userId: string): Promise<VoltProfile | null> {
  if (profileCache.has(userId)) return profileCache.get(userId)!;
  const { data } = await client
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', userId)
    .single();
  if (data) {
    profileCache.set(userId, data);
    return data;
  }
  return null;
}

async function enrichWithSenders(
  client: SupabaseClient,
  transfers: VoltTransfer[]
): Promise<VoltTransfer[]> {
  const uniqueSenderIds = [...new Set(transfers.map((t) => t.sender_id))];
  await Promise.all(uniqueSenderIds.map((id) => fetchProfile(client, id)));

  return transfers.map((t) => {
    const p = profileCache.get(t.sender_id);
    return {
      ...t,
      sender_username: p?.username,
      sender_display_name: p?.display_name ?? p?.username,
    };
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useVoltStore = create<VoltState>((set, get) => ({
  authState: 'idle',
  authError: null,
  currentUser: null,

  dataState: 'idle',
  dataError: null,
  transfers: [],

  // ── Session restore (called on widget mount) ──────────────────────────────
  // Supabase persists the session to chrome.storage.local via the async
  // storage adapter, so getSession() transparently reads + refreshes it.
  restoreSession: async () => {
    set({ authState: 'loading', authError: null });
    try {
      const client = getVoltClient();

      const { data, error } = await client.auth.getSession();

      if (error || !data.session?.user) {
        // No valid session stored — first-time user or signed out
        set({ authState: 'unauthenticated' });
        return;
      }

      const profile = await fetchProfile(client, data.session.user.id);
      if (!profile) {
        await client.auth.signOut();
        set({ authState: 'unauthenticated' });
        return;
      }

      set({ authState: 'authenticated', currentUser: profile, authError: null });
    } catch (err) {
      // Any unexpected error — fall back to sign-in, don't crash the widget
      set({
        authState: 'unauthenticated',
        authError: err instanceof Error ? err.message : 'Session restore failed',
      });
    }
  },

  // ── Sign in ───────────────────────────────────────────────────────────────
  signIn: async (email, password) => {
    set({ authState: 'loading', authError: null });
    try {
      const client = getVoltClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        set({ authState: 'unauthenticated', authError: error?.message ?? 'Sign in failed' });
        return;
      }

      // Supabase persists the session automatically via the storage adapter —
      // no manual token handling needed.

      // Fetch the user's VOLT profile (username, display_name)
      const profile = await fetchProfile(client, data.user.id);
      if (!profile) {
        // Authenticated but no VOLT profile — user exists in auth but hasn't
        // completed VOLT onboarding. Treat as unauthenticated for our purposes.
        await client.auth.signOut();
        set({
          authState: 'unauthenticated',
          authError: 'No VOLT profile found for this account.',
        });
        return;
      }

      set({ authState: 'authenticated', currentUser: profile, authError: null });
    } catch (err) {
      set({
        authState: 'error',
        authError: err instanceof Error ? err.message : 'Unexpected error during sign in',
      });
    }
  },

  // ── Sign out ──────────────────────────────────────────────────────────────
  signOut: async () => {
    try {
      const client = getVoltClient();
      await client.auth.signOut();
    } catch {
      // Best-effort
    }
    // Clear the persisted session so the sign-in form shows on next load
    void chrome.storage.local.remove(VOLT_SESSION_KEY);
    profileCache.clear();
    set({
      authState: 'unauthenticated',
      authError: null,
      currentUser: null,
      transfers: [],
      dataState: 'idle',
      dataError: null,
    });
  },

  // ── Fetch transfers ───────────────────────────────────────────────────────
  fetchTransfers: async (maxItems = 5) => {
    const { currentUser } = get();
    if (!currentUser) return;

    set({ dataState: 'loading', dataError: null });
    try {
      const client = getVoltClient();
      const { data, error } = await client
        .from('direct_transfers')
        .select('id, type, content, file_url, file_name, file_size, mime_type, status, created_at, sender_id, group_name')
        .eq('recipient_id', currentUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (error) {
        set({ dataState: 'error', dataError: error.message });
        return;
      }

      const enriched = await enrichWithSenders(client, (data ?? []) as VoltTransfer[]);
      set({ dataState: 'ready', transfers: enriched, dataError: null });
    } catch (err) {
      set({
        dataState: 'error',
        dataError: err instanceof Error ? err.message : 'Failed to load transfers',
      });
    }
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteTransfer: async (id) => {
    // Optimistic remove
    get().removeLocal(id);
    try {
      const client = getVoltClient();
      await client.from('direct_transfers').delete().eq('id', id);
    } catch {
      // If deletion fails, re-fetch to restore accurate state
      get().fetchTransfers();
    }
  },

  markDelivered: async (id) => {
    // Optimistic remove from pending list
    get().removeLocal(id);
    try {
      const client = getVoltClient();
      await client
        .from('direct_transfers')
        .update({ status: 'delivered' })
        .eq('id', id);
    } catch {
      // Best-effort
    }
  },

  // ── Save to Vault ─────────────────────────────────────────────────────────
  // Maps a transfer to a clips row (matching VOLT's own transferToClip shape)
  // and inserts it into the user's vault, then marks the transfer delivered.
  // This completes the RECEIVE → SEE → ACT loop: content received via VOLT
  // can be kept permanently in the vault straight from FRONTLY.
  saveToVault: async (transfer) => {
    const { currentUser } = get();
    if (!currentUser) return false;

    try {
      const client = getVoltClient();

      // Build the clip payload. File-backed types carry a Cloudinary metadata
      // descriptor; text/link store their value in `content`.
      const isFileType =
        transfer.type === 'image' || transfer.type === 'file' || transfer.type === 'audio';

      const clipRow: Record<string, unknown> = {
        user_id: currentUser.id,
        type: transfer.type,
        content: isFileType ? null : transfer.content,
        source_device: 'web',
      };

      if (isFileType && transfer.file_url) {
        clipRow.metadata = {
          provider: 'cloudinary',
          secure_url: transfer.file_url,
          name: transfer.file_name ?? undefined,
          bytes: transfer.file_size ?? undefined,
          mime: transfer.mime_type ?? undefined,
        };
      }

      const { error } = await client.from('clips').insert(clipRow);
      if (error) return false;

      // Dismiss the transfer now that it's saved (mirrors VOLT's behavior).
      await get().markDelivered(transfer.id);
      return true;
    } catch {
      return false;
    }
  },

  // ── Quick-send recipient (for the FRONTLY → VOLT context menu) ─────────────
  searchUsers: async (query) => {
    const q = query.trim();
    if (q.length < 2) return [];
    const { currentUser } = get();
    try {
      const client = getVoltClient();
      const { data } = await client
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${q}%`)
        .limit(8);
      const results = (data ?? []) as VoltProfile[];
      // Exclude the current user from their own recipient list
      return results.filter((p) => p.id !== currentUser?.id);
    } catch {
      return [];
    }
  },

  setQuickRecipient: async (recipient) => {
    // Stored under the same key the background service worker reads.
    if (recipient) {
      await chrome.storage.local.set({
        'volt-quick-recipient': JSON.stringify({ id: recipient.id, username: recipient.username }),
      });
    } else {
      await chrome.storage.local.remove('volt-quick-recipient');
    }
  },

  getQuickRecipient: async () => {
    const stored = await chrome.storage.local.get('volt-quick-recipient');
    const raw = stored['volt-quick-recipient'] as string | undefined;
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { id: string; username: string };
      return { id: parsed.id, username: parsed.username, display_name: null, avatar_url: null };
    } catch {
      return null;
    }
  },

  removeLocal: (id) => {
    set((state) => ({ transfers: state.transfers.filter((t) => t.id !== id) }));
  },

  // ── Realtime subscription ─────────────────────────────────────────────────
  subscribeRealtime: (maxItems = 5) => {
    const { currentUser } = get();
    if (!currentUser) return () => {};

    const client = getVoltClient();
    let channel: RealtimeChannel | null = null;

    // Unique channel name per subscription so remounts (React StrictMode,
    // navigation) never collide on the same channel name.
    const channelName = `volt-widget-${currentUser.id}-${Date.now()}`;

    channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_transfers',
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        async (payload) => {
          const newTransfer = payload.new as VoltTransfer;
          // Only surface pending transfers
          if (newTransfer.status !== 'pending') return;

          // Enrich with sender info
          const [enriched] = await enrichWithSenders(client, [newTransfer]);

          set((state) => {
            // Prepend new transfer, cap to maxItems
            const updated = [enriched, ...state.transfers].slice(0, maxItems);
            return { transfers: updated };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_transfers',
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const updated = payload.new as VoltTransfer;
          // If a transfer becomes delivered (dismissed from another device), remove it
          if (updated.status === 'delivered') {
            get().removeLocal(updated.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'direct_transfers',
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        (payload) => {
          get().removeLocal((payload.old as { id: string }).id);
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      if (channel) {
        client.removeChannel(channel);
        channel = null;
      }
    };
  },
}));
