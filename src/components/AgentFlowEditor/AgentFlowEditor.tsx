import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, MiniMap, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './AgentFlowEditor.css';
import { Center, Loader, LoadingOverlay } from '@mantine/core';
import { useAgentEditor } from './hooks/useAgentEditor';
import { useNodeClipboard } from './hooks/useNodeClipboard';
import { useEditorHistory } from './hooks/useEditorHistory';
import { EditorToolbar } from './EditorToolbar';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import type { AgentFlowEditorProps } from './types';
import type { NodeType } from '../../api';
import { agentsApi } from '../../api';
import { usePageTitle } from '../../layout/pageTitle';
import type { ChatStatusEvent } from '../../api/sessions';
import type { NodeStatus } from '../../types';
import { PanelLeft } from './PanelLeft';
import type { AgentRunner } from './PanelLeft/RunTab';
import { PanelRight } from './PanelRight';
import { clearGitHubCache } from './PanelLeft/GitTab/useGitHubData';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../config/routes';

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
// Assistant run: how long to wait for the Run tab to be able to start (just-saved agent / other run)
const RUN_START_ATTEMPTS = 20;
const RUN_START_RETRY_MS = 100;
const TAB_STORAGE_KEY = 'agent-editor-active-tab';

// Agents opened in the editor during this session, most recent last - used to pick where to go after a delete
const visitedAgents: { id: string; workspaceId?: string }[] = [];

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
  // in "running" for at least minRunningMs (Run tab speed). playheadRef = earliest time the next event may show.
  const playheadRef = useRef(0);
  const startedRef = useRef<Set<string>>(new Set());
  // Running time per node at the speed it was scheduled with - drives edge photon timing
  const runningMsRef = useRef<Record<string, number>>({});
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    playheadRef.current = 0;
    startedRef.current = new Set();
    runningMsRef.current = {};
    setRunStatuses(statuses);
  }, []);

  const handleRunStart = useCallback(() => resetRunStatuses({}), [resetRunStatuses]);
  const handleRunClear = useCallback(() => resetRunStatuses(null), [resetRunStatuses]);

  const handleNodeStatus = useCallback((nodeId: string, status: ChatStatusEvent['status'], minRunningMs: number) => {
    let at = Math.max(Date.now(), playheadRef.current);
    if (status === 'skipped') {
      scheduleAt(at, () => setNodeRunStatus(nodeId, 'skipped'));
      playheadRef.current = at;
      return;
    }
    // Finished without a 'started' event - show it running first
    if (status === 'started' || !startedRef.current.has(nodeId)) {
      startedRef.current.add(nodeId);
      runningMsRef.current[nodeId] = minRunningMs;
      scheduleAt(at, () => setNodeRunStatus(nodeId, 'running'));
      at += minRunningMs;
    }
    if (status !== 'started') {
      scheduleAt(at, () => setNodeRunStatus(nodeId, status));
    }
    playheadRef.current = at;
  }, [setNodeRunStatus, scheduleAt]);

  // Run finished, failed or was stopped - after replay ends, nodes still running didn't complete.
  // Final statuses stay visible until the next run or animation is turned off.
  const handleRunEnd = useCallback(() => {
    const replayEnd = Math.max(Date.now(), playheadRef.current);
    scheduleAt(replayEnd, () => {
      setRunStatuses((prev) => prev && Object.fromEntries(
        Object.entries(prev).map(([nodeId, status]) => [nodeId, status === 'running' ? 'skipped' : status])
      ));
    });
  }, [scheduleAt]);

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

  // Toolbar Run: bumps a counter the Run tab reacts to; Run tab reports back running state / missing inputs
  const [runRequest, setRunRequest] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const handleToolbarRun = useCallback(() => setRunRequest((n) => n + 1), []);
  const handleRunInputsRequired = useCallback(() => {
    handleActiveTabChange('run');
    setIsPaletteOpen(true);
    localStorage.setItem(PALETTE_STORAGE_KEY, 'true');
  }, [handleActiveTabChange]);

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
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    onNodeClick,
    onPaneClick,
    saveAgent,
    updateNodeId,
    updateNodeData,
    replaceNodeData,
    deleteNode,
    updateAgentInfo,
    updateWorkspace,
    updateAgentMeta,
    changeLayoutDirection,
    changeEdgeType,
    addNode,
    loadTemplate,
    setViewportGetter,
    reloadAgent,
    getAgentNodes,
    upsertNode,
    removeNode,
  } = useAgentEditor({ agentId, workspaceId });

  // Show agent name in browser tab title
  usePageTitle(agent?.name);

  // Apply run status classes for rendering only - stored nodes stay untouched.
  // Copies are reused while node and status are unchanged, so a status update re-renders only that node
  const displayNodeCache = useRef(new Map<string, { source: (typeof nodes)[number]; display: (typeof nodes)[number] }>());
  const displayNodes = useMemo(() => {
    if (!runStatuses) {
      displayNodeCache.current.clear();
      return nodes;
    }
    const cache = displayNodeCache.current;
    const next = new Map<string, { source: (typeof nodes)[number]; display: (typeof nodes)[number] }>();
    const result = nodes.map((node) => {
      const className = `run-${runStatuses[node.id] ?? 'pending'}`;
      const cached = cache.get(node.id);
      const display = cached && cached.source === node && cached.display.className === className
        ? cached.display
        : { ...node, className };
      next.set(node.id, { source: node, display });
      return display;
    });
    displayNodeCache.current = next;
    return result;
  }, [nodes, runStatuses]);

  // Photons flow along edges carrying data: source finished, target running
  const displayEdges = useMemo(() => {
    if (!runStatuses) return edges;
    return edges.map((edge) => {
      const active = runStatuses[edge.source] === 'completed' && runStatuses[edge.target] === 'running';
      // photon = target's running time, so the trail follows the animation speed
      // zIndex keeps active edges drawn above overlapping ones
      return active ? { ...edge, zIndex: 1, data: { ...edge.data, photon: runningMsRef.current[edge.target] } } : edge;
    });
  }, [edges, runStatuses]);

  // Compute set of node types already on the canvas
  // Keyed by the sorted type list so node edits/moves keep the same Set (it's a PanelLeft prop)
  const existingNodeTypesKey = [...new Set(nodes.map((node) => node.type).filter(Boolean))].sort().join('\n');
  const existingNodeTypes = useMemo(
    () => new Set(existingNodeTypesKey ? existingNodeTypesKey.split('\n') : []),
    [existingNodeTypesKey]
  );

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

  const clipboardMouseHandlers = useNodeClipboard({ selectedNode, reactFlowInstance, addNode });

  const history = useEditorHistory({
    nodes,
    edges,
    setNodes,
    setEdges,
    // Fresh history once each load finishes, baseline = loaded graph (not the empty canvas before it)
    resetKey: `${agentId ?? ''}:${loading}`,
    paused: loading || isNodesDragging,
  });

  // Wrap save to also refresh git data - returns the saved agent id, null on failure
  const handleSave = useCallback(async () => {
    const savedId = await saveAgent();
    if (savedId) history.markSaved();
    if (savedId && agent?.id) {
      // Clear git cache for this agent (use rootId for sub-agents)
      const syncAgentId = agent.github?.rootId || agent.id;
      clearGitHubCache(syncAgentId);
      setSavedAt(Date.now());
    }
    return savedId;
  }, [saveAgent, agent?.id, agent?.github?.rootId, history.markSaved]);

  // Assistant tools call the latest save / Run tab runner through refs, keeping assistantEditor stable
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const runnerRef = useRef<AgentRunner | null>(null);
  const agentRef = useRef(agent);
  agentRef.current = agent;
  const updateAgentMetaRef = useRef(updateAgentMeta);
  updateAgentMetaRef.current = updateAgentMeta;
  const selectedNodeIdRef = useRef(selectedNode?.id);
  selectedNodeIdRef.current = selectedNode?.id;

  const assistantEditor = useMemo(
    () => ({
      getNodes: getAgentNodes,
      upsertNode,
      removeNode,
      nodeTypes: availableNodeTypes,
      save: () => handleSaveRef.current(),
      getSelection: () => (selectedNodeIdRef.current ? [selectedNodeIdRef.current] : []),
      getAgentInfo: () => ({
        name: agentRef.current?.name ?? '',
        description: agentRef.current?.description ?? '',
        workspaceId: agentRef.current?.workspaceId ?? null,
      }),
      updateAgentInfo: (data: { name?: string; description?: string; workspaceId?: string | null }) =>
        updateAgentMetaRef.current(data),
      run: async (input?: Record<string, unknown>) => {
        // Backend runs the saved version - save first so the latest edits run
        const savedId = await handleSaveRef.current();
        if (!savedId) return { error: 'Failed to save the agent' };
        // A just-created agent reaches the Run tab on the next render - retry briefly
        for (let attempt = 0; attempt < RUN_START_ATTEMPTS; attempt++) {
          const result = await runnerRef.current?.(input);
          if (result) return result;
          await new Promise((resolve) => setTimeout(resolve, RUN_START_RETRY_MS));
        }
        return { error: 'Could not start the run - another run may be in progress' };
      },
    }),
    [getAgentNodes, upsertNode, removeNode, availableNodeTypes]
  );

  const navigate = useNavigate();

  useEffect(() => {
    if (!agent?.id) return;
    const i = visitedAgents.findIndex((v) => v.id === agent.id);
    if (i !== -1) visitedAgents.splice(i, 1);
    visitedAgents.push({ id: agent.id, workspaceId: agent.workspaceId });
  }, [agent?.id, agent?.workspaceId]);

  // After delete: open the previously visited agent of the same workspace, else the workspace, else the agents list
  const handleAgentDeleted = useCallback(() => {
    const deletedId = agent?.id;
    const i = visitedAgents.findIndex((v) => v.id === deletedId);
    if (i !== -1) visitedAgents.splice(i, 1);
    // Most recently visited agent from the same workspace
    const previousId = visitedAgents.findLast((v) => v.workspaceId === agent?.workspaceId)?.id;
    const target = previousId
      ? routes.agentEditor(previousId)
      : agent?.workspaceId ? routes.workspace(agent.workspaceId) : routes.agents();
    navigate(target, { replace: true });
  }, [agent?.id, agent?.workspaceId, navigate]);

  // Memoized so it doesn't break PanelLeft memoization
  const editorToolbar = useMemo(() => (
    <EditorToolbar
      agentName={agent?.name || ''}
      agentId={agent?.id}
      workspaceId={agent?.workspaceId}
      workspaceName={agent?.workspaceName}
      github={agent?.github}
      saving={saving}
      isPaletteOpen={isPaletteOpen}
      onSave={handleSave}
      onTogglePalette={togglePalette}
      running={isRunning}
      onRun={handleToolbarRun}
      // New agents can always be saved (creates them)
      canSave={!agent?.id || history.isDirty}
      canUndo={history.canUndo}
      canRedo={history.canRedo}
      onUndo={history.undo}
      onRedo={history.redo}
    />
  ), [
    history.isDirty,
    history.canUndo,
    history.canRedo,
    history.undo,
    history.redo,
    agent?.name, 
    agent?.id, 
    agent?.workspaceId, 
    agent?.workspaceName, 
    agent?.github, 
    saving, 
    isPaletteOpen, 
    isRunning, 
    handleSave, 
    togglePalette, 
    handleToolbarRun
  ]);

  // Apply the loaded agent's viewport when switching agents in place (first load is handled by onInit)
  useEffect(() => {
    const instance = reactFlowInstance.current;
    if (!instance || loading) return;
    if (initialViewport) instance.setViewport(initialViewport);
    else requestAnimationFrame(() => instance.fitView());
    setRunStatuses(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only when a different agent finished loading
  }, [agent?.id, loading]);

  // Full-screen loader only for the first load; switching agents keeps the editor mounted
  if (loading && !agent?.id) {
    return (
      <Center style={{ width: '100%', height: '100%' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Canvas takes full width */}
      <div
        style={{ width: '100%', height: '100%', position: 'relative' }}
        {...clipboardMouseHandlers}
      >
        {!isPaletteOpen && editorToolbar}
        {/* Switching agents: cover only the canvas, side panels stay usable (they sit above at zIndex 100) */}
        <LoadingOverlay visible={loading} zIndex={5} overlayProps={{ blur: 2 }} />
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: edgeType }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
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
          snapToGrid={true}
          snapGrid={[1,1]}
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

      {/* Always mounted (hidden when closed) so an in-progress run keeps its output */}
      <PanelLeft
          hidden={!isPaletteOpen}
          header={editorToolbar}
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
          onEdgeTypeChange={changeEdgeType}
          onExport={handleExport}
          onAgentDeleted={handleAgentDeleted}
          onLayoutDirectionChange={changeLayoutDirection}
          onLoadTemplate={loadTemplate}
          onReloadAgent={reloadAgent}
          onRunStart={handleRunStart}
          onNodeStatus={handleNodeStatus}
          onRunEnd={handleRunEnd}
          onRunClear={handleRunClear}
          runRequest={runRequest}
          onRunInputsRequired={handleRunInputsRequired}
          onRunningChange={setIsRunning}
          assistantEditor={assistantEditor}
          runnerRef={runnerRef}
        />

      {selectedNode && (
        <PanelRight
          // Remount after undo/redo so editors holding local state show restored data
          key={history.version}
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
