import { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Text, Group, ActionIcon, Divider, Tabs } from '@mantine/core';
import { IconLayoutSidebar, IconSettings, IconNote, IconBrush } from '@tabler/icons-react';
import type { NodeType } from '../../../api';
import type { Agent } from '../../../types/agent';
import { NodesTab } from './NodesTab';
import { SettingsTab } from './SettingsTab';
import { CanvasTab } from './CanvasTab';

const MIN_WIDTH = 120;
const MAX_WIDTH_RATIO = 0.4; // 40% of viewport
const STORAGE_KEY = 'agent-editor-palette-width';
const TAB_STORAGE_KEY = 'agent-editor-active-tab';

interface PanelLeftProps {
  nodeTypes: NodeType[];
  existingNodeTypes: Set<string>;
  edgeType: string;
  agent: Agent | null;
  onAddNode: (nodeType: NodeType, exampleIndex?: number) => void;
  onEdgeTypeChange: (value: string) => void;
  onAgentInfoChange: (data: { name?: string; description?: string }) => Promise<void>;
  onClose: () => void;
}

export function PanelLeft({ nodeTypes, existingNodeTypes, edgeType, agent, onAddNode, onEdgeTypeChange, onAgentInfoChange, onClose }: PanelLeftProps) {
  const [viewingNodeType, setViewingNodeType] = useState<NodeType | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return saved || 'nodes';
  });
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 180;
  });
  const resizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  // Cleanup resize state on unmount
  useEffect(() => {
    return () => {
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Get the container's left offset to calculate width correctly
    const containerLeft = containerRef.current?.getBoundingClientRect().left ?? 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
      const newWidth = e.clientX - containerLeft;
      setWidth(Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth)));
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

  return (
    <Box
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        display: 'flex',
        zIndex: 100,
      }}
    >
      <Box
        style={{
          width,
          height: '100%',
          background: 'var(--mantine-color-body)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderRight: '1px solid var(--mantine-color-default-border)',
          overflow: 'hidden',
        }}
      >
        <>
          <Group gap="xs" align="center" justify="space-between" style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 8 }}>
            <Text fw={600} size="sm">Agent Editor</Text>
            <ActionIcon
              size="md"
              variant="subtle"
              title="Hide Panel"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <IconLayoutSidebar size={16} />
            </ActionIcon>
          </Group>
          <Divider />

          <Tabs value={activeTab} onChange={setActiveTab} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <Tabs.List px="xs" pt="xs">
              <Tabs.Tab value="nodes" leftSection={<IconNote size={14} />}>
                Nodes
              </Tabs.Tab>
              <Tabs.Tab value="settings" leftSection={<IconSettings size={14} />}>
                Settings
              </Tabs.Tab>
              <Tabs.Tab value="canvas" leftSection={<IconBrush size={14} />}>
                Canvas
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="nodes" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <NodesTab
                nodeTypes={nodeTypes}
                existingNodeTypes={existingNodeTypes}
                viewingNodeType={viewingNodeType}
                onAddNode={onAddNode}
                onNodeClick={setViewingNodeType}
                onBack={() => setViewingNodeType(null)}
              />
            </Tabs.Panel>

            <Tabs.Panel value="canvas" style={{ flex: 1, minHeight: 0 }} p="xs">
              <CanvasTab edgeType={edgeType} onEdgeTypeChange={onEdgeTypeChange} />
            </Tabs.Panel>

            <Tabs.Panel value="settings" style={{ flex: 1, minHeight: 0 }} p="xs">
              <SettingsTab agent={agent} onAgentInfoChange={onAgentInfoChange} />
            </Tabs.Panel>
          </Tabs>
        </>
      </Box>

      {/* Resize handle */}
      <Box
        onMouseDown={handleResizeStart}
        style={{
          width: 8,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Box
          style={{
            width: 4,
            height: 40,
            borderRadius: 2,
            backgroundColor: 'var(--mantine-color-default-border)',
          }}
        />
      </Box>
    </Box>
  );
}
