import type { CSSProperties } from 'react';
import { ReactFlow, ReactFlowProvider, Background, type Edge, type Node, type NodeTypes, type NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './AgentsGraph.css';
import { Alert, Box, Center, Loader, Paper, useComputedColorScheme } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
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
  onNodeClick?: NodeMouseHandler;
  onNodeDoubleClick?: NodeMouseHandler;
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
  nodes, edges, bounds, nodeTypes, loading, error, style, topInset, nodesDraggable, onNodeClick, onNodeDoubleClick, onPaneClick,
}: AgentsGraphViewProps) {
  const colorScheme = useComputedColorScheme('dark');
  const { ref, viewport, setViewport } = useFitWidthViewport(bounds, topInset);

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
            minZoom={0.05}
            nodesConnectable={false}
            nodesDraggable={nodesDraggable}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
          >
            <Background />
          </ReactFlow>
        )}
      </Paper>
    </Box>
  );
}
