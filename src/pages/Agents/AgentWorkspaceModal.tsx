import { useState, useEffect } from 'react';
import { Modal, Stack, Select, Group, Button, Text } from '@mantine/core';
import { agentsApi } from '../../api';
import { workspacesApi } from '../../api/workspaces';
import type { Agent } from '../../types';
import type { Workspace } from '../../types/workspace';

interface AgentWorkspaceModalProps {
  agent: Agent | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AgentWorkspaceModal({ agent, onClose, onSaved }: AgentWorkspaceModalProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Load workspaces and set initial value
  useEffect(() => {
    if (agent) {
      setSelectedWorkspaceId(agent.workspaceId || '');

      const loadWorkspaces = async () => {
        setWorkspacesLoading(true);
        try {
          const data = await workspacesApi.list({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
          setWorkspaces(data.workspaces);
        } catch (err) {
          console.error('Failed to load workspaces:', err);
        } finally {
          setWorkspacesLoading(false);
        }
      };

      loadWorkspaces();
    }
  }, [agent]);

  const handleSave = async () => {
    if (!agent) return;

    setSaving(true);
    try {
      await agentsApi.update(agent.id, {
        workspaceId: selectedWorkspaceId || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to update workspace:', err);
    } finally {
      setSaving(false);
    }
  };

  const workspaceName = workspaces.find(ws => ws.id === agent?.workspaceId)?.name;

  return (
    <Modal
      opened={!!agent}
      onClose={onClose}
      title="Manage Agent Workspace"
      size="md"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Assign <Text span fw={600}>{agent?.name}</Text> to a workspace
        </Text>

        {agent?.workspaceId && workspaceName && (
          <Text size="sm">
            Current workspace: <Text span fw={600} c="cyan">{workspaceName}</Text>
          </Text>
        )}

        <Select
          label="Workspace"
          placeholder={workspacesLoading ? 'Loading...' : 'Select workspace (or leave empty for no workspace)'}
          value={selectedWorkspaceId}
          onChange={(val) => setSelectedWorkspaceId(val || '')}
          data={workspaces.map((ws) => ({ value: ws.id, label: ws.name }))}
          disabled={workspacesLoading}
          searchable
          clearable
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
