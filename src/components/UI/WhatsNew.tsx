import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { APP_VERSION, setSeenVersion, unseenWhatsNew, type WhatsNewEntry } from '../../lib/version';

/**
 * A small dismissible panel shown once after the extension updates, summarising
 * what changed. Renders nothing when the user is already up to date.
 */
export function WhatsNew() {
  const [entries, setEntries] = useState<WhatsNewEntry[]>([]);

  useEffect(() => {
    setEntries(unseenWhatsNew());
  }, []);

  if (entries.length === 0) return null;

  const dismiss = () => {
    setSeenVersion(APP_VERSION);
    setEntries([]);
  };

  return (
    <div className="f-whatsnew-overlay" onClick={dismiss}>
      <div className="f-whatsnew" onClick={(e) => e.stopPropagation()}>
        <div className="f-whatsnew-head">
          <span className="f-whatsnew-badge"><Sparkles size={13} strokeWidth={2} /></span>
          <span className="f-whatsnew-title">{entries[0].title}</span>
          <button className="f-whatsnew-close" type="button" onClick={dismiss} aria-label="Dismiss">
            <X size={15} strokeWidth={2} />
          </button>
        </div>
        <div className="f-whatsnew-body">
          {entries.map((entry) => (
            <ul className="f-whatsnew-list" key={entry.version}>
              {entry.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ))}
        </div>
        <button className="f-whatsnew-cta" type="button" onClick={dismiss}>Got it</button>
      </div>
    </div>
  );
}
