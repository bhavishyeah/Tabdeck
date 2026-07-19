import type { StateStorage } from 'zustand/middleware';

export const chromeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(name);
    const value = result[name];
    return typeof value === 'string' ? value : null;
  },

  setItem: async (name: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [name]: value });
  },

  removeItem: async (name: string): Promise<void> => {
    await chrome.storage.local.remove(name);
  },
};