# Frontly — Complete Documentation

## Overview

Frontly is a Chrome extension that replaces your new tab page with a powerful, visually stunning bento-grid bookmark and productivity manager. It transforms the blank new tab into an organized dashboard where you can manage bookmarks, notes, todos, and widgets — all with a draggable, resizable grid layout.

---

## Installation

### From GitHub (Developer Mode)
1. Download `release/Frontly-v4.1.0.zip` from the repository
2. Unzip the file
3. Open Chrome → `chrome://extensions`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked**
6. Select the unzipped folder
7. Open a new tab — Frontly is ready

### Development Setup
```bash
git clone https://github.com/bhavishyeah/Frontly.git
cd Frontly
npm install
npm run dev    # Hot reload development
npm run build  # Production build → /dist
```

---

## Core Features

### 1. Bento Grid Layout
- **172×85 hyper-dense grid** with 6×6px square cells
- Boards can be placed anywhere on the grid
- Drag boards by the top bar to reposition
- Resize boards from the bottom-right corner
- `preventCollision: true` — boards can't overlap
- Positions persist across sessions

### 2. Workspaces
- Create unlimited workspaces for different contexts (Work, Personal, Projects)
- Switch between workspaces via tabs in the toolbar
- Each workspace has its own boards, layout, and wallpaper
- Right-click workspace tab → Rename, Export as JSON, Delete
- Transfer boards between workspaces via right-click context menu

### 3. Bookmark Boards
- Import Chrome bookmarks by folder
- Auto-splits large folders into multiple boards (semi-structured masonry sizes)
- Overflow bookmarks auto-create a new workspace
- Max 7 links per board, max 10 boards per workspace
- Drag links between boards via favicon
- Reorder links within a board by dragging favicon up/down
- Click link title → opens URL
- Right-click link → Rename, Transfer to workspace board, Delete

### 4. Note Boards
- Sticky note boards with a text area
- Auto-saves content to storage
- Supports any text content
- Create via Widgets menu or `Alt+N`

### 5. Todo Boards
- Checklist boards with checkboxes
- Add tasks by typing + Enter
- Check/uncheck to mark complete (strikethrough)
- Delete individual tasks on hover
- Create via Widgets menu or `Alt+T`

### 6. Weather Widget
- Live weather from Open-Meteo API (free, no key needed)
- Auto-detects location via browser geolocation
- Shows temperature, condition icon, description, city
- Updates on each new tab load
- Create via Widgets menu or `Alt+W`

### 7. Clock Widget
- Displays current time (hours:minutes:seconds)
- Shows full date (weekday, month, day, year)
- No board name shown (minimal)
- Create via Widgets menu or `Alt+C`

### 8. Wallpapers
- **Static images** (PNG, JPG) — stored as data URL
- **Animated GIFs** — stored as data URL, animates as background
- **4K Videos** (MP4, WebM) — stored in IndexedDB as raw Blob, GPU-accelerated playback
- Each workspace can have its own wallpaper
- Default fallback: `Frontly.png` in public folder
- Set via toolbar wallpaper button or `Alt+P`

### 9. Board Colors
- 7 color themes: Red, Amber, Green, Blue, Purple, Pink, Default
- Right-click board name → Color picker dots
- Opacity controlled by Settings slider
- Text automatically turns white on colored boards

### 10. Layout Lock
- Lock button (🔒/🔓) in toolbar
- When locked: no dragging, no resizing, no accidental moves
- Toggle via button or `Alt+L`
- Auto-lock timer available in Settings

---

## Toolbar

The toolbar is a retractable drawer activated by the Frontly logo button.

### Toolbar elements (left to right):
| # | Element             | Function                             |
|---|---------------------|--------------------------------------|
| 1 | Frontly Logo        | Toggle toolbar open/close            |
| 2 | Workspace Tabs      | Switch/create workspaces             |
| 3 | + Button            | Create bookmark board                |
| 4 | Widgets (grid icon) | Dropdown: Note, Todo, Weather, Clock |
| 5 | Search              | Filter boards and links              |
| 6 | Lock Button         | Toggle layout lock                   |
| 7 | 3-Dot Menu (⋯)      | Expands to reveal toolbar actions   |

### 3-Dot Menu actions:
- Quick Save — cycle quick-save board
- Bookmarks — import Chrome bookmarks (folder picker)
- Export — download all data as JSON
- Import — upload JSON backup
- Wallpaper — set image/GIF/video background
- Clear Everything — wipe workspace (with confirmation)

---

## Keyboard Shortcuts

| Shortcut       | Action                                  |
|----------------|-----------------------------------------|
| `Ctrl+B`       | New bookmark board                      |
| `Ctrl+M`       | Toggle toolbar                          |
| `Ctrl+Z`       | Undo                                    |
| `Ctrl+Y`       | Redo                                    |
| `Alt+T`        | New todo list                           |
| `Alt+N`        | New note board                          |
| `Alt+W`        | New weather widget                      |
| `Alt+C`        | New clock widget                        |
| `Alt+L`        | Lock/unlock layout                      |
| `Alt+S`        | Focus search bar                        |
| `Alt+E`        | Export JSON                             |
| `Alt+I`        | Import JSON                             |
| `Alt+P`        | Set wallpaper                           |
| `Alt+X`        | Wipe workspace                          |
| `Ctrl+Shift+Z` | Quick save current tab (Chrome command) |

---

## Context Menus

### Board name (right-click):
- Add link
- Rename board
- Color picker (7 colors)
- Duplicate board
- Transfer to [workspace]
- Delete board

### Link/bookmark (right-click):
- Rename
- Transfer to workspace / board
- Delete bookmark

### Workspace tab (right-click):
- Rename workspace
- Export workspace (JSON download)
- Delete workspace

### Note textarea (right-click):
- Same as board name context menu (color, rename, delete)

---

## Settings (⚙️ gear icon — bottom right)

### Appearance Tab:
- **Font Family** — 10 Google Fonts to choose from
- **Font Size** — 8px to 14px slider
- **Board Opacity** — 50% to 100% (applies to all boards including colored)
- **Border Radius** — 4px to 24px
- **Text Mode** — Auto / Dark / Light (force text color)
- **Toolbar Position** — Left / Center / Right

### Behavior Tab:
- **Auto-close toolbar** — 0-30 seconds (0 = disabled)
- **Auto-lock layout** — 0-60 seconds (0 = disabled)
- **Open links in** — New tab / Same tab
- **Default board width** — 20 to 60 grid units
- **Default board height** — 4 to 20 grid units

### Data Tab:
- **Storage usage** — shows current KB/MB used
- **Re-run onboarding** — restart the guided tour
- **Factory reset** — clear ALL data (with confirmation)

### Info Tab:
- Version number
- GitHub link
- Full keyboard shortcuts reference

---

## Onboarding

First-time users see a guided spotlight tour highlighting:
1. Welcome introduction
2. Create boards & notes buttons
3. 3-dot toolbar menu features
4. Workspace tabs
5. Search functionality
6. Lock button
7. All keyboard shortcuts

The tour uses a spotlight cutout effect that highlights each element with a white border. Tooltip auto-flips if near viewport edges.

---

## Technical Architecture

### Tech Stack:
- **React 19** + TypeScript
- **Vite** + CRXJS (Chrome Extension plugin)
- **react-grid-layout v1.4.4** — bento grid system
- **@dnd-kit** — link drag & drop (sortable + droppable)
- **Zustand** — state management (workspace store + settings store + UI store)
- **Lucide React** — icons
- **Chrome APIs** — storage, bookmarks, tabs, commands

### File Structure:
```
src/
├── newtab/
│   ├── main.tsx                      — Entry point
│   └── NewTab.tsx                    — Main component (900+ lines)
├── components/
│   ├── Board/Board.tsx               — Board panel (links/note/todo/weather/clock)
│   ├── Card/LinkCard.tsx             — Individual bookmark link
│   ├── UI/
│   │   ├── Toolbar.tsx               — Retractable 3-dot menu
│   │   ├── WorkspaceTabs.tsx
│   │   ├── Toast.tsx
│   │   ├── Onboarding.tsx
│   │   └── Settings.tsx
│   ├── Wallpaper/
│   │   └── LiveWallpaperPicker.tsx
│   └── Widgets/
│       ├── ClockWidget.tsx
│       ├── TodoBoard.tsx
│       └── WeatherWidget.tsx
├── store/
│   ├── useWorkspaceStore.ts          — All workspace/board/link CRUD
│   ├── useSettingsStore.ts           — App settings (font, opacity, etc.)
│   └── useUiStore.ts                 — Toast notifications
├── lib/
│   ├── bookmarkImport.ts             — Import + auto-split logic
│   ├── videoStorage.ts               — IndexedDB for video wallpapers
│   ├── undoManager.ts                — Undo/redo stack
│   ├── workspaceTypes.ts             — TypeScript interfaces
│   ├── types.ts                      — Link/Board types
│   └── favicon.ts                    — Favicon URL helper
├── styles/
│   └── global.css                    — All styles (1300+ lines)
└── background.ts                     — Service worker (quick save handler)
```

### Storage:
- **chrome.storage.local** (with `unlimitedStorage` permission) — workspace data, board layouts, image/GIF wallpapers
- **IndexedDB** (`Frontly-videos` database) — video wallpaper blobs
- **localStorage** — settings, onboarding state

### Grid System:
- 172 columns × 85 rows
- 6px cell size, 4px margins
- Zero leftover pixels: 172×6 + 171×4 = 1716px width, 85×6 + 84×4 = 846px height

---

## Permissions Used:
- `storage` — save workspace data
- `unlimitedStorage` — store large GIF/video wallpapers
- `activeTab` — read current tab for quick save
- `tabs` — access tab info
- `bookmarks` — import Chrome bookmarks
- `notifications` — toast notifications

---

## Version History

| Version | Highlights                                                              |
|---------|-------------------------------------------------------------------------|
| v1.0.0  | Initial commit — basic boards, toolbar                                  |
| v2.0.0  | Glass UI, bookmark import, workspace management                         |
| v3.0.0  | Bento grid, video wallpapers, transfer, lock, context menus             |
| v4.0.0  | Notes, todo, weather, clock, onboarding, undo/redo, duplicate, cleanup  |
| v4.1.0  | Full settings panel, Alt shortcuts, clock widget, colored board opacity |

---

## Author

**Bhavishya** — [@bhavishyeah](https://github.com/bhavishyeah)

---

## License

MIT
