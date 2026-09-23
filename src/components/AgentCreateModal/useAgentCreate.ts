import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { agentsApi, nodesApi } from '../../api';
import type { NodeType } from '../../api';
import type { Agent, AgentNode } from '../../types';
import {
  DEFAULT_NODES,
  generateNodeId,
  loadTipsPosition,
  type AgentCreateForm,
} from './agentCreate.types';

const RIGHT_PANEL_MIN_WIDTH = 220;
const RIGHT_PANEL_MAX_WIDTH_RATIO = 0.6; // 60% of container width

// Split editor constants
const SPLIT_MIN_RATIO = 0.2; // 20% minimum for each pane
const SPLIT_MAX_RATIO = 0.8; // 80% maximum for each pane

interface UseAgentCreateOptions {
  opened: boolean;
  onClose: () => void;
  onSave: () => void;
  agent?: Agent | null;
}

export function useAgentCreate({ opened, onClose, onSave, agent }: UseAgentCreateOptions) {
  const isEditMode = Boolean(agent);
  // Form state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nodes, setNodes] = useState<AgentNode[]>(DEFAULT_NODES);
  const [nodesValid, setNodesValid] = useState(true);

  // Tips panel state
  const [tipsOpen, setTipsOpen] = useState(false);
  const [tipsPosition, setTipsPosition] = useState(loadTipsPosition);

  // Node types state
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [nodeTypesLoading, setNodeTypesLoading] = useState(false);
  const [nodeTypesError, setNodeTypesError] = useState('');

  // Resizable panel
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_PANEL_MIN_WIDTH);
  const resizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Split editor state
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5); // 50% each by default
  const splitResizingRef = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Shared editor text state (for split view sync)
  const [nodesText, setNodesText] = useState(() => JSON.stringify(nodes, null, 2));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AgentCreateForm>();

  // Load node types
  const loadNodeTypes = useCallback(async () => {
    setNodeTypesLoading(true);
    setNodeTypesError('');
    try {
      const data = await nodesApi.list();
      setNodeTypes(data);
    } catch (err) {
      setNodeTypesError(err instanceof Error ? err.message : 'Failed to load node types');
    } finally {
      setNodeTypesLoading(false);
    }
  }, []);

  // Reset state and load node types when modal opens
  useEffect(() => {
    if (opened) {
      if (agent) {
        reset({ name: agent.name, description: agent.description || '' });
        const agentNodes = agent.nodes || DEFAULT_NODES;
        setNodes(agentNodes);
        setNodesText(JSON.stringify(agentNodes, null, 2));
      } else {
        reset({ name: '', description: '' });
        setNodes(DEFAULT_NODES);
        setNodesText(JSON.stringify(DEFAULT_NODES, null, 2));
      }
      setNodesValid(true);
      setError('');
      loadNodeTypes();
    }
  }, [opened, agent, reset, loadNodeTypes]);

  const handleClose = useCallback(() => {
    reset({ name: '', description: '' });
    setNodes(DEFAULT_NODES);
    setNodesText(JSON.stringify(DEFAULT_NODES, null, 2));
    setNodesValid(true);
    setError('');
    onClose();
  }, [reset, onClose]);

  const handleNodesChange = useCallback((value: unknown, isValid: boolean) => {
    setNodesValid(isValid);
    if (isValid) {
      setNodes(value as AgentNode[]);
    }
  }, []);

  // Handler for shared text state (used when split view is enabled)
  const handleNodesTextChange = useCallback((text: string) => {
    setNodesText(text);
    try {
      const parsed = JSON.parse(text);
      setNodes(parsed as AgentNode[]);
      setNodesValid(true);
    } catch {
      setNodesValid(false);
    }
  }, []);

  const handleAddNode = useCallback((nodeType: NodeType) => {
    const data: Record<string, unknown> = {};

    const processSchema = (schema: unknown) => {
      if (Array.isArray(schema)) {
        for (const field of schema) {
          if (field && typeof field === 'object' && 'name' in field) {
            const f = field as { name: string; default?: unknown; values?: unknown[] };
            data[f.name] = f.default ?? (f.values?.[0] ?? '');
          }
        }
      } else if (schema && typeof schema === 'object') {
        for (const [key, val] of Object.entries(schema)) {
          if (val && typeof val === 'object' && ('default' in val || 'values' in val)) {
            const v = val as { default?: unknown; values?: unknown[] };
            data[key] = v.default ?? (v.values?.[0] ?? '');
          } else if (val && typeof val === 'object' && 'name' in val) {
            // Skip - this is metadata
          } else {
            data[key] = val;
          }
        }
      }
    };

    if (nodeType.options) {
      processSchema(nodeType.options);
    }
    if (nodeType.inputSchema && Object.keys(data).length === 0) {
      processSchema(nodeType.inputSchema);
    }

    setNodes((prev) => {
      const newNode: AgentNode = {
        id: generateNodeId(nodeType.type, prev),
        type: nodeType.type,
        data,
      };
      return [...prev, newNode];
    });
  }, []);

  const onSubmit = useCallback(
    async (data: AgentCreateForm) => {
      if (!nodesValid) {
        setError('Invalid JSON in nodes');
        return;
      }

      setSaving(true);
      setError('');
      try {
        if (agent) {
          await agentsApi.update(agent.id, {
            name: data.name,
            description: data.description || undefined,
            nodes,
          });
        } else {
          await agentsApi.create({
            name: data.name,
            description: data.description || undefined,
            nodes,
          });
        }
        handleClose();
        onSave();
      } catch (err) {
        setError(err instanceof Error ? err.message : agent ? 'Failed to update agent' : 'Failed to create agent');
      } finally {
        setSaving(false);
      }
    },
    [agent, nodesValid, nodes, handleClose, onSave]
  );

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const maxWidth = containerRect.width * RIGHT_PANEL_MAX_WIDTH_RATIO;
      setRightPanelWidth(
        Math.max(RIGHT_PANEL_MIN_WIDTH, Math.min(maxWidth, newWidth))
      );
    };

    const handleMouseUp = () => {
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Split editor resize handler
  const handleSplitResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    splitResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitResizingRef.current || !editorContainerRef.current) return;
      const containerRect = editorContainerRef.current.getBoundingClientRect();
      const newRatio = (e.clientX - containerRect.left) / containerRect.width;
      setSplitRatio(Math.max(SPLIT_MIN_RATIO, Math.min(SPLIT_MAX_RATIO, newRatio)));
    };

    const handleMouseUp = () => {
      splitResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  return {
    // Mode
    isEditMode,
    agent,

    // Form
    register,
    handleSubmit,
    errors,
    saving,
    error,
    setError,
    onSubmit,

    // Nodes
    nodes,
    nodesValid,
    handleNodesChange,
    handleAddNode,
    nodesText,
    handleNodesTextChange,

    // Node types
    nodeTypes,
    nodeTypesLoading,
    nodeTypesError,

    // Tips panel
    tipsOpen,
    setTipsOpen,
    tipsPosition,
    setTipsPosition,

    // Resize
    rightPanelWidth,
    containerRef,
    handleResizeStart,

    // Split editor
    splitEnabled,
    setSplitEnabled,
    splitRatio,
    editorContainerRef,
    handleSplitResizeStart,

    // Actions
    handleClose,
  };
}
