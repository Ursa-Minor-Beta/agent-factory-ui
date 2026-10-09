import { useCallback, useMemo, useRef, useState } from 'react';
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
import { PanelLeft } from './PanelLeft';
import { PanelRight } from './PanelRight';

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

export function AgentFlowEditor({ agentId }: AgentFlowEditorProps) {
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
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    saveAgent,
    updateNodeData,
    replaceNodeData,
    updateAgentInfo,
    changeLayoutDirection,
    changeEdgeType,
    addNode,
    loadTemplate,
  } = useAgentEditor({ agentId });

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
          saving={saving}
          isPaletteOpen={isPaletteOpen}
          onSave={saveAgent}
          onRun={handleRunClick}
          onTogglePalette={togglePalette}
        />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: edgeType }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={(instance) => { reactFlowInstance.current = instance; }}
          fitView
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
          activeTab={activeTab}
          agent={agent}
          edgeType={edgeType}
          existingNodeTypes={existingNodeTypes}
          exporting={exporting}
          hasNodes={nodes.length > 0}
          layoutDirection={layoutDirection}
          nodeTypes={availableNodeTypes}
          onActiveTabChange={handleActiveTabChange}
          onAddNode={handleAddNode}
          onAgentInfoChange={updateAgentInfo}
          onClose={togglePalette}
          onEdgeTypeChange={changeEdgeType}
          onExport={handleExport}
          onLayoutDirectionChange={changeLayoutDirection}
          onLoadTemplate={loadTemplate}
          />
      }

      {selectedNode && (
        <PanelRight
          node={selectedNode}
          nodes={nodes}
          nodeTypes={availableNodeTypes}
          onUpdate={updateNodeData}
          onReplace={replaceNodeData}
          onClose={onPaneClick}
          />
      )}

    </div>
  );
}
