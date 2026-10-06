import type { Node, Edge } from '@xyflow/react';
import type { Agent } from '../../types/agent';

export interface AgentFlowEditorProps {
  agentId?: string;
}

export interface UseAgentEditorReturn {
  // State
  agent: Agent | null;
  nodes: Node[];
  edges: Edge[];
  loading: boolean;
  saving: boolean;

  // Actions
  onNodesChange: (changes: unknown) => void;
  onEdgesChange: (changes: unknown) => void;
  onConnect: (connection: unknown) => void;
  saveAgent: () => Promise<void>;
  addNode: (type: string, position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
}
