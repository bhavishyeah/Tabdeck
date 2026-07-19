import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'TabDeck',
  version: '1.0.0',
  chrome_url_overrides: {
    newtab: 'index.html',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  permissions: ['storage', 'activeTab', 'tabs'],
  commands: {
    'quick-save-tab': {
      suggested_key: {
        default: 'Ctrl+Shift+Y',
        mac: 'Command+Shift+Y',
      },
      description: 'Save current tab to TabDeck',
    },
  },
})