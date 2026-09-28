import { ReactFlow, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './AgentFlowEditor.css';
import { Center, Loader } from '@mantine/core';
import { useAgentEditor } from './hooks/useAgentEditor';
import { EditorToolbar } from './EditorToolbar';
import { NodeSettingsPanel } from './NodeSettingsPanel';
import { nodeTypes } from './nodes';
import type { AgentFlowEditorProps } from './types';

export function AgentFlowEditor({ agentId }: AgentFlowEditorProps) {
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
  } = useAgentEditor({ agentId });

  if (loading) {
    return (
      <Center style={{ width: '100%', height: '100%' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <EditorToolbar
          agentName={agent?.name || ''}
          saving={saving}
          running={running}
          onSave={saveAgent}
          onRun={runAgent}
          onStop={stopAgent}
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
      {selectedNode && (
        <NodeSettingsPanel node={selectedNode} onUpdate={updateNodeData} onClose={onPaneClick} />
      )}
    </div>
  );
}
