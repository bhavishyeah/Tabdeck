import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { BoardItem, LinkItem, LiveWallpaperType, WorkspaceItem } from '../lib/workspaceTypes';
import { MAX_BOARDS_PER_WORKSPACE, MAX_LINKS_PER_BOARD } from '../lib/bookmarkImport';
import { useSettingsStore } from './useSettingsStore';

const uid = () => crypto.randomUUID();
const now = () => Date.now();

const createBoard = (name = 'New Board'): BoardItem => ({
  id: uid(),
  name,
  links: [],
  createdAt: now(),
  updatedAt: now(),
});

const createWorkspace = (name = 'Home'): WorkspaceItem => ({
  id: uid(),
  name,
  boards: [],
  wallpaper: null,
  videoWallpaper: null,
  liveWallpaper: null,
  createdAt: now(),
  updatedAt: now(),
});

const chromeStorage: StateStorage = {
  getItem: async (name) => {
    const result = await chrome.storage.local.get(name);
    return (result[name] as string) ?? null;
  },
  setItem: async (name, value) => {
    await chrome.storage.local.set({ [name]: value });
  },
  removeItem: async (name) => {
    await chrome.storage.local.remove(name);
  },
};

interface WorkspaceState {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string;
  setActiveWorkspace: (workspaceId: string) => void;
  addWorkspace: (name?: string) => void;
  renameWorkspace: (workspaceId: string, name: string) => void;
  removeWorkspace: (workspaceId: string) => void;
  addBoard: (workspaceId: string, name?: string) => void;
  addNoteBoard: (workspaceId: string, name?: string) => void;
  addTodoBoard: (workspaceId: string, name?: string) => void;
  addClockBoard: (workspaceId: string) => void;
  duplicateBoard: (workspaceId: string, boardId: string) => void;
  updateNoteContent: (workspaceId: string, boardId: string, content: string) => void;
  updateTodos: (workspaceId: string, boardId: string, todos: import('../lib/workspaceTypes').TodoItem[]) => void;
  renameBoard: (workspaceId: string, boardId: string, name: string) => void;
  setBoardColor: (workspaceId: string, boardId: string, color: string | undefined) => void;
  removeBoard: (workspaceId: string, boardId: string) => void;
  transferBoard: (fromWorkspaceId: string, toWorkspaceId: string, boardId: string) => void;
  reorderBoards: (workspaceId: string, fromIndex: number, toIndex: number) => void;
  updateBoardLayouts: (workspaceId: string, layouts: { id: string; x: number; y: number; w: number; h: number }[]) => void;
  importBoard: (workspaceId: string, board: BoardItem) => void;
  addLink: (workspaceId: string, boardId: string, title: string, url: string) => void;
  renameLink: (workspaceId: string, boardId: string, linkId: string, title: string) => void;
  transferLink: (fromWorkspaceId: string, fromBoardId: string, linkId: string, toWorkspaceId: string, toBoardId: string) => void;
  reorderLinks: (workspaceId: string, boardId: string, fromIndex: number, toIndex: number) => void;
  removeLink: (workspaceId: string, boardId: string, linkId: string) => void;
  moveLink: (
    workspaceId: string,
    activeLinkId: string,
    overLinkId: string,
    fromBoardId: string,
    toBoardId: string
  ) => void;
  setWorkspaceWallpaper: (workspaceId: string, wallpaper: string | null) => void;
  setVideoWallpaper: (workspaceId: string, videoKey: string | null) => void;
  setWorkspaceLiveWallpaper: (workspaceId: string, liveWallpaper: LiveWallpaperType) => void;
  getActiveWorkspace: () => WorkspaceItem | undefined;
}

