import { useEffect, useRef, useState } from 'react';
import { renderMarkdown } from '../../lib/markdown';

interface Props {
  content: string;
  onChange: (content: string) => void;
}

/**
 * Note widget with a Markdown preview. It renders formatted content by default
 * and switches to a raw textarea for editing when clicked, committing back to
 * preview on blur. Empty notes open straight into edit mode.
 */
export function NoteBoardContent({ content, onChange }: Props) {
  const [editing, setEditing] = useState(!content.trim());
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing && areaRef.current) {
      areaRef.current.focus();
      // Place caret at end.
      const len = areaRef.current.value.length;
      areaRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  if (editing) {
    return (
      <textarea
        ref={areaRef}
        className="td-note-textarea"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { if (content.trim()) setEditing(false); }}
        placeholder="Write your note here... Markdown supported (**bold**, - lists, [ ] tasks, # headings)"
        spellCheck={false}
      />
    );
  }

  return (
    <div
      className="td-note-preview"
      onClick={(e) => {
        // Let link clicks through; otherwise enter edit mode.
        if ((e.target as HTMLElement).closest('a')) return;
        setEditing(true);
      }}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
