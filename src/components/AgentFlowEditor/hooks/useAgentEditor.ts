import { useCallback, useEffect, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Position,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import { agentsApi } from '../../../api';
import type { Agent } from '../../../types/agent';
import { toFlowNode, toAgentNode, extractEdges, generateNodeId, autoLayoutNodes } from '../utils/converters';

interface UseAgentEditorOptions {
  agentId?: string;
}

export function useAgentEditor({ agentId }: UseAgentEditorOptions) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Fetch agent on mount
  useEffect(() => {
    if (!agentId || agentId === 'new') return;

    async function fetchAgent() {
      setLoading(true);
      try {
        const data = await agentsApi.getById(agentId!);
        setAgent(data);

        // Convert agent nodes to flow nodes
        const flowNodes = data.nodes.map((n, i) => toFlowNode(n, i));

        // Extract edges from node data
        const flowEdges = extractEdges(flowNodes);

        // Apply auto-layout for proper positioning
        const layoutedNodes = autoLayoutNodes(flowNodes, flowEdges);
        setNodes(layoutedNodes);
        setEdges(flowEdges);
      } catch (err) {
        console.error('Failed to fetch agent:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAgent();
  }, [agentId, setNodes, setEdges]);

  // Handle connection
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  // Save agent
  const saveAgent = useCallback(async () => {
    if (!agent) return;

    setSaving(true);
    try {
      const agentNodes = nodes.map(toAgentNode);
      await agentsApi.update(agent.id, { nodes: agentNodes });
    } catch (err) {
      console.error('Failed to save agent:', err);
    } finally {
      setSaving(false);
    }
  }, [agent, nodes]);

  // Add new node
  const addNode = useCallback(
    (type: string, position?: { x: number; y: number }, data?: Record<string, unknown>) => {
      const id = generateNodeId(type, nodes);
      // Default position at center if not provided
      const pos = position || { x: 200, y: 200 };
      const newNode: Node = {
        id,
        type,
        position: pos,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { label: type.toUpperCase(), ...data },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes, setNodes]
  );

  // Delete node
  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  // Run agent
  const runAgent = useCallback(() => {
    if (!agent) return;
    setRunning(true);
    // TODO: Implement agent execution via API
    console.log('Running agent:', agent.id);
  }, [agent]);

  // Stop agent
  const stopAgent = useCallback(() => {
    setRunning(false);
    // TODO: Implement agent stop via API
    console.log('Stopping agent');
  }, []);

  // Handle node click
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  // Update node data
  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      );
      // Update selected node reference
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev
      );
    },
    [setNodes]
  );

  // Clear selection when clicking canvas
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return {
    // State
    agent,
    nodes,
    edges,
    loading,
    saving,
    running,
    selectedNode,

    // Actions
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    saveAgent,
    addNode,
    deleteNode,
    runAgent,
    stopAgent,
    updateNodeData,
  };
}
