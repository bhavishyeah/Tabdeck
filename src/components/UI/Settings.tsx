import { useEffect, useRef, useState } from 'react';
import {
  Settings as SettingsIcon, X, AlertTriangle,
  Palette, Sliders, LayoutGrid, Database, Info
} from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { getStarterTemplateBoards, getStarterTemplateJSON } from '../../lib/starterTemplate';
import { GRID_STEP } from '../../lib/useGridDimensions';

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

interface SliderProps {
  min: number; max: number; step?: number; value: number;
  onChange: (value: number) => void; tooltip?: string;
}

function TipSlider({ min, max, step = 1, value, onChange, tooltip }: SliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const isDragging = useRef(false);
  useEffect(() => { if (!isDragging.current) setLocalValue(value); }, [value]);
  return (
    <div className="f-slider-wrap" title={tooltip}>
      <input type="range" min={min} max={max} step={step} value={localValue}
        className="td-settings-slider"
        onMouseDown={() => { isDragging.current = true; }}
        onInput={(e) => { const v = +(e.target as HTMLInputElement).value; setLocalValue(v); onChange(v); }}
        onMouseUp={() => { isDragging.current = false; }}
        onTouchStart={() => { isDragging.current = true; }}
        onTouchEnd={() => { isDragging.current = false; onChange(localValue); }}
      />
    </div>
  );
}

const COLOR_PALETTE = ['', 'clear', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#111111'];
const TEXT_PALETTE = ['', '#ffffff', '#111111', '#f5f0e8', '#cccccc'];

function ColorRow({
  label, colors, active, onSelect,
}: {
  label: string;
  colors: string[];
  active: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div className="f-setting-row">
      <span className="f-setting-label">{label}</span>
      <div className="f-color-dots">
        {colors.map((c) => (
          <button
            key={c || 'default'}
            type="button"
            title={c === 'clear' ? 'Clear / glass' : c || 'Auto'}
            className={`f-color-dot ${active === c ? 'is-active' : ''}`}
            style={{
              background: c === 'clear'
                ? 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1))'
                : c || 'linear-gradient(135deg, #fff 50%, #333 50%)',
              border: (c === 'clear' || !c) ? '1.5px dashed rgba(0,0,0,0.22)' : undefined,
            }}
            onClick={() => onSelect(c)}
          />
        ))}
      </div>
    </div>
  );
}

function RowSlider({ label, value, min, max, step, onChange, unit = '' }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div className="f-setting-row f-setting-row--slider">
      <div className="f-row-top">
        <span className="f-setting-label">{label}</span>
        <span className="f-setting-value">{value}{unit}</span>
      </div>
      <TipSlider min={min} max={max} step={step} value={value} onChange={onChange} />
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="f-settings-card">
      <div className="f-settings-card-title">{title}</div>
      {children}
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

export function applyGlassCSS(blur: number, saturation: number, _tint?: number, toolbarBlur?: number, toolbarSaturation?: number, _toolbarTint?: number, toolbarOpacity?: number, toolbarRadius?: number, toolbarGrain?: number, toolbarColor?: string, toolbarTextColor?: string, miscTextColor?: string) {
  const root = document.documentElement.style;
  root.setProperty('--td-backdrop', `blur(${blur}px) saturate(${saturation}%)`);
  const tb = toolbarBlur ?? blur;
  const ts = toolbarSaturation ?? saturation;
  const to = toolbarOpacity ?? 0.4;
  const tr = toolbarRadius ?? 50;
  const tg = toolbarGrain ?? 0;
  const tc = toolbarColor || '';
  root.setProperty('--td-toolbar-backdrop', `blur(${tb}px) saturate(${ts}%)`);
  root.setProperty('--td-toolbar-opacity', `${to}`);
  root.setProperty('--td-toolbar-radius', `${tr}px`);
  root.setProperty('--td-toolbar-grain', `${tg / 100}`);
  if (tc) {
    const r = parseInt(tc.slice(1, 3), 16);
    const g = parseInt(tc.slice(3, 5), 16);
    const b = parseInt(tc.slice(5, 7), 16);
    root.setProperty('--td-toolbar-bg', `rgba(${r}, ${g}, ${b}, ${to})`);
  } else {
    root.setProperty('--td-toolbar-bg', `rgba(255, 255, 255, ${to})`);
  }
  root.setProperty('--td-toolbar-color', tc);
  root.setProperty('--td-toolbar-text', toolbarTextColor || '');
  root.setProperty('--td-misc-text', miscTextColor || '#222222');
}

type Tab = 'appearance' | 'layout' | 'behavior' | 'data' | 'about';
type AppearanceSub = 'typography' | 'boards' | 'toolbar' | 'widgets' | 'ui-text';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode; subs?: { id: AppearanceSub; label: string }[] }[] = [
  {
    id: 'appearance', label: 'Appearance', icon: <Palette size={15} strokeWidth={2} />,
    subs: [
      { id: 'typography', label: 'Typography' },
      { id: 'boards',     label: 'Boards' },
      { id: 'toolbar',    label: 'Toolbar' },
      { id: 'widgets',    label: 'Widgets' },
      { id: 'ui-text',    label: 'UI Text' },
    ],
  },
  { id: 'layout',   label: 'Layout',     icon: <LayoutGrid size={15} strokeWidth={2} /> },
  { id: 'behavior', label: 'Behaviour',  icon: <Sliders size={15} strokeWidth={2} /> },
  { id: 'data',     label: 'Data',       icon: <Database size={15} strokeWidth={2} /> },
  { id: 'about',    label: 'About',      icon: <Info size={15} strokeWidth={2} /> },
];

