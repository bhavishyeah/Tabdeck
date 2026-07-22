import type { LiveWallpaperType } from '../../lib/workspaceTypes';
import './LiveWallpaper.css';

interface Props {
  type: LiveWallpaperType;
}

export function LiveWallpaper({ type }: Props) {
  if (!type) return null;

  return (
    <div className={`td-live-wallpaper td-lw-${type}`} aria-hidden="true">
      {type === 'particles' && <ParticlesCanvas />}
    </div>
  );
}

function ParticlesCanvas() {
  return (
    <div className="td-lw-particles-container">
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="td-lw-particle"
          style={{
            '--x': `${Math.random() * 100}%`,
            '--y': `${Math.random() * 100}%`,
            '--duration': `${4 + Math.random() * 6}s`,
            '--delay': `${Math.random() * 5}s`,
            '--size': `${2 + Math.random() * 4}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
