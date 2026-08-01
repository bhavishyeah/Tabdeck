import { useEffect, useRef, useState } from 'react';
import { Settings as SettingsIcon, X } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

const FONTS = [
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Poppins', value: "'Poppins', sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Open Sans', value: "'Open Sans', sans-serif" },
  { name: 'Nunito', value: "'Nunito', sans-serif" },
  { name: 'Lato', value: "'Lato', sans-serif" },
  { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { name: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
  { name: 'DM Sans', value: "'DM Sans', sans-serif" },
];

const FONT_URLS: Record<string, string> = {
  Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  Poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap',
  Roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'Open Sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
  Nunito: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap',
  Lato: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap',
  'JetBrains Mono': 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap',
  'Space Grotesk': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap',
  'DM Sans': 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap',
};

const SHORTCUTS = [
  { keys: 'Ctrl+B', action: 'New board' },
  { keys: 'Ctrl+M', action: 'Toggle toolbar' },
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Y', action: 'Redo' },
  { keys: 'Alt+N', action: 'New note' },
  { keys: 'Alt+T', action: 'New todo' },
  { keys: 'Alt+W', action: 'New weather' },
  { keys: 'Alt+C', action: 'New clock' },
  { keys: 'Alt+L', action: 'Lock/Unlock' },
  { keys: 'Alt+S', action: 'Search' },
  { keys: 'Alt+E', action: 'Export' },
  { keys: 'Alt+I', action: 'Import' },
  { keys: 'Alt+P', action: 'Wallpaper' },
  { keys: 'Alt+X', action: 'Wipe' },
];

export function applyFontCSS(fontFamily: string, fontSize: number) {
  const font = FONTS.find((f) => f.name === fontFamily);
  if (font) document.documentElement.style.setProperty('--td-font', font.value);
  document.documentElement.style.setProperty('--td-font-size', `${fontSize}px`);

  if (fontFamily !== 'Montserrat') {
    const url = FONT_URLS[fontFamily];
    if (url && !document.querySelector(`link[href="${url}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
    }
  }
}

export function applyGlassCSS(blur: number, saturation: number, tint?: number) {
  document.documentElement.style.setProperty('--td-backdrop', `blur(${blur}px) saturate(${saturation}%)`);
  if (tint !== undefined) {
    document.documentElement.style.setProperty('--td-glass-tint', `${tint / 100}`);
  }
}

type Tab = 'appearance' | 'behavior' | 'data' | 'info';

interface Props {
  onResetOnboarding: () => void;
}

export function SettingsButton({ onResetOnboarding }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('appearance');
  const [storageUsage, setStorageUsage] = useState('...');
  const panelRef = useRef<HTMLDivElement>(null);
  const settings = useSettingsStore();

  // Apply font CSS on mount and when font changes
  useEffect(() => {
    applyFontCSS(settings.fontFamily, settings.fontSize);
  }, [settings.fontFamily, settings.fontSize]);

  // Apply glass effects on mount and when changed
  useEffect(() => {
    applyGlassCSS(settings.glassBlur, settings.glassSaturation, settings.glassTint);
  }, [settings.glassBlur, settings.glassSaturation, settings.glassTint]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open && tab === 'data') {
      chrome.storage.local.getBytesInUse(null, (bytes) => {
        setStorageUsage(bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`);
      });
    }
  }, [open, tab]);

  const handleClearAll = () => {
    if (confirm('This will delete ALL TabDeck data. Are you sure?')) {
      chrome.storage.local.clear();
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="td-settings-wrapper" ref={panelRef}>
      <button className="td-settings-btn" type="button" onClick={() => setOpen((v) => !v)} title="Settings">
        <SettingsIcon size={16} strokeWidth={2} />
      </button>

      {open && (
        <div className="td-settings-panel">
          <div className="td-settings-header">
            <span className="td-settings-panel-title">Settings</span>
            <button className="td-settings-close" type="button" onClick={() => setOpen(false)}><X size={14} /></button>
          </div>

          <div className="td-settings-tabs">
            {(['appearance', 'behavior', 'data', 'info'] as Tab[]).map((t) => (
              <button key={t} className={`td-settings-tab ${tab === t ? 'is-active' : ''}`} type="button" onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="td-settings-body">
            {tab === 'appearance' && (
              <>
                <label className="td-settings-label">Font</label>
                <div className="td-settings-fonts">
                  {FONTS.map((font) => (
                    <button key={font.name} className={`td-settings-font-btn ${settings.fontFamily === font.name ? 'is-active' : ''}`} type="button" onClick={() => settings.update({ fontFamily: font.name })} style={{ fontFamily: font.value }}>
                      {font.name}
                    </button>
                  ))}
                </div>

                <label className="td-settings-label">Font Size ({settings.fontSize}px)</label>
                <input type="range" min={8} max={14} value={settings.fontSize} onChange={(e) => settings.update({ fontSize: +e.target.value })} className="td-settings-slider" />

                <label className="td-settings-label">Board Opacity ({Math.round(settings.boardOpacity * 100)}%)</label>
                <input type="range" min={50} max={100} value={Math.round(settings.boardOpacity * 100)} onChange={(e) => settings.update({ boardOpacity: +e.target.value / 100 })} className="td-settings-slider" />

                <label className="td-settings-label">Border Radius ({settings.boardRadius}px)</label>
                <input type="range" min={4} max={24} value={settings.boardRadius} onChange={(e) => settings.update({ boardRadius: +e.target.value })} className="td-settings-slider" />

                <label className="td-settings-label">Text Mode</label>
                <div className="td-settings-row">
                  {(['auto', 'dark', 'light'] as const).map((m) => (
                    <button key={m} className={`td-settings-pill ${settings.textMode === m ? 'is-active' : ''}`} type="button" onClick={() => settings.update({ textMode: m })}>{m}</button>
                  ))}
                </div>

                <label className="td-settings-label">Toolbar Position</label>
                <div className="td-settings-row">
                  {(['left', 'center', 'right'] as const).map((p) => (
                    <button key={p} className={`td-settings-pill ${settings.toolbarPosition === p ? 'is-active' : ''}`} type="button" onClick={() => settings.update({ toolbarPosition: p })}>{p}</button>
                  ))}
                </div>

                <div className="td-settings-divider" />
                <label className="td-settings-section-title">Glass Effect</label>

                <label className="td-settings-label">Blur ({settings.glassBlur}px)</label>
                <input type="range" min={0} max={24} step={1} value={settings.glassBlur}
                  onChange={(e) => settings.update({ glassBlur: +e.target.value })}
                  className="td-settings-slider" />

                <label className="td-settings-label">Saturation ({settings.glassSaturation}%)</label>
                <input type="range" min={100} max={300} step={10} value={settings.glassSaturation}
                  onChange={(e) => settings.update({ glassSaturation: +e.target.value })}
                  className="td-settings-slider" />

                <label className="td-settings-label">Transparency ({settings.glassTint}%)</label>
                <input type="range" min={5} max={90} step={5} value={settings.glassTint}
                  onChange={(e) => settings.update({ glassTint: +e.target.value })}
                  className="td-settings-slider" />

                <div className="td-settings-divider" />

                <label className="td-settings-label">Apply color to all boards</label>
                <div className="td-board-color-picks" style={{ padding: '4px 0 6px' }}>
                  {['', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      className="td-board-color-dot"
                      type="button"
                      style={{ background: c || 'rgba(250,248,244,0.92)' }}
                      title={c || 'Default (no color)'}
                      onClick={() => {
                        const ws = useWorkspaceStore.getState().getActiveWorkspace();
                        if (!ws) return;
                        const color = c || undefined;
                        useWorkspaceStore.setState((s) => ({
                          workspaces: s.workspaces.map((w) =>
                            w.id === ws.id
                              ? { ...w, boards: w.boards.map((b) => ({ ...b, color })), updatedAt: Date.now() }
                              : w
                          ),
                        }));
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {tab === 'behavior' && (
              <>
                <label className="td-settings-label">Auto-close toolbar ({settings.autoCloseToolbar === 0 ? 'Off' : `${settings.autoCloseToolbar}s`})</label>
                <input type="range" min={0} max={30} step={5} value={settings.autoCloseToolbar} onChange={(e) => settings.update({ autoCloseToolbar: +e.target.value })} className="td-settings-slider" />

                <label className="td-settings-label">Auto-lock layout ({settings.autoLock === 0 ? 'Off' : `${settings.autoLock}s`})</label>
                <input type="range" min={0} max={60} step={10} value={settings.autoLock} onChange={(e) => settings.update({ autoLock: +e.target.value })} className="td-settings-slider" />

                <label className="td-settings-label">Open links in</label>
                <div className="td-settings-row">
                  <button className={`td-settings-pill ${settings.openLinksNewTab ? 'is-active' : ''}`} type="button" onClick={() => settings.update({ openLinksNewTab: true })}>New tab</button>
                  <button className={`td-settings-pill ${!settings.openLinksNewTab ? 'is-active' : ''}`} type="button" onClick={() => settings.update({ openLinksNewTab: false })}>Same tab</button>
                </div>

                <label className="td-settings-label">Default board width ({settings.defaultBoardW})</label>
                <input type="range" min={20} max={60} value={settings.defaultBoardW} onChange={(e) => settings.update({ defaultBoardW: +e.target.value })} className="td-settings-slider" />

                <label className="td-settings-label">Default board height ({settings.defaultBoardH})</label>
                <input type="range" min={4} max={20} value={settings.defaultBoardH} onChange={(e) => settings.update({ defaultBoardH: +e.target.value })} className="td-settings-slider" />
              </>
            )}

            {tab === 'data' && (
              <>
                <label className="td-settings-label">Storage used</label>
                <div className="td-settings-value">{storageUsage}</div>
                <button className="td-settings-action" type="button" onClick={onResetOnboarding}>Re-run onboarding tour</button>
                <button className="td-settings-action td-settings-danger" type="button" onClick={handleClearAll}>Factory reset (clear all data)</button>
              </>
            )}

            {tab === 'info' && (
              <>
                <div className="td-settings-info-row"><span>Version</span><span>TabDeck v4.1.0</span></div>
                <div className="td-settings-info-row"><span>GitHub</span><a href="https://github.com/bhavishyeah/Tabdeck" target="_blank" rel="noreferrer">bhavishyeah/Tabdeck</a></div>
                <label className="td-settings-label" style={{ marginTop: 12 }}>Keyboard Shortcuts</label>
                <div className="td-settings-shortcuts">
                  {SHORTCUTS.map((s) => (
                    <div key={s.keys} className="td-settings-shortcut-row"><kbd className="td-settings-kbd">{s.keys}</kbd><span>{s.action}</span></div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
