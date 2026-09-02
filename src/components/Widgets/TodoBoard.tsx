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
          <div key={todo.id} className={`td-todo-item ${todo.done ? 'is-done' : ''}`}>
            <button
              type="button"
              className={`f-todo-radio ${todo.done ? 'is-checked' : ''}`}
              onClick={() => toggleTodo(todo.id)}
              aria-label={todo.done ? 'Mark incomplete' : 'Mark complete'}
            >
              {todo.done && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.2 5.8L6.5 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className="td-todo-text">{todo.text}</span>
            <button
              className="td-todo-remove"
              type="button"
              onClick={() => removeTodo(todo.id)}
              aria-label="Remove task"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Inline input — acts as both placeholder and add field */}
      <div className="td-todo-add">
        <input
          className="td-todo-input"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTodo(); }}
          placeholder={todos.length === 0 ? 'Type a task...' : '+ Add task'}
        />
      </div>
    </div>
  );
}
