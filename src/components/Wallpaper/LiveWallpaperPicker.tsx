import { useEffect, useRef, useState } from 'react';
import type { LiveWallpaperType } from '../../lib/workspaceTypes';

interface Props {
  current: LiveWallpaperType;
  onSelect: (type: LiveWallpaperType) => void;
}

const LIVE_OPTIONS: { id: LiveWallpaperType; label: string; preview: string }[] = [
  { id: 'aurora', label: 'Aurora', preview: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  { id: 'gradient-wave', label: 'Gradient Wave', preview: 'linear-gradient(270deg, #fc5c7d, #6a82fb, #05dfd7)' },
  { id: 'particles', label: 'Particles', preview: 'linear-gradient(160deg, #0f2027, #203a43, #2c5364)' },
  { id: 'mesh-gradient', label: 'Mesh', preview: 'linear-gradient(135deg, #1a1a2e, #ff6b6b33, #4ecdc433)' },
  { id: 'ocean', label: 'Ocean', preview: 'linear-gradient(180deg, #1a3a4a, #0a1628)' },
];

export function LiveWallpaperPicker({ current, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="td-lwp-wrapper" ref={ref}>
      <button
        className="td-toolbar-btn"
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Live wallpaper"
        aria-label="Live wallpaper"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </button>

      {open && (
        <div className="td-lwp-dropdown" role="menu">
          <div className="td-lwp-header">Live backgrounds</div>
          <div className="td-lwp-grid">
            {LIVE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`td-lwp-option ${current === opt.id ? 'is-active' : ''}`}
                type="button"
                onClick={() => {
                  onSelect(opt.id);
                  setOpen(false);
                }}
                title={opt.label}
                aria-label={opt.label}
              >
                <span
                  className="td-lwp-preview"
                  style={{ background: opt.preview }}
                />
                <span className="td-lwp-label">{opt.label}</span>
              </button>
            ))}
          </div>
          {current && (
            <button
              className="td-lwp-clear"
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
            >
              Remove live wallpaper
            </button>
          )}
        </div>
      )}
    </div>
  );
}
