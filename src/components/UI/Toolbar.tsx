import { useRef, useState } from 'react';
import {
  Bookmark,
  CircleArrowDown,
  CircleArrowUp,
  Ellipsis,
  Image,
  Power,
  ScanSearch,
  X,
} from 'lucide-react';
import type { BoardType } from '../../lib/types';
import { useUiStore } from '../../store/useUiStore';

interface Props {
  boards: BoardType[];
  quickSaveBoardId: string;
  setQuickSaveBoardId: (id: string) => void;
  onImportBookmarks: () => void | Promise<void>;
  onExport: () => void | Promise<void>;
  onImportJson: (file?: File) => void;
  onWallpaper: (file?: File) => void;
  onClearWallpaper: () => void;
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
}: Props) {
  const [open, setOpen] = useState(false);
  const importRef = useRef<HTMLInputElement | null>(null);
  const wallpaperRef = useRef<HTMLInputElement | null>(null);
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

  return (
    <div className={`td-toolbar ${open ? 'is-open' : ''}`}>
      <div className="td-toolbar-expanded">
        <button
          className="td-toolbar-btn"
          type="button"
          onClick={cycleQuickSaveBoard}
          title="Quick Save board"
          aria-label="Quick Save board"
        >
          <ScanSearch size={20} strokeWidth={2.4} />
        </button>

        <button
          className="td-toolbar-btn"
          type="button"
          onClick={onImportBookmarks}
          title="Import bookmarks"
          aria-label="Import bookmarks"
        >
          <Bookmark size={20} strokeWidth={2.4} />
        </button>

        <button
          className="td-toolbar-btn"
          type="button"
          onClick={onExport}
          title="Export JSON"
          aria-label="Export JSON"
        >
          <CircleArrowUp size={20} strokeWidth={2.4} />
        </button>

        <button
          className="td-toolbar-btn"
          type="button"
          onClick={() => importRef.current?.click()}
          title="Import JSON"
          aria-label="Import JSON"
        >
          <CircleArrowDown size={20} strokeWidth={2.4} />
        </button>

        <button
          className="td-toolbar-btn"
          type="button"
          onClick={() => wallpaperRef.current?.click()}
          title="Wallpaper"
          aria-label="Wallpaper"
        >
          <Image size={20} strokeWidth={2.4} />
        </button>

        <button
          className="td-toolbar-btn"
          type="button"
          onClick={onClearWallpaper}
          title="Clear wallpaper"
          aria-label="Clear wallpaper"
        >
          <Power size={20} strokeWidth={2.4} />
        </button>

        <button
          className="td-toolbar-btn"
          type="button"
          onClick={() => setOpen(false)}
          title="Close toolbar"
          aria-label="Close toolbar"
        >
          <X size={20} strokeWidth={2.4} />
        </button>

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

      <button
        className="td-toolbar-trigger"
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Menu"
        aria-label="Menu"
      >
        <Ellipsis size={22} strokeWidth={2.4} />
      </button>
    </div>
  );
}