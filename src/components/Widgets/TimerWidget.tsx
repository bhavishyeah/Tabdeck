import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { TimerConfig } from '../../lib/workspaceTypes';
import { fireTimerAlert } from '../../lib/alerts';

interface Props {
  config?: TimerConfig;
}

/** Break ms into d/h/m/s parts. */
function parts(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function CountdownView({ config }: { config?: TimerConfig }) {
  const target = config?.target ? new Date(config.target).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Reset the latch when the target changes. If the new target is ALREADY in
  // the past at this moment, mark it as fired so we don't replay the alarm on
  // load — the alert should only fire when the countdown crosses zero live.
  useEffect(() => {
    firedRef.current = target ? target - Date.now() <= 0 : false;
  }, [target]);

  // Fire the completion alert exactly once when the countdown crosses zero.
  useEffect(() => {
    if (target && !firedRef.current && target - now <= 0) {
      firedRef.current = true;
      fireTimerAlert(config?.label ? `${config.label} — time's up!` : "Countdown finished!");
    }
  }, [now, target, config?.label]);

  if (!target || Number.isNaN(target)) {
    return <div className="f-timer-empty">Set a target date in widget settings.</div>;
  }

  const remaining = target - now;
  const done = remaining <= 0;
  const p = parts(remaining);

  return (
    <div className="f-timer f-timer--countdown">
      {config?.label && <div className="f-timer-label">{config.label}</div>}
      {done ? (
        <div className="f-timer-done">Time's up 🎉</div>
      ) : (
        <div className="f-timer-digits">
          {p.days > 0 && (
            <div className="f-timer-unit"><span className="f-timer-num">{p.days}</span><span className="f-timer-cap">d</span></div>
          )}
          <div className="f-timer-unit"><span className="f-timer-num">{pad(p.hours)}</span><span className="f-timer-cap">h</span></div>
          <div className="f-timer-unit"><span className="f-timer-num">{pad(p.minutes)}</span><span className="f-timer-cap">m</span></div>
          <div className="f-timer-unit"><span className="f-timer-num">{pad(p.seconds)}</span><span className="f-timer-cap">s</span></div>
        </div>
      )}
    </div>
  );
}

function PomodoroView({ config }: { config?: TimerConfig }) {
  const focusMin = config?.focusMinutes ?? 25;
  const breakMin = config?.breakMinutes ?? 5;

  const [phase, setPhase] = useState<'focus' | 'break'>('focus');
  const [remaining, setRemaining] = useState(focusMin * 60);
  const [running, setRunning] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFire = useRef(0);

  // Fire an alert at most once per second (guards against StrictMode double-invoke).
  const alertOnce = (msg: string) => {
    const t = Date.now();
    if (t - lastFire.current < 900) return;
    lastFire.current = t;
    fireTimerAlert(msg);
  };

  // Reset the clock when the phase changes or the configured lengths change —
  // but NOT when the user pauses/resumes (running is intentionally excluded so
  // pausing keeps the current remaining time).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining((phase === 'focus' ? focusMin : breakMin) * 60);
  }, [focusMin, breakMin, phase]);

  useEffect(() => {
    if (!running) { if (tick.current) clearInterval(tick.current); return; }
    tick.current = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        // Phase complete → alert, switch phase, keep running.
        const nextPhase = phase === 'focus' ? 'break' : 'focus';
        alertOnce(phase === 'focus' ? 'Focus done — take a break!' : 'Break over — back to focus!');
        setPhase(nextPhase);
        return (nextPhase === 'focus' ? focusMin : breakMin) * 60;
      });
    }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [running, phase, focusMin, breakMin]);

  const reset = () => {
    setRunning(false);
    setPhase('focus');
    setRemaining(focusMin * 60);
  };

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <div className={`f-timer f-timer--pomodoro ${phase === 'break' ? 'is-break' : ''}`}>
      <div className="f-timer-phase">{phase === 'focus' ? 'Focus' : 'Break'}</div>
      <div className="f-timer-clock">{pad(mm)}:{pad(ss)}</div>
      <div className="f-timer-controls">
        <button type="button" className="f-timer-btn" onClick={() => setRunning((v) => !v)} aria-label={running ? 'Pause' : 'Start'}>
          {running ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
        </button>
        <button type="button" className="f-timer-btn" onClick={reset} aria-label="Reset">
          <RotateCcw size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

export function TimerWidget({ config }: Props) {
  const mode = config?.mode ?? 'countdown';
  return mode === 'pomodoro' ? <PomodoroView config={config} /> : <CountdownView config={config} />;
}
