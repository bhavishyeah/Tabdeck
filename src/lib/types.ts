export interface LinkCardType {
  id: string;
  title: string;
  url: string;
  faviconUrl?: string;
}

export interface BoardType {
  id: string;
  name: string;
  color: string;
  links: LinkCardType[];
}