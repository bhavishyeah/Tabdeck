import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BoardItem, LinkItem, WorkspaceItem } from '../lib/workspaceTypes';

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
  createdAt: now(),
  updatedAt: now(),
});

interface WorkspaceState {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string;

  setActiveWorkspace: (workspaceId: string) => void;
  addWorkspace: (name?: string) => void;
  renameWorkspace: (workspaceId: string, name: string) => void;
  removeWorkspace: (workspaceId: string) => void;

  addBoard: (workspaceId: string, name?: string) => void;
  renameBoard: (workspaceId: string, boardId: string, name: string) => void;
  removeBoard: (workspaceId: string, boardId: string) => void;
  importBoard: (workspaceId: string, board: BoardItem) => void;

  addLink: (workspaceId: string, boardId: string, title: string, url: string) => void;
  removeLink: (workspaceId: string, boardId: string, linkId: string) => void;
  moveLink: (
    workspaceId: string,
    activeLinkId: string,
    overLinkId: string,
    fromBoardId: string,
    toBoardId: string
  ) => void;

  setWorkspaceWallpaper: (workspaceId: string, wallpaper: string | null) => void;
  getActiveWorkspace: () => WorkspaceItem | undefined;
}

const initialWorkspace = createWorkspace('Home');

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [initialWorkspace],
      activeWorkspaceId: initialWorkspace.id,

      setActiveWorkspace: (workspaceId) =>
        set({ activeWorkspaceId: workspaceId }),

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
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: [...workspace.boards, createBoard(name)],
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

      importBoard: (workspaceId, board) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: [...workspace.boards, board],
                  updatedAt: now(),
                }
              : workspace
          ),
        })),

      addLink: (workspaceId, boardId, title, url) =>
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === workspaceId
              ? {
                  ...workspace,
                  boards: workspace.boards.map((board) =>
                    board.id === boardId
                      ? {
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
                        }
                      : board
                  ),
                  updatedAt: now(),
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
              ? { ...workspace, wallpaper, updatedAt: now() }
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
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    }
  )
);