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
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  boards: BoardItem[];
  wallpaper: string | null;
  createdAt: number;
  updatedAt: number;
}