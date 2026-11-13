import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, MiniMap, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './AgentFlowEditor.css';
import { Center, Loader, LoadingOverlay } from '@mantine/core';
import { useAgentEditor } from './hooks/useAgentEditor';
import { useNodeClipboard } from './hooks/useNodeClipboard';
import { useTemplateRefs } from './hooks/useTemplateRefs';
import { useEditorHistory } from './hooks/useEditorHistory';
import { useRunReplay } from './hooks/useRunReplay';
import { useDisplayEdges, useDisplayNodes } from './hooks/useRunDisplay';
import { useEdgeHighlight } from './hooks/useEdgeHighlight';
import { usePersistedState } from './hooks/usePersistedState';
import { useAssistantEditor } from './hooks/useAssistantEditor';
import { useDeleteNavigation } from './hooks/useDeleteNavigation';
import { useDisableShortcut } from './hooks/useDisableShortcut';
import { useAgentExport } from './hooks/useAgentExport';
import { EditorToolbar } from './EditorToolbar';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import type { AgentFlowEditorProps } from './types';
import type { NodeType } from '../../api';
import { usePageTitle } from '../../layout/pageTitle';
import { PanelLeft } from './PanelLeft';
import { PanelRight } from './PanelRight';
import { clearGitHubCache } from './PanelLeft/GitTab/useGitHubData';
import { PALETTE_STORAGE_KEY, TAB_STORAGE_KEY } from './constants';

const parseBoolean = (raw: string) => raw === 'true';
const parseTab = (raw: string) => raw || 'nodes';

export function AgentFlowEditor({ agentId, workspaceId }: AgentFlowEditorProps) {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = usePersistedState(PALETTE_STORAGE_KEY, true, parseBoolean);
  const [activeTab, setActiveTab] = usePersistedState<string | null>(TAB_STORAGE_KEY, 'nodes', parseTab);
  const [savedAt, setSavedAt] = useState<number | undefined>();
  const [isNodesDragging, setIsNodesDragging] = useState(false);

  const { runStatuses, runningMsRef, handleRunStart, handleRunClear, handleNodeStatus, handleRunEnd } = useRunReplay();
  const { exporting, handleExport } = useAgentExport(agentId);

  const togglePalette = useCallback(() => setIsPaletteOpen((prev) => !prev), [setIsPaletteOpen]);

  // Toolbar Run: bumps a counter the Run tab reacts to; Run tab reports back running state / missing inputs
  const [runRequest, setRunRequest] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const handleToolbarRun = useCallback(() => setRunRequest((n) => n + 1), []);
  const handleRunInputsRequired = useCallback(() => {
    setActiveTab('run');
    setIsPaletteOpen(true);
  }, [setActiveTab, setIsPaletteOpen]);

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
    setNodesDisabled,
  } = useAgentEditor({ agentId, workspaceId });

  useDisableShortcut({ nodes, selectedNodeId: selectedNode?.id, setNodesDisabled });

  // Secret / variable names for {{secret:NAME}} / {{var:NAME}} suggestions
  const templateRefs = useTemplateRefs(agent?.workspaceId ?? workspaceId);

  // Show agent name in browser tab title
  usePageTitle(agent?.name);

  const { highlightedNodeIds, handleNodeClick, handleNodeDoubleClick, handlePaneClick } =
    useEdgeHighlight({ onNodeClick, onPaneClick });
  const displayNodes = useDisplayNodes(nodes, runStatuses);
  const displayEdges = useDisplayEdges(edges, nodes, runStatuses, runningMsRef, highlightedNodeIds);

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    setViewportGetter(() => instance.getViewport());
    // Restore saved viewport if available
    if (initialViewport) {
      instance.setViewport(initialViewport);
    }
  }, [initialViewport, setViewportGetter]);

  const handleNodeDragStart = useCallback(() => setIsNodesDragging(true), []);
  const handleNodeDragStop = useCallback(() => setIsNodesDragging(false), []);

  const handleRemoveNode = useCallback((nodeId: string) => {
    deleteNode(nodeId);
    onPaneClick();
  }, [deleteNode, onPaneClick]);

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

  const { assistantEditor, runnerRef } = useAssistantEditor({
    agent,
    getAgentNodes,
    upsertNode,
    removeNode,
    updateAgentMeta,
    nodeTypes: availableNodeTypes,
    selectedNodeId: selectedNode?.id,
    save: handleSave,
  });

  const handleAgentDeleted = useDeleteNavigation(agent?.id, agent?.workspaceId);

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
    handleRunClear();
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
          elevateEdgesOnSelect
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onPaneClick={handlePaneClick}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onInit={handleInit}
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
          onActiveTabChange={setActiveTab}
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
          templateRefs={templateRefs}
          onUpdate={updateNodeData}
          onUpdateId={updateNodeId}
          onReplace={replaceNodeData}
          onRemove={handleRemoveNode}
          onSetDisabled={setNodesDisabled}
          onClose={onPaneClick}
          />
      )}

    </div>
  );
}
