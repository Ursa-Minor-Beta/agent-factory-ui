import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Position,
  type Node,
  type Edge,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import { agentsApi, nodesApi, type NodeType, type AgentExample } from '../../../api';
import type { Agent, CanvasSettings, EditorViewport } from '../../../types/agent';
import {
  toFlowNode,
  toAgentNode,
  extractEdges,
  generateNodeId,
  autoLayoutNodes,
  syncNodeEdges,
  buildRunAfterEdge,
  isRunAfterEdge,
  isReachable,
  canRunAfter,
  getRunAfter,
  RUN_AFTER_KEY,
  type LayoutDirection,
} from '../utils/converters';
import { routes } from '../../../config/routes';

const DEFAULT_EDGE_TYPE_KEY = 'agent-editor-default-edge-type';
const DEFAULT_LAYOUT_DIRECTION_KEY = 'agent-editor-default-layout-direction';

interface UseAgentEditorOptions {
  agentId?: string;
  workspaceId?: string;
}

export function useAgentEditor({ agentId, workspaceId }: UseAgentEditorOptions) {
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Partial<Agent> | null>(null);
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [initialViewport, setInitialViewport] = useState<EditorViewport | undefined>();

  // Ref to hold a function that gets the current viewport from ReactFlow
  const viewportGetterRef = useRef<(() => EditorViewport) | null>(null);

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

  // Fetch agent function - extracted for reuse
  const fetchAgent = useCallback(async () => {
    if (!agentId || agentId === 'new') return;

    setLoading(true);
    try {
      const data = await agentsApi.getById(agentId);
      setAgent(data);

      // Convert agent nodes to flow nodes
      const flowNodes = data.nodes.map((n, i) => toFlowNode(n, i));

      // Extract edges from node data
      const flowEdges = extractEdges(flowNodes);

      // Get layout direction from agent or localStorage fallback
      const savedDirection = data.editorData?.canvasSettings?.layoutDirection
        ?? localStorage.getItem(DEFAULT_LAYOUT_DIRECTION_KEY);
      const direction: LayoutDirection = (savedDirection === 'LR' || savedDirection === 'TB') ? savedDirection : 'LR';

      // Determine handle positions based on direction
      const sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;
      const targetPosition = direction === 'LR' ? Position.Left : Position.Top;

      // Apply saved positions from editorData if available, otherwise use auto-layout
      const nodePositions = data.editorData?.nodePositions;
      const positionedNodes = nodePositions
        ? flowNodes.map((node) => ({
            ...node,
            sourcePosition,
            targetPosition,
            position: nodePositions[node.id] || node.position,
          }))
        : autoLayoutNodes(flowNodes, flowEdges, direction);

      setNodes(positionedNodes);
      setEdges(flowEdges);

      // Load saved viewport if available
      if (data.editorData?.viewport) {
        setInitialViewport(data.editorData.viewport);
      }
    } catch (err) {
      console.error('Failed to fetch agent:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId, setNodes, setEdges]);

  // Fetch agent on mount
  useEffect(() => {
    if (!agentId) return;

    if (agentId === 'new') {
      setAgent({ workspaceId });
      return;
    }

    fetchAgent();
  }, [agentId, fetchAgent, workspaceId]);

  // Set target's runAfter list, keeping flow data in sync
  const setNodeRunAfter = useCallback(
    (nodeId: string, update: (runAfter: string[]) => string[]) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const { [RUN_AFTER_KEY]: _runAfter, ...rest } = n.data as Record<string, unknown>;
          const runAfter = update(getRunAfter(n.data));
          return { ...n, data: runAfter.length ? { ...rest, [RUN_AFTER_KEY]: runAfter } : rest };
        })
      );
    },
    [setNodes]
  );

  // Only ordering connections can be drawn: plain output -> another non input/output node, no cycles
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const { source, target, sourceHandle } = connection;
      if (!source || !target || source === target || sourceHandle) return false;
      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);
      if (!canRunAfter(sourceNode?.type) || !canRunAfter(targetNode?.type)) return false;
      if (getRunAfter(targetNode?.data).includes(source)) return false;
      return !isReachable(edges, target, source);
    },
    [nodes, edges]
  );

  // Drawn connection = runAfter dependency of the target node
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) return;
      const { source, target } = connection;
      setNodeRunAfter(target, (runAfter) => [...runAfter, source]);
      setEdges((eds) => addEdge(buildRunAfterEdge(source, target), eds));
    },
    [isValidConnection, setNodeRunAfter, setEdges]
  );

  // Removing a runAfter edge drops the dependency from the target node
  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      changes.forEach((change) => {
        if (change.type !== 'remove') return;
        const edge = edges.find((e) => e.id === change.id);
        if (edge && isRunAfterEdge(edge)) {
          setNodeRunAfter(edge.target, (runAfter) => runAfter.filter((id) => id !== edge.source));
        }
      });
      onEdgesChange(changes);
    },
    [edges, onEdgesChange, setNodeRunAfter]
  );

  // Save agent - returns true on success
  const saveAgent = useCallback(async (): Promise<boolean> => {
    if (!agent) return false;

    setSaving(true);
    try {
      const agentNodes = nodes.map(toAgentNode);

      // Build nodePositions from current node positions
      const nodePositions: Record<string, { x: number; y: number }> = {};
      for (const node of nodes) {
        nodePositions[node.id] = { x: node.position.x, y: node.position.y };
      }

      // Get current viewport if getter is available
      const viewport = viewportGetterRef.current?.();

      // Merge with existing editorData to preserve other fields
      const editorData = {
        ...agent.editorData,
        nodePositions,
        viewport,
      };

      if (agent.id) {
        // Update existing agent
        await agentsApi.update(agent.id, { nodes: agentNodes, editorData });
        // Sync local agent so derived data (e.g. Run tab input schema) updates
        setAgent((prev) => (prev ? { ...prev, nodes: agentNodes, editorData } : prev));
      } else {
        // Create new agent
        const newAgent = await agentsApi.create({
          name: agent.name || 'Untitled Agent',
          description: agent.description || undefined,
          nodes: agentNodes,
          editorData,
          workspaceId,
        });
        // Navigate to the new agent's editor
        navigate(routes.agentEditor(newAgent.id), { replace: true });
      }
      return true;
    } catch (err) {
      console.error('Failed to save agent:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [agent, nodes, navigate, workspaceId]);

  // Update agent info (name, description)
  const updateAgentInfo = useCallback(
    async (data: { name?: string; description?: string }) => {
      if (!agent) return;

      // For new agents (no id), just update local state
      if (!agent.id) {
        setAgent({ ...agent, ...data });
        return;
      }

      // For existing agents, persist to backend
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

  // Update workspace
  const updateWorkspace = useCallback(
    async (newWorkspaceId: string | null) => {
      if (!agent) return;

      // For new agents (no id), just update local state
      if (!agent.id) {
        setAgent({ ...agent, workspaceId: newWorkspaceId || undefined });
        return;
      }

      // For existing agents, persist to backend
      setSaving(true);
      try {
        const updatedAgent = await agentsApi.update(agent.id, { workspaceId: newWorkspaceId });
        setAgent(updatedAgent);
      } catch (err) {
        console.error('Failed to update workspace:', err);
      } finally {
        setSaving(false);
      }
    },
    [agent]
  );

  // Update canvas settings (layout direction, edge type)
  const updateCanvasSettings = useCallback(
    async (settings: CanvasSettings) => {
      if (!agent) return;

      // Optimistically update local state
      const updatedEditorData = {
        ...agent.editorData,
        canvasSettings: {
          ...agent.editorData?.canvasSettings,
          ...settings,
        },
      };
      setAgent({ ...agent, editorData: updatedEditorData });

      // Persist to backend only for existing agents
      if (agent.id) {
        try {
          await agentsApi.update(agent.id, { editorData: updatedEditorData });
        } catch (err) {
          console.error('Failed to save canvas settings:', err);
        }
      }
    },
    [agent]
  );

  // Add new node
  const addNode = (type: string, position?: { x: number; y: number }, data?: Record<string, unknown>) => {
    const id = generateNodeId(type, nodes);
    // Default position at center if not provided
    const pos = position || { x: 200, y: 200 };

    // Determine handle positions based on current layout direction
    const direction = agent?.editorData?.canvasSettings?.layoutDirection
      ?? localStorage.getItem(DEFAULT_LAYOUT_DIRECTION_KEY)
      ?? 'LR';
    const sourcePos = direction === 'TB' ? Position.Bottom : Position.Right;
    const targetPos = direction === 'TB' ? Position.Top : Position.Left;

    const newNode: Node = {
      id,
      type,
      position: pos,
      sourcePosition: sourcePos,
      targetPosition: targetPos,
      data: { label: type.toUpperCase(), ...data },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Delete node
  const deleteNode = useCallback(
    (nodeId: string) => {
      // Also drop the deleted node from other nodes' runAfter
      setNodes((nds) =>
        nds
          .filter((n) => n.id !== nodeId)
          .map((n) => {
            const runAfter = getRunAfter(n.data);
            if (!runAfter.includes(nodeId)) return n;
            const { [RUN_AFTER_KEY]: _runAfter, ...rest } = n.data as Record<string, unknown>;
            const next = runAfter.filter((id) => id !== nodeId);
            return { ...n, data: next.length ? { ...rest, [RUN_AFTER_KEY]: next } : rest };
          })
      );
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  // Run agent - opens chat in new tab
  const runAgent = useCallback(() => {
    if (!agent?.id) return;
    window.open(routes.agentChat(agent.id), '_blank');
  }, [agent]);

  // Handle node click
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (event.ctrlKey || event.metaKey) return;
      setSelectedNodeId(node.id);
    },
    []
  );

  // Update node ID and all related edges
  const updateNodeId = (oldId: string, newId: string) => {
    if (oldId === newId) return;

    // Update node ID and rename it in other nodes' runAfter
    setNodes((nds) =>
      nds.map((n) => {
        const runAfter = getRunAfter(n.data);
        const data = runAfter.includes(oldId)
          ? { ...n.data, [RUN_AFTER_KEY]: runAfter.map((id) => (id === oldId ? newId : id)) }
          : n.data;
        return { ...n, id: n.id === oldId ? newId : n.id, data };
      })
    );

    // Update selected node ID if needed
    setSelectedNodeId((prev) => (prev === oldId ? newId : prev));

    // Update all edges referencing this node
    setEdges((eds) =>
      eds.map((e) => {
        if (e.source !== oldId && e.target !== oldId) return e;
        const source = e.source === oldId ? newId : e.source;
        const target = e.target === oldId ? newId : e.target;
        if (isRunAfterEdge(e)) return buildRunAfterEdge(source, target);
        return { ...e, id: `${source}-${target}`, source, target };
      })
    );
  };

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      );

      // Auto-manage edges based on template references and branch targets
      setEdges((eds) => {
        const currentNode = nodes.find((n) => n.id === nodeId);
        const mergedData = { ...currentNode?.data, ...data } as Record<string, unknown>;
        return syncNodeEdges(eds, nodes, nodeId, mergedData);
      });
    },
    [setNodes, setEdges, nodes, updateNodeId]
  );

  const replaceNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
      );

      // Auto-manage edges based on template references and branch targets
      setEdges((eds) => syncNodeEdges(eds, nodes, nodeId, data));
    },
    [setNodes, setEdges, nodes]
  );

  // Clear selection when clicking canvas
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Derive canvas settings from agent (with localStorage fallback)
  const edgeType = useMemo(() => {
    return agent?.editorData?.canvasSettings?.edgeType
      ?? localStorage.getItem(DEFAULT_EDGE_TYPE_KEY)
      ?? 'smart';
  }, [agent?.editorData?.canvasSettings?.edgeType]);

  const layoutDirection = useMemo((): LayoutDirection => {
    const saved = agent?.editorData?.canvasSettings?.layoutDirection
      ?? localStorage.getItem(DEFAULT_LAYOUT_DIRECTION_KEY);
    return (saved === 'LR' || saved === 'TB') ? saved : 'LR';
  }, [agent?.editorData?.canvasSettings?.layoutDirection]);

  // Change layout direction and re-layout nodes
  const changeLayoutDirection = useCallback((direction: LayoutDirection) => {
    const layoutedNodes = autoLayoutNodes(nodes, edges, direction);
    setNodes(layoutedNodes);
    updateCanvasSettings({ layoutDirection: direction });
    localStorage.setItem(DEFAULT_LAYOUT_DIRECTION_KEY, direction);
  }, [nodes, edges, setNodes, updateCanvasSettings]);

  // Change edge type
  const changeEdgeType = useCallback((value: string) => {
    updateCanvasSettings({ edgeType: value });
    localStorage.setItem(DEFAULT_EDGE_TYPE_KEY, value);
  }, [updateCanvasSettings]);

  // Set the viewport getter function (called by the component)
  const setViewportGetter = useCallback((getter: () => EditorViewport) => {
    viewportGetterRef.current = getter;
  }, []);

  // Load template - replaces all nodes with template nodes
  const loadTemplate = useCallback(
    (template: AgentExample) => {
      // Convert template nodes to flow nodes
      const flowNodes = template.nodes.map((n, i) => toFlowNode(n, i));

      // Extract edges from node data
      const flowEdges = extractEdges(flowNodes);

      // Apply auto-layout
      const layoutedNodes = autoLayoutNodes(flowNodes, flowEdges, layoutDirection);

      setNodes(layoutedNodes);
      setEdges(flowEdges);
      setSelectedNodeId(null);
    },
    [layoutDirection, setNodes, setEdges]
  );

  return {
    // State
    agent,
    nodes,
    edges,
    nodeTypes,
    loading,
    saving,
    selectedNode,
    edgeType,
    layoutDirection,
    initialViewport,

    // Actions
    onNodesChange,
    onEdgesChange: handleEdgesChange,
    onConnect,
    isValidConnection,
    onNodeClick,
    onPaneClick,
    saveAgent,
    addNode,
    deleteNode,
    runAgent,
    updateNodeId,
    updateNodeData,
    replaceNodeData,
    updateAgentInfo,
    updateWorkspace,
    changeLayoutDirection,
    changeEdgeType,
    loadTemplate,
    setViewportGetter,
    reloadAgent: fetchAgent,
  };
}
