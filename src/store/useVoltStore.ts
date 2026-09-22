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
// Supabase's storage interface is called synchronously on client init, so
// getItem always returns null at construction time. The actual session
// restore is done asynchronously by restoreSession() which calls setSession().
// setItem / removeItem write to chrome.storage.local fire-and-forget.
// ---------------------------------------------------------------------------
const chromeStorageAdapter = {
  getItem: (_key: string): string | null => null,
  setItem: (key: string, value: string): void => {
    void chrome.storage.local.set({ [key]: value });
  },
  removeItem: (key: string): void => {
    void chrome.storage.local.remove(key);
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
  restoreSession: async () => {
    set({ authState: 'loading', authError: null });
    try {
      const client = getVoltClient();

      // Read the raw tokens we stored in chrome.storage.local
      const stored = await chrome.storage.local.get(VOLT_SESSION_KEY);
      const raw = stored[VOLT_SESSION_KEY] as string | undefined;

      if (!raw) {
        // Nothing stored — first-time user or explicitly signed out
        set({ authState: 'unauthenticated' });
        return;
      }

      let parsed: { access_token: string; refresh_token: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Corrupted entry — clear and show sign-in
        void chrome.storage.local.remove(VOLT_SESSION_KEY);
        set({ authState: 'unauthenticated' });
        return;
      }

      const { data, error } = await client.auth.setSession({
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
      });

      if (error || !data.user) {
        // Tokens expired and couldn't be refreshed — clear and show sign-in
        void chrome.storage.local.remove(VOLT_SESSION_KEY);
        set({ authState: 'unauthenticated' });
        return;
      }

      // Persist the (possibly refreshed) tokens back to storage
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData.session) {
        void chrome.storage.local.set({
          [VOLT_SESSION_KEY]: JSON.stringify({
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
          }),
        });
      }

      const profile = await fetchProfile(client, data.user.id);
      if (!profile) {
        void chrome.storage.local.remove(VOLT_SESSION_KEY);
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

      // Persist the session tokens so the next page load can restore silently
      if (data.session) {
        void chrome.storage.local.set({
          [VOLT_SESSION_KEY]: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        });
      }

      // Fetch the user's VOLT profile (username, display_name)
      const profile = await fetchProfile(client, data.user.id);
      if (!profile) {
        // Authenticated but no VOLT profile — user exists in auth but hasn't
        // completed VOLT onboarding. Treat as unauthenticated for our purposes.
        await client.auth.signOut();
        void chrome.storage.local.remove(VOLT_SESSION_KEY);
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

  removeLocal: (id) => {
    set((state) => ({ transfers: state.transfers.filter((t) => t.id !== id) }));
  },

  // ── Realtime subscription ─────────────────────────────────────────────────
  subscribeRealtime: (maxItems = 5) => {
    const { currentUser } = get();
    if (!currentUser) return () => {};

    const client = getVoltClient();
    let channel: RealtimeChannel | null = null;

    channel = client
      .channel(`volt-widget-transfers-${currentUser.id}`)
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
