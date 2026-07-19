import { create } from 'zustand';

type ToastTone = 'success' | 'error' | 'info';

interface UiStore {
  toastMessage: string;
  toastTone: ToastTone;
  showToast: (message: string, tone?: ToastTone) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  toastMessage: '',
  toastTone: 'info',
  showToast: (message, tone = 'info') =>
    set({ toastMessage: message, toastTone: tone }),
  clearToast: () => set({ toastMessage: '', toastTone: 'info' }),
}));