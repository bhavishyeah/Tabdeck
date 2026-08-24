import { useEffect, useRef, useState } from 'react';

export function ClockWidget() {
  const [now, setNow] = useState(new Date());
  const [compact, setCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update every second for smooth minute transitions
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Adaptive layout: detect if container is small
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCompact(entry.contentRect.height < 100);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Format time (12-hour without seconds for clean display)
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const isPM = hours >= 12;
  const h12 = hours % 12 || 12;
  const timeStr = `${h12}:${minutes.toString().padStart(2, '0')}`;
  const period = isPM ? 'PM' : 'AM';

  // Format date
  const weekday = now.toLocaleDateString([], { weekday: 'long' });
  const month = now.toLocaleDateString([], { month: 'short' });
  const day = now.getDate();

  if (compact) {
    return (
      <div ref={containerRef} className="f-clock">
        <span className="f-clock-time">{timeStr}</span>
        <span className="f-clock-period">{period}</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="f-clock">
      <div className="f-clock-main">
        <span className="f-clock-time">{timeStr}</span>
        <span className="f-clock-period">{period}</span>
      </div>
      <div className="f-clock-date">
        {weekday} · {month} {day}
      </div>
    </div>
  );
}
