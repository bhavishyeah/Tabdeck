/**
 * alerts — cross-tab-aware completion alerts for the Timer widget.
 * Plays a short chime (Web Audio, no asset), shows a Chrome notification, and
 * flashes the tab title so the user notices even on another tab.
 */

/** Play a short two-note chime using the Web Audio API. */
export function playChime(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = [880, 1174.66]; // A5 → D6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.18;
      const end = start + 0.32;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(end);
    });
    // Release the context shortly after the sound finishes.
    setTimeout(() => { ctx.close().catch(() => {}); }, 900);
  } catch {
    // Audio blocked (e.g. no user gesture) — non-fatal.
  }
}

/** Show a Chrome notification if the API + permission are available. */
export function notify(title: string, message: string): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.notifications?.create) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime?.getURL ? chrome.runtime.getURL('icons/icon128.png') : 'icons/icon128.png',
        title,
        message,
        priority: 2,
      }, () => { void chrome.runtime?.lastError; });
    }
  } catch {
    // non-fatal
  }
}

let flashTimer: ReturnType<typeof setInterval> | null = null;
let originalTitle = '';

/**
 * Flash the tab title until the user returns to the tab. Alternates between the
 * given message and the original title so a backgrounded tab visibly changes.
 */
export function flashTitle(message: string): void {
  // Capture the true page title only when we're NOT already flashing — otherwise
  // a second timer firing mid-flash would save the "⏰ …" string as the original.
  if (flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
  } else {
    originalTitle = document.title;
  }
  document.title = originalTitle;
  let on = false;
  flashTimer = setInterval(() => {
    document.title = on ? originalTitle : `⏰ ${message}`;
    on = !on;
  }, 1000);

  const stop = () => {
    if (flashTimer) { clearInterval(flashTimer); flashTimer = null; }
    document.title = originalTitle;
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', stop);
  };
  const onVisible = () => { if (!document.hidden) stop(); };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', stop);
  // Stop flashing after ~8s so it doesn't blink indefinitely.
  setTimeout(stop, 8000);
}

/** Fire all completion alerts at once. */
export function fireTimerAlert(label: string): void {
  playChime();
  notify('Frontly Timer', label);
  flashTitle(label);
}
