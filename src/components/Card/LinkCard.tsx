import { ExternalLink, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LinkCardType } from '../../lib/types';
import { getFaviconUrl } from '../../lib/favicon';

interface Props {
  link: LinkCardType;
  onDelete: () => void;
}

export function LinkCard({ link, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 2 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`td-link-row ${isDragging ? 'is-dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="td-link-left">
        <img
          className="td-link-favicon"
          src={getFaviconUrl(link.url, 32)}
          alt=""
          draggable={false}
        />
        <span className="td-link-name">{link.title}</span>
      </div>

      <div className="td-link-actions">
        <button
          className="td-link-icon"
          type="button"
          title="Delete"
          aria-label="Delete"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X size={17} strokeWidth={2.3} />
        </button>

        <a
          className="td-link-icon"
          href={link.url}
          target="_blank"
          rel="noreferrer"
          title="Open"
          aria-label="Open"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={17} strokeWidth={2.3} />
        </a>
      </div>
    </div>
  );
}