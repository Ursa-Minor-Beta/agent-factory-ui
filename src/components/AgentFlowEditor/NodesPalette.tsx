import { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Text, Stack, ScrollArea, Center, Loader, Group, ActionIcon, Tooltip, Menu, Divider } from '@mantine/core';
import { IconPlus, IconChevronDown, IconArrowLeft, IconLayoutSidebar } from '@tabler/icons-react';
import type { NodeType } from '../../api';

const MIN_WIDTH = 120;
const MAX_WIDTH_RATIO = 0.4; // 40% of viewport
const STORAGE_KEY = 'agent-editor-palette-width';

interface NodesPaletteProps {
  nodeTypes: NodeType[];
  onAddNode: (nodeType: NodeType, exampleIndex?: number) => void;
  onClose: () => void;
}

function NodeTypeDetail({
  nodeType,
  onBack,
  onAdd,
}: {
  nodeType: NodeType;
  onBack: () => void;
  onAdd: (nodeType: NodeType, exampleIndex?: number) => void;
}) {
  const hasMultipleExamples = nodeType.examples && nodeType.examples.length > 1;

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Group justify="space-between" align="center" style={{ paddingLeft: 16, paddingRight: 10, paddingTop: 16, paddingBottom: 16 }}>
        <Group gap="xs">
          <ActionIcon variant="subtle" size="xs" onClick={onBack}>
            <IconArrowLeft size={14} />
          </ActionIcon>
          <Text fw={600} size="sm" truncate style={{ maxWidth: 100 }}>{nodeType.type}</Text>
        </Group>
        {hasMultipleExamples ? (
          <ActionIcon.Group>
            <Tooltip label="Add">
              <ActionIcon
                variant="subtle"
                size="xs"
                onClick={() => {
                  onAdd(nodeType, 0);
                  onBack();
                }}
              >
                <IconPlus size={12} />
              </ActionIcon>
            </Tooltip>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Tooltip label="Select">
                  <ActionIcon variant="subtle" size="xs">
                    <IconChevronDown size={12} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                {nodeType.examples!.map((example, index) => {
                  const exampleName = example.name || example.title || `Example ${index + 1}`;
                  return (
                    <Menu.Item
                      key={index}
                      onClick={() => {
                        onAdd(nodeType, index);
                        onBack();
                      }}
                    >
                      {exampleName}
                    </Menu.Item>
                  );
                })}
              </Menu.Dropdown>
            </Menu>
          </ActionIcon.Group>
        ) : (
          <Tooltip label="Add">
            <ActionIcon
              variant="subtle"
              size="xs"
              onClick={() => {
                onAdd(nodeType);
                onBack();
              }}
            >
              <IconPlus size={12} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
      <Divider />
      <ScrollArea flex={1} p="xs">
        <pre
          style={{
            fontSize: 10,
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {JSON.stringify(nodeType, null, 2)}
        </pre>
      </ScrollArea>
    </Box>
  );
}

export function NodesPalette({ nodeTypes, onAddNode, onClose }: NodesPaletteProps) {
  const [viewingNodeType, setViewingNodeType] = useState<NodeType | null>(null);
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 180;
  });
  const resizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

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
        zIndex: 5,
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
        {viewingNodeType ? (
          <NodeTypeDetail
            nodeType={viewingNodeType}
            onBack={() => setViewingNodeType(null)}
            onAdd={onAddNode}
          />
        ) : (
          <>
            <Group gap="xs" align="center" style={{ paddingLeft: 16, paddingTop: 16, paddingBottom: 8 }}>
              <ActionIcon
                size="md"
                variant="subtle"
                title="Hide Nodes Palette"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <IconLayoutSidebar size={16} />
              </ActionIcon>
              <Text fw={600} size="sm">Nodes</Text>
            </Group>
            <Divider />

            {nodeTypes.length === 0 ? (
              <Center py="xl">
                <Loader size="sm" />
              </Center>
            ) : (
              <ScrollArea flex={1} p="xs" scrollbarSize={6}>
                <Stack gap="xs">
                  {nodeTypes.map((nodeType) => {
                    const hasMultipleExamples = nodeType.examples && nodeType.examples.length > 1;

                    return (
                      <Box
                        key={nodeType.type}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 'var(--mantine-radius-sm)',
                          border: '1px solid var(--mantine-color-default-border)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setViewingNodeType(nodeType)}
                      >
                        <Group justify="space-between" wrap="nowrap" gap={4}>
                          <Text size="xs" truncate style={{ flex: 1 }}>
                            {nodeType.name || nodeType.type}
                          </Text>
                          <div onClick={(e) => e.stopPropagation()}>
                            {hasMultipleExamples ? (
                              <ActionIcon.Group>
                                <Tooltip label="Add">
                                  <ActionIcon
                                    variant="subtle"
                                    size="xs"
                                    onClick={() => onAddNode(nodeType, 0)}
                                  >
                                    <IconPlus size={12} />
                                  </ActionIcon>
                                </Tooltip>
                                <Menu position="bottom-end" withinPortal>
                                  <Menu.Target>
                                    <Tooltip label="Select">
                                      <ActionIcon variant="subtle" size="xs">
                                        <IconChevronDown size={12} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    {nodeType.examples!.map((example, index) => {
                                      const exampleName = example.name || example.title || `Example ${index + 1}`;
                                      return (
                                        <Menu.Item
                                          key={index}
                                          onClick={() => onAddNode(nodeType, index)}
                                        >
                                          {exampleName}
                                        </Menu.Item>
                                      );
                                    })}
                                  </Menu.Dropdown>
                                </Menu>
                              </ActionIcon.Group>
                            ) : (
                              <Tooltip label="Add">
                                <ActionIcon
                                  variant="subtle"
                                  size="xs"
                                  onClick={() => onAddNode(nodeType)}
                                >
                                  <IconPlus size={12} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </div>
                        </Group>
                      </Box>
                    );
                  })}
                </Stack>
              </ScrollArea>
            )}
          </>
        )}
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