interface Props { onResetOnboarding: () => void; }

export function SettingsButton({ onResetOnboarding }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('appearance');
  const [appearanceSub, setAppearanceSub] = useState<AppearanceSub>('typography');
  const [storageUsage, setStorageUsage] = useState('...');
  const [confirmReset, setConfirmReset] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const settings = useSettingsStore();

  useEffect(() => { applyFontCSS(settings.fontFamily, settings.fontSize); }, [settings.fontFamily, settings.fontSize]);

  useEffect(() => {
    applyGlassCSS(
      settings.glassBlur, settings.glassSaturation, settings.glassTint,
      settings.toolbarBlur, settings.toolbarSaturation, settings.toolbarTint,
      settings.toolbarOpacity, settings.toolbarRadius, settings.toolbarGrain,
      settings.toolbarColor, settings.toolbarTextColor, settings.miscTextColor
    );
  }, [settings.glassBlur, settings.glassSaturation, settings.glassTint, settings.toolbarBlur, settings.toolbarSaturation, settings.toolbarTint, settings.toolbarOpacity, settings.toolbarRadius, settings.toolbarGrain, settings.toolbarColor, settings.toolbarTextColor, settings.miscTextColor]);

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

  const handleClearAll = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    chrome.storage.local.clear();
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="f-settings-root" ref={panelRef}>
      <button
        className="td-settings-btn"
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Settings"
        aria-label="Open settings"
      >
        <SettingsIcon size={16} strokeWidth={2} />
      </button>

      {open && (
        <div className="f-settings-panel" role="dialog" aria-label="Settings">
          {/* ── Left sidebar nav ── */}
          <nav className="f-settings-nav">
            <div className="f-settings-nav-title">Settings</div>
            {NAV_ITEMS.map((item) => (
              <div key={item.id}>
                <button
                  type="button"
                  className={`f-settings-nav-item ${tab === item.id ? 'is-active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  <span className="f-nav-icon">{item.icon}</span>
                  <span className="f-nav-label">{item.label}</span>
                </button>
                {/* Sub-nav for Appearance */}
                {item.subs && tab === item.id && (
                  <div className="f-settings-subnav">
                    {item.subs.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        className={`f-settings-subnav-item ${appearanceSub === sub.id ? 'is-active' : ''}`}
                        onClick={() => setAppearanceSub(sub.id)}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* ── Content area ── */}
          <div className="f-settings-content">
            <div className="f-settings-content-header">
              <span>
                {tab === 'appearance'
                  ? NAV_ITEMS[0].subs?.find((s) => s.id === appearanceSub)?.label ?? 'Appearance'
                  : NAV_ITEMS.find((n) => n.id === tab)?.label}
              </span>
              <button className="f-settings-close" type="button" onClick={() => setOpen(false)} aria-label="Close settings">
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            <div className="f-settings-scroll">

              {/* ═══ APPEARANCE ═══ */}
              {tab === 'appearance' && (
                <>
                  {/* ── Typography ── */}
                  {appearanceSub === 'typography' && (
                    <SectionCard title="Font Family">
                      <div className="f-font-grid-full">
                        {FONTS.map((font) => (
                          <button
                            key={font.name}
                            type="button"
                            className={`f-font-chip ${settings.fontFamily === font.name ? 'is-active' : ''}`}
                            style={{ fontFamily: font.value }}
                            onClick={() => settings.update({ fontFamily: font.name })}
                          >
                            {font.name}
                          </button>
                        ))}
                      </div>
                      <RowSlider label="Size" value={settings.fontSize} min={8} max={14} unit="px" onChange={(v) => settings.update({ fontSize: v })} />
                      <div className="f-setting-row">
                        <span className="f-setting-label">Text mode</span>
                        <div className="f-pill-group">
                          {(['auto', 'dark', 'light'] as const).map((m) => (
                            <button key={m} type="button" className={`f-pill ${settings.textMode === m ? 'is-active' : ''}`} onClick={() => settings.update({ textMode: m })}>{m}</button>
                          ))}
                        </div>
                      </div>
                    </SectionCard>
                  )}

                  {/* ── Boards ── */}
                  {appearanceSub === 'boards' && (
                    <SectionCard title="Board Appearance">
                      <RowSlider label="Opacity" value={Math.round(settings.boardOpacity * 100)} min={5} max={100} unit="%" onChange={(v) => settings.update({ boardOpacity: v / 100 })} />
                      <RowSlider label="Radius" value={settings.boardRadius} min={4} max={24} unit="px" onChange={(v) => settings.update({ boardRadius: v })} />
                      <RowSlider label="Blur" value={settings.glassBlur} min={0} max={24} unit="px" onChange={(v) => settings.update({ glassBlur: v })} />
                      <RowSlider label="Saturation" value={settings.glassSaturation} min={100} max={300} step={10} unit="%" onChange={(v) => settings.update({ glassSaturation: v })} />
                      <RowSlider label="Grain" value={settings.grainIntensity} min={0} max={100} step={5} unit="%" onChange={(v) => settings.update({ grainIntensity: v })} />
                      <div className="f-setting-row">
                        <span className="f-setting-label">Color (all boards)</span>
                        <div className="f-color-dots">
                          {COLOR_PALETTE.map((c) => (
                            <button key={c || 'default'} type="button"
                              className="f-color-dot"
                              title={c === 'clear' ? 'Clear / glass' : c || 'Default'}
                              style={{
                                background: c === 'clear' ? 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1))' : c || 'rgba(250,248,244,0.92)',
                                border: (c === 'clear' || !c) ? '1.5px dashed rgba(0,0,0,0.22)' : undefined,
                              }}
                              onClick={() => {
                                const ws = useWorkspaceStore.getState().getActiveWorkspace();
                                if (!ws) return;
                                const color = c === '' ? undefined : c;
                                useWorkspaceStore.setState((s) => ({
                                  workspaces: s.workspaces.map((w) =>
                                    w.id === ws.id
                                      ? { ...w, boards: w.boards.map((b) => (b.type === 'links' || !b.type) ? { ...b, color } : b), updatedAt: Date.now() }
                                      : w
                                  ),
                                }));
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <ColorRow label="Text color" colors={TEXT_PALETTE} active={settings.boardTextColor} onSelect={(c) => settings.update({ boardTextColor: c })} />
                    </SectionCard>
                  )}

                  {/* ── Toolbar ── */}
                  {appearanceSub === 'toolbar' && (
                    <SectionCard title="Toolbar Appearance">
                      <div className="f-setting-row">
                        <span className="f-setting-label">Position</span>
                        <div className="f-pill-group">
                          {(['left', 'center', 'right'] as const).map((p) => (
                            <button key={p} type="button" className={`f-pill ${settings.toolbarPosition === p ? 'is-active' : ''}`} onClick={() => settings.update({ toolbarPosition: p })}>{p}</button>
                          ))}
                        </div>
                      </div>
                      <RowSlider label="Opacity" value={Math.round(settings.toolbarOpacity * 100)} min={5} max={100} unit="%" onChange={(v) => settings.update({ toolbarOpacity: v / 100 })} />
                      <RowSlider label="Radius" value={settings.toolbarRadius} min={4} max={50} unit="px" onChange={(v) => settings.update({ toolbarRadius: v })} />
                      <RowSlider label="Blur" value={settings.toolbarBlur} min={0} max={24} unit="px" onChange={(v) => settings.update({ toolbarBlur: v })} />
                      <RowSlider label="Saturation" value={settings.toolbarSaturation} min={100} max={300} step={10} unit="%" onChange={(v) => settings.update({ toolbarSaturation: v })} />
                      <RowSlider label="Grain" value={settings.toolbarGrain} min={0} max={100} step={5} unit="%" onChange={(v) => settings.update({ toolbarGrain: v })} />
                      <ColorRow label="Color" colors={['', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#1e293b', '#111111']} active={settings.toolbarColor} onSelect={(c) => settings.update({ toolbarColor: c })} />
                      <ColorRow label="Text color" colors={TEXT_PALETTE} active={settings.toolbarTextColor} onSelect={(c) => settings.update({ toolbarTextColor: c })} />
                    </SectionCard>
                  )}

                  {/* ── Widgets ── */}
                  {appearanceSub === 'widgets' && (
                    <SectionCard title="Widget Appearance">
                      <RowSlider label="Opacity" value={Math.round(settings.widgetOpacity * 100)} min={5} max={100} unit="%" onChange={(v) => settings.update({ widgetOpacity: v / 100 })} />
                      <RowSlider label="Radius" value={settings.widgetRadius} min={4} max={24} unit="px" onChange={(v) => settings.update({ widgetRadius: v })} />
                      <RowSlider label="Blur" value={settings.widgetBlur} min={0} max={24} unit="px" onChange={(v) => settings.update({ widgetBlur: v })} />
                      <RowSlider label="Saturation" value={settings.widgetSaturation} min={100} max={300} step={10} unit="%" onChange={(v) => settings.update({ widgetSaturation: v })} />
                      <RowSlider label="Grain" value={settings.widgetGrain} min={0} max={100} step={5} unit="%" onChange={(v) => settings.update({ widgetGrain: v })} />
                      <ColorRow label="Color" colors={COLOR_PALETTE} active={settings.widgetColor} onSelect={(c) => settings.update({ widgetColor: c })} />
                      <ColorRow label="Text color" colors={TEXT_PALETTE} active={settings.widgetTextColor} onSelect={(c) => settings.update({ widgetTextColor: c })} />
                    </SectionCard>
                  )}

                  {/* ── UI Text ── */}
                  {appearanceSub === 'ui-text' && (
                    <SectionCard title="Misc UI Text">
                      <div className="f-settings-hint-text" style={{ padding: '8px 12px' }}>Text color for context menus, add-link form, and overlays.</div>
                      <ColorRow label="Color" colors={['', '#222222', '#111111', '#444444', '#ffffff', '#f5f0e8']} active={settings.miscTextColor} onSelect={(c) => settings.update({ miscTextColor: c })} />
                    </SectionCard>
                  )}
                </>
              )}

              {/* ═══ LAYOUT ═══ */}
              {tab === 'layout' && (
                <>
                  <SectionCard title="Default Board">
                    <RowSlider label="Width" value={settings.defaultBoardW * GRID_STEP} min={108} max={360} step={12}
                      unit="px" onChange={(v) => settings.update({ defaultBoardW: Math.round(v / GRID_STEP) })} />
                  </SectionCard>

                  <SectionCard title="Display Mode">
                    <div className="f-setting-row f-setting-row--block">
                      <span className="f-setting-label" style={{ marginBottom: 6 }}>Default mode</span>
                      <div className="f-pill-group f-pill-group--wrap">
                        {([
                          ['default', 'List'],
                          ['icons-vertical', 'V-Icons'],
                          ['icons-horizontal', 'H-Icons'],
                          ['icons-floating', 'Floating'],
                        ] as const).map(([m, label]) => (
                          <button key={m} type="button"
                            className={`f-pill ${settings.defaultDisplayMode === m ? 'is-active' : ''}`}
                            onClick={() => settings.update({ defaultDisplayMode: m })}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="f-setting-row">
                      <span className="f-setting-label">Icon size</span>
                      <div className="f-pill-group">
                        {([12, 24, 36, 48] as const).map((sz) => (
                          <button key={sz} type="button" className={`f-pill ${settings.defaultIconSize === sz ? 'is-active' : ''}`} onClick={() => settings.update({ defaultIconSize: sz })}>{sz}</button>
                        ))}
                      </div>
                    </div>
                    <div className="f-setting-row">
                      <span className="f-setting-label">Sections</span>
                      <button
                        type="button"
                        className={`f-toggle ${settings.defaultShowSections ? 'is-on' : ''}`}
                        onClick={() => settings.update({ defaultShowSections: !settings.defaultShowSections })}
                        aria-label="Toggle sections"
                      >
                        <span className="f-toggle-knob" />
                      </button>
                    </div>
                  </SectionCard>
                </>
              )}

              {/* ═══ BEHAVIOUR ═══ */}
              {tab === 'behavior' && (
                <>
                  <SectionCard title="Automation">
                    <RowSlider label="Auto-close toolbar" value={settings.autoCloseToolbar} min={0} max={30} step={5}
                      unit={settings.autoCloseToolbar === 0 ? ' (Off)' : 's'} onChange={(v) => settings.update({ autoCloseToolbar: v })} />
                    <RowSlider label="Auto-lock layout" value={settings.autoLock} min={0} max={60} step={10}
                      unit={settings.autoLock === 0 ? ' (Off)' : 's'} onChange={(v) => settings.update({ autoLock: v })} />
                  </SectionCard>

                  <SectionCard title="Links">
                    <div className="f-setting-row">
                      <span className="f-setting-label">Open in</span>
                      <div className="f-pill-group">
                        <button type="button" className={`f-pill ${settings.openLinksNewTab ? 'is-active' : ''}`} onClick={() => settings.update({ openLinksNewTab: true })}>New tab</button>
                        <button type="button" className={`f-pill ${!settings.openLinksNewTab ? 'is-active' : ''}`} onClick={() => settings.update({ openLinksNewTab: false })}>Same tab</button>
                      </div>
                    </div>
                  </SectionCard>
                </>
              )}

              {/* ═══ DATA ═══ */}
              {tab === 'data' && (
                <>
                  <SectionCard title="Storage">
                    <div className="f-setting-row">
                      <span className="f-setting-label">Used</span>
                      <span className="f-setting-value-text">{storageUsage}</span>
                    </div>
                    <button className="f-settings-action-btn" type="button" onClick={onResetOnboarding}>Re-run onboarding</button>
                  </SectionCard>

                  <SectionCard title="Starter Template">
                    <p className="f-settings-hint-text">Load 4 demo boards — Dev, Social, Design, Productivity.</p>
                    <button
                      className="f-settings-action-btn"
                      type="button"
                      onClick={() => {
                        const ws = useWorkspaceStore.getState().getActiveWorkspace();
                        if (!ws) return;
                        getStarterTemplateBoards().forEach((board) => useWorkspaceStore.getState().importBoard(ws.id, board));
                        const blob = new Blob([getStarterTemplateJSON()], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'frontly-starter-template.json'; a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >Load Starter Template</button>
                  </SectionCard>

                  <SectionCard title="Danger Zone">
                    {!confirmReset ? (
                      <button className="f-settings-danger-btn" type="button" onClick={handleClearAll}>Factory reset</button>
                    ) : (
                      <div className="f-reset-confirm">
                        <div className="f-reset-warning">
                          <AlertTriangle size={13} strokeWidth={2} />
                          <span>This permanently removes all Frontly data.</span>
                        </div>
                        <div className="f-reset-actions">
                          <button className="f-reset-cancel" type="button" onClick={() => setConfirmReset(false)}>Cancel</button>
                          <button className="f-reset-delete" type="button" onClick={handleClearAll}>Delete everything</button>
                        </div>
                      </div>
                    )}
                  </SectionCard>
                </>
              )}

              {/* ═══ ABOUT ═══ */}
              {tab === 'about' && (
                <>
                  <SectionCard title="Frontly">
                    <div className="f-setting-row"><span className="f-setting-label">Version</span><span className="f-setting-value-text">v1.2.0</span></div>
                    <div className="f-setting-row">
                      <span className="f-setting-label">GitHub</span>
                      <a className="f-settings-link" href="https://github.com/bhavishyeah/Frontly" target="_blank" rel="noreferrer">bhavishyeah/Frontly</a>
                    </div>
                  </SectionCard>

                  <SectionCard title="Keyboard Shortcuts">
                    <div className="f-shortcuts-grid">
                      {SHORTCUTS.map((s) => (
                        <div key={s.keys} className="f-shortcut-row">
                          <kbd className="f-kbd">{s.keys}</kbd>
                          <span className="f-shortcut-label">{s.action}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
