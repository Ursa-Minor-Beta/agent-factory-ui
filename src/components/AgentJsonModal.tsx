import { useState, useRef, useEffect } from 'react';
import { Modal, Box, Text, Button, Group, Alert, Code, ActionIcon, Tooltip, Paper, Stack } from '@mantine/core';
import { IconDeviceFloppy, IconAlertCircle, IconBulb, IconX, IconGripHorizontal } from '@tabler/icons-react';
import { JsonEditor } from './JsonEditor';
import { agentsApi } from '../api';
import type { AgentNode, AgentEdge, AgentJsonModalProps } from '../types';

const TIPS_POSITION_KEY = 'agent-json-tips-position';
const TIPS_PANEL_WIDTH = 320;
const TIPS_PANEL_HEIGHT = 150;

function loadTipsPosition(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(TIPS_POSITION_KEY);
    if (saved) {
      const pos = JSON.parse(saved);
      if (typeof pos.x === 'number' && typeof pos.y === 'number') {
        return pos;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { x: 20, y: 80 };
}

function clampToViewport(pos: { x: number; y: number }): { x: number; y: number } {
  const maxX = window.innerWidth - TIPS_PANEL_WIDTH - 20;
  const maxY = window.innerHeight - TIPS_PANEL_HEIGHT - 20;
  return {
    x: Math.max(0, Math.min(pos.x, maxX)),
    y: Math.max(0, Math.min(pos.y, maxY)),
  };
}

export function AgentJsonModal({ agent, onClose, onSave, isMobile }: AgentJsonModalProps) {
  const [splitPercent, setSplitPercent] = useState(70);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<AgentNode[]>([]);
  const [edges, setEdges] = useState<AgentEdge[]>([]);
  const [nodesValid, setNodesValid] = useState(true);
  const [edgesValid, setEdgesValid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [tipsPosition, setTipsPosition] = useState(loadTipsPosition);
  const tipsDragRef = useRef<{ startX: number; startY: number; isDragging: boolean }>({
    startX: 0,
    startY: 0,
    isDragging: false,
  });

  // Save tips position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(TIPS_POSITION_KEY, JSON.stringify(tipsPosition));
  }, [tipsPosition]);

  // Clamp position to viewport when opening tips
  useEffect(() => {
    if (tipsOpen) {
      setTipsPosition((prev) => clampToViewport(prev));
    }
  }, [tipsOpen]);

  // Reset state when agent changes
  useEffect(() => {
    if (agent) {
      setNodes(agent.nodes);
      setEdges(agent.edges);
      setNodesValid(true);
      setEdgesValid(true);
      setHasChanges(false);
      setError('');
    }
  }, [agent]);

  const handleNodesChange = (value: unknown, isValid: boolean) => {
    setNodesValid(isValid);
    if (isValid) {
      setNodes(value as AgentNode[]);
      setHasChanges(true);
    }
  };

  const handleEdgesChange = (value: unknown, isValid: boolean) => {
    setEdgesValid(isValid);
    if (isValid) {
      setEdges(value as AgentEdge[]);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (!agent || !nodesValid || !edgesValid) return;

    try {
      setSaving(true);
      setError('');
      await agentsApi.update(agent.id, { nodes, edges });
      setHasChanges(false);
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const canSave = nodesValid && edgesValid && hasChanges && !saving;

  return (
    <Modal
      opened={!!agent}
      onClose={onClose}
      title={
        <Group gap="sm">
          <Text fw={600}>{agent?.name} - Structure</Text>
          {hasChanges && <Text size="xs" c="yellow">Unsaved changes</Text>}
          <Tooltip label={tipsOpen ? 'Hide tips' : 'Show tips'}>
            <ActionIcon
              variant={tipsOpen ? 'filled' : 'subtle'}
              color="cyan"
              size="sm"
              onClick={() => setTipsOpen((o) => !o)}
            >
              <IconBulb size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      }
      fullScreen
      trapFocus={false}
    >
      {agent && (
        <Box style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              mb="md"
              withCloseButton
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}

          {/* Floating Tips Panel */}
          {tipsOpen && (
            <Paper
              shadow="lg"
              withBorder
              p={0}
              style={{
                position: 'fixed',
                left: tipsPosition.x,
                top: tipsPosition.y,
                zIndex: 1000,
                width: 320,
                backgroundColor: 'var(--mantine-color-dark-7)',
              }}
              onMouseMove={(e) => {
                if (!tipsDragRef.current.isDragging) return;
                const dx = e.clientX - tipsDragRef.current.startX;
                const dy = e.clientY - tipsDragRef.current.startY;
                setTipsPosition((prev) => ({
                  x: Math.max(0, prev.x + dx),
                  y: Math.max(0, prev.y + dy),
                }));
                tipsDragRef.current.startX = e.clientX;
                tipsDragRef.current.startY = e.clientY;
              }}
              onMouseUp={() => { tipsDragRef.current.isDragging = false; }}
              onMouseLeave={() => { tipsDragRef.current.isDragging = false; }}
            >
              <Group
                justify="space-between"
                px="sm"
                py="xs"
                style={{
                  cursor: 'grab',
                  backgroundColor: 'var(--mantine-color-dark-6)',
                  borderBottom: '1px solid var(--mantine-color-dark-4)',
                }}
                onMouseDown={(e) => {
                  tipsDragRef.current.isDragging = true;
                  tipsDragRef.current.startX = e.clientX;
                  tipsDragRef.current.startY = e.clientY;
                }}
              >
                <Group gap="xs">
                  <IconGripHorizontal size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                  <Text size="sm" fw={600}>Tips</Text>
                </Group>
                <ActionIcon variant="subtle" size="xs" onClick={() => setTipsOpen(false)}>
                  <IconX size={14} />
                </ActionIcon>
              </Group>
              <Stack gap="xs" p="sm">
                <Text size="xs">
                  Use <Code fz="xs">{'{{variable}}'}</Code> to reference variables.
                </Text>
                <Text size="xs">
                  Use <Code fz="xs">{'{{secret:NAME}}'}</Code> for secrets.
                </Text>
                <Text size="xs">
                  Use <Code fz="xs">{'{{node-id.output}}'}</Code> to reference outputs from other nodes.
                </Text>
              </Stack>
            </Paper>
          )}

          <Box
            ref={containerRef}
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              flex: 1,
              minHeight: 0,
              userSelect: isDraggingRef.current ? 'none' : undefined,
            }}
            onMouseMove={(e) => {
              if (!isDraggingRef.current || isMobile || !containerRef.current) return;
              const rect = containerRef.current.getBoundingClientRect();
              const percent = ((e.clientX - rect.left) / rect.width) * 100;
              setSplitPercent(Math.min(Math.max(percent, 20), 80));
            }}
            onMouseUp={() => { isDraggingRef.current = false; }}
            onMouseLeave={() => { isDraggingRef.current = false; }}
          >
            <Box style={{
              width: isMobile ? '100%' : `${splitPercent}%`,
              flex: isMobile ? 1 : undefined,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              minHeight: isMobile ? 0 : undefined,
              paddingRight: isMobile ? 0 : 8,
            }}>
              <Group justify="space-between" mb="xs">
                <Text fw={600}>Nodes ({nodes.length})</Text>
                {!nodesValid && <Text size="xs" c="red">Invalid JSON</Text>}
              </Group>
              <Box style={{ flex: 1, minHeight: 0 }} onKeyDown={(e) => e.stopPropagation()}>
                <JsonEditor
                  value={nodes}
                  onChange={handleNodesChange}
                />
              </Box>
            </Box>

            {!isMobile && (
              <Box
                onMouseDown={() => { isDraggingRef.current = true; }}
                style={{
                  width: 8,
                  cursor: 'col-resize',
                  backgroundColor: 'var(--mantine-color-dark-5)',
                  borderRadius: 4,
                  transition: 'background-color 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--mantine-color-cyan-7)'; }}
                onMouseLeave={(e) => {
                  if (!isDraggingRef.current) {
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-5)';
                  }
                }}
              />
            )}

            <Box style={{
              width: isMobile ? '100%' : `${100 - splitPercent}%`,
              flex: isMobile ? 1 : undefined,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              minHeight: isMobile ? 0 : undefined,
              paddingLeft: isMobile ? 0 : 8,
              marginTop: isMobile ? 16 : 0,
            }}>
              <Group justify="space-between" mb="xs">
                <Text fw={600}>Edges ({edges.length})</Text>
                {!edgesValid && <Text size="xs" c="red">Invalid JSON</Text>}
              </Group>
              <Box style={{ flex: 1, minHeight: 0 }} onKeyDown={(e) => e.stopPropagation()}>
                <JsonEditor
                  value={edges}
                  onChange={handleEdgesChange}
                />
              </Box>
            </Box>
          </Box>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSave}
              loading={saving}
              disabled={!canSave}
            >
              Save Changes
            </Button>
          </Group>
        </Box>
      )}
    </Modal>
  );
}
