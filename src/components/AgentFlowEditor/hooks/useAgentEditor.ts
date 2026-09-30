import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Position,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import { agentsApi, nodesApi, type NodeType } from '../../../api';
import type { Agent } from '../../../types/agent';
import { toFlowNode, toAgentNode, extractEdges, generateNodeId, autoLayoutNodes, extractReferencedNodeIds } from '../utils/converters';

interface UseAgentEditorOptions {
  agentId?: string;
}

export function useAgentEditor({ agentId }: UseAgentEditorOptions) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Derive selectedNode from nodes array
  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId]
  );

  // Fetch node types on mount
  useEffect(() => {
    async function fetchNodeTypes() {
      try {
        const data = await nodesApi.list();
        setNodeTypes(data);
      } catch (err) {
        console.error('Failed to fetch node types:', err);
      }
    }
    fetchNodeTypes();
  }, []);

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

        // Apply saved positions from editorData if available, otherwise use auto-layout
        const nodePositions = data.editorData?.nodePositions;
        const positionedNodes = nodePositions
          ? flowNodes.map((node) => ({
              ...node,
              position: nodePositions[node.id] || node.position,
            }))
          : autoLayoutNodes(flowNodes, flowEdges);

        setNodes(positionedNodes);
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

      // Build nodePositions from current node positions
      const nodePositions: Record<string, { x: number; y: number }> = {};
      for (const node of nodes) {
        nodePositions[node.id] = { x: node.position.x, y: node.position.y };
      }

      // Merge with existing editorData to preserve other fields
      const editorData = {
        ...agent.editorData,
        nodePositions,
      };

      await agentsApi.update(agent.id, { nodes: agentNodes, editorData });
    } catch (err) {
      console.error('Failed to save agent:', err);
    } finally {
      setSaving(false);
    }
  }, [agent, nodes]);

  // Update agent info (name, description)
  const updateAgentInfo = useCallback(
    async (data: { name?: string; description?: string }) => {
      if (!agent) return;

      setSaving(true);
      try {
        const updatedAgent = await agentsApi.update(agent.id, data);
        setAgent(updatedAgent);
      } catch (err) {
        console.error('Failed to update agent info:', err);
      } finally {
        setSaving(false);
      }
    },
    [agent]
  );

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
      setSelectedNodeId(node.id);
    },
    []
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      // Handle ID change
      const targetId = data.id && data.id !== nodeId ? (data.id as string) : nodeId;

      if (data.id && data.id !== nodeId) {
        const newId = data.id as string;
        setNodes((nds) =>
          nds.map((n) => (n.id === nodeId ? { ...n, id: newId, data: { ...n.data, ...data } } : n))
        );
        setSelectedNodeId((prev) => (prev === nodeId ? newId : prev));
      } else {
        setNodes((nds) =>
          nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
        );
      }

      // Auto-manage edges based on template references
      setEdges((eds) => {
        // Get current node's full data (merge existing with new)
        const currentNode = nodes.find((n) => n.id === nodeId);
        const mergedData = { ...currentNode?.data, ...data };

        // Extract referenced node IDs from merged data
        const referencedIds = extractReferencedNodeIds(mergedData as Record<string, unknown>);

        // Get existing node IDs for validation
        const existingNodeIds = new Set(nodes.map((n) => (n.id === nodeId ? targetId : n.id)));

        // Current edges targeting this node
        const currentSourceIds = new Set(
          eds.filter((e) => e.target === nodeId || e.target === targetId).map((e) => e.source)
        );

        // Remove edges for references that no longer exist
        let updatedEdges = eds.filter((e) => {
          if (e.target !== nodeId && e.target !== targetId) return true;
          return referencedIds.has(e.source);
        });

        // Add new edges for new references (only if source node exists)
        referencedIds.forEach((sourceId) => {
          if (!currentSourceIds.has(sourceId) && existingNodeIds.has(sourceId)) {
            const edgeId = `${sourceId}-${targetId}`;
            if (!updatedEdges.some((e) => e.id === edgeId)) {
              updatedEdges.push({
                id: edgeId,
                source: sourceId,
                target: targetId,
              });
            }
          }
        });

        return updatedEdges;
      });
    },
    [setNodes, setEdges, nodes]
  );

  // Clear selection when clicking canvas
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return {
    // State
    agent,
    nodes,
    edges,
    nodeTypes,
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
    updateAgentInfo,
  };
}
