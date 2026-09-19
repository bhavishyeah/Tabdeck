import type { AppSettings } from '../store/useSettingsStore';

/**
 * A theme preset applies a bundle of appearance settings in one click.
 * Only visual fields are included — behavior/layout settings (autoLock,
 * openLinksNewTab, defaultBoardW, display-mode defaults, etc.) are left alone.
 *
 * The exact px/%/color values here are sensible starting points and are
 * expected to be fine-tuned later.
 */
export type ThemeAppearance = Pick<
  AppSettings,
  | 'fontFamily'
  | 'textMode'
  | 'boardOpacity' | 'boardRadius' | 'glassBlur' | 'glassSaturation' | 'grainIntensity'
  | 'boardTextColor'
  | 'toolbarOpacity' | 'toolbarRadius' | 'toolbarBlur' | 'toolbarSaturation' | 'toolbarGrain' | 'toolbarColor' | 'toolbarTextColor'
  | 'widgetOpacity' | 'widgetRadius' | 'widgetBlur' | 'widgetSaturation' | 'widgetGrain' | 'widgetColor' | 'widgetTextColor'
  | 'miscTextColor'
>;

export interface Theme {
  id: string;
  name: string;
  /** Two swatch colors for the preview chip [surface, accent] */
  preview: [string, string];
  settings: ThemeAppearance;
}

export const THEMES: Theme[] = [
  {
    id: 'frosted',
    name: 'Frosted',
    preview: ['#f5f0e8', '#ffffff'],
    settings: {
      fontFamily: 'Montserrat',
      textMode: 'auto',
      boardOpacity: 0.92, boardRadius: 14, glassBlur: 5, glassSaturation: 100, grainIntensity: 0,
      boardTextColor: '',
      toolbarOpacity: 0.4, toolbarRadius: 50, toolbarBlur: 5, toolbarSaturation: 100, toolbarGrain: 0, toolbarColor: '', toolbarTextColor: '',
      widgetOpacity: 0.92, widgetRadius: 14, widgetBlur: 5, widgetSaturation: 100, widgetGrain: 0, widgetColor: '', widgetTextColor: '',
      miscTextColor: '',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    preview: ['#1e1e2e', '#ffffff'],
    settings: {
      fontFamily: 'Inter',
      textMode: 'light',
      boardOpacity: 0.55, boardRadius: 16, glassBlur: 14, glassSaturation: 120, grainIntensity: 0,
      boardTextColor: '#ffffff',
      toolbarOpacity: 0.5, toolbarRadius: 40, toolbarBlur: 14, toolbarSaturation: 120, toolbarGrain: 0, toolbarColor: '#1e293b', toolbarTextColor: '#ffffff',
      widgetOpacity: 0.55, widgetRadius: 16, widgetBlur: 14, widgetSaturation: 120, widgetGrain: 0, widgetColor: '#1e293b', widgetTextColor: '#ffffff',
      miscTextColor: '#f5f0e8',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    preview: ['#0f0c29', '#8b5cf6'],
    settings: {
      fontFamily: 'Space Grotesk',
      textMode: 'light',
      boardOpacity: 0.35, boardRadius: 6, glassBlur: 10, glassSaturation: 200, grainIntensity: 0,
      boardTextColor: '#ffffff',
      toolbarOpacity: 0.35, toolbarRadius: 12, toolbarBlur: 10, toolbarSaturation: 200, toolbarGrain: 0, toolbarColor: '#111111', toolbarTextColor: '#ffffff',
      widgetOpacity: 0.35, widgetRadius: 6, widgetBlur: 10, widgetSaturation: 200, widgetGrain: 0, widgetColor: '#111111', widgetTextColor: '#ffffff',
      miscTextColor: '#ffffff',
    },
  },
  {
    id: 'paper',
    name: 'Paper',
    preview: ['#faf8f4', '#333333'],
    settings: {
      fontFamily: 'DM Sans',
      textMode: 'dark',
      boardOpacity: 1, boardRadius: 8, glassBlur: 0, glassSaturation: 100, grainIntensity: 15,
      boardTextColor: '#111111',
      toolbarOpacity: 1, toolbarRadius: 16, toolbarBlur: 0, toolbarSaturation: 100, toolbarGrain: 10, toolbarColor: '', toolbarTextColor: '#111111',
      widgetOpacity: 1, widgetRadius: 8, widgetBlur: 0, widgetSaturation: 100, widgetGrain: 15, widgetColor: '', widgetTextColor: '#111111',
      miscTextColor: '#222222',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    preview: ['#ffffff', '#e5e5e5'],
    settings: {
      fontFamily: 'Inter',
      textMode: 'auto',
      boardOpacity: 0.15, boardRadius: 10, glassBlur: 3, glassSaturation: 100, grainIntensity: 0,
      boardTextColor: '',
      toolbarOpacity: 0.15, toolbarRadius: 24, toolbarBlur: 3, toolbarSaturation: 100, toolbarGrain: 0, toolbarColor: '', toolbarTextColor: '',
      widgetOpacity: 0.15, widgetRadius: 10, widgetBlur: 3, widgetSaturation: 100, widgetGrain: 0, widgetColor: '', widgetTextColor: '',
      miscTextColor: '',
    },
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    preview: ['#3b82f6', '#ec4899'],
    settings: {
      fontFamily: 'Poppins',
      textMode: 'light',
      boardOpacity: 0.85, boardRadius: 18, glassBlur: 8, glassSaturation: 180, grainIntensity: 0,
      boardTextColor: '#ffffff',
      toolbarOpacity: 0.6, toolbarRadius: 50, toolbarBlur: 8, toolbarSaturation: 180, toolbarGrain: 0, toolbarColor: '#3b82f6', toolbarTextColor: '#ffffff',
      widgetOpacity: 0.85, widgetRadius: 18, widgetBlur: 8, widgetSaturation: 180, widgetGrain: 0, widgetColor: '#8b5cf6', widgetTextColor: '#ffffff',
      miscTextColor: '#ffffff',
    },
  },
];
