import { useEffect, useRef, useState } from 'react';

export interface AutocompleteOption {
  /** Value stored/committed when chosen. */
  value: string;
  /** Text shown in the dropdown row. */
  label: string;
  /** Optional secondary line. */
  sublabel?: string;
  /** Arbitrary caller payload (e.g. lat/lon), passed back on select. */
  [extra: string]: unknown;
}

interface Props {
  initialText: string;
  placeholder?: string;
  /** Return matching options for the current query (sync or async). */
  getOptions: (query: string) => AutocompleteOption[] | Promise<AutocompleteOption[]>;
  /** Called when the user picks an option. */
  onSelect: (opt: AutocompleteOption) => void;
  /** Called on Enter with no selection (free text) — optional. */
  onSubmitText?: (text: string) => void;
}

/**
 * A text input with a filtered dropdown. Works for a static list (timezones)
 * or an async source (city geocoding). Debounced 200ms.
 */
export function Autocomplete({ initialText, placeholder, getOptions, onSelect, onSubmitText }: Props) {
  const [text, setText] = useState(initialText);
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const runQuery = (q: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const result = await getOptions(q);
      setOptions(result.slice(0, 8));
      setActive(0);
      setOpen(result.length > 0);
    }, 200);
  };

  const choose = (opt: AutocompleteOption) => {
    setText(opt.label);
    setOpen(false);
    onSelect(opt);
  };

  return (
    <div className="f-ac" ref={wrapRef}>
      <input
        className="f-wc-input"
        placeholder={placeholder}
        value={text}
        onChange={(e) => { setText(e.target.value); runQuery(e.target.value); }}
        onFocus={() => { if (text.trim()) runQuery(text); }}
        onKeyDown={(e) => {
          if (!open) {
            if (e.key === 'Enter') { onSubmitText?.(text.trim()); }
            return;
          }
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); if (options[active]) choose(options[active]); }
          else if (e.key === 'Escape') { setOpen(false); }
        }}
      />
      {open && (
        <ul className="f-ac-list">
          {options.map((opt, i) => (
            <li key={opt.value}>
              <button
                type="button"
                className={`f-ac-item ${i === active ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(opt)}
              >
                <span className="f-ac-label">{opt.label}</span>
                {opt.sublabel && <span className="f-ac-sub">{opt.sublabel}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
