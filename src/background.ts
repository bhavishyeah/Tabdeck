const BOARD_STORE_KEY = 'tabdeck-board-store'
const QUICK_SAVE_BOARD_KEY = 'tabdeck-quick-save-board-id'

type StoredLink = {
  id?: string
  title?: string
  url?: string
  favicon?: string
}

type StoredBoard = {
  id?: string
  name?: string
  links?: StoredLink[]
}

type StoredBoardStore = {
  state?: {
    boards?: StoredBoard[]
  }
}

function normalizeBoardStore(raw: unknown): StoredBoardStore | null {
  if (!raw) return null

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as StoredBoardStore
    } catch {
      return null
    }
  }

  if (typeof raw === 'object') {
    return raw as StoredBoardStore
  }

  return null
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'quick-save-tab') return

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab || !tab.url) return

    const result = await chrome.storage.local.get([
      BOARD_STORE_KEY,
      QUICK_SAVE_BOARD_KEY,
    ])

    const boardStore = normalizeBoardStore(result[BOARD_STORE_KEY])
    const boards = boardStore?.state?.boards

    if (!Array.isArray(boards) || boards.length === 0) return

    const quickSaveBoardId = result[QUICK_SAVE_BOARD_KEY]
    const targetBoard =
      boards.find((b) => b.id === quickSaveBoardId) ?? boards[0]

    if (!Array.isArray(targetBoard.links)) {
      targetBoard.links = []
    }

    const exists = targetBoard.links.some((link) => link.url === tab.url)
    if (exists) return

    targetBoard.links.unshift({
      id: crypto.randomUUID(),
      title: tab.title || tab.url,
      url: tab.url,
      favicon: tab.favIconUrl || '',
    })

    await chrome.storage.local.set({
      [BOARD_STORE_KEY]: {
        state: {
          boards,
        },
      },
    })
  } catch (error) {
    console.error('quick-save-tab failed', error)
  }
})