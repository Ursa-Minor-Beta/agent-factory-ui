import type { Agent } from '../../types';

// Re-export shared types from main types
export type { AgentForm, AgentEditModalProps } from '../../types';

export interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onClone: (agent: Agent) => void;
  onWorkspace: (agent: Agent) => void;
  onExport: (agent: Agent) => void;
  compact?: boolean; // graph mode: no description, tighter spacing
  currentWorkspaceId?: string; // workspace being viewed - its agents don't repeat the workspace badge
}

export interface AgentFiltersProps {
  descriptionFilter: string;
  onDescriptionChange: (value: string) => void;
  createdAfter: string;
  onCreatedAfterChange: (value: string) => void;
  createdBefore: string;
  onCreatedBeforeChange: (value: string) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
}
