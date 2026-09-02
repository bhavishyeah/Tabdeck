import React from 'react';
import ReactDOM from 'react-dom/client';
import { NewTab } from './NewTab';
import { applyFontCSS, applyGlassCSS } from '../components/UI/Settings';
import { useSettingsStore } from '../store/useSettingsStore';

// Apply saved settings immediately before first render (no flash)
const _s = useSettingsStore.getState();
applyFontCSS(_s.fontFamily, _s.fontSize);
applyGlassCSS(
  _s.glassBlur, _s.glassSaturation, _s.glassTint,
  _s.toolbarBlur, _s.toolbarSaturation, _s.toolbarTint,
  _s.toolbarOpacity, _s.toolbarRadius, _s.toolbarGrain,
  _s.toolbarColor, _s.toolbarTextColor, _s.miscTextColor
);
document.documentElement.style.setProperty('--td-board-radius', `${_s.boardRadius}px`);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NewTab />
  </React.StrictMode>
);