export interface LinkItem {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  /** Optional due date as an ISO date string (YYYY-MM-DD). */
  dueDate?: string;
}

/** Display modes for link boards */
export type BoardDisplayMode = 'default' | 'icons-vertical' | 'icons-horizontal' | 'icons-floating';

/** Icon sizes in pixels (must fit on 12px grid) */
export type IconSize = 12 | 24 | 36 | 48;

/** Per-clock-widget configuration */
export interface ClockConfig {
  /** Use 24-hour time (default false = 12h with AM/PM) */
  hour24?: boolean;
  /** Show seconds in the time (default false) */
  showSeconds?: boolean;
  /** Show the date line (default true) */
  showDate?: boolean;
  /** IANA timezone (e.g. 'Europe/London'); empty/undefined = local */
  timezone?: string;
}

/** Per-weather-widget configuration */
export interface WeatherConfig {
  /** Temperature unit (default 'c') */
  unit?: 'c' | 'f';
  /** Manual location coordinates; when set, geolocation is skipped */
  lat?: number;
  lon?: number;
  /** Display label for a manual location */
  label?: string;
}

/** Per-timer/countdown-widget configuration */
export interface TimerConfig {
  /** Timer mode: countdown to a target date, or a pomodoro/interval timer. */
  mode?: 'countdown' | 'pomodoro';
  /** For 'countdown': target datetime as an ISO string. */
  target?: string;
  /** For 'countdown': optional label ("Launch day", "Vacation"). */
  label?: string;
  /** For 'pomodoro': focus length in minutes (default 25). */
  focusMinutes?: number;
  /** For 'pomodoro': break length in minutes (default 5). */
  breakMinutes?: number;
}

/** Per-RSS-widget configuration */
export interface RssConfig {
  /** Feed URL. */
  url?: string;
  /** Max items to show (default 6). */
  count?: number;
}

/** Per-VOLT-widget configuration */
export interface VoltConfig {
  /** Max items to display in the widget (default 5) */
  maxItems?: number;
  /** Show sender username (default true) */
  showSender?: boolean;
  /** Show relative timestamps (default true) */
  showTimestamps?: boolean;
  /** Filter: which content types to show */
  showText?: boolean;
  showLinks?: boolean;
  showImages?: boolean;
  showFiles?: boolean;
}

export interface BoardItem {
  id: string;
  name: string;
  type?: 'links' | 'note' | 'todo' | 'weather' | 'clock' | 'timer' | 'rss' | 'volt';
  color?: string;
  hideHeader?: boolean;
  noteContent?: string;
  todos?: TodoItem[];
  links: LinkItem[];
  /** Display mode for link boards — icon-only layouts */
  displayMode?: BoardDisplayMode;
  /** Icon size in px for icon modes (default 12) */
  iconSize?: IconSize;
  /** Show 1px vertical dividers between icons in horizontal modes */
  showSections?: boolean;
  /** Clock widget configuration (only used when type === 'clock') */
  clockConfig?: ClockConfig;
  /** Weather widget configuration (only used when type === 'weather') */
  weatherConfig?: WeatherConfig;
  /** Timer/countdown widget configuration (only used when type === 'timer') */
  timerConfig?: TimerConfig;
  /** RSS widget configuration (only used when type === 'rss') */
  rssConfig?: RssConfig;
  /** VOLT widget configuration (only used when type === 'volt') */
  voltConfig?: VoltConfig;
  /**
   * Position/size in grid cells. `gridStep` records the pixel size of one cell
   * at the time the layout was written, so layouts saved under an older grid
   * can be rescaled on read. Absent means 24 (the pre-12px grid).
   */
  layout?: { x: number; y: number; w: number; h: number; gridStep?: number };
  createdAt: number;
  updatedAt: number;
}

export type LiveWallpaperType =
  | 'aurora'
  | 'gradient-wave'
  | 'particles'
  | 'mesh-gradient'
  | 'ocean'
  | null;

export interface WorkspaceItem {
  id: string;
  name: string;
  boards: BoardItem[];
  wallpaper: string | null;
  videoWallpaper: string | null;
  liveWallpaper: LiveWallpaperType;
  createdAt: number;
  updatedAt: number;
}