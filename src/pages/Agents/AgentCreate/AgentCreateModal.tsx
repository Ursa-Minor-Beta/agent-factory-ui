import {
  Modal,
  Box,
  Text,
  TextInput,
  Group,
  Button,
  Alert,
  ActionIcon,
  Tooltip,
  Badge,
} from '@mantine/core';
import { IconAlertCircle, IconBulb } from '@tabler/icons-react';
import { JsonEditor } from '../../../components/JsonEditor';
import { TipsPanel } from './TipsPanel';
import { NodeTypesPanel } from './NodeTypesPanel';
import { useAgentCreate } from './useAgentCreate';
import type { AgentCreateModalProps } from './agentCreate.types';

export function AgentCreateModal({ opened, onClose, onSave }: AgentCreateModalProps) {
  const {
    register,
    handleSubmit,
    errors,
    saving,
    error,
    setError,
    onSubmit,
    nodes,
    nodesValid,
    handleNodesChange,
    handleAddNode,
    nodeTypes,
    nodeTypesLoading,
    nodeTypesError,
    tipsOpen,
    setTipsOpen,
    tipsPosition,
    setTipsPosition,
    rightPanelWidth,
    containerRef,
    handleResizeStart,
    handleClose,
  } = useAgentCreate({ opened, onClose, onSave });

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
      fullScreen
      trapFocus={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ height: '100%' }}>
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

          {tipsOpen && (
            <TipsPanel
              position={tipsPosition}
              onPositionChange={setTipsPosition}
              onClose={() => setTipsOpen(false)}
            />
          )}

          <Box ref={containerRef} style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* Left panel - Form fields and JSON editor */}
            <Box
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                marginRight: 8,
              }}
            >
              <Group gap="md" mb="md">
                <TextInput
                  label="Name"
                  placeholder="Enter agent name"
                  error={errors.name?.message}
                  style={{ flex: 1 }}
                  {...register('name', { required: 'Name is required' })}
                />
                <TextInput
                  label="Description"
                  placeholder="Enter description (optional)"
                  style={{ flex: 2 }}
                  {...register('description')}
                />
              </Group>

              <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <Text fw={600}>Nodes</Text>
                    <Badge size="sm" variant="light">
                      {nodes.length}
                    </Badge>
                  </Group>
                  {!nodesValid && (
                    <Text size="xs" c="red">
                      Invalid JSON
                    </Text>
                  )}
                </Group>
                <Box style={{ flex: 1, minHeight: 0 }} onKeyDown={(e) => e.stopPropagation()}>
                  <JsonEditor value={nodes} onChange={handleNodesChange} />
                </Box>
              </Box>
            </Box>

            {/* Resize divider */}
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

            {/* Right panel - Node types */}
            <NodeTypesPanel
              nodeTypes={nodeTypes}
              loading={nodeTypesLoading}
              error={nodeTypesError}
              width={rightPanelWidth}
              onAddNode={handleAddNode}
            />
          </Box>

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
