import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { chromeStorage } from './chromeStorage';

interface SettingsStore {
  wallpaper: string;
  setWallpaper: (value: string) => void;
  clearWallpaper: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      wallpaper: '',
      setWallpaper: (value) => set({ wallpaper: value }),
      clearWallpaper: () => set({ wallpaper: '' }),
    }),
    {
      name: 'tabdeck-settings',
      storage: createJSONStorage(() => chromeStorage),
    }
  )
);