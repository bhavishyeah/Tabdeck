import { useEffect, useMemo, useState } from 'react'
import './App.css'

type LinkItem = {
  id: string
  title: string
  url: string
  favicon: string
}

type Board = {
  id: string
  name: string
  links: LinkItem[]
}

type Workspace = {
  id: string
  name: string
  boards: Board[]
}

const createInitialBoards = (): Board[] => [
  { id: crypto.randomUUID(), name: 'New Board', links: [] },
  { id: crypto.randomUUID(), name: 'New Board', links: [] },
  { id: crypto.randomUUID(), name: 'New Board', links: [] },
  { id: crypto.randomUUID(), name: 'New Board', links: [] },
  { id: crypto.randomUUID(), name: 'New Board', links: [] },
  { id: crypto.randomUUID(), name: 'New Board', links: [] },
  { id: crypto.randomUUID(), name: 'New Board', links: [] },
  { id: crypto.randomUUID(), name: 'New Board', links: [] },
]

const BOARD_STORE_KEY = 'tabdeck-board-store'
const QUICK_SAVE_BOARD_KEY = 'tabdeck-quick-save-board-id'

type ImportedSavedLink = {
  id?: string
  title?: string
  url?: string
  favicon?: string
}

type ImportedSavedBoard = {
  id?: string
  name?: string
  links?: ImportedSavedLink[]
}

type ImportedSavedBoardStore = {
  state?: {
    boards?: ImportedSavedBoard[]
  }
}

function normalizeImportedBoardStore(raw: unknown): ImportedSavedBoardStore | null {
  if (!raw) return null

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ImportedSavedBoardStore
    } catch {
      return null
    }
  }

  if (typeof raw === 'object') {
    return raw as ImportedSavedBoardStore
  }

  return null
}

function mapImportedBoards(importedBoards: ImportedSavedBoard[]): Board[] {
  return importedBoards.map((board) => ({
    id: String(board.id ?? crypto.randomUUID()),
    name: board.name ?? 'New Board',
    links: Array.isArray(board.links)
      ? board.links
          .filter((link) => !!link?.url)
          .map((link) => ({
            id: String(link.id ?? crypto.randomUUID()),
            title: link.title ?? link.url ?? 'Untitled',
            url: link.url ?? '',
            favicon: link.favicon ?? '',
          }))
      : [],
  }))
}

function toImportedBoards(boards: Board[]): ImportedSavedBoard[] {
  return boards.map((board) => ({
    id: board.id,
    name: board.name,
    links: board.links.map((link) => ({
      id: link.id,
      title: link.title,
      url: link.url,
      favicon: link.favicon,
    })),
  }))
}

function storageSet(items: Record<string, unknown>) {
  return new Promise<void>((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const err = chrome.runtime.lastError
      if (err) reject(new Error(err.message))
      else resolve()
    })
  })
}

function storageGet(keys: string[]) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      const err = chrome.runtime.lastError
      if (err) reject(new Error(err.message))
      else resolve(result as Record<string, unknown>)
    })
  })
}

