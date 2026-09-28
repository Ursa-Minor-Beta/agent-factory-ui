import { useCallback, useRef, useState } from 'react';
import { ReactFlow, MiniMap, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './AgentFlowEditor.css';
import { Center, Loader } from '@mantine/core';
import { useAgentEditor } from './hooks/useAgentEditor';
import { EditorToolbar } from './EditorToolbar';
import { NodeSettingsPanel } from './NodeSettingsPanel';
import { NodesPalette } from './NodesPalette';
import { nodeTypes } from './nodes';
import type { AgentFlowEditorProps } from './types';
import type { NodeType } from '../../api';

const PALETTE_STORAGE_KEY = 'agent-editor-palette-open';

export function AgentFlowEditor({ agentId }: AgentFlowEditorProps) {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(() => {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const togglePalette = useCallback(() => {
    setIsPaletteOpen((prev) => {
      const newValue = !prev;
      localStorage.setItem(PALETTE_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const {
    agent,
    nodes,
    edges,
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
    addNode,
  } = useAgentEditor({ agentId });

  const handleAddNode = useCallback(
    (nodeType: NodeType, exampleIndex?: number) => {
      // Get example data if provided
      let data: Record<string, unknown> | undefined;
      if (exampleIndex !== undefined && nodeType.examples?.[exampleIndex]) {
        data = nodeType.examples[exampleIndex].data;
      }

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
      {/* Overlay panels */}
      {isPaletteOpen && <NodesPalette onAddNode={handleAddNode} onClose={togglePalette} />}
      {selectedNode && (
        <NodeSettingsPanel node={selectedNode} onUpdate={updateNodeData} onClose={onPaneClick} />
      )}
    </div>
  );
}
