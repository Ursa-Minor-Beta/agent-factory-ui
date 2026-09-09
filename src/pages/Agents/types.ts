import type { Agent } from '../../types';

export interface AgentForm {
  name: string;
  description: string;
}

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

export interface AgentEditModalProps {
  opened: boolean;
  onClose: () => void;
  agent: Agent | null;
  onSave: () => void;
  isMobile: boolean;
}

export interface AgentJsonModalProps {
  agent: Agent | null;
  onClose: () => void;
  isMobile: boolean;
}
