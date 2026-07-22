import type { BoardType, LinkCardType } from './types';

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

/**
 * Semi-structured split sizes for masonry layout variety.
 * Alternates between small (3-4), medium (5-6), and large (7).
 */
function getSemiStructuredSizes(totalLinks: number): number[] {
  const sizes: number[] = [];
  const buckets = [
    { min: 3, max: 4 },   // small
    { min: 5, max: 6 },   // medium
    { min: 7, max: 7 },   // large
  ];

  let remaining = totalLinks;
  let bucketIndex = 0;

  while (remaining > 0) {
    const bucket = buckets[bucketIndex % buckets.length];
    const size = Math.min(
      remaining,
      bucket.min + Math.floor(Math.random() * (bucket.max - bucket.min + 1))
    );

    // If remaining is small enough to be one board, just take it all
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

/**
 * Collect all bookmark URLs from a folder tree into flat link array
 */
function collectLinks(folder: BookmarkNode): LinkCardType[] {
  const links: LinkCardType[] = [];

  function collect(node: BookmarkNode) {
    if (node.url) {
      links.push({
        id: crypto.randomUUID(),
        title: node.title || node.url || 'Untitled',
        url: node.url,
        favicon: getBookmarkFavicon(node.url, 32),
      });
    }

    if (node.children?.length) {
      node.children.forEach(collect);
    }
  }

  collect(folder);
  return links.filter((link) => !!link.url);
}

/**
 * Split links into boards using semi-structured sizes for masonry variety.
 * Each board gets a name like "FolderName (1)", "FolderName (2)", etc.
 */
function splitLinksIntoBoards(links: LinkCardType[], baseName: string): BoardType[] {
  if (links.length === 0) return [];

  // If fits in one board, no splitting needed
  if (links.length <= MAX_LINKS_PER_BOARD) {
    return [{
      id: crypto.randomUUID(),
      name: baseName,
      color: randomColor(),
      links,
    }];
  }

  const sizes = getSemiStructuredSizes(links.length);
  const boards: BoardType[] = [];
  let offset = 0;

  for (let i = 0; i < sizes.length; i++) {
    const chunk = links.slice(offset, offset + sizes[i]);
    boards.push({
      id: crypto.randomUUID(),
      name: sizes.length > 1 ? `${baseName} (${i + 1})` : baseName,
      color: randomColor(),
      links: chunk,
    });
    offset += sizes[i];
  }

  return boards;
}

/**
 * Import a bookmark folder, split into boards respecting workspace limits.
 * Returns: { boards: boards for current workspace, overflow: boards for overflow workspace }
 */
export function importBookmarkFolder(
  folder: BookmarkNode,
  existingBoardCount: number
): { boards: BoardType[]; overflow: BoardType[] } {
  const links = collectLinks(folder);

  if (links.length === 0) {
    return { boards: [], overflow: [] };
  }

  const baseName = folder.title || 'Imported Bookmarks';
  const allBoards = splitLinksIntoBoards(links, baseName);

  // How many boards can fit in current workspace?
  const slotsAvailable = MAX_BOARDS_PER_WORKSPACE - existingBoardCount;

  if (slotsAvailable <= 0) {
    // No room at all — everything goes to overflow
    return { boards: [], overflow: allBoards };
  }

  if (allBoards.length <= slotsAvailable) {
    // Everything fits
    return { boards: allBoards, overflow: [] };
  }

  // Split between current and overflow
  const boards = allBoards.slice(0, slotsAvailable);
  const overflow = allBoards.slice(slotsAvailable);

  return { boards, overflow };
}

/**
 * Legacy single-board export (kept for backward compat)
 */
export function bookmarkFolderToBoard(folder: BookmarkNode) {
  const links = collectLinks(folder);
  if (links.length === 0) return null;

  // Respect max per board — only take first 12
  return {
    id: crypto.randomUUID(),
    name: folder.title || 'Imported Bookmarks',
    color: randomColor(),
    links: links.slice(0, MAX_LINKS_PER_BOARD),
  };
}

export function bookmarkTreeToBoards(nodes: BookmarkNode[]): BoardType[] {
  const boards: BoardType[] = [];

  function walk(node: BookmarkNode) {
    const board = bookmarkFolderToBoard(node);
    if (board) boards.push(board);

    if (node.children?.length) {
      node.children.forEach(walk);
    }
  }

  nodes.forEach(walk);
  return boards;
}
