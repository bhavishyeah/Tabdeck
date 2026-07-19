type SavedLink = {
  id: string;
  title: string;
  url: string;
  createdAt?: number;
};

type SavedBoard = {
  id: string;
  name: string;
  color: string;
  links: SavedLink[];
};

type SavedBoardStore = {
  state?: {
    boards?: SavedBoard[];
  };
};

const BOARD_STORE_KEY = 'tabdeck-board-store';
const QUICK_SAVE_BOARD_KEY = 'tabdeck-quick-save-board-id';
const DEBUG_KEY = 'tabdeck-last-quick-save-debug';

function normalizeBoardStore(raw: unknown): SavedBoardStore | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as SavedBoardStore;
    } catch {
      return null;
    }
  }

  if (typeof raw === 'object') {
    return raw as SavedBoardStore;
  }

  return null;
}

function isBlockedUrl(url: string): boolean {
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:')
  );
}

async function notify(message: string) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: 'TabDeck',
      message,
    });
  } catch (error) {
    console.warn('TabDeck notification failed:', error);
  }
}

async function saveCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.url) {
      await notify('No active tab found');
      return;
    }

    if (isBlockedUrl(tab.url)) {
      await notify('This page cannot be saved');
      return;
    }

    const title = tab.title?.trim() || tab.url;

    const result = await chrome.storage.local.get([
      BOARD_STORE_KEY,
      QUICK_SAVE_BOARD_KEY,
    ]);

    const parsedBoards = normalizeBoardStore(result[BOARD_STORE_KEY]);
    if (!parsedBoards?.state?.boards?.length) {
      await chrome.storage.local.set({
        [DEBUG_KEY]: {
          reason: 'NO_BOARDS_FOUND',
          rawType: typeof result[BOARD_STORE_KEY],
          rawValue: result[BOARD_STORE_KEY] ?? null,
        },
      });

      await notify('No boards found. Import or create a board first.');
      return;
    }

    const boards = parsedBoards.state.boards;
    const quickSaveBoardId =
      typeof result[QUICK_SAVE_BOARD_KEY] === 'string'
        ? result[QUICK_SAVE_BOARD_KEY]
        : '';

    const matchedBoard = boards.find((board) => board.id === quickSaveBoardId);
    const targetBoard = matchedBoard ?? boards[0];

    if (!Array.isArray(targetBoard.links)) {
      targetBoard.links = [];
    }

    const alreadyExists = targetBoard.links.some(
      (link) => link.url === tab.url && link.title === title,
    );

    if (!alreadyExists) {
      targetBoard.links.unshift({
        id: crypto.randomUUID(),
        title,
        url: tab.url,
        createdAt: Date.now(),
      });
    }

    await chrome.storage.local.set({
      [BOARD_STORE_KEY]: parsedBoards,
      [QUICK_SAVE_BOARD_KEY]: targetBoard.id,
      [DEBUG_KEY]: {
        ok: true,
        quickSaveBoardId,
        matchedBoardId: matchedBoard?.id ?? null,
        matchedBoardName: matchedBoard?.name ?? null,
        targetBoardId: targetBoard.id,
        targetBoardName: targetBoard.name,
        savedTitle: title,
        savedUrl: tab.url,
        alreadyExists,
        storeShape: typeof result[BOARD_STORE_KEY],
      },
    });

    await notify(
      alreadyExists
        ? `Already saved in ${targetBoard.name}`
        : `Saved "${title}" to ${targetBoard.name}`,
    );
  } catch (error) {
    console.error('TabDeck quick save failed:', error);

    await chrome.storage.local.set({
      [DEBUG_KEY]: {
        ok: false,
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : String(error),
      },
    });

    await notify('Tab save failed');
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-current-tab') return;
  await saveCurrentTab();
});