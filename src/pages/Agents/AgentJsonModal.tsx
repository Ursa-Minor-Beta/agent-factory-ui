import { useState, useRef, useEffect } from 'react';
import { Modal, Box, Text, Button, Group, Alert } from '@mantine/core';
import { IconDeviceFloppy, IconAlertCircle } from '@tabler/icons-react';
import { JsonEditor } from '../../components/JsonEditor';
import { agentsApi } from '../../api';
import type { AgentNode, AgentEdge } from '../../types';
import type { AgentJsonModalProps } from './types';

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
