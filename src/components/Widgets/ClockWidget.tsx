import { useEffect, useRef, useState } from 'react';
import type { ClockConfig } from '../../lib/workspaceTypes';

interface Props {
  config?: ClockConfig;
}

export function ClockWidget({ config }: Props) {
  const [now, setNow] = useState(new Date());
  const [compact, setCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hour24 = config?.hour24 ?? false;
  const showSeconds = config?.showSeconds ?? false;
  const showDate = config?.showDate ?? true;
  const timezone = config?.timezone?.trim() || undefined;

  // Update every second (needed for the seconds display; harmless otherwise)
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Adaptive layout: detect if container is small
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setCompact(entry.contentRect.height < 50);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Build time/date parts honoring the configured timezone.
  // Intl handles the timezone conversion; we read parts to compose the layout.
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !hour24,
    ...(showSeconds ? { second: '2-digit' } : {}),
    ...(timezone ? { timeZone: timezone } : {}),
  };

  const { timeStr, period } = (() => {
    try {
      const parts = new Intl.DateTimeFormat([], timeOpts).formatToParts(now);
      const per = (parts.find((p) => p.type === 'dayPeriod')?.value ?? '').toUpperCase();
      // Everything except the AM/PM token forms the time text (hour:minute[:second])
      const t = parts
        .filter((p) => p.type !== 'dayPeriod')
        .map((p) => p.value)
        .join('')
        .trim();
      return { timeStr: t, period: per };
    } catch {
      // Invalid timezone → fall back to local formatting
      return { timeStr: new Intl.DateTimeFormat([], { ...timeOpts, timeZone: undefined }).format(now), period: '' };
    }
  })();

  let dateStr = '';
  if (showDate) {
    try {
      const dateOpts: Intl.DateTimeFormatOptions = {
        weekday: 'long', month: 'short', day: 'numeric',
        ...(timezone ? { timeZone: timezone } : {}),
      };
      const parts = new Intl.DateTimeFormat([], dateOpts).formatToParts(now);
      const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
      const month = parts.find((p) => p.type === 'month')?.value ?? '';
      const day = parts.find((p) => p.type === 'day')?.value ?? '';
      dateStr = `${weekday} · ${month} ${day}`;
    } catch {
      dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    }
  }

  if (compact) {
    return (
      <div ref={containerRef} className="f-clock">
        <span className="f-clock-time">{timeStr}</span>
        {period && <span className="f-clock-period">{period}</span>}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="f-clock">
      <div className="f-clock-main">
        <span className="f-clock-time">{timeStr}</span>
        {period && <span className="f-clock-period">{period}</span>}
      </div>
      {showDate && <div className="f-clock-date">{dateStr}</div>}
    </div>
  );
}
