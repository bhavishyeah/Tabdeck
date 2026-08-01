import { create } from 'zustand';

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
  defaultBoardW: number;
  defaultBoardH: number;
  glassBlur: number;
  glassSaturation: number;
  glassTint: number; // 0-100, controls rgba white alpha for toolbar pills
}

const STORAGE_KEY = 'tabdeck-settings';

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
  defaultBoardW: 34,
  defaultBoardH: 7,
  glassBlur: 5,
  glassSaturation: 100,
  glassTint: 40,
};

function loadFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
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
    // Remove 'update' function before saving
    const { update: _, ...toSave } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  },
}));
