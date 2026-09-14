import type { Agent } from '../../types';

// Re-export shared types from main types
export type { AgentForm, AgentEditModalProps, AgentJsonModalProps } from '../../types';

export interface AgentCardProps {
  agent: Agent;
  isAdmin: boolean;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onViewJson: (agent: Agent) => void;
}

export interface AgentFiltersProps {
  descriptionFilter: string;
  onDescriptionChange: (value: string) => void;
  createdAfter: string;
  onCreatedAfterChange: (value: string) => void;
  createdBefore: string;
  onCreatedBeforeChange: (value: string) => void;
  isSystemFilter: string | null;
  onIsSystemChange: (value: string | null) => void;
  isAdmin: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;
}

