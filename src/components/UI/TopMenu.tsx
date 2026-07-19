import { useRef, useState } from 'react';
import {
  Bookmark,
  Download,
  Ellipsis,
  Image,
  Layers,
  Upload,
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

export function TopMenu({
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
    <div className={`td-menu ${open ? 'is-open' : ''}`}>
      <div className="td-menu-rail">
        <button
          className="td-icon-btn"
          type="button"
          onClick={cycleQuickSaveBoard}
          title={
            boards.find((board) => board.id === quickSaveBoardId)?.name
              ? `Quick Save: ${boards.find((board) => board.id === quickSaveBoardId)?.name}`
              : 'Quick Save'
          }
          aria-label="Cycle Quick Save board"
        >
          <Layers size={18} strokeWidth={1.9} />
        </button>

        <button
          className="td-icon-btn"
          type="button"
          onClick={onImportBookmarks}
          title="Import bookmarks"
          aria-label="Import bookmarks"
        >
          <Bookmark size={18} strokeWidth={1.9} />
        </button>

        <button
          className="td-icon-btn"
          type="button"
          onClick={onExport}
          title="Export JSON"
          aria-label="Export JSON"
        >
          <Download size={18} strokeWidth={1.9} />
        </button>

        <button
          className="td-icon-btn"
          type="button"
          onClick={() => importRef.current?.click()}
          title="Import JSON"
          aria-label="Import JSON"
        >
          <Upload size={18} strokeWidth={1.9} />
        </button>

        <button
          className="td-icon-btn"
          type="button"
          onClick={() => wallpaperRef.current?.click()}
          title="Wallpaper"
          aria-label="Pick wallpaper"
        >
          <Image size={18} strokeWidth={1.9} />
        </button>

        <button
          className="td-icon-btn"
          type="button"
          onClick={onClearWallpaper}
          title="Clear wallpaper"
          aria-label="Clear wallpaper"
        >
          <X size={18} strokeWidth={1.9} />
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
        className="td-icon-btn td-menu-trigger"
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Menu"
        aria-label="Open menu"
      >
        <Ellipsis size={20} strokeWidth={2} />
      </button>
    </div>
  );
}