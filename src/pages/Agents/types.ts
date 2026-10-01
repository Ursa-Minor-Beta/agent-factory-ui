import type { Agent } from '../../types';
import type { Workspace } from '../../types/workspace';

// Re-export shared types from main types
export type { AgentForm, AgentEditModalProps } from '../../types';

export interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onClone: (agent: Agent) => void;
  onWorkspace: (agent: Agent) => void;
}

export interface AgentFiltersProps {
  descriptionFilter: string;
  onDescriptionChange: (value: string) => void;
  workspaceId: string;
  onWorkspaceChange: (value: string) => void;
  workspaces: Workspace[];
  workspacesLoading: boolean;
  createdAfter: string;
  onCreatedAfterChange: (value: string) => void;
  createdBefore: string;
  onCreatedBeforeChange: (value: string) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
}

