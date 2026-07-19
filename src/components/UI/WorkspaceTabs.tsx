import { Plus } from 'lucide-react';
import type { WorkspaceItem } from '../../lib/workspaceTypes';

interface Props {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string;
  onSelect: (workspaceId: string) => void;
  onAdd: () => void;
}

export function WorkspaceTabs({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onAdd,
}: Props) {
  return (
    <div className="td-workspace-tabs" role="tablist" aria-label="Workspaces">
      {workspaces.map((workspace) => {
        const isActive = workspace.id === activeWorkspaceId;

        return (
          <button
            key={workspace.id}
            className={`td-workspace-tab ${isActive ? 'is-active' : ''}`}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onSelect(workspace.id)}
            title={workspace.name}
          >
            {workspace.name}
          </button>
        );
      })}

      <button
        className="td-workspace-add"
        type="button"
        onClick={onAdd}
        title="Create workspace"
        aria-label="Create workspace"
      >
        <Plus size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}