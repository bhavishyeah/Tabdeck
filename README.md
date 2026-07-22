# TabDeck — Bento Grid New Tab Extension

A Chrome extension that replaces your new tab with a beautiful, draggable bento-grid bookmark manager.

## Features

- **Bento Grid Layout** — drag and resize boards like widgets on a dense grid
- **Workspaces** — organize boards into separate workspaces
- **Bookmark Import** — import Chrome bookmark folders, auto-split into boards
- **Live GIF Wallpapers** — upload animated GIFs as backgrounds
- **Glass UI** — transparent blur toolbar that inherits wallpaper colors
- **Context Menus** — right-click to rename, delete, or transfer links/boards
- **Layout Lock** — lock your layout to prevent accidental moves
- **Zoom Protection** — Ctrl+/- is blocked to prevent layout misalignment
- **Transfer** — move boards or individual links between workspaces
- **Search** — filter boards and links instantly
- **Quick Save** — keyboard shortcut (Ctrl+Shift+Y) to save current tab

## Install (from GitHub)

1. Download the latest release zip from [Releases](https://github.com/bhavishyeah/Tabdeck/releases)
   - Or download `release/tabdeck-v2.0.0.zip` directly from the repo
2. Unzip the file
3. Open Chrome → go to `chrome://extensions`
4. Enable **Developer mode** (toggle in top-right)
5. Click **Load unpacked**
6. Select the unzipped folder (the `dist` folder contents)
7. Open a new tab — TabDeck is ready!

## Development

```bash
# Install dependencies
npm install

# Dev mode (hot reload)
npm run dev

# Build for production
npm run build

# The built extension is in the /dist folder
```

## Tech Stack

- React 19 + TypeScript
- Vite + CRXJS (Chrome Extension plugin)
- react-grid-layout (bento grid)
- @dnd-kit (link drag & drop)
- Zustand (state management)
- Lucide icons

## License

MIT
