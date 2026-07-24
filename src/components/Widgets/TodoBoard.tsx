import { useState } from 'react';
import type { TodoItem } from '../../lib/workspaceTypes';

interface Props {
  todos: TodoItem[];
  onChange: (todos: TodoItem[]) => void;
}

export function TodoBoardContent({ todos, onChange }: Props) {
  const [newText, setNewText] = useState('');

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
      <div className="td-todo-list">
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
          placeholder="Add task..."
        />
      </div>
    </div>
  );
}
