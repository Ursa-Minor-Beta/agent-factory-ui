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
import { PanelLeft } from './PanelLeft';
import { PanelRight } from './PanelRight';

const PALETTE_STORAGE_KEY = 'agent-editor-palette-open';
const EDGE_TYPE_STORAGE_KEY = 'agent-editor-edge-type';

export function AgentFlowEditor({ agentId }: AgentFlowEditorProps) {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(() => {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [edgeType, setEdgeType] = useState(() => {
    return localStorage.getItem(EDGE_TYPE_STORAGE_KEY) || 'smart';
  });

  const togglePalette = useCallback(() => {
    setIsPaletteOpen((prev) => {
      const newValue = !prev;
      localStorage.setItem(PALETTE_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const handleEdgeTypeChange = useCallback((value: string) => {
    setEdgeType(value);
    localStorage.setItem(EDGE_TYPE_STORAGE_KEY, value);
  }, []);

  const {
    agent,
    nodes,
    edges,
    nodeTypes: availableNodeTypes,
    loading,
    saving,
    running,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    saveAgent,
    runAgent,
    stopAgent,
    updateNodeData,
    updateAgentInfo,
    addNode,
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
          running={running}
          isPaletteOpen={isPaletteOpen}
          onSave={saveAgent}
          onRun={runAgent}
          onStop={stopAgent}
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
          nodeTypes={availableNodeTypes}
          existingNodeTypes={existingNodeTypes}
          edgeType={edgeType}
          agent={agent}
          onAddNode={handleAddNode}
          onEdgeTypeChange={handleEdgeTypeChange}
          onAgentInfoChange={updateAgentInfo}
          onClose={togglePalette}
          />
      }

      {selectedNode && (
        <PanelRight 
          node={selectedNode} 
          nodeTypes={availableNodeTypes} 
          onUpdate={updateNodeData} 
          onClose={onPaneClick} 
          />
      )}

    </div>
  );
}
