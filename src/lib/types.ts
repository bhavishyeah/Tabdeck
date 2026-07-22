export type LinkCardType = {
  id: string;
  title: string;
  url: string;
  favicon?: string;
};

export interface BoardType {
  id: string;
  name: string;
  color: string;
  links: LinkCardType[];
}