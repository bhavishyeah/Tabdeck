export interface LinkItem {
  id: string;
  title: string;
  url: string;
  createdAt: number;
  updatedAt: number;
}

export interface BoardItem {
  id: string;
  name: string;
  links: LinkItem[];
  layout?: { x: number; y: number; w: number; h: number };
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
  liveWallpaper: LiveWallpaperType;
  createdAt: number;
  updatedAt: number;
}