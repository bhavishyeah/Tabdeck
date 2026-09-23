/**
 * VoltWidget
 *
 * A native FRONTLY widget that surfaces the user's VOLT incoming transfers
 * directly on their workspace canvas.
 *
 * Component tree:
 *   VoltWidget
 *     ├── VoltSignIn          — when unauthenticated
 *     ├── VoltLoadingState    — skeleton while fetching
 *     ├── VoltErrorState      — when data fetch or connection fails
 *     ├── VoltEmptyState      — when authenticated but no pending transfers
 *     └── VoltItemList
 *           ├── VoltTextItem
 *           ├── VoltLinkItem
 *           ├── VoltImageItem
 *           └── VoltFileItem
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoltConfig } from '../../lib/workspaceTypes';
import { useVoltStore, type VoltTransfer } from '../../store/useVoltStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function humanSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// ⚡ VOLT identity mark — always visible regardless of customization
// ---------------------------------------------------------------------------
function VoltBadge() {
  return (
    <span className="f-volt-badge" aria-label="VOLT">
      <svg className="f-volt-bolt" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
        <path d="M7 0L0 9h5l-1 7 7-9H6l1-7z" />
      </svg>
      VOLT
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sign-in form
// ---------------------------------------------------------------------------
function VoltSignIn({ onSignIn }: { onSignIn: (email: string, password: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { authState, authError } = useVoltStore();
  const loading = authState === 'loading';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    onSignIn(email.trim(), password);
  };

  return (
    <div className="f-volt-signin">
      <div className="f-volt-signin-header">
        <VoltBadge />
        <p className="f-volt-signin-sub">Connect your VOLT account to see your transfers here.</p>
      </div>
      <form className="f-volt-signin-form" onSubmit={handleSubmit} autoComplete="off">
        <input
          className="f-volt-input"
          type="email"
          placeholder="VOLT email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
        />
        <input
          className="f-volt-input"
          type="password"
          placeholder="VOLT password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="new-password"
        />
        {authError && (
          <p className="f-volt-signin-error" role="alert">{authError}</p>
        )}
        <button
          className={`f-volt-signin-btn ${loading ? 'is-loading' : ''}`}
          type="submit"
          disabled={loading || !email.trim() || !password}
        >
          {loading ? (
            <span className="f-volt-spinner" aria-hidden="true" />
          ) : null}
          {loading ? 'Connecting…' : 'Connect VOLT'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function VoltLoadingState({ showBadge = true }: { showBadge?: boolean }) {
  return (
    <div className="f-volt-loading" aria-label="Loading VOLT transfers">
      {showBadge && (
        <div className="f-volt-loading-header">
          <VoltBadge />
        </div>
      )}
      {[1, 2, 3].map((i) => (
        <div key={i} className="f-volt-skeleton-card">
          <div className="f-volt-skeleton f-volt-skeleton--sender" />
          <div className="f-volt-skeleton f-volt-skeleton--content" />
          <div className="f-volt-skeleton f-volt-skeleton--actions" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------
function VoltErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="f-volt-state f-volt-state--error">
      <p className="f-volt-state-text">Couldn't connect right now.</p>
      <p className="f-volt-state-detail">{message}</p>
      <button className="f-volt-retry" type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function VoltEmptyState() {
  return (
    <div className="f-volt-state f-volt-state--empty">
      <p className="f-volt-state-text">You're all caught up.</p>
      <p className="f-volt-state-detail">Send something from another device or receive from a VOLT user.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Copy feedback hook
// ---------------------------------------------------------------------------
function useCopied() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      setCopiedId(id);
      timerRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { copiedId, copy };
}

// ---------------------------------------------------------------------------
// Save-to-vault feedback hook
// Tracks per-item state: 'saving' while the insert is in flight, 'saved' on
// success (briefly, before the item is dismissed). Delegates the actual work
// to the store's saveToVault action.
// ---------------------------------------------------------------------------
function useSaveToVault() {
  const saveToVault = useVoltStore((s) => s.saveToVault);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const save = useCallback(
    async (transfer: VoltTransfer) => {
      if (savingId) return; // ignore double-clicks
      setSavingId(transfer.id);
      const ok = await saveToVault(transfer);
      setSavingId(null);
      if (ok) {
        // Show the saved checkmark briefly. The store dismisses the transfer
        // (markDelivered) so the item will animate out shortly after.
        setSavedId(transfer.id);
      }
    },
    [saveToVault, savingId]
  );

  return { savingId, savedId, save };
}

/** Small shared Save button used by every item type. */
function SaveButton({
  transfer,
  savingId,
  savedId,
  onSave,
}: {
  transfer: VoltTransfer;
  savingId: string | null;
  savedId: string | null;
  onSave: (transfer: VoltTransfer) => void;
}) {
  const saving = savingId === transfer.id;
  const saved = savedId === transfer.id;
  return (
    <button
      className={`f-volt-action f-volt-action--save ${saved ? 'is-saved' : ''}`}
      type="button"
      onClick={() => onSave(transfer)}
      disabled={saving || saved}
      title="Save to VOLT vault"
    >
      {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Text item
// ---------------------------------------------------------------------------
function VoltTextItem({
  transfer,
  showSender,
  showTimestamps,
  onDelete,
  copiedId,
  onCopy,
  savingId,
  savedId,
  onSave,
}: {
  transfer: VoltTransfer;
  showSender: boolean;
  showTimestamps: boolean;
  onDelete: (id: string) => void;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  savingId: string | null;
  savedId: string | null;
  onSave: (transfer: VoltTransfer) => void;
}) {
  const copied = copiedId === transfer.id;
  return (
    <div className="f-volt-item f-volt-item--text">
      <div className="f-volt-item-meta">
        {showSender && (
          <span className="f-volt-sender">@{transfer.sender_username ?? '…'}</span>
        )}
        {showTimestamps && (
          <span className="f-volt-time">{relativeTime(transfer.created_at)}</span>
        )}
        {transfer.group_name && (
          <span className="f-volt-group">via {transfer.group_name}</span>
        )}
      </div>
      <p className="f-volt-item-text">{transfer.content}</p>
      <div className="f-volt-item-actions">
        <SaveButton transfer={transfer} savingId={savingId} savedId={savedId} onSave={onSave} />
        <button
          className={`f-volt-action f-volt-action--copy ${copied ? 'is-copied' : ''}`}
          type="button"
          onClick={() => onCopy(transfer.id, transfer.content ?? '')}
          title="Copy text"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <button
          className="f-volt-action f-volt-action--delete"
          type="button"
          onClick={() => onDelete(transfer.id)}
          title="Delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Link item
// ---------------------------------------------------------------------------
function VoltLinkItem({
  transfer,
  showSender,
  showTimestamps,
  onDelete,
  copiedId,
  onCopy,
  savingId,
  savedId,
  onSave,
}: {
  transfer: VoltTransfer;
  showSender: boolean;
  showTimestamps: boolean;
  onDelete: (id: string) => void;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  savingId: string | null;
  savedId: string | null;
  onSave: (transfer: VoltTransfer) => void;
}) {
  const copied = copiedId === transfer.id;
  const url = transfer.content ?? '';
  const domain = extractDomain(url);

  return (
    <div className="f-volt-item f-volt-item--link">
      <div className="f-volt-item-meta">
        {showSender && (
          <span className="f-volt-sender">@{transfer.sender_username ?? '…'}</span>
        )}
        {showTimestamps && (
          <span className="f-volt-time">{relativeTime(transfer.created_at)}</span>
        )}
        {transfer.group_name && (
          <span className="f-volt-group">via {transfer.group_name}</span>
        )}
      </div>
      <div className="f-volt-link-row">
        <img
          className="f-volt-favicon"
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
          width={14}
          height={14}
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
        <span className="f-volt-link-domain">{domain}</span>
      </div>
      <div className="f-volt-item-actions">
        <a
          className="f-volt-action f-volt-action--open"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open link"
        >
          Open
        </a>
        <SaveButton transfer={transfer} savingId={savingId} savedId={savedId} onSave={onSave} />
        <button
          className={`f-volt-action f-volt-action--copy ${copied ? 'is-copied' : ''}`}
          type="button"
          onClick={() => onCopy(transfer.id, url)}
          title="Copy URL"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <button
          className="f-volt-action f-volt-action--delete"
          type="button"
          onClick={() => onDelete(transfer.id)}
          title="Delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image item
// ---------------------------------------------------------------------------
function VoltImageItem({
  transfer,
  showSender,
  showTimestamps,
  onDelete,
  savingId,
  savedId,
  onSave,
}: {
  transfer: VoltTransfer;
  showSender: boolean;
  showTimestamps: boolean;
  onDelete: (id: string) => void;
  savingId: string | null;
  savedId: string | null;
  onSave: (transfer: VoltTransfer) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const url = transfer.file_url ?? '';

  return (
    <div className="f-volt-item f-volt-item--image">
      <div className="f-volt-item-meta">
        {showSender && (
          <span className="f-volt-sender">@{transfer.sender_username ?? '…'}</span>
        )}
        {showTimestamps && (
          <span className="f-volt-time">{relativeTime(transfer.created_at)}</span>
        )}
        {transfer.group_name && (
          <span className="f-volt-group">via {transfer.group_name}</span>
        )}
      </div>
      {url && !imgError ? (
        <div className="f-volt-image-wrap">
          <img
            className="f-volt-image-preview"
            // Use Cloudinary URL transformation to request a thumbnail
            // Cloudinary URLs contain /upload/ — inject w_320,c_limit before the version/path
            src={url.includes('/upload/')
              ? url.replace('/upload/', '/upload/w_320,c_limit,q_auto,f_auto/')
              : url}
            alt={transfer.file_name ?? 'Image'}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="f-volt-image-fallback">
          <span className="f-volt-image-icon" aria-hidden="true">🖼️</span>
          <span className="f-volt-file-name">{transfer.file_name ?? 'image'}</span>
        </div>
      )}
      <div className="f-volt-item-actions">
        <a
          className="f-volt-action f-volt-action--open"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open full image"
        >
          Open
        </a>
        <SaveButton transfer={transfer} savingId={savingId} savedId={savedId} onSave={onSave} />
        <button
          className="f-volt-action f-volt-action--delete"
          type="button"
          onClick={() => onDelete(transfer.id)}
          title="Delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File / audio item
// ---------------------------------------------------------------------------
function VoltFileItem({
  transfer,
  showSender,
  showTimestamps,
  onDelete,
  savingId,
  savedId,
  onSave,
}: {
  transfer: VoltTransfer;
  showSender: boolean;
  showTimestamps: boolean;
  onDelete: (id: string) => void;
  savingId: string | null;
  savedId: string | null;
  onSave: (transfer: VoltTransfer) => void;
}) {
  const url = transfer.file_url ?? '';
  const isAudio = transfer.type === 'audio';
  const icon = isAudio ? '🎵' : '📄';

  return (
    <div className="f-volt-item f-volt-item--file">
      <div className="f-volt-item-meta">
        {showSender && (
          <span className="f-volt-sender">@{transfer.sender_username ?? '…'}</span>
        )}
        {showTimestamps && (
          <span className="f-volt-time">{relativeTime(transfer.created_at)}</span>
        )}
        {transfer.group_name && (
          <span className="f-volt-group">via {transfer.group_name}</span>
        )}
      </div>
      <div className="f-volt-file-row">
        <span className="f-volt-file-icon" aria-hidden="true">{icon}</span>
        <div className="f-volt-file-info">
          <span className="f-volt-file-name">{transfer.file_name ?? (isAudio ? 'audio' : 'file')}</span>
          {transfer.file_size && (
            <span className="f-volt-file-size">{humanSize(transfer.file_size)}</span>
          )}
        </div>
      </div>
      <div className="f-volt-item-actions">
        {url && (
          <a
            className="f-volt-action f-volt-action--open"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={transfer.file_name ?? undefined}
            title="Download"
          >
            {isAudio ? 'Open' : 'Download'}
          </a>
        )}
        <SaveButton transfer={transfer} savingId={savingId} savedId={savedId} onSave={onSave} />
        <button
          className="f-volt-action f-volt-action--delete"
          type="button"
          onClick={() => onDelete(transfer.id)}
          title="Delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item dispatcher
// ---------------------------------------------------------------------------
function VoltItemList({
  transfers,
  config,
}: {
  transfers: VoltTransfer[];
  config: Required<VoltConfig>;
}) {
  const { deleteTransfer } = useVoltStore();
  const { copiedId, copy } = useCopied();
  const { savingId, savedId, save } = useSaveToVault();

  // Apply type filters from config
  const visible = transfers.filter((t) => {
    if (t.type === 'text' && !config.showText) return false;
    if (t.type === 'link' && !config.showLinks) return false;
    if ((t.type === 'image') && !config.showImages) return false;
    if ((t.type === 'file' || t.type === 'audio') && !config.showFiles) return false;
    return true;
  });

  if (visible.length === 0) return null;

  return (
    <div className="f-volt-list">
      {visible.map((transfer) => {
        const commonProps = {
          transfer,
          showSender: config.showSender,
          showTimestamps: config.showTimestamps,
          onDelete: deleteTransfer,
          copiedId,
          onCopy: copy,
          savingId,
          savedId,
          onSave: save,
        };

        const fileProps = {
          transfer,
          showSender: config.showSender,
          showTimestamps: config.showTimestamps,
          onDelete: deleteTransfer,
          savingId,
          savedId,
          onSave: save,
        };

        switch (transfer.type) {
          case 'text':
            return <VoltTextItem key={transfer.id} {...commonProps} />;
          case 'link':
            return <VoltLinkItem key={transfer.id} {...commonProps} />;
          case 'image':
            return <VoltImageItem key={transfer.id} {...fileProps} />;
          case 'file':
          case 'audio':
            return <VoltFileItem key={transfer.id} {...fileProps} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header — shown when authenticated
// ---------------------------------------------------------------------------
function VoltHeader({
  username,
  onSignOut,
}: {
  username: string;
  onSignOut: () => void;
}) {
  return (
    <div className="f-volt-header">
      <VoltBadge />
      <div className="f-volt-header-right">
        <span className="f-volt-header-user">@{username}</span>
        <button
          className="f-volt-signout"
          type="button"
          onClick={onSignOut}
          title="Disconnect VOLT"
          aria-label="Disconnect VOLT account"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New-item badge — shown briefly when a realtime transfer arrives
// ---------------------------------------------------------------------------
function VoltNewBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <div className="f-volt-new-badge" aria-live="polite">⚡ New</div>;
}

// ---------------------------------------------------------------------------
// Root widget
// ---------------------------------------------------------------------------
interface Props {
  config?: VoltConfig;
}

// Merge user config with defaults
function resolveConfig(config?: VoltConfig): Required<VoltConfig> {
  return {
    maxItems: config?.maxItems ?? 5,
    showSender: config?.showSender ?? true,
    showTimestamps: config?.showTimestamps ?? true,
    showText: config?.showText ?? true,
    showLinks: config?.showLinks ?? true,
    showImages: config?.showImages ?? true,
    showFiles: config?.showFiles ?? true,
  };
}

export function VoltWidget({ config }: Props) {
  const resolved = resolveConfig(config);

  const {
    authState,
    currentUser,
    dataState,
    dataError,
    transfers,
    signIn,
    signOut,
    fetchTransfers,
    subscribeRealtime,
    restoreSession,
  } = useVoltStore();

  // On first mount, attempt to silently restore a persisted session.
  // This replaces the sign-in form with the live widget after a page reload.
  useEffect(() => {
    restoreSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track previous transfer count to animate new arrivals
  const prevCountRef = useRef(transfers.length);
  const [showNewBadge, setShowNewBadge] = useState(false);
  const newBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch data once authenticated
  useEffect(() => {
    if (authState === 'authenticated' && currentUser) {
      fetchTransfers(resolved.maxItems);
    }
  }, [authState, currentUser, resolved.maxItems, fetchTransfers]);

  // Subscribe to realtime once authenticated
  useEffect(() => {
    if (authState !== 'authenticated' || !currentUser) return;
    const unsubscribe = subscribeRealtime(resolved.maxItems);
    return unsubscribe;
  }, [authState, currentUser, resolved.maxItems, subscribeRealtime]);

  // Flash the new-item badge when transfer count increases
  useEffect(() => {
    if (transfers.length > prevCountRef.current) {
      setShowNewBadge(true);
      if (newBadgeTimerRef.current) clearTimeout(newBadgeTimerRef.current);
      newBadgeTimerRef.current = setTimeout(() => setShowNewBadge(false), 3000);
    }
    prevCountRef.current = transfers.length;
  }, [transfers.length]);

  useEffect(() => {
    return () => {
      if (newBadgeTimerRef.current) clearTimeout(newBadgeTimerRef.current);
    };
  }, []);

  // ---------- unauthenticated / idle ----------
  if (authState === 'idle' || authState === 'unauthenticated' || authState === 'error') {
    return (
      <div className="f-volt">
        <VoltSignIn onSignIn={signIn} />
      </div>
    );
  }

  // ---------- signing in ----------
  if (authState === 'loading') {
    return (
      <div className="f-volt">
        <VoltLoadingState />
      </div>
    );
  }

  // ---------- authenticated ----------
  return (
    <div className="f-volt">
      <VoltHeader
        username={currentUser!.username}
        onSignOut={signOut}
      />

      <VoltNewBadge visible={showNewBadge} />

      {dataState === 'loading' && <VoltLoadingState showBadge={false} />}

      {dataState === 'error' && (
        <VoltErrorState
          message={dataError ?? 'Unknown error'}
          onRetry={() => fetchTransfers(resolved.maxItems)}
        />
      )}

      {dataState === 'ready' && transfers.length === 0 && (
        <VoltEmptyState />
      )}

      {dataState === 'ready' && transfers.length > 0 && (
        <VoltItemList transfers={transfers} config={resolved} />
      )}
    </div>
  );
}
