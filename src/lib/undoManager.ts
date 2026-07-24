/**
 * Simple undo/redo manager for workspace state.
 * Stores snapshots of workspace data as JSON strings.
 */

const MAX_HISTORY = 30;

let undoStack: string[] = [];
let redoStack: string[] = [];

export function pushState(state: unknown) {
  const snapshot = JSON.stringify(state);

  // Don't push duplicate
  if (undoStack.length > 0 && undoStack[undoStack.length - 1] === snapshot) {
    return;
  }

  undoStack.push(snapshot);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }

  // Clear redo stack on new action
  redoStack = [];
}

export function undo(): unknown | null {
  if (undoStack.length <= 1) return null;

  const current = undoStack.pop()!;
  redoStack.push(current);

  const previous = undoStack[undoStack.length - 1];
  return previous ? JSON.parse(previous) : null;
}

export function redo(): unknown | null {
  if (redoStack.length === 0) return null;

  const next = redoStack.pop()!;
  undoStack.push(next);

  return JSON.parse(next);
}

export function canUndo(): boolean {
  return undoStack.length > 1;
}

export function canRedo(): boolean {
  return redoStack.length > 0;
}

export function clearHistory() {
  undoStack = [];
  redoStack = [];
}
