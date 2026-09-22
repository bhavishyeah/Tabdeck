import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  /** Current value as an ISO string, or '' when unset. */
  value: string;
  /** Called with a new ISO string whenever the selection changes. */
  onChange: (iso: string) => void;
  /** Optional: called when the user presses Enter to confirm. */
  onSubmit?: () => void;
}

/**
 * Android-style dial clock. The hand is draggable (free angle → any minute),
 * the hour/minute readout are editable text inputs (type any value), and
 * tapping a number picks it. Switches hour↔minute modes.
 */
function DialClock({
  hour12, minute, isPM,
  onHour, onMinute, onAmPm, onSubmit,
}: {
  hour12: number; minute: number; isPM: boolean;
  onHour: (h: number) => void; onMinute: (m: number) => void; onAmPm: (pm: boolean) => void;
  onSubmit?: () => void;
}) {
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const faceRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const R = 60;          // face radius
  const NR = 46;         // number ring radius
  const cx = R, cy = R;

  const pointFor = (index: number, total: number, radius: number) => {
    const ang = (index / total) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
  };

  // Current hand angle (radians, 0 = 3 o'clock as atan2 returns).
  const handAngleDeg = mode === 'hour'
    ? (hour12 % 12) / 12 * 360 - 90
    : minute / 60 * 360 - 90;

  // Convert a pointer position on the face into the nearest hour/minute.
  const applyFromPoint = (clientX: number, clientY: number) => {
    const rect = faceRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = clientX - rect.left - cx;
    const py = clientY - rect.top - cy;
    // Angle from 12 o'clock, clockwise, in [0,360)
    let deg = Math.atan2(py, px) * 180 / Math.PI + 90;
    if (deg < 0) deg += 360;
    if (mode === 'hour') {
      let h = Math.round(deg / 30) % 12;      // 30° per hour
      if (h === 0) h = 12;
      onHour(h);
    } else {
      const m = Math.round(deg / 6) % 60;     // 6° per minute → free minutes
      onMinute(m);
    }
  };

  const startDrag = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    applyFromPoint(e.clientX, e.clientY);
  };
  const moveDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    applyFromPoint(e.clientX, e.clientY);
  };
  const endDrag = () => { dragging.current = false; };

  const numbers = mode === 'hour'
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="f-dial">
      <div className="f-dial-readout">
        <input
          className={`f-dial-seg ${mode === 'hour' ? 'is-active' : ''}`}
          value={String(hour12).padStart(2, '0')}
          inputMode="numeric"
          onFocus={() => setMode('hour')}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
            if (!Number.isNaN(n) && n >= 1 && n <= 12) onHour(n);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit?.(); }}
          aria-label="Hour"
        />
        <span className="f-dial-colon">:</span>
        <input
          className={`f-dial-seg ${mode === 'minute' ? 'is-active' : ''}`}
          value={String(minute).padStart(2, '0')}
          inputMode="numeric"
          onFocus={() => setMode('minute')}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
            if (!Number.isNaN(n) && n >= 0 && n <= 59) onMinute(n);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit?.(); }}
          aria-label="Minute"
        />
        <div className="f-dial-ampm">
          <button type="button" className={`f-dial-ampm-btn ${!isPM ? 'is-active' : ''}`} onClick={() => onAmPm(false)}>AM</button>
          <button type="button" className={`f-dial-ampm-btn ${isPM ? 'is-active' : ''}`} onClick={() => onAmPm(true)}>PM</button>
        </div>
      </div>

      <div
        className="f-dial-face"
        ref={faceRef}
        style={{ width: R * 2, height: R * 2 }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="f-dial-center" style={{ left: cx, top: cy }} />
        <span
          className="f-dial-hand"
          style={{ left: cx, top: cy, width: NR, transform: `rotate(${handAngleDeg}deg)` }}
        />
        {numbers.map((val, i) => {
          const p = pointFor(i, 12, NR);
          const active = mode === 'hour' ? hour12 === val : minute === val;
          return (
            <button
              key={val}
              type="button"
              className={`f-dial-num ${active ? 'is-active' : ''}`}
              style={{ left: p.x, top: p.y }}
              onClick={() => { if (mode === 'hour') { onHour(val); setMode('minute'); } else { onMinute(val); } }}
            >{mode === 'hour' ? val : String(val).padStart(2, '0')}</button>
          );
        })}
      </div>
    </div>
  );
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Custom date + time picker. Calendar and dial sit side by side (horizontal)
 * via the .f-dtp--wide CSS. Colours/glass are inherited from the popover.
 */
export function DateTimePicker({ value, onChange, onSubmit }: Props) {
  const selected = value ? new Date(value) : null;
  const initial = selected ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const base = selected ?? new Date(new Date().setHours(12, 0, 0, 0));
  const hour24 = base.getHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minute = base.getMinutes();
  const isPM = hour24 >= 12;

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const emit = (parts: { day?: number; h12?: number; min?: number; pm?: boolean }) => {
    const h12 = parts.h12 ?? hour12;
    const min = parts.min ?? minute;
    const pm = parts.pm ?? isPM;
    let h24 = h12 % 12;
    if (pm) h24 += 12;

    let year: number, month: number, day: number;
    if (parts.day !== undefined) {
      year = viewYear; month = viewMonth; day = parts.day;
    } else {
      const src = selected ?? new Date();
      year = src.getFullYear(); month = src.getMonth(); day = src.getDate();
    }
    onChange(new Date(year, month, day, h24, min, 0, 0).toISOString());
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const today = new Date();

  return (
    <div className="f-dtp f-dtp--wide">
      <div className="f-dtp-cal">
        <div className="f-dtp-head">
          <button type="button" className="f-dtp-nav" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
          <span className="f-dtp-month">{MONTHS[viewMonth]} {viewYear}</span>
          <button type="button" className="f-dtp-nav" onClick={nextMonth} aria-label="Next month">
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="f-dtp-grid f-dtp-dow">
          {WEEKDAYS.map((d, i) => <span key={i} className="f-dtp-dow-cell">{d}</span>)}
        </div>

        <div className="f-dtp-grid">
          {days.map((d, i) => {
            if (d === null) return <span key={i} className="f-dtp-cell f-dtp-cell--empty" />;
            const cellDate = new Date(viewYear, viewMonth, d);
            const isSel = selected ? sameDay(cellDate, selected) : false;
            const isToday = sameDay(cellDate, today);
            return (
              <button
                key={i}
                type="button"
                className={`f-dtp-cell ${isSel ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                onClick={() => emit({ day: d })}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <DialClock
        hour12={hour12}
        minute={minute}
        isPM={isPM}
        onHour={(h) => emit({ h12: h })}
        onMinute={(m) => emit({ min: m })}
        onAmPm={(pm) => emit({ pm })}
        onSubmit={onSubmit}
      />
    </div>
  );
}