const initialWorkspace = createWorkspace('Home');

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [initialWorkspace],
      activeWorkspaceId: initialWorkspace.id,

      setActiveWorkspace: (workspaceId) => set({ activeWorkspaceId: workspaceId }),

      addWorkspace: (name = 'New Space') =>
        set((state) => {
          const workspace = createWorkspace(name);
          return {
            workspaces: [...state.workspaces, workspace],
            activeWorkspaceId: workspace.id,
          };
        }),

      renameWorkspace: (workspaceId, name) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? { ...workspace, name, updatedAt: now() }
              : workspace
          ),
        })),

      removeWorkspace: (workspaceId) =>
        set((state) => {
          if (state.workspaces.length === 1) return state;

          const nextWorkspaces = state.workspaces.filter(
            (workspace) => workspace.id !== workspaceId
          );

          const nextActive =
            state.activeWorkspaceId === workspaceId
              ? nextWorkspaces[0]?.id ?? ''
              : state.activeWorkspaceId;

          return {
            workspaces: nextWorkspaces,
            activeWorkspaceId: nextActive,
          };
        }),

      addBoard: (workspaceId, name = 'New Board') =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) => {
            if (workspace.id !== workspaceId) return workspace;
            if (workspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) return workspace;
            const s = useSettingsStore.getState();
            const col = workspace.boards.length % Math.floor(172 / s.defaultBoardW);
            const row = Math.floor(workspace.boards.length / Math.floor(172 / s.defaultBoardW));
            const layout = { x: col * s.defaultBoardW, y: row * (s.defaultBoardH + 2), w: s.defaultBoardW, h: s.defaultBoardH };
            return {
              ...workspace,
              boards: [...workspace.boards, { ...createBoard(name), layout }],
              updatedAt: now(),
            };
          }),
        })),

      addNoteBoard: (workspaceId, name = 'Note') =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) => {
            if (workspace.id !== workspaceId) return workspace;
            if (workspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) return workspace;
            const col = workspace.boards.length % 5;
            const row = Math.floor(workspace.boards.length / 5);
            const layout = { x: col * 34, y: row * 12, w: 34, h: 7 };
            return {
              ...workspace,
              boards: [...workspace.boards, { ...createBoard(name), type: 'note' as const, noteContent: '', layout }],
              updatedAt: now(),
            };
          }),
        })),

      addTodoBoard: (workspaceId, name = 'Todo') =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) => {
            if (workspace.id !== workspaceId) return workspace;
            if (workspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) return workspace;
            const col = workspace.boards.length % 5;
            const row = Math.floor(workspace.boards.length / 5);
            const layout = { x: col * 34, y: row * 12, w: 34, h: 7 };
            return {
              ...workspace,
              boards: [...workspace.boards, { ...createBoard(name), type: 'todo' as const, todos: [], layout }],
              updatedAt: now(),
            };
          }),
        })),

      addClockBoard: (workspaceId) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) => {
            if (workspace.id !== workspaceId) return workspace;
            if (workspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) return workspace;
            const col = workspace.boards.length % 5;
            const row = Math.floor(workspace.boards.length / 5);
            const layout = { x: col * 34, y: row * 12, w: 34, h: 7 };
            return {
              ...workspace,
              boards: [...workspace.boards, { ...createBoard('Clock'), type: 'clock' as const, layout }],
              updatedAt: now(),
            };
          }),
        })),

      duplicateBoard: (workspaceId, boardId) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) => {
            if (workspace.id !== workspaceId) return workspace;
            if (workspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) return workspace;
            const board = workspace.boards.find((b) => b.id === boardId);
            if (!board) return workspace;
            const duplicate = {
              ...board,
              id: uid(),
              name: `${board.name} (copy)`,
              layout: undefined,
              links: board.links.map((l) => ({ ...l, id: uid() })),
              todos: board.todos?.map((t) => ({ ...t, id: uid() })),
              createdAt: now(),
              updatedAt: now(),
            };
            return {
              ...workspace,
              boards: [...workspace.boards, duplicate],
              updatedAt: now(),
            };
          }),
        })),

      updateNoteContent: (workspaceId, boardId, content) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: workspace.boards.map((board) =>
                    board.id === boardId
                      ? { ...board, noteContent: content, updatedAt: now() }
                      : board
                  ),
                  updatedAt: now(),
                }
              : workspace
          ),
        })),

      updateTodos: (workspaceId, boardId, todos) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: workspace.boards.map((board) =>
                    board.id === boardId
                      ? { ...board, todos, updatedAt: now() }
                      : board
                  ),
                  updatedAt: now(),
                }
              : workspace
          ),
        })),

      renameBoard: (workspaceId, boardId, name) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: workspace.boards.map((board) =>
                    board.id === boardId
                      ? { ...board, name, updatedAt: now() }
                      : board
                  ),
                  updatedAt: now(),
                }
              : workspace
          ),
        })),

      setBoardColor: (workspaceId, boardId, color) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: workspace.boards.map((board) =>
                    board.id === boardId
                      ? { ...board, color, updatedAt: now() }
                      : board
                  ),
                  updatedAt: now(),
                }
              : workspace
          ),
        })),

      removeBoard: (workspaceId, boardId) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: workspace.boards.filter((board) => board.id !== boardId),
                  updatedAt: now(),
                }
              : workspace
          ),
        })),

      transferBoard: (fromWorkspaceId, toWorkspaceId, boardId) =>
        set((state) => {
          const fromWs = state.workspaces.find((ws) => ws.id === fromWorkspaceId);
          const toWs = state.workspaces.find((ws) => ws.id === toWorkspaceId);
          if (!fromWs || !toWs) return state;

          const board = fromWs.boards.find((b) => b.id === boardId);
          if (!board) return state;

          // Check target workspace capacity
          if (toWs.boards.length >= MAX_BOARDS_PER_WORKSPACE) return state;

          return {
            workspaces: state.workspaces.map((workspace) => {
              if (workspace.id === fromWorkspaceId) {
                return {
                  ...workspace,
                  boards: workspace.boards.filter((b) => b.id !== boardId),
                  updatedAt: now(),
                };
              }
              if (workspace.id === toWorkspaceId) {
                return {
                  ...workspace,
                  boards: [...workspace.boards, { ...board, layout: undefined }],
                  updatedAt: now(),
                };
              }
              return workspace;
            }),
          };
        }),

      reorderBoards: (workspaceId, fromIndex, toIndex) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) => {
            if (workspace.id !== workspaceId) return workspace;
            const boards = [...workspace.boards];
            const [moved] = boards.splice(fromIndex, 1);
            boards.splice(toIndex, 0, moved);
            return { ...workspace, boards, updatedAt: now() };
          }),
        })),

      updateBoardLayouts: (workspaceId, layouts) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) => {
            if (workspace.id !== workspaceId) return workspace;
            const boards = workspace.boards.map((board) => {
              const layout = layouts.find((l) => l.id === board.id);
              if (!layout) return board;
              return { ...board, layout: { x: layout.x, y: layout.y, w: layout.w, h: layout.h } };
            });
            return { ...workspace, boards, updatedAt: now() };
          }),
        })),

      importBoard: (workspaceId, board) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) => {
            if (workspace.id !== workspaceId) return workspace;
            if (workspace.boards.length >= MAX_BOARDS_PER_WORKSPACE) return workspace;
            return {
              ...workspace,
              boards: [...workspace.boards, board],
              updatedAt: now(),
            };
          }),
        })),

      addLink: (workspaceId, boardId, title, url) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: workspace.boards.map((board) => {
                    if (board.id !== boardId) return board;
                    if (board.links.length >= MAX_LINKS_PER_BOARD) return board;
                    return {
                      ...board,
                      links: [
                        ...board.links,
                        {
                          id: uid(),
                          title,
                          url,
                          createdAt: now(),
                          updatedAt: now(),
                        } as LinkItem,
                      ],
                      updatedAt: now(),
                    };
                  }),
                  updatedAt: now(),
                }
              : workspace
          ),
        })),

      renameLink: (workspaceId, boardId, linkId, title) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: workspace.boards.map((board) =>
                    board.id === boardId
                      ? {
                          ...board,
                          links: board.links.map((link) =>
                            link.id === linkId
                              ? { ...link, title, updatedAt: now() }
                              : link
                          ),
                          updatedAt: now(),
                        }
                      : board
                  ),
                  updatedAt: now(),
                }
              : workspace
          ),
        })),

      transferLink: (fromWorkspaceId, fromBoardId, linkId, toWorkspaceId, toBoardId) =>
        set((state) => {
          // Find the link
          const fromWs = state.workspaces.find((ws) => ws.id === fromWorkspaceId);
          const fromBoard = fromWs?.boards.find((b) => b.id === fromBoardId);
          const link = fromBoard?.links.find((l) => l.id === linkId);
          if (!link) return state;

          // Check target board capacity
          const toWs = state.workspaces.find((ws) => ws.id === toWorkspaceId);
          const toBoard = toWs?.boards.find((b) => b.id === toBoardId);
          if (!toBoard || toBoard.links.length >= MAX_LINKS_PER_BOARD) return state;

          return {
            workspaces: state.workspaces.map((workspace) => {
              if (workspace.id === fromWorkspaceId) {
                return {
                  ...workspace,
                  boards: workspace.boards.map((board) =>
                    board.id === fromBoardId
                      ? { ...board, links: board.links.filter((l) => l.id !== linkId), updatedAt: now() }
                      : board
                  ),
                  updatedAt: now(),
                };
              }
              if (workspace.id === toWorkspaceId) {
                return {
                  ...workspace,
                  boards: workspace.boards.map((board) =>
                    board.id === toBoardId
                      ? { ...board, links: [...board.links, link], updatedAt: now() }
                      : board
                  ),
                  updatedAt: now(),
                };
              }
              return workspace;
            }),
          };
        }),

      reorderLinks: (workspaceId, boardId, fromIndex, toIndex) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: workspace.boards.map((board) => {
                    if (board.id !== boardId) return board;
                    const links = [...board.links];
                    const [moved] = links.splice(fromIndex, 1);
                    links.splice(toIndex, 0, moved);
                    return { ...board, links, updatedAt: Date.now() };
                  }),
                  updatedAt: Date.now(),
                }
              : workspace
          ),
        })),

      removeLink: (workspaceId, boardId, linkId) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: workspace.boards.map((board) =>
                    board.id === boardId
                      ? {
                          ...board,
                          links: board.links.filter((link) => link.id !== linkId),
                          updatedAt: now(),
                        }
                      : board
                  ),
                  updatedAt: now(),
                }
              : workspace
          ),
        })),

      moveLink: (workspaceId, activeLinkId, overLinkId, fromBoardId, toBoardId) =>
        set((state) => {
          const workspaces = state.workspaces.map((workspace) => {
            if (workspace.id !== workspaceId) return workspace;

            const fromBoard = workspace.boards.find((board) => board.id === fromBoardId);
            const toBoard = workspace.boards.find((board) => board.id === toBoardId);
            if (!fromBoard || !toBoard) return workspace;

            const activeLink = fromBoard.links.find((link) => link.id === activeLinkId);
            if (!activeLink) return workspace;

            const cleanedBoards = workspace.boards.map((board) =>
              board.id === fromBoardId
                ? {
                    ...board,
                    links: board.links.filter((link) => link.id !== activeLinkId),
                    updatedAt: now(),
                  }
                : board
            );

            const rebuiltBoards = cleanedBoards.map((board) => {
              if (board.id !== toBoardId) return board;

              const overIndex = board.links.findIndex((link) => link.id === overLinkId);
              const nextLinks = [...board.links];

              if (overIndex === -1 || overLinkId.startsWith('board-drop-')) {
                nextLinks.push(activeLink);
              } else {
                nextLinks.splice(overIndex, 0, activeLink);
              }

              return {
                ...board,
                links: nextLinks,
                updatedAt: now(),
              };
            });

            return {
              ...workspace,
              boards: rebuiltBoards,
              updatedAt: now(),
            };
          });

          return { workspaces };
        }),

      setWorkspaceWallpaper: (workspaceId, wallpaper) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? { ...workspace, wallpaper, liveWallpaper: null, videoWallpaper: null, updatedAt: now() }
              : workspace
          ),
        })),

      setVideoWallpaper: (workspaceId, videoKey) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? { ...workspace, videoWallpaper: videoKey, wallpaper: null, liveWallpaper: null, updatedAt: now() }
              : workspace
          ),
        })),

      setWorkspaceLiveWallpaper: (workspaceId, liveWallpaper) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? { ...workspace, liveWallpaper, wallpaper: null, videoWallpaper: null, updatedAt: now() }
              : workspace
          ),
        })),

      getActiveWorkspace: () =>
        get().workspaces.find(
          (workspace) => workspace.id === get().activeWorkspaceId
        ),
    }),
    {
      name: 'tabdeck-workspaces',
      storage: createJSONStorage(() => chromeStorage),
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    }
  )
);
