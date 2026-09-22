import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  /** Current value as YYYY-MM-DD, or '' when unset. */
  value: string;
  /** Called with a YYYY-MM-DD string (or '' to clear) on selection. */
  onChange: (iso: string) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Compact date-only calendar. Styling inherited via .f-dtp* classes. */
export function DatePicker({ value, onChange }: Props) {
  const selected = value
    ? (() => { const [y, m, d] = value.split('-').map(Number); return { y, m: m - 1, d }; })()
    : null;
  const now = new Date();
  const [viewYear, setViewYear] = useState(selected?.y ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.m ?? now.getMonth());

  const days = useMemo(() => {
    const startDow = new Date(viewYear, viewMonth, 1).getDay();
    const count = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= count; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div className="f-dtp f-dtp--dateonly">
      <div className="f-dtp-head">
        <button type="button" className="f-dtp-nav" onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft size={13} strokeWidth={2} />
        </button>
        <span className="f-dtp-month">{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" className="f-dtp-nav" onClick={nextMonth} aria-label="Next month">
          <ChevronRight size={13} strokeWidth={2} />
        </button>
      </div>

      <div className="f-dtp-grid f-dtp-dow">
        {WEEKDAYS.map((d, i) => <span key={i} className="f-dtp-dow-cell">{d}</span>)}
      </div>

      <div className="f-dtp-grid">
        {days.map((d, i) => {
          if (d === null) return <span key={i} className="f-dtp-cell f-dtp-cell--empty" />;
          const isSel = selected?.y === viewYear && selected?.m === viewMonth && selected?.d === d;
          const isToday = now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === d;
          return (
            <button
              key={i}
              type="button"
              className={`f-dtp-cell ${isSel ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => onChange(toISO(viewYear, viewMonth, d))}
            >
              {d}
            </button>
          );
        })}
      </div>

      {value && (
        <button type="button" className="f-dtp-clear" onClick={() => onChange('')}>Clear date</button>
      )}
    </div>
  );
}
