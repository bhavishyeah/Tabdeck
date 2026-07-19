import { useRef } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';

export function WallpaperPicker() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { setWallpaper, clearWallpaper } = useSettingsStore();

  const handleFile = (file?: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setWallpaper(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="td-wallpaper-actions">
      <button
        className="td-wallpaper-btn"
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        Wallpaper
      </button>

      <button
        className="td-wallpaper-btn td-wallpaper-clear"
        type="button"
        onClick={clearWallpaper}
      >
        Clear
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}