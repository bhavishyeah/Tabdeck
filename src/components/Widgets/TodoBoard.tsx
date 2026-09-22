import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';
import type { TodoItem } from '../../lib/workspaceTypes';
import { DatePicker } from '../UI/DatePicker';

interface Props {
  todos: TodoItem[];
  onChange: (todos: TodoItem[]) => void;
}

/** Local YYYY-MM-DD for "today", used for due-date comparisons. */
function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Classify a due date relative to today for badge styling + label. */
function dueMeta(dueDate?: string): { cls: string; label: string } | null {
  if (!dueDate) return null;
  const today = todayISO();
  if (dueDate < today) return { cls: 'is-overdue', label: shortDate(dueDate) };
  if (dueDate === today) return { cls: 'is-today', label: 'Today' };
  return { cls: 'is-upcoming', label: shortDate(dueDate) };
}

/** Render YYYY-MM-DD as DD/MM. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function TodoBoardContent({ todos, onChange }: Props) {
  const [newText, setNewText] = useState('');
  const [dateOpenId, setDateOpenId] = useState<string | null>(null);
  const [datePos, setDatePos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const dateWrapRef = useRef<HTMLDivElement | null>(null);
  const datePopRef = useRef<HTMLDivElement | null>(null);

  // Open the date popover, anchored to the calendar button and clamped to the
  // viewport (portaled to body so the board's overflow:hidden can't clip it).
  const openDate = (id: string, btn: HTMLElement) => {
    if (dateOpenId === id) { setDateOpenId(null); return; }
    const r = btn.getBoundingClientRect();
    const W = 210, H = 250, pad = 8;
    let left = r.right - W;
    let top = r.bottom + 4;
    if (left < pad) left = pad;
    if (left + W > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - W - pad);
    if (top + H > window.innerHeight - pad) top = Math.max(pad, r.top - H - 4);
    setDatePos({ top, left });
    setDateOpenId(id);
  };

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

  const setDue = (id: string, dueDate: string) => {
    onChange(todos.map((t) => (t.id === id ? { ...t, dueDate: dueDate || undefined } : t)));
    setDateOpenId(null);
  };

  const clearCompleted = () => {
    onChange(todos.filter((t) => !t.done));
  };

  const rescheduleOverdue = () => {
    const today = todayISO();
    onChange(
      todos.map((t) =>
        !t.done && t.dueDate && t.dueDate < today ? { ...t, dueDate: today } : t
      )
    );
  };

  // Close the date popover on outside click (checks both the button wrap and
  // the portaled popover).
  useEffect(() => {
    if (!dateOpenId) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (dateWrapRef.current?.contains(t)) return;
      if (datePopRef.current?.contains(t)) return;
      setDateOpenId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [dateOpenId]);

  const completedCount = todos.filter((t) => t.done).length;
  const overdueCount = todos.filter((t) => !t.done && t.dueDate && t.dueDate < todayISO()).length;

  return (
    <div className="td-todo-content">
      <div className="td-todo-list">
        {todos.map((todo) => {
          const meta = dueMeta(todo.dueDate);
          return (
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

              {meta && (
                <span className={`td-todo-due ${meta.cls}`} title={todo.dueDate}>{meta.label}</span>
              )}

              <div className="td-todo-due-wrap" ref={dateOpenId === todo.id ? dateWrapRef : undefined}>
                <button
                  type="button"
                  className="td-todo-due-btn"
                  onClick={(e) => openDate(todo.id, e.currentTarget)}
                  aria-label="Set due date"
                  title="Set due date"
                >
                  <Calendar size={11} strokeWidth={2} />
                </button>
              </div>

              <button
                className="td-todo-remove"
                type="button"
                onClick={() => removeTodo(todo.id)}
                aria-label="Remove task"
              >
                ×
              </button>
            </div>
          );
        })}
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

      <div className="td-todo-actions">
        {overdueCount > 0 && (
          <button type="button" className="f-todo-clear" onClick={rescheduleOverdue}>
            Reschedule overdue ({overdueCount})
          </button>
        )}
        {completedCount > 0 && (
          <button type="button" className="f-todo-clear" onClick={clearCompleted}>
            Clear completed ({completedCount})
          </button>
        )}
      </div>

      {dateOpenId && createPortal(
        <div
          ref={datePopRef}
          className="td-todo-datepop"
          style={{ position: 'fixed', top: datePos.top, left: datePos.left }}
        >
          <DatePicker
            value={todos.find((t) => t.id === dateOpenId)?.dueDate || ''}
            onChange={(iso) => setDue(dateOpenId, iso)}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
