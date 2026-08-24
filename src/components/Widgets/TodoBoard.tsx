import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { TodoItem } from '../../lib/workspaceTypes';

interface Props {
  todos: TodoItem[];
  onChange: (todos: TodoItem[]) => void;
}

export function TodoBoardContent({ todos, onChange }: Props) {
  const [newText, setNewText] = useState('');

  const remaining = todos.filter((t) => !t.done).length;

  const addTodo = () => {
    if (!newText.trim()) return;
    const item: TodoItem = {
      id: crypto.randomUUID(),
      text: newText.trim(),
      done: false,
    };
    onChange([...todos, item]);
    setNewText('');
  };

  const toggleTodo = (id: string) => {
    onChange(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const removeTodo = (id: string) => {
    onChange(todos.filter((t) => t.id !== id));
  };

  return (
    <div className="td-todo-content">
      {/* Task count */}
      {todos.length > 0 && (
        <div className="f-todo-count">
          {remaining === 0 ? 'All done' : `${remaining} remaining`}
        </div>
      )}

      <div className="td-todo-list">
        {todos.length === 0 && (
          <div className="f-todo-empty">
            <CheckCircle2 size={16} strokeWidth={1.5} style={{ opacity: 0.35 }} />
            <span>No tasks yet</span>
          </div>
        )}
        {todos.map((todo) => (
          <label key={todo.id} className={`td-todo-item ${todo.done ? 'is-done' : ''}`}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
              className="td-todo-checkbox"
            />
            <span className="td-todo-text">{todo.text}</span>
            <button
              className="td-todo-remove"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                removeTodo(todo.id);
              }}
              aria-label="Remove task"
            >
              ×
            </button>
          </label>
        ))}
      </div>
      <div className="td-todo-add">
        <input
          className="td-todo-input"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTodo(); }}
          placeholder="+ Add a task..."
        />
      </div>
    </div>
  );
}