function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    { id: 'home', name: 'Home', boards: createInitialBoards() },
    { id: 'space-2', name: 'Space 2', boards: createInitialBoards() },
  ])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('home')
  const [clock, setClock] = useState('')
  const [search, setSearch] = useState('')
  const [loadedFromStorage, setLoadedFromStorage] = useState(false)

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0]

  const boards = activeWorkspace?.boards ?? []
  const homeBoards =
    workspaces.find((workspace) => workspace.id === 'home')?.boards ?? []

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClock(
        now.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })
      )
    }

    updateClock()
    const timer = window.setInterval(updateClock, 1000 * 30)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const loadBoards = async () => {
      try {
        const result = await storageGet([BOARD_STORE_KEY, QUICK_SAVE_BOARD_KEY])
        const boardStore = normalizeImportedBoardStore(result[BOARD_STORE_KEY])
        const importedBoards = boardStore?.state?.boards

        if (Array.isArray(importedBoards) && importedBoards.length > 0) {
          const normalizedBoards = mapImportedBoards(importedBoards)

          setWorkspaces((prev) =>
            prev.map((workspace) =>
              workspace.id === 'home'
                ? { ...workspace, boards: normalizedBoards }
                : workspace
            )
          )
        }

        setLoadedFromStorage(true)
      } catch (error) {
        console.error('Load failed:', error)
        setLoadedFromStorage(true)
      }
    }

    loadBoards()
  }, [])

  useEffect(() => {
    if (!loadedFromStorage) return

    const saveBoards = async () => {
      try {
        const importedBoards = toImportedBoards(homeBoards)
        const quickSaveBoardId = homeBoards[0]?.id ?? crypto.randomUUID()

        await storageSet({
          [BOARD_STORE_KEY]: {
            state: {
              boards: importedBoards,
            },
          },
          [QUICK_SAVE_BOARD_KEY]: quickSaveBoardId,
        })
      } catch (error) {
        console.error('Save failed:', error)
      }
    }

    saveBoards()
  }, [homeBoards, loadedFromStorage])

  useEffect(() => {
    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local') return
      if (!changes[BOARD_STORE_KEY]) return

      const boardStore = normalizeImportedBoardStore(changes[BOARD_STORE_KEY].newValue)
      const importedBoards = boardStore?.state?.boards

      if (!Array.isArray(importedBoards) || importedBoards.length === 0) return

      const normalizedBoards = mapImportedBoards(importedBoards)

      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === 'home'
            ? { ...workspace, boards: normalizedBoards }
            : workspace
        )
      )
    }

    chrome.storage.onChanged.addListener(onStorageChanged)
    return () => chrome.storage.onChanged.removeListener(onStorageChanged)
  }, [])

  const updateActiveBoards = (updater: (prev: Board[]) => Board[]) => {
    setWorkspaces((prev) =>
      prev.map((workspace) =>
        workspace.id === activeWorkspaceId
          ? { ...workspace, boards: updater(workspace.boards) }
          : workspace
      )
    )
  }

  const filteredBoards = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return boards

    return boards.filter((board) => {
      const boardMatch = board.name.toLowerCase().includes(q)
      const linkMatch = board.links.some((link) =>
        link.title.toLowerCase().includes(q) || link.url.toLowerCase().includes(q)
      )
      return boardMatch || linkMatch
    })
  }, [boards, search])

  const addBoard = () => {
    updateActiveBoards((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: 'New Board', links: [] },
    ])
  }

  const deleteBoard = (id: string) => {
    updateActiveBoards((prev) => prev.filter((board) => board.id !== id))
  }

  const renameBoard = (id: string, value: string) => {
    updateActiveBoards((prev) =>
      prev.map((board) => (board.id === id ? { ...board, name: value } : board))
    )
  }

  const addWorkspace = () => {
    const nextNumber = workspaces.length + 1

    setWorkspaces((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Space ${nextNumber}`,
        boards: createInitialBoards(),
      },
    ])
  }

  const deleteWorkspace = (id: string) => {
    setWorkspaces((prev) => {
      if (prev.length === 1) return prev

      const next = prev.filter((workspace) => workspace.id !== id)

      if (activeWorkspaceId === id && next.length > 0) {
        setActiveWorkspaceId(next[0].id)
      }

      return next
    })
  }

  const importBackup = async (file: File) => {
    try {
      const text = await file.text()
      const raw = JSON.parse(text) as Record<string, unknown>

      const boardStore = normalizeImportedBoardStore(raw[BOARD_STORE_KEY])

      if (
        !boardStore?.state?.boards ||
        !Array.isArray(boardStore.state.boards) ||
        boardStore.state.boards.length === 0
      ) {
        throw new Error('Missing tabdeck-board-store.state.boards')
      }

      const importedBoards = boardStore.state.boards
      const normalizedBoards = mapImportedBoards(importedBoards)
      const firstBoardId = normalizedBoards[0]?.id ?? crypto.randomUUID()

      const quickSaveBoardId =
        typeof raw[QUICK_SAVE_BOARD_KEY] === 'string'
          ? raw[QUICK_SAVE_BOARD_KEY]
          : firstBoardId

      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === 'home'
            ? { ...workspace, boards: normalizedBoards }
            : workspace
        )
      )
      setActiveWorkspaceId('home')

      await storageSet({
        [BOARD_STORE_KEY]: {
          state: {
            boards: importedBoards,
          },
        },
        [QUICK_SAVE_BOARD_KEY]: quickSaveBoardId,
      })

      alert('Import worked')
    } catch (error) {
      console.error('Import failed:', error)
      alert(
        `Import failed: ${
          error instanceof Error ? error.message : 'Unknown import error'
        }`
      )
    }
  }

  return (
    <div className="td-page">
      <input
        id="td-import-json"
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) importBackup(file)
          e.currentTarget.value = ''
        }}
      />

      <header className="td-topbar">
        <div className="td-topbar-left">
          <div className="td-workspace-tabs">
            {workspaces.map((workspace) => (
              <div key={workspace.id} className="td-workspace-tab-wrap">
                <button
                  className={`td-workspace-tab ${
                    activeWorkspaceId === workspace.id ? 'is-active' : ''
                  }`}
                  onClick={() => setActiveWorkspaceId(workspace.id)}
                >
                  {workspace.name}
                </button>

                {workspaces.length > 1 && (
                  <button
                    className="td-workspace-delete"
                    onClick={() => deleteWorkspace(workspace.id)}
                    title="Delete space"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button className="td-workspace-add" onClick={addWorkspace}>
              +
            </button>
          </div>
        </div>

        <div className="td-topbar-center">
          <button className="td-create-board-btn" onClick={addBoard}>
            +
          </button>

          <label className="td-search-bar">
            <span className="td-search-icon">⌕</span>
            <input
              className="td-search-input"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        <div className="td-top-actions">
          <div className="td-clock-chip">{clock}</div>

          <div className="td-toolbar">
            <button
              className="td-toolbar-trigger"
              onClick={() => document.getElementById('td-import-json')?.click()}
            >
              Import
            </button>
          </div>
        </div>
      </header>

      <main className="td-content">
        <section className="td-board-grid">
          {filteredBoards.map((board) => (
            <article key={board.id} className="td-board-panel">
              <div className="td-board-top">
                <input
                  className="td-board-name"
                  value={board.name}
                  onChange={(e) => renameBoard(board.id, e.target.value)}
                />
                <div className="td-board-top-actions">
                  <button className="td-board-icon">+</button>
                  <button
                    className="td-board-close"
                    onClick={() => deleteBoard(board.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>

              <div className="td-board-links">
                {board.links.length ? (
                  board.links.map((link) => (
                    <div key={link.id} className="td-link-row">
                      <div className="td-link-left">
                        {link.favicon ? (
                          <img
                            className="td-link-favicon"
                            src={link.favicon}
                            alt=""
                          />
                        ) : null}
                        <span className="td-link-name">{link.title}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="td-board-empty">Drop here</div>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}

export default App