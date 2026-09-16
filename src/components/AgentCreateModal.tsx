import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Group,
  Button,
  Alert,
  Box,
  Text,
  ActionIcon,
  Tooltip,
  Paper,
  Code,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconBulb,
  IconX,
  IconGripHorizontal,
} from '@tabler/icons-react';
import { JsonEditor } from './JsonEditor';
import { agentsApi } from '../api';
import type { AgentNode } from '../types';

const TIPS_POSITION_KEY = 'agent-create-tips-position';
const TIPS_PANEL_WIDTH = 320;
const TIPS_PANEL_HEIGHT = 150;

const DEFAULT_NODES: AgentNode[] = [];

interface AgentCreateForm {
  name: string;
  description: string;
}

export interface AgentCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: () => void;
  isMobile: boolean;
}

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

export function AgentCreateModal({ opened, onClose, onSave, isMobile }: AgentCreateModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nodes, setNodes] = useState<AgentNode[]>(DEFAULT_NODES);
  const [nodesValid, setNodesValid] = useState(true);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [tipsPosition, setTipsPosition] = useState(loadTipsPosition);
  const tipsDragRef = useRef<{ startX: number; startY: number; isDragging: boolean }>({
    startX: 0,
    startY: 0,
    isDragging: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AgentCreateForm>();

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

  // Reset state when modal opens
  useEffect(() => {
    if (opened) {
      reset({ name: '', description: '' });
      setNodes(DEFAULT_NODES);
      setNodesValid(true);
      setError('');
    }
  }, [opened, reset]);

  const handleClose = () => {
    reset({ name: '', description: '' });
    setNodes(DEFAULT_NODES);
    setNodesValid(true);
    setError('');
    onClose();
  };

  const handleNodesChange = (value: unknown, isValid: boolean) => {
    setNodesValid(isValid);
    if (isValid) {
      setNodes(value as AgentNode[]);
    }
  };

  const onSubmit = async (data: AgentCreateForm) => {
    if (!nodesValid) {
      setError('Invalid JSON in nodes');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await agentsApi.create({
        name: data.name,
        description: data.description || undefined,
        nodes,
      });
      handleClose();
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <Text fw={600}>New Agent</Text>
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
      fullScreen={isMobile}
      size="xl"
      trapFocus={false}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100vh - 120px)' : 'auto' }}>
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
                backgroundColor: 'var(--mantine-color-default)',
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
              onMouseUp={() => {
                tipsDragRef.current.isDragging = false;
              }}
              onMouseLeave={() => {
                tipsDragRef.current.isDragging = false;
              }}
            >
              <Group
                justify="space-between"
                px="sm"
                py="xs"
                style={{
                  cursor: 'grab',
                  backgroundColor: 'var(--mantine-color-default-hover)',
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                }}
                onMouseDown={(e) => {
                  tipsDragRef.current.isDragging = true;
                  tipsDragRef.current.startX = e.clientX;
                  tipsDragRef.current.startY = e.clientY;
                }}
              >
                <Group gap="xs">
                  <IconGripHorizontal size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                  <Text size="sm" fw={600}>
                    Tips
                  </Text>
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

          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Enter agent name"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />

            <Textarea
              label="Description"
              placeholder="Enter agent description (optional)"
              rows={2}
              {...register('description')}
            />

            <Box style={{ flex: isMobile ? 1 : undefined, minHeight: isMobile ? 0 : 300 }}>
              <Group justify="space-between" mb="xs">
                <Text fw={600}>Nodes</Text>
                {!nodesValid && (
                  <Text size="xs" c="red">
                    Invalid JSON
                  </Text>
                )}
              </Group>
              <Box
                style={{ height: isMobile ? '100%' : 300 }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <JsonEditor value={nodes} onChange={handleNodesChange} />
              </Box>
            </Box>
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!nodesValid}>
              Create Agent
            </Button>
          </Group>
        </Box>
      </form>
    </Modal>
  );
}
