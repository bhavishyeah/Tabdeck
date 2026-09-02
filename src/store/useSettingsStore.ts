import { create } from 'zustand';
import { GRID_STEP } from '../lib/useGridDimensions';

export interface AppSettings {
  fontFamily: string;
  fontSize: number;
  boardOpacity: number;
  boardRadius: number;
  textMode: 'auto' | 'dark' | 'light';
  toolbarPosition: 'left' | 'center' | 'right';
  autoCloseToolbar: number;
  autoLock: number;
  openLinksNewTab: boolean;
  /** New-board size in grid cells (1 cell = GRID_STEP px). */
  defaultBoardW: number;
  defaultBoardH: number;
  /** Grid cell size these board dimensions were authored against. */
  gridScaleStep: number;
  // Board glass
  glassBlur: number;
  glassSaturation: number;
  glassTint: number;
  grainIntensity: number;
  // Toolbar glass
  toolbarOpacity: number;
  toolbarRadius: number;
  toolbarBlur: number;
  toolbarSaturation: number;
  toolbarTint: number;
  toolbarGrain: number;
  toolbarColor: string;
  // Widget glass
  widgetOpacity: number;
  widgetRadius: number;
  widgetBlur: number;
  widgetSaturation: number;
  widgetTint: number;
  widgetGrain: number;
  widgetColor: string;
  // Per-section text colors (empty string = auto)
  boardTextColor: string;
  widgetTextColor: string;
  toolbarTextColor: string;
  miscTextColor: string; // context menus, add-link form, misc UI
  // Board display mode defaults
  defaultDisplayMode: import('../lib/workspaceTypes').BoardDisplayMode;
  defaultIconSize: import('../lib/workspaceTypes').IconSize;
  defaultShowSections: boolean;
}

const STORAGE_KEY = 'frontly-settings';

const DEFAULT_SETTINGS: AppSettings = {
  fontFamily: 'Montserrat',
  fontSize: 10,
  boardOpacity: 0.92,
  boardRadius: 14,
  textMode: 'auto',
  toolbarPosition: 'left',
  autoCloseToolbar: 0,
  autoLock: 0,
  openLinksNewTab: true,
  defaultBoardW: 28, // 28 × 12px = 336px
  defaultBoardH: 14, // 14 × 12px = 168px
  gridScaleStep: GRID_STEP,
  glassBlur: 5,
  glassSaturation: 100,
  glassTint: 40,
  grainIntensity: 0,
  toolbarOpacity: 0.4,
  toolbarRadius: 50,
  toolbarBlur: 5,
  toolbarSaturation: 100,
  toolbarTint: 40,
  toolbarGrain: 0,
  toolbarColor: '',
  widgetOpacity: 0.92,
  widgetRadius: 14,
  widgetBlur: 5,
  widgetSaturation: 100,
  widgetTint: 40,
  widgetGrain: 0,
  widgetColor: '',
  boardTextColor: '',
  widgetTextColor: '',
  toolbarTextColor: '',
  miscTextColor: '',
  defaultDisplayMode: 'default',
  defaultIconSize: 12,
  defaultShowSections: false,
};

function loadFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const settings: AppSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };

    // Board size is stored in grid cells. If it was saved against a coarser
    // grid, rescale once and write back so this cannot compound on reload.
    const savedStep = settings.gridScaleStep ?? 24;
    if (savedStep !== GRID_STEP) {
      const scale = savedStep / GRID_STEP;
      settings.defaultBoardW = Math.round(settings.defaultBoardW * scale);
      settings.defaultBoardH = Math.round(settings.defaultBoardH * scale);
      settings.gridScaleStep = GRID_STEP;
    }

    // Clamp to allowed slider bounds (width 9–30, height 5–15)
    settings.defaultBoardW = Math.min(Math.max(settings.defaultBoardW, 9), 30);
    settings.defaultBoardH = Math.min(Math.max(settings.defaultBoardH, 5), 15);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    return settings;
  } catch {
    // ignore parse errors — fall back to defaults
  }
  return DEFAULT_SETTINGS;
}

interface SettingsState extends AppSettings {
  update: (partial: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadFromStorage(),

  update: (partial) => {
    set(partial);
    const state = { ...get(), ...partial };
    // Omit the 'update' function before serialising to localStorage
    const toSave = Object.fromEntries(
      Object.entries(state).filter(([k]) => k !== 'update')
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  },
}));
