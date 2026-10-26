import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, MiniMap, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './AgentFlowEditor.css';
import { Center, Loader } from '@mantine/core';
import { useAgentEditor } from './hooks/useAgentEditor';
import { EditorToolbar } from './EditorToolbar';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import type { AgentFlowEditorProps } from './types';
import type { NodeType } from '../../api';
import { agentsApi } from '../../api';
import type { ChatStatusEvent } from '../../api/sessions';
import type { NodeStatus } from '../../types';
import { PanelLeft } from './PanelLeft';
import { PanelRight } from './PanelRight';
import { clearGitHubCache } from './PanelLeft/GitTab/useGitHubData';

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PALETTE_STORAGE_KEY = 'agent-editor-palette-open';
const TAB_STORAGE_KEY = 'agent-editor-active-tab';
const MIN_RUNNING_MS = 300;

export function AgentFlowEditor({ agentId, workspaceId }: AgentFlowEditorProps) {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(() => {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [activeTab, setActiveTab] = useState<string | null>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return saved || 'nodes';
  });
  const [exporting, setExporting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | undefined>();

  const [isNodesDragging, setIsNodesDragging] = useState(false);

  // Node statuses of the last run from the Run tab (null = no run yet, missing node = pending)
  const [runStatuses, setRunStatuses] = useState<Record<string, NodeStatus> | null>(null);

  // Runs can be very fast - replay status events sequentially, keeping every executed node
  // in "running" for at least MIN_RUNNING_MS. playheadRef = earliest time the next event may show.
  const playheadRef = useRef(0);
  const startedRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const replayEndedRef = useRef(false);
  const replayDoneRef = useRef<(() => void) | null>(null);

  const setNodeRunStatus = useCallback((nodeId: string, status: NodeStatus) => {
    setRunStatuses((prev) => ({ ...prev, [nodeId]: status }));
  }, []);

  const scheduleAt = useCallback((time: number, fn: () => void) => {
    const delay = time - Date.now();
    if (delay <= 0) {
      fn();
      return;
    }
    timersRef.current.push(setTimeout(fn, delay));
  }, []);

  // Reset replay; {} = new run (all pending), null = no run statuses shown
  const resetRunStatuses = useCallback((statuses: Record<string, NodeStatus> | null) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    // Replay cancelled - don't leave the Run tab waiting for output
    replayDoneRef.current?.();
    replayDoneRef.current = null;
    playheadRef.current = 0;
    startedRef.current = new Set();
    replayEndedRef.current = false;
    setRunStatuses(statuses);
  }, []);

  const handleRunStart = useCallback(() => resetRunStatuses({}), [resetRunStatuses]);
  const handleRunClear = useCallback(() => resetRunStatuses(null), [resetRunStatuses]);

  const handleNodeStatus = useCallback((nodeId: string, status: ChatStatusEvent['status']) => {
    let at = Math.max(Date.now(), playheadRef.current);
    if (status === 'skipped') {
      scheduleAt(at, () => setNodeRunStatus(nodeId, 'skipped'));
      playheadRef.current = at;
      return;
    }
    // Finished without a 'started' event - show it running first
    if (status === 'started' || !startedRef.current.has(nodeId)) {
      startedRef.current.add(nodeId);
      scheduleAt(at, () => setNodeRunStatus(nodeId, 'running'));
      at += MIN_RUNNING_MS;
    }
    if (status !== 'started') {
      scheduleAt(at, () => setNodeRunStatus(nodeId, status));
    }
    playheadRef.current = at;
  }, [setNodeRunStatus, scheduleAt]);

  // Run finished, failed or was stopped - after replay ends, nodes still running didn't complete.
  // Final statuses stay visible until the next click.
  // Resolves when replay ends, so the Run tab can show output after the animation
  const handleRunEnd = useCallback(() => new Promise<void>((resolve) => {
    replayDoneRef.current = resolve;
    const replayEnd = Math.max(Date.now(), playheadRef.current);
    scheduleAt(replayEnd, () => {
      replayEndedRef.current = true;
      replayDoneRef.current = null;
      resolve();
      setRunStatuses((prev) => prev && Object.fromEntries(
        Object.entries(prev).map(([nodeId, status]) => [nodeId, status === 'running' ? 'skipped' : status])
      ));
    });  }), [scheduleAt]);

  // Click anywhere clears final statuses early (not while the run is still replaying)
  const hasRunStatuses = runStatuses !== null;
  useEffect(() => {
    if (!hasRunStatuses) return;
    const handlePointerDown = () => {
      if (replayEndedRef.current) handleRunClear();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [hasRunStatuses, handleRunClear]);

  // Clear pending status timers on unmount
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const handleActiveTabChange = useCallback((tab: string | null) => {
    setActiveTab(tab);
    if (tab) {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    }
  }, []);

  const togglePalette = useCallback(() => {
    setIsPaletteOpen((prev) => {
      const newValue = !prev;
      localStorage.setItem(PALETTE_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  // Handle Run button - open panel and switch to Run tab
  const handleRunClick = useCallback(() => {
    if (!isPaletteOpen) {
      setIsPaletteOpen(true);
      localStorage.setItem(PALETTE_STORAGE_KEY, 'true');
    }
    handleActiveTabChange('run');
  }, [isPaletteOpen, handleActiveTabChange]);

  // Handle Export button
  const handleExport = useCallback(async () => {
    if (!agentId) return;
    setExporting(true);
    try {
      const exportData = await agentsApi.export(agentId);
      const agentName = exportData.agent?.name || 'agent';
      downloadJson(exportData, `${agentName}.agent.json`);
    } catch (err) {
      console.error('Failed to export agent:', err);
    } finally {
      setExporting(false);
    }
  }, [agentId]);

  const {
    agent,
    nodes,
    edges,
    nodeTypes: availableNodeTypes,
    loading,
    saving,
    selectedNode,
    edgeType,
    layoutDirection,
    initialViewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    saveAgent,
    updateNodeId,
    updateNodeData,
    replaceNodeData,
    deleteNode,
    updateAgentInfo,
    updateWorkspace,
    changeLayoutDirection,
    changeEdgeType,
    addNode,
    loadTemplate,
    setViewportGetter,
    reloadAgent,
  } = useAgentEditor({ agentId, workspaceId });

  // Apply run status classes for rendering only - stored nodes stay untouched
  const displayNodes = useMemo(() => {
    if (!runStatuses) return nodes;
    return nodes.map((node) => ({
      ...node,
      className: `run-${runStatuses[node.id] ?? 'pending'}`,
    }));
  }, [nodes, runStatuses]);

  // Photons flow along edges carrying data: source finished, target running
  const displayEdges = useMemo(() => {
    if (!runStatuses) return edges;
    return edges.map((edge) => {
      const photon = runStatuses[edge.source] === 'completed' && runStatuses[edge.target] === 'running';
      return photon ? { ...edge, data: { ...edge.data, photon } } : edge;
    });
  }, [edges, runStatuses]);

  // Compute set of node types already on the canvas
  const existingNodeTypes = useMemo(() => {
    return new Set(nodes.map((node) => node.type).filter((type): type is string => !!type));
  }, [nodes]);

  const handleAddNode = useCallback(
    (nodeType: NodeType, exampleIndex?: number) => {
      // Build initial data from option defaults
      const optionDefaults: Record<string, unknown> = {};
      if (nodeType.options) {
        for (const option of nodeType.options) {
          if (option.default !== undefined) {
            optionDefaults[option.name] = option.default;
          }
        }
      }

      // Get example data if provided (overrides defaults)
      let exampleData: Record<string, unknown> = {};
      if (exampleIndex !== undefined && nodeType.examples?.[exampleIndex]) {
        exampleData = nodeType.examples[exampleIndex].data || {};
      }

      const data = { ...optionDefaults, ...exampleData };

      // Add at center of viewport
      if (reactFlowInstance.current) {
        const { x, y, zoom } = reactFlowInstance.current.getViewport();
        const centerX = (-x + 400) / zoom;
        const centerY = (-y + 300) / zoom;
        addNode(nodeType.type, { x: centerX, y: centerY }, data);
      } else {
        addNode(nodeType.type, undefined, data);
      }
    },
    [addNode]
  );

  // Wrap save to also refresh git data
  const handleSave = useCallback(async () => {
    const success = await saveAgent();
    if (success && agent?.id) {
      // Clear git cache for this agent (use rootId for sub-agents)
      const syncAgentId = agent.github?.rootId || agent.id;
      clearGitHubCache(syncAgentId);
      setSavedAt(Date.now());
    }
  }, [saveAgent, agent?.id, agent?.github?.rootId]);

  if (loading) {
    return (
      <Center style={{ width: '100%', height: '100%' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Canvas takes full width */}
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <EditorToolbar
          agentName={agent?.name || ''}
          agentId={agent?.id}
          workspaceName={agent?.workspaceName}
          github={agent?.github}
          saving={saving}
          isPaletteOpen={isPaletteOpen}
          onSave={handleSave}
          onRun={handleRunClick}
          onTogglePalette={togglePalette}
        />
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: edgeType }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeDragStart={ () => setIsNodesDragging(true) }
          onNodeDragStop={ () => setIsNodesDragging(false) }
          onInit={(instance) => {
            reactFlowInstance.current = instance;
            setViewportGetter(() => instance.getViewport());
            // Restore saved viewport if available
            if (initialViewport) {
              instance.setViewport(initialViewport);
            }
          }}
          fitView={!initialViewport}
          // nodeDragThreshold={10}
          onlyRenderVisibleElements={true}
          style={{ background: 'transparent' }}
        >
          { !selectedNode && 
              <MiniMap
                nodeColor="var(--mantine-color-default-border)"
                maskColor="var(--mantine-color-body)"
                style={{
                  background: 'var(--mantine-color-body)',
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 'var(--mantine-radius-md)',
                }}
              />
          }
        </ReactFlow>
      </div>

      {isPaletteOpen &&
        <PanelLeft
          isNodesDragging={isNodesDragging}
          activeTab={activeTab}
          agent={agent}
          edgeType={edgeType}
          existingNodeTypes={existingNodeTypes}
          exporting={exporting}
          hasNodes={nodes.length > 0}
          layoutDirection={layoutDirection}
          nodeTypes={availableNodeTypes}
          savedAt={savedAt}
          onActiveTabChange={handleActiveTabChange}
          onAddNode={handleAddNode}
          onAgentInfoChange={updateAgentInfo}
          onWorkspaceChange={updateWorkspace}
          onClose={togglePalette}
          onEdgeTypeChange={changeEdgeType}
          onExport={handleExport}
          onLayoutDirectionChange={changeLayoutDirection}
          onLoadTemplate={loadTemplate}
          onReloadAgent={reloadAgent}
          onRunStart={handleRunStart}
          onNodeStatus={handleNodeStatus}
          onRunEnd={handleRunEnd}
          onRunClear={handleRunClear}
        />
      }

      {selectedNode && (
        <PanelRight
          isNodesDragging={isNodesDragging}
          node={selectedNode}
          nodes={nodes}
          nodeTypes={availableNodeTypes}
          onUpdate={updateNodeData}
          onUpdateId={updateNodeId}
          onReplace={replaceNodeData}
          onRemove={(nodeId) => { deleteNode(nodeId); onPaneClick(); }}
          onClose={onPaneClick}
          />
      )}

    </div>
  );
}
