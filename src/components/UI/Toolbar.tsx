import { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronRight,
  CircleArrowDown,
  CircleArrowUp,
  Ellipsis,
  FolderOpen,
  Image,
  Power,
  ScanSearch,
  X,
} from 'lucide-react';
import type { BoardType } from '../../lib/types';
import type { LiveWallpaperType } from '../../lib/workspaceTypes';
import { useUiStore } from '../../store/useUiStore';
import { LiveWallpaperPicker } from '../Wallpaper/LiveWallpaperPicker';

interface BookmarkFolder {
  id: string;
  title: string;
  children?: BookmarkFolder[];
}

interface Props {
  boards: BoardType[];
  quickSaveBoardId: string;
  setQuickSaveBoardId: (id: string) => void;
  onImportBookmarks: (folderId?: string) => void | Promise<void>;
  onExport: () => void | Promise<void>;
  onImportJson: (file?: File) => void;
  onWallpaper: (file?: File) => void;
  onClearWallpaper: () => void;
  currentLiveWallpaper?: LiveWallpaperType;
  onLiveWallpaper?: (type: LiveWallpaperType) => void;
}

function collectFolders(nodes: chrome.bookmarks.BookmarkTreeNode[]): BookmarkFolder[] {
  const folders: BookmarkFolder[] = [];

  for (const node of nodes) {
    if (!node.url && node.children) {
      folders.push({
        id: node.id,
        title: node.title || 'Untitled Folder',
        children: collectFolders(node.children),
      });
    }
  }

  return folders;
}

export function Toolbar({
  boards,
  quickSaveBoardId,
  setQuickSaveBoardId,
  onImportBookmarks,
  onExport,
  onImportJson,
  onWallpaper,
  onClearWallpaper,
  currentLiveWallpaper,
  onLiveWallpaper,
}: Props) {
  const [open, setOpen] = useState(false);
  const [bookmarkDropdownOpen, setBookmarkDropdownOpen] = useState(false);
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const importRef = useRef<HTMLInputElement | null>(null);
  const wallpaperRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const { showToast } = useUiStore();

  const cycleQuickSaveBoard = async () => {
    if (!boards.length) return;

    const currentIndex = boards.findIndex((board) => board.id === quickSaveBoardId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % boards.length;
    const nextBoard = boards[nextIndex];

    setQuickSaveBoardId(nextBoard.id);
    await chrome.storage.local.set({
      'tabdeck-quick-save-board-id': nextBoard.id,
    });

    showToast(`Quick Save: ${nextBoard.name}`, 'info');
  };

  const handleBookmarkClick = async () => {
    if (bookmarkDropdownOpen) {
      setBookmarkDropdownOpen(false);
      return;
    }

    try {
      const tree = await chrome.bookmarks.getTree();
      const rootChildren = tree[0]?.children ?? [];
      const folders = collectFolders(rootChildren);
      setBookmarkFolders(folders);
      setExpandedFolders(new Set());
      setBookmarkDropdownOpen(true);
    } catch (err) {
      console.error('Failed to load bookmark folders:', err);
      showToast('Could not load bookmarks', 'error');
    }
  };

  const handleFolderSelect = (folderId: string) => {
    setBookmarkDropdownOpen(false);
    onImportBookmarks(folderId);
  };

  const toggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!bookmarkDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBookmarkDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bookmarkDropdownOpen]);

  const renderFolderTree = (folders: BookmarkFolder[], depth = 0) => {
    return folders.map((folder) => {
      const hasChildren = folder.children && folder.children.length > 0;
      const isExpanded = expandedFolders.has(folder.id);

      return (
        <div key={folder.id} className="td-bm-folder-item">
          <div
            className="td-bm-folder-row"
            style={{ paddingLeft: `${8 + depth * 14}px` }}
          >
            {hasChildren && (
              <button
                className="td-bm-expand-btn"
                type="button"
                onClick={() => toggleExpand(folder.id)}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                <ChevronRight
                  size={14}
                  style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 150ms ease',
                  }}
                />
              </button>
            )}
            {!hasChildren && <span className="td-bm-expand-spacer" />}
            <button
              className="td-bm-folder-btn"
              type="button"
              onClick={() => handleFolderSelect(folder.id)}
              title={`Import "${folder.title}"`}
            >
              <FolderOpen size={14} strokeWidth={2} />
              <span className="td-bm-folder-name">{folder.title}</span>
            </button>
          </div>
          {hasChildren && isExpanded && (
            <div className="td-bm-folder-children">
              {renderFolderTree(folder.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={`td-toolbar ${open ? 'is-open' : ''}`}>
      {/* Trigger button: ⋯ when closed, X when open */}
      <button
        className="td-toolbar-trigger"
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Close menu' : 'Menu'}
        aria-label={open ? 'Close menu' : 'Menu'}
      >
        <span className={`td-trigger-icon ${open ? 'is-rotated' : ''}`}>
          {open ? <X size={20} strokeWidth={2.4} /> : <Ellipsis size={22} strokeWidth={2.4} />}
        </span>
      </button>

      {/* Expanded tray — slides out to the right */}
      <div className="td-toolbar-tray">
        <button
          className="td-toolbar-btn"
          type="button"
          onClick={cycleQuickSaveBoard}
          title="Quick Save board"
          aria-label="Quick Save board"
        >
          <ScanSearch size={18} strokeWidth={2.2} />
        </button>

        <div className="td-bm-dropdown-wrapper" ref={dropdownRef}>
          <button
            className="td-toolbar-btn"
            type="button"
            onClick={handleBookmarkClick}
            title="Import bookmarks"
            aria-label="Import bookmarks"
            aria-expanded={bookmarkDropdownOpen}
            aria-haspopup="true"
          >
            <Bookmark size={18} strokeWidth={2.2} />
          </button>

          {bookmarkDropdownOpen && (
            <div className="td-bm-dropdown" role="menu">
              <div className="td-bm-dropdown-header">Select bookmark folder</div>
              <div className="td-bm-dropdown-list">
                {bookmarkFolders.length === 0 ? (
                  <div className="td-bm-dropdown-empty">No folders found</div>
                ) : (
                  renderFolderTree(bookmarkFolders)
                )}
              </div>
            </div>
          )}
        </div>

        <button
          className="td-toolbar-btn"
          type="button"
          onClick={onExport}
          title="Export JSON"
          aria-label="Export JSON"
        >
          <CircleArrowUp size={18} strokeWidth={2.2} />
        </button>

        <button
          className="td-toolbar-btn"
          type="button"
          onClick={() => importRef.current?.click()}
          title="Import JSON"
          aria-label="Import JSON"
        >
          <CircleArrowDown size={18} strokeWidth={2.2} />
        </button>

        <button
          className="td-toolbar-btn"
          type="button"
          onClick={() => wallpaperRef.current?.click()}
          title="Wallpaper"
          aria-label="Wallpaper"
        >
          <Image size={18} strokeWidth={2.2} />
        </button>

        <button
          className="td-toolbar-btn"
          type="button"
          onClick={onClearWallpaper}
          title="Clear wallpaper"
          aria-label="Clear wallpaper"
        >
          <Power size={18} strokeWidth={2.2} />
        </button>

        {currentLiveWallpaper !== undefined && onLiveWallpaper && (
          <LiveWallpaperPicker
            current={currentLiveWallpaper}
            onSelect={onLiveWallpaper}
          />
        )}

        <input
          ref={importRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => onImportJson(e.target.files?.[0])}
        />

        <input
          ref={wallpaperRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onWallpaper(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
