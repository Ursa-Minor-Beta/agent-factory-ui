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
  Code,
  CopyButton,
  Textarea,
  Tabs,
  Stack,
} from '@mantine/core';
import { IconAlertCircle, IconBulb, IconCopy, IconCheck, IconLayoutColumns } from '@tabler/icons-react';
import { JsonEditor } from '../JsonEditor';
import { TipsPanel } from './TipsPanel';
import { NodeTypesPanel } from './NodeTypesPanel';
import { useAgentCreate } from './useAgentCreate';
import type { AgentCreateModalProps } from './agentCreate.types';

export function AgentCreateModal({ opened, onClose, onSave, agent }: AgentCreateModalProps) {
  const {
    isEditMode,
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
    nodesText,
    handleNodesTextChange,
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
    splitEnabled,
    setSplitEnabled,
    splitRatio,
    editorContainerRef,
    handleSplitResizeStart,
    handleClose,
  } = useAgentCreate({ opened, onClose, onSave, agent });

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm" justify="space-between" style={{ width: '100%' }}>
          <Group gap="sm">
            <Text fw={600}>{isEditMode ? 'Edit Agent' : 'New Agent'}</Text>
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
          <Group gap="sm">
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="agent-form" loading={saving} disabled={!nodesValid}>
              {isEditMode ? 'Save' : 'Create Agent'}
            </Button>
          </Group>
        </Group>
      }
      fullScreen
      trapFocus={false}
      withCloseButton={false}
      styles={{
        title: { flex: 1 },
      }}
    >
      <form id="agent-form" onSubmit={handleSubmit(onSubmit)} style={{ height: '100%' }}>
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
            {/* Left panel - JSON editor */}
            <Box
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                marginRight: 8,
              }}
            >
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Text>Nodes</Text>
                  <Badge size="sm" variant="light">
                    {nodes.length}
                  </Badge>
                  <Tooltip label={splitEnabled ? 'Disable split view' : 'Enable split view'}>
                    <ActionIcon
                      variant={splitEnabled ? 'filled' : 'subtle'}
                      color="cyan"
                      size="sm"
                      onClick={() => setSplitEnabled((v) => !v)}
                    >
                      <IconLayoutColumns size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                {!nodesValid && (
                  <Text size="xs" c="red">
                    Invalid JSON
                  </Text>
                )}
              </Group>
              <Box
                ref={editorContainerRef}
                style={{ flex: 1, minHeight: 0, display: 'flex' }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {splitEnabled ? (
                  <>
                    {/* Left editor pane */}
                    <Box style={{ width: `${splitRatio * 100}%`, minWidth: 0 }}>
                      <JsonEditor value={nodes} text={nodesText} onTextChange={handleNodesTextChange} />
                    </Box>
                    {/* Split resize divider */}
                    <Box
                      onMouseDown={handleSplitResizeStart}
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
                    {/* Right editor pane */}
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <JsonEditor value={nodes} text={nodesText} onTextChange={handleNodesTextChange} />
                    </Box>
                  </>
                ) : (
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <JsonEditor value={nodes} onChange={handleNodesChange} />
                  </Box>
                )}
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

            {/* Right panel - Tabs */}
            <Box
              style={{
                width: rightPanelWidth,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                paddingLeft: 8
              }}
            >
              <Tabs defaultValue="info" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Tabs.List>
                  <Tabs.Tab value="info">Info</Tabs.Tab>
                  <Tabs.Tab value="nodes">Available Nodes</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="info" style={{ flex: 1, overflow: 'auto', paddingTop: 'var(--mantine-spacing-md)' }}>
                  <Stack gap="md">
                    <TextInput
                      label="Name"
                      placeholder="Enter agent name"
                      error={errors.name?.message}
                      disabled={agent?.isSystem}
                      {...register('name', { required: 'Name is required' })}
                    />
                    <Textarea
                      label="Description"
                      placeholder="Enter description (optional)"
                      autosize
                      minRows={3}
                      maxRows={8}
                      {...register('description')}
                    />
                    {isEditMode && agent && (
                      <Group gap="xs">
                        <Code>ID: {agent.id}</Code>
                        <CopyButton value={agent.id}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied' : 'Copy'}>
                              <ActionIcon variant="subtle" size="sm" onClick={copy}>
                                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                    )}
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="nodes" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
                  <NodeTypesPanel
                    nodeTypes={nodeTypes}
                    loading={nodeTypesLoading}
                    error={nodeTypesError}
                    width="100%"
                    onAddNode={handleAddNode}
                  />
                </Tabs.Panel>
              </Tabs>
            </Box>
          </Box>

        </Box>
      </form>
    </Modal>
  );
}
