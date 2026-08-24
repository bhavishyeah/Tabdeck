import { useEffect, useRef, useState } from 'react';
import { Settings as SettingsIcon, X, AlertTriangle } from 'lucide-react';
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

// ─── Cursor-following tooltip slider ───
interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  tooltip?: string;
}

function TipSlider({ min, max, step = 1, value, onChange, tooltip }: SliderProps) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      className="f-slider-wrap"
      onMouseEnter={() => tooltip && setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="td-settings-slider"
      />
      {showTip && tooltip && (
        <div className="f-slider-tip">{tooltip}</div>
      )}
    </div>
  );
}

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

export function applyGlassCSS(blur: number, saturation: number, _tint?: number, toolbarBlur?: number, toolbarSaturation?: number, _toolbarTint?: number, toolbarOpacity?: number, toolbarRadius?: number, toolbarGrain?: number) {
  const root = document.documentElement.style;
  // Board glass
  root.setProperty('--td-backdrop', `blur(${blur}px) saturate(${saturation}%)`);
  // Toolbar glass
  const tb = toolbarBlur ?? blur;
  const ts = toolbarSaturation ?? saturation;
  const to = toolbarOpacity ?? 0.4;
  const tr = toolbarRadius ?? 50;
  const tg = toolbarGrain ?? 0;
  root.setProperty('--td-toolbar-backdrop', `blur(${tb}px) saturate(${ts}%)`);
  root.setProperty('--td-toolbar-opacity', `${to}`);
  root.setProperty('--td-toolbar-radius', `${tr}px`);
  root.setProperty('--td-toolbar-grain', `${tg / 100}`);
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
    applyGlassCSS(
      settings.glassBlur, settings.glassSaturation, settings.glassTint,
      settings.toolbarBlur, settings.toolbarSaturation, settings.toolbarTint,
      settings.toolbarOpacity, settings.toolbarRadius, settings.toolbarGrain
    );
  }, [settings.glassBlur, settings.glassSaturation, settings.glassTint, settings.toolbarBlur, settings.toolbarSaturation, settings.toolbarTint, settings.toolbarOpacity, settings.toolbarRadius, settings.toolbarGrain]);

  // Sync board radius to CSS variable (used by resize handle)
  useEffect(() => {
    document.documentElement.style.setProperty('--td-board-radius', `${settings.boardRadius}px`);
  }, [settings.boardRadius]);

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

  const [confirmReset, setConfirmReset] = useState(false);

  const handleClearAll = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    chrome.storage.local.clear();
    localStorage.clear();
    window.location.reload();
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
                {/* ─── Typography ─── */}
                <label className="td-settings-section-title">Typography</label>

                <label className="td-settings-label">Font</label>
                <div className="td-settings-fonts">
                  {FONTS.map((font) => (
                    <button key={font.name} className={`td-settings-font-btn ${settings.fontFamily === font.name ? 'is-active' : ''}`} type="button" onClick={() => settings.update({ fontFamily: font.name })} style={{ fontFamily: font.value }}>
                      {font.name}
                    </button>
                  ))}
                </div>

                <label className="td-settings-label">Font Size ({settings.fontSize}px)</label>
                <TipSlider min={8} max={14} value={settings.fontSize} onChange={(v) => settings.update({ fontSize: v })} tooltip="Base font size for all text content" />

                <label className="td-settings-label">Text Mode</label>
                <div className="td-settings-row">
                  {(['auto', 'dark', 'light'] as const).map((m) => (
                    <button key={m} className={`td-settings-pill ${settings.textMode === m ? 'is-active' : ''}`} type="button" onClick={() => settings.update({ textMode: m })}>{m}</button>
                  ))}
                </div>

                <div className="td-settings-divider" />

                {/* ─── Board ─── */}
                <label className="td-settings-section-title">Board</label>

                <label className="td-settings-label">Opacity ({Math.round(settings.boardOpacity * 100)}%)</label>
                <TipSlider min={5} max={100} value={Math.round(settings.boardOpacity * 100)} onChange={(v) => settings.update({ boardOpacity: v / 100 })} tooltip="Board background transparency — lower values show more wallpaper" />

                <label className="td-settings-label">Border Radius ({settings.boardRadius}px)</label>
                <TipSlider min={4} max={24} value={settings.boardRadius} onChange={(v) => settings.update({ boardRadius: v })} tooltip="Corner roundness of all boards" />

                <label className="td-settings-label">Blur ({settings.glassBlur}px)</label>
                <TipSlider min={0} max={24} value={settings.glassBlur} onChange={(v) => settings.update({ glassBlur: v })} tooltip="Backdrop blur intensity behind boards" />

                <label className="td-settings-label">Saturation ({settings.glassSaturation}%)</label>
                <TipSlider min={100} max={300} step={10} value={settings.glassSaturation} onChange={(v) => settings.update({ glassSaturation: v })} tooltip="Color vibrancy of the wallpaper through boards" />

                <label className="td-settings-label">Grain ({settings.grainIntensity}%)</label>
                <TipSlider min={0} max={100} step={5} value={settings.grainIntensity} onChange={(v) => settings.update({ grainIntensity: v })} tooltip="Film grain texture overlay on boards" />

                <label className="td-settings-label">Color (all boards)</label>
                <div className="td-board-color-picks" style={{ padding: '4px 0 6px' }}>
                  {['', 'clear', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      className="td-board-color-dot"
                      type="button"
                      style={{ background: c === 'clear' ? 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))' : c || 'rgba(250,248,244,0.92)', border: c === 'clear' ? '2px dashed rgba(255,255,255,0.5)' : undefined }}
                      title={c === 'clear' ? 'Clear glass (no color)' : c || 'Default'}
                      onClick={() => {
                        const ws = useWorkspaceStore.getState().getActiveWorkspace();
                        if (!ws) return;
                        const color = c === '' ? undefined : c;
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

                <div className="td-settings-divider" />

                {/* ─── Toolbar ─── */}
                <label className="td-settings-section-title">Toolbar</label>

                <label className="td-settings-label">Position</label>
                <div className="td-settings-row">
                  {(['left', 'center', 'right'] as const).map((p) => (
                    <button key={p} className={`td-settings-pill ${settings.toolbarPosition === p ? 'is-active' : ''}`} type="button" onClick={() => settings.update({ toolbarPosition: p })}>{p}</button>
                  ))}
                </div>

                <label className="td-settings-label">Opacity ({Math.round(settings.toolbarOpacity * 100)}%)</label>
                <TipSlider min={5} max={100} value={Math.round(settings.toolbarOpacity * 100)} onChange={(v) => settings.update({ toolbarOpacity: v / 100 })} tooltip="Toolbar background transparency" />

                <label className="td-settings-label">Border Radius ({settings.toolbarRadius}px)</label>
                <TipSlider min={4} max={50} value={settings.toolbarRadius} onChange={(v) => settings.update({ toolbarRadius: v })} tooltip="Corner roundness of toolbar elements" />

                <label className="td-settings-label">Blur ({settings.toolbarBlur}px)</label>
                <TipSlider min={0} max={24} value={settings.toolbarBlur} onChange={(v) => settings.update({ toolbarBlur: v })} tooltip="Backdrop blur behind toolbar" />

                <label className="td-settings-label">Saturation ({settings.toolbarSaturation}%)</label>
                <TipSlider min={100} max={300} step={10} value={settings.toolbarSaturation} onChange={(v) => settings.update({ toolbarSaturation: v })} tooltip="Color vibrancy through toolbar glass" />

                <label className="td-settings-label">Grain ({settings.toolbarGrain}%)</label>
                <TipSlider min={0} max={100} step={5} value={settings.toolbarGrain} onChange={(v) => settings.update({ toolbarGrain: v })} tooltip="Noise texture on toolbar surfaces" />
              </>
            )}

            {tab === 'behavior' && (
              <>
                {/* ─── Automation ─── */}
                <label className="td-settings-section-title">Automation</label>

                <label className="td-settings-label">Auto-close toolbar ({settings.autoCloseToolbar === 0 ? 'Off' : `${settings.autoCloseToolbar}s`})</label>
                <TipSlider min={0} max={30} step={5} value={settings.autoCloseToolbar} onChange={(v) => settings.update({ autoCloseToolbar: v })} tooltip="Collapse toolbar after inactivity — 0 to disable" />

                <label className="td-settings-label">Auto-lock layout ({settings.autoLock === 0 ? 'Off' : `${settings.autoLock}s`})</label>
                <TipSlider min={0} max={60} step={10} value={settings.autoLock} onChange={(v) => settings.update({ autoLock: v })} tooltip="Lock board positions after inactivity — 0 to disable" />

                <div className="td-settings-divider" />

                {/* ─── Links ─── */}
                <label className="td-settings-section-title">Links</label>

                <label className="td-settings-label">Open links in</label>
                <div className="td-settings-row">
                  <button className={`td-settings-pill ${settings.openLinksNewTab ? 'is-active' : ''}`} type="button" onClick={() => settings.update({ openLinksNewTab: true })}>New tab</button>
                  <button className={`td-settings-pill ${!settings.openLinksNewTab ? 'is-active' : ''}`} type="button" onClick={() => settings.update({ openLinksNewTab: false })}>Same tab</button>
                </div>

                <div className="td-settings-divider" />

                {/* ─── Default Board Size ─── */}
                <label className="td-settings-section-title">Default Board Size</label>

                <label className="td-settings-label">Width ({settings.defaultBoardW})</label>
                <TipSlider min={20} max={60} value={settings.defaultBoardW} onChange={(v) => settings.update({ defaultBoardW: v })} tooltip="Default grid width for new boards" />

                <label className="td-settings-label">Height ({settings.defaultBoardH})</label>
                <TipSlider min={4} max={20} value={settings.defaultBoardH} onChange={(v) => settings.update({ defaultBoardH: v })} tooltip="Default grid height for new boards" />
              </>
            )}

            {tab === 'data' && (
              <>
                <label className="td-settings-label">Storage used</label>
                <div className="td-settings-value">{storageUsage}</div>
                <button className="td-settings-action" type="button" onClick={onResetOnboarding}>Re-run onboarding tour</button>

                <div className="td-settings-divider" />

                {!confirmReset ? (
                  <button className="td-settings-action td-settings-danger" type="button" onClick={handleClearAll}>
                    Factory reset
                  </button>
                ) : (
                  <div className="f-reset-confirm">
                    <div className="f-reset-warning">
                      <AlertTriangle size={14} strokeWidth={2} />
                      <span>This permanently removes all Frontly data.</span>
                    </div>
                    <div className="f-reset-actions">
                      <button className="f-reset-cancel" type="button" onClick={() => setConfirmReset(false)}>Cancel</button>
                      <button className="f-reset-delete" type="button" onClick={handleClearAll}>Delete everything</button>
                    </div>
                  </div>
                )}
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
