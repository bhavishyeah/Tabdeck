import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { arrayMove } from '@dnd-kit/sortable';
import type { BoardType, LinkCardType } from '../lib/types';
import { chromeStorage } from './chromeStorage';

interface BoardStore {
  boards: BoardType[];
  addBoard: () => void;
  removeBoard: (id: string) => void;
  renameBoard: (id: string, name: string) => void;
  addLink: (boardId: string, title: string, url: string) => void;
  addLinkObject: (boardId: string, link: LinkCardType) => void;
  removeLink: (boardId: string, linkId: string) => void;
  moveLink: (
    activeId: string,
    overId: string,
    fromBoardId: string,
    toBoardId: string
  ) => void;
  importBoard: (board: BoardType) => void;
}

const defaultBoards: BoardType[] = [
  {
    id: '1',
    name: 'Work',
    color: '#6366f1',
    links: [
      { id: '1-1', title: 'GitHub', url: 'https://github.com' },
      { id: '1-2', title: 'Railway', url: 'https://railway.app' },
      { id: '1-3', title: 'Supabase', url: 'https://supabase.com' },
    ],
  },
  {
    id: '2',
    name: 'Study',
    color: '#10b981',
    links: [
      { id: '2-1', title: 'MDN Docs', url: 'https://developer.mozilla.org' },
      { id: '2-2', title: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org' },
      { id: '2-3', title: 'College Portal', url: 'https://example.com' },
    ],
  },
];

export const useBoardStore = create<BoardStore>()(
  persist(
    (set) => ({
      boards: defaultBoards,

      addBoard: () =>
        set((state) => ({
          boards: [
            ...state.boards,
            {
              id: crypto.randomUUID(),
              name: 'New Board',
              color: '#8b5cf6',
              links: [],
            },
          ],
        })),

      removeBoard: (id: string) =>
        set((state) => ({
          boards: state.boards.filter((board) => board.id !== id),
        })),

      renameBoard: (id: string, name: string) =>
        set((state) => ({
          boards: state.boards.map((board) =>
            board.id === id ? { ...board, name } : board
          ),
        })),

      addLink: (boardId: string, title: string, url: string) =>
        set((state) => ({
          boards: state.boards.map((board) =>
            board.id === boardId
              ? {
                  ...board,
                  links: [
                    ...board.links,
                    {
                      id: crypto.randomUUID(),
                      title,
                      url,
                    },
                  ],
                }
              : board
          ),
        })),

      addLinkObject: (boardId: string, link: LinkCardType) =>
        set((state) => ({
          boards: state.boards.map((board) =>
            board.id === boardId
              ? {
                  ...board,
                  links: [...board.links, link],
                }
              : board
          ),
        })),

      removeLink: (boardId: string, linkId: string) =>
        set((state) => ({
          boards: state.boards.map((board) =>
            board.id === boardId
              ? {
                  ...board,
                  links: board.links.filter((link) => link.id !== linkId),
                }
              : board
          ),
        })),

      moveLink: (activeId, overId, fromBoardId, toBoardId) =>
        set((state) => {
          const sourceBoard = state.boards.find((b) => b.id === fromBoardId);
          const targetBoard = state.boards.find((b) => b.id === toBoardId);

          if (!sourceBoard || !targetBoard) return state;

          const activeLink = sourceBoard.links.find((l) => l.id === activeId);
          if (!activeLink) return state;

          if (fromBoardId === toBoardId) {
            const oldIndex = sourceBoard.links.findIndex((l) => l.id === activeId);
            const newIndex = sourceBoard.links.findIndex((l) => l.id === overId);

            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
              return state;
            }

            return {
              boards: state.boards.map((board) =>
                board.id === fromBoardId
                  ? {
                      ...board,
                      links: arrayMove(board.links, oldIndex, newIndex),
                    }
                  : board
              ),
            };
          }

          return {
            boards: state.boards.map((board) => {
              if (board.id === fromBoardId) {
                return {
                  ...board,
                  links: board.links.filter((l) => l.id !== activeId),
                };
              }

              if (board.id === toBoardId) {
                const insertIndex = board.links.findIndex((l) => l.id === overId);
                const newLinks = [...board.links];

                if (insertIndex === -1) {
                  newLinks.push(activeLink);
                } else {
                  newLinks.splice(insertIndex, 0, activeLink);
                }

                return {
                  ...board,
                  links: newLinks,
                };
              }

              return board;
            }),
          };
        }),

      importBoard: (board: BoardType) =>
        set((state) => ({
          boards: [...state.boards, board],
        })),
    }),
    {
      name: 'tabdeck-board-store',
      storage: createJSONStorage(() => chromeStorage),
    }
  )
);