import { useId, type CSSProperties } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Panel, type Edge, type OnNodesChange, type Node, type NodeTypes, type NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './AgentsGraph.css';
import { ActionIcon, Alert, Box, Center, Loader, Paper, Tooltip, useComputedColorScheme } from '@mantine/core';
import { IconAlertCircle, IconLayoutGrid } from '@tabler/icons-react';
import { useFitWidthViewport } from './hooks/useFitWidthViewport';
import type { GraphBounds } from './types';

interface AgentsGraphViewProps {
  nodes: Node[];
  edges: Edge[];
  bounds: GraphBounds | null;
  nodeTypes: NodeTypes;
  loading: boolean;
  error: string | null;
  style: CSSProperties; // Outer container sizing
  topInset?: number; // Extra top space (px) kept free when fitting, e.g. for a toolbar floating over the graph
  nodesDraggable?: boolean;
  viewportStorageKey?: string; // Remember the user's pan/zoom under this key instead of always fitting
  onNodesChange?: OnNodesChange;
  onResetLayout?: () => void; // Shows a reset button when given (e.g. nodes were moved)
  onNodeClick?: NodeMouseHandler;
  onNodeDoubleClick?: NodeMouseHandler;
  onNodeContextMenu?: NodeMouseHandler;
  onPaneClick?: () => void;
}

// Shared read-only React Flow canvas for the agents graph variants
export function AgentsGraphView(props: AgentsGraphViewProps) {
  // Own provider so the graph never shares the agent editor's React Flow store
  return (
    <ReactFlowProvider>
      <AgentsGraphViewInner {...props} />
    </ReactFlowProvider>
  );
}

function AgentsGraphViewInner({
  nodes, edges, bounds, nodeTypes, loading, error, style, topInset, nodesDraggable, viewportStorageKey, onNodesChange, onResetLayout,
  onNodeClick, onNodeDoubleClick, onNodeContextMenu, onPaneClick,
}: AgentsGraphViewProps) {
  const colorScheme = useComputedColorScheme('dark');
  // Unique SVG pattern id - another canvas on the page (the editor) would otherwise share it
  const backgroundId = useId();
  const { ref, viewport, setViewport, onMoveEnd } = useFitWidthViewport(bounds, topInset, viewportStorageKey);

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">{error}</Alert>
      )}

      <Paper ref={ref} style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <Center h="100%"><Loader /></Center>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            className="agents-graph"
            colorMode={colorScheme}
            viewport={viewport}
            onViewportChange={setViewport}
            onMoveEnd={onMoveEnd}
            minZoom={0.05}
            nodesConnectable={false}
            nodesDraggable={nodesDraggable}
            onNodesChange={onNodesChange}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
          >
            <Background id={backgroundId} />
            {onResetLayout && (
              <Panel position="bottom-right">
                <Tooltip label="Reset layout">
                  <ActionIcon variant="default" onClick={onResetLayout} aria-label="Reset layout">
                    <IconLayoutGrid size={16} />
                  </ActionIcon>
                </Tooltip>
              </Panel>
            )}
          </ReactFlow>
        )}
      </Paper>
    </Box>
  );
}
