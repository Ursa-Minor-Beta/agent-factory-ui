import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { agentsApi, nodesApi } from '../../../api';
import type { NodeType } from '../../../api';
import type { AgentNode } from '../../../types';
import {
  DEFAULT_NODES,
  generateNodeId,
  loadTipsPosition,
  type AgentCreateForm,
} from './agentCreate.types';

interface UseAgentCreateOptions {
  opened: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function useAgentCreate({ opened, onClose, onSave }: UseAgentCreateOptions) {
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
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const resizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      reset({ name: '', description: '' });
      setNodes(DEFAULT_NODES);
      setNodesValid(true);
      setError('');
      loadNodeTypes();
    }
  }, [opened, reset, loadNodeTypes]);

  const handleClose = useCallback(() => {
    reset({ name: '', description: '' });
    setNodes(DEFAULT_NODES);
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
        await agentsApi.create({
          name: data.name,
          description: data.description || undefined,
          nodes,
        });
        handleClose();
        onSave();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create agent');
      } finally {
        setSaving(false);
      }
    },
    [nodesValid, nodes, handleClose, onSave]
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
      setRightPanelWidth(Math.max(180, Math.min(500, newWidth)));
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

  return {
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

    // Actions
    handleClose,
  };
}
