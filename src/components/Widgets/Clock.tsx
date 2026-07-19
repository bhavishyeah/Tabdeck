import { useEffect, useState } from 'react';

export function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="td-clock-chip">
      {time.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </div>
  );
}