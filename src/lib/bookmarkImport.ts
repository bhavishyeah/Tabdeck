import type { BoardType, LinkCardType } from './types';

type BookmarkNode = chrome.bookmarks.BookmarkTreeNode;

function randomColor() {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function bookmarkFolderToBoard(folder: BookmarkNode): BoardType | null {
  if (!folder.children || folder.children.length === 0) return null;

  const links: LinkCardType[] = folder.children
    .filter((child) => !!child.url)
    .map((child) => ({
      id: crypto.randomUUID(),
      title: child.title || child.url || 'Untitled',
      url: child.url || '',
    }))
    .filter((link) => !!link.url);

  if (links.length === 0) return null;

  return {
    id: crypto.randomUUID(),
    name: folder.title || 'Imported Bookmarks',
    color: randomColor(),
    links,
  };
}