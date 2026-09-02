import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,

  name: 'Frontly',
  short_name: 'Frontly',

  description:
  'Replace every new tab with a beautiful, customizable homepage for bookmarks, notes, tasks, and widgets.',
  
  version: '1.2.0',

  chrome_url_overrides: {
    newtab: 'index.html',
  },

  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },

  action: {
    default_title: 'Open Frontly',
    default_icon: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },

  icons: {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },

  permissions: [
    'storage',
    'unlimitedStorage',
    'activeTab',
    'tabs',
    'bookmarks',
    'notifications',
  ],

  commands: {
    'quick-save-tab': {
      suggested_key: {
        default: 'Ctrl+Shift+Z',
        mac: 'Command+Shift+Z',
      },
      description: 'Save current tab to Frontly',
    },
  },
})