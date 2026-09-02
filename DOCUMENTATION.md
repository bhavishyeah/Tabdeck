# Frontly — Complete Documentation

## Overview

Frontly is a Chrome extension that replaces your new tab page with a draggable, resizable bento-grid dashboard. Manage bookmarks, notes, todos, and widgets — all arranged on a precise 12px grid, with full glass-morphism theming, live wallpapers, and per-workspace layouts.

---

## Installation

### From Release
1. Download the latest zip from the `release/` folder
2. Unzip the file
3. Open Chrome → `chrome://extensions`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked**
6. Select the unzipped `dist/` folder
7. Open a new tab — Frontly is ready

### Development Setup
```bash
git clone https://github.com/bhavishyeah/Frontly.git
cd Frontly
npm install
npm run build   # Production build → /dist
```

---

## Grid System

Frontly uses a **12 × 12 px** square grid cell.

| Property | Value |
|---|---|
| Cell size | 12 × 12 px |
| Columns (1920px) | 156 |
| Row height | 12 px |
| Link row height | 24 px (2 cells) |
| Board header | 24 px (2 cells) |
| Y positions | Snapped to even rows (24px alignment) |

Board heights are always derived from content — you can't manually resize link board heights. Widget heights (note, todo, clock, weather) auto-size from their content.

---

## Board Types

### Link Boards
The default board type. Each link occupies one 24px row (favicon + title). Boards auto-resize as you add or remove links.

**Display modes** (right-click → Display):
| Mode | Description |
|---|---|
| **List** | Default — favicon + link name per row |
| **Icons vertical** | Thin strip of stacked favicons, no header |
| **Icons horizontal** | Row of favicons side by side |
| **Icons floating** | Row of favicons with no board background |

**Icon sizes**: 12px (default), 24px, 36px, 48px  
**Sections**: Optional 1px dividers between icons (horizontal/floating modes)

### Note Widget
A free-form text area. Height auto-expands as you type — pressing Enter grows the board to fit the new line.

### Todo Widget
Checklist with circular radio buttons. Tasks added by typing + Enter. Shows `✓ completed/total` in the header.

### Weather Widget
Live weather via Open-Meteo API (free, no API key). Auto-detects location via browser geolocation. Shows temperature, condition, description, and city name.

### Clock Widget
Displays current time (HH:MM:SS) and full date. Minimal — no board name shown.

---

## Grid Layout Behaviour

- **Drag** boards by the grey pill handle that appears at the top edge on hover
- **Resize** boards by the right-edge bar that appears on hover (width only for link boards; all widgets use width resize)
- **Push-down**: when a board grows (link added), boards directly below shift down to maintain the 24px gap
- **Column overflow**: if a board would extend past the bottom of the viewport, it is automatically relocated to the next free column
- **Bounded**: `isBounded` is off — boards can extend below the fold (scroll to reach them)
- **Collision**: `preventCollision` is on — boards cannot overlap during drag
- **Grid placeholder**: a subtle blue dashed outline shows valid drop positions during drag

---

## Workspaces

- Unlimited workspaces (Work, Personal, Projects, etc.)
- Switch via tabs in the toolbar
- Each workspace has its own boards, layout, and wallpaper
- Right-click a workspace tab → Rename, Export as JSON, Delete
- Transfer individual boards between workspaces via right-click on the board

---

## Wallpapers

| Type | Format | Storage |
|---|---|---|
| Static image | PNG, JPG | `chrome.storage.local` as data URL |
| Animated GIF | GIF | `chrome.storage.local` as data URL |
| Video | MP4, WebM | IndexedDB (`frontly-videos`) as raw Blob |
| Live wallpaper | CSS animation | No storage — 5 built-in animated backgrounds |

**Live wallpaper options**: Aurora, Gradient Wave, Particles, Mesh Gradient, Ocean  
Set via: toolbar → Live wallpaper button (sun icon)  
Keyboard: `Alt+P` opens the file picker for static/video wallpapers

---

## Toolbar

Activated by clicking the Frontly logo button (top-left by default).

**Toolbar elements**:
| Element | Function |
|---|---|
| Frontly logo | Toggle toolbar open/close |
| Workspace tabs | Switch / create workspaces |
| `+` button | Create new link board |
| Widgets button | Dropdown: Note, Todo, Weather, Clock |
| Search | Filter boards and links live |
| Lock `🔒/🔓` | Toggle layout lock (no drag/resize when locked) |
| `⋯` menu | Reveals action buttons |

**Action buttons in `⋯` menu**:
- Quick Save — set which board receives Ctrl+Shift+Z saves
- Bookmarks — import Chrome bookmarks (folder picker)
- Export — download all workspace data as JSON
- Import — restore from JSON backup
- Wallpaper (image icon) — set static image or video wallpaper
- Clear wallpaper (power icon) — remove wallpaper and reset workspace
- Live wallpaper (sun icon) — pick an animated CSS background

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+B` | New link board |
| `Ctrl+M` | Toggle toolbar |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Alt+N` | New note board |
| `Alt+T` | New todo list |
| `Alt+W` | New weather widget |
| `Alt+C` | New clock widget |
| `Alt+L` | Lock / unlock layout |
| `Alt+S` | Focus search bar |
| `Alt+E` | Export workspace JSON |
| `Alt+I` | Import JSON (opens file picker) |
| `Alt+P` | Set wallpaper (opens file picker) |
| `Alt+X` | Clear workspace (with confirmation) |
| `Ctrl+Shift+Z` | Quick-save current tab to selected board |

---

## Context Menus

### Board (right-click anywhere on board):
- **Add link** *(link boards only, default mode)*
- **Rename board** *(link boards in default mode only)*
- **Hide / Show header** *(link boards in default mode only)*
- **Display** — switch between List / Icons vertical / Icons horizontal / Icons floating; set icon size (12/24/36/48px); toggle sections
- **Color** — per-board color picker (8 colors + clear glass + default)
- **Duplicate board**
- **Transfer to [workspace]** *(if other workspaces exist)*
- **Delete board**

### Link (right-click a bookmark row):
- Rename
- Transfer to workspace/board
- Delete

### Workspace tab (right-click):
- Rename workspace
- Export workspace as JSON
- Delete workspace

---

## Settings (⚙️ gear icon — bottom right)

### Appearance Tab

**Typography**
- Font Family — 10 Google Fonts
- Font Size — 8–14px
- Text Mode — Auto / Dark / Light

**Board**
- Opacity, Border Radius, Blur, Saturation, Grain
- Color (applies to all link boards at once)

**Toolbar**
- Position — Left / Center / Right
- Opacity, Border Radius, Blur, Saturation, Grain, Color

**Widgets** (note, todo, clock, weather — independent of board settings)
- Opacity, Border Radius, Blur, Saturation, Grain, Color

### Behavior Tab

**Automation**
- Auto-close toolbar — 0–30 s (0 = off)
- Auto-lock layout — 0–60 s (0 = off)

**Links**
- Open links in — New tab / Same tab

**Default Board Size**
- Width — 108–360 px (9–30 grid units)

**Default Display Mode**
- Mode — List / V-Icons / H-Icons / Float
- Icon Size — 12 / 24 / 36 / 48 px
- Show sections — toggle dividers between icons

### Data Tab
- Storage used (KB / MB)
- Re-run onboarding
- Factory reset (wipes everything)

### Info Tab
- Version
- GitHub link
- Full keyboard shortcut reference

---

## Quick Save (`Ctrl+Shift+Z`)

Saves the current active tab as a link to the designated quick-save board. Configure which board receives saved links by clicking the Quick Save button in the toolbar `⋯` menu.

Requirements:
- At least one link board must exist in the active workspace
- The page must not be a browser internal page (`chrome://`, `about:`, etc.)

A Chrome notification confirms the save, or explains why it failed.

---

## Import / Export

**Export**: Downloads a JSON file containing all workspaces, boards, links, settings, and layout data. Video wallpapers are excluded (stored in IndexedDB separately).

**Import**: Restores from a JSON backup. Also supports importing from the old TabDeck format — if the JSON contains boards but no workspaces, it auto-converts them into a new workspace.

**Bookmark Import**: Imports a Chrome bookmarks folder. Large folders are automatically split into multiple boards (3–7 links each, semi-structured for visual variety). Boards that exceed the workspace limit (10) spill into a new workspace.

---

## Data Migration (TabDeck → Frontly)

If you previously used TabDeck, your data is automatically migrated on first load:

- `tabdeck-workspaces` → `frontly-workspaces`
- `tabdeck-board-store` → `frontly-board-store`
- `tabdeck-quick-save-board-id` → `frontly-quick-save-board-id`
- `tabdeck-settings` → `frontly-settings` (localStorage)
- `tabdeck-onboarding-done` → `frontly-onboarding-done` (localStorage)

The migration runs once (flagged by `frontly-migrated-from-tabdeck`) and only writes new keys if they don't already exist, so it's safe to run on any device.

---

## Technical Architecture

### Tech Stack
- **React 19** + TypeScript
- **Vite** + CRXJS (Chrome Extension plugin)
- **react-grid-layout v1.4.4** — 12px bento grid
- **@dnd-kit** — link drag-and-drop within boards
- **Zustand** — state (workspace store + settings store + UI store)
- **Lucide React** — icons
- **Chrome APIs** — storage, bookmarks, tabs, commands, notifications

### Storage
| Store | Content |
|---|---|
| `chrome.storage.local` | Workspaces, boards, links, layouts, image/GIF wallpapers |
| IndexedDB (`frontly-videos`) | Video wallpaper blobs |
| `localStorage` | Settings, onboarding state |

### File Structure
```
src/
├── newtab/
│   ├── main.tsx                      Entry point + settings pre-apply
│   └── NewTab.tsx                    Main component (grid, toolbar, drag)
├── background.ts                     Service worker (quick-save, migration)
├── components/
│   ├── Board/Board.tsx               All board types + icon modes
│   ├── Card/LinkCard.tsx             Sortable bookmark link row
│   ├── UI/
│   │   ├── Toolbar.tsx               Retractable action toolbar
│   │   ├── WorkspaceTabs.tsx         Workspace switcher
│   │   ├── Settings.tsx              Settings panel + sliders
│   │   ├── Toast.tsx                 Notification toasts
│   │   └── Onboarding.tsx            First-run guided tour
│   ├── Wallpaper/
│   │   └── LiveWallpaperPicker.tsx   Animated wallpaper selector
│   └── Widgets/
│       ├── ClockWidget.tsx
│       ├── TodoBoard.tsx
│       └── WeatherWidget.tsx
├── store/
│   ├── useWorkspaceStore.ts          Workspace / board / link CRUD
│   ├── useSettingsStore.ts           App-wide settings
│   └── useUiStore.ts                 Toast notifications
├── lib/
│   ├── workspaceTypes.ts             TypeScript interfaces
│   ├── bookmarkImport.ts             Import + auto-split logic
│   ├── videoStorage.ts               IndexedDB for video wallpapers
│   ├── undoManager.ts                Undo/redo stack
│   ├── useGridDimensions.ts          Reactive grid size (12px cells)
│   └── favicon.ts                    Google favicon URL helper
└── styles/
    ├── global.css                    All component styles + live wallpaper animations
    └── tokens.css                    Design tokens (spacing, radius, shadow, etc.)
```

### Permissions
- `storage` + `unlimitedStorage` — workspace data and wallpapers
- `activeTab` + `tabs` — quick-save current tab
- `bookmarks` — import Chrome bookmarks
- `notifications` — quick-save confirmation

---

## Version History

| Version | Highlights |
|---|---|
| v1.0.0 | Initial release — basic boards, toolbar |
| v1.1.0 | Frontly rebrand; 12px grid; icon display modes; live wallpapers; widget settings; note/todo redesign; context menu clamping; full type-safety cleanup |
| v1.2.0 | Text color settings per section; add-link form inherits board style; icon strip fixes; localStorage migration; background.ts migration; live wallpaper wiring; documentation rewrite |

---

## Author

**Bhavishya** — [@bhavishyeah](https://github.com/bhavishyeah)

---

## License

MIT
