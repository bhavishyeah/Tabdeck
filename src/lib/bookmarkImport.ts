import type { BoardItem, LinkItem } from './workspaceTypes';

type BookmarkNode = chrome.bookmarks.BookmarkTreeNode;

/** Max links a single board can hold */
export const MAX_LINKS_PER_BOARD = 7;

/** Max boards a single workspace can hold */
export const MAX_BOARDS_PER_WORKSPACE = 10;

/** Max total links per workspace */
export const MAX_LINKS_PER_WORKSPACE = MAX_LINKS_PER_BOARD * MAX_BOARDS_PER_WORKSPACE;

function randomColor() {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getBookmarkFavicon(url: string, size = 32) {
  return `https://www.google.com/s2/favicons?sz=${size}&domain_url=${encodeURIComponent(url)}`;
}

function getSemiStructuredSizes(totalLinks: number): number[] {
  const sizes: number[] = [];
  const buckets = [
    { min: 3, max: 4 },
    { min: 5, max: 6 },
    { min: 7, max: 7 },
  ];
  let remaining = totalLinks;
  let bucketIndex = 0;

  while (remaining > 0) {
    const bucket = buckets[bucketIndex % buckets.length];
    const size = Math.min(
      remaining,
      bucket.min + Math.floor(Math.random() * (bucket.max - bucket.min + 1))
    );
    if (remaining <= MAX_LINKS_PER_BOARD) {
      sizes.push(remaining);
      break;
    }
    sizes.push(size);
    remaining -= size;
    bucketIndex++;
  }

  return sizes;
}

function collectLinks(folder: BookmarkNode): LinkItem[] {
  const links: LinkItem[] = [];

  function collect(node: BookmarkNode) {
    if (node.url) {
      const ts = Date.now();
      links.push({
        id: crypto.randomUUID(),
        title: node.title || node.url || 'Untitled',
        url: node.url,
        favicon: getBookmarkFavicon(node.url, 32),
        createdAt: ts,
        updatedAt: ts,
      });
    }
    if (node.children?.length) node.children.forEach(collect);
  }

  collect(folder);
  return links.filter((link) => !!link.url);
}

function splitLinksIntoBoards(links: LinkItem[], baseName: string): BoardItem[] {
  if (links.length === 0) return [];
  const ts = Date.now();

  if (links.length <= MAX_LINKS_PER_BOARD) {
    return [{
      id: crypto.randomUUID(),
      name: baseName,
      color: randomColor(),
      links,
      createdAt: ts,
      updatedAt: ts,
    }];
  }

  const sizes = getSemiStructuredSizes(links.length);
  const boards: BoardItem[] = [];
  let offset = 0;

  for (let i = 0; i < sizes.length; i++) {
    const chunk = links.slice(offset, offset + sizes[i]);
    boards.push({
      id: crypto.randomUUID(),
      name: sizes.length > 1 ? `${baseName} (${i + 1})` : baseName,
      color: randomColor(),
      links: chunk,
      createdAt: ts,
      updatedAt: ts,
    });
    offset += sizes[i];
  }

  return boards;
}

export function importBookmarkFolder(
  folder: BookmarkNode,
  existingBoardCount: number
): { boards: BoardItem[]; overflow: BoardItem[] } {
  const links = collectLinks(folder);

  if (links.length === 0) return { boards: [], overflow: [] };

  const baseName = folder.title || 'Imported Bookmarks';
  const allBoards = splitLinksIntoBoards(links, baseName);
  const slotsAvailable = MAX_BOARDS_PER_WORKSPACE - existingBoardCount;

  if (slotsAvailable <= 0) return { boards: [], overflow: allBoards };
  if (allBoards.length <= slotsAvailable) return { boards: allBoards, overflow: [] };

  return {
    boards: allBoards.slice(0, slotsAvailable),
    overflow: allBoards.slice(slotsAvailable),
  };
}

export function bookmarkFolderToBoard(folder: BookmarkNode): BoardItem | null {
  const links = collectLinks(folder);
  if (links.length === 0) return null;
  const ts = Date.now();
  return {
    id: crypto.randomUUID(),
    name: folder.title || 'Imported Bookmarks',
    color: randomColor(),
    links: links.slice(0, MAX_LINKS_PER_BOARD),
    createdAt: ts,
    updatedAt: ts,
  };
}

export function bookmarkTreeToBoards(nodes: BookmarkNode[]): BoardItem[] {
  const boards: BoardItem[] = [];

  function walk(node: BookmarkNode) {
    const board = bookmarkFolderToBoard(node);
    if (board) boards.push(board);
    if (node.children?.length) node.children.forEach(walk);
  }

  nodes.forEach(walk);
  return boards;
}
