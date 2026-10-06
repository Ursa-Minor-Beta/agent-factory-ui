import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Text,
  Group,
  Loader,
  Alert,
  ActionIcon,
  Tooltip,
  Tabs,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconEdit,
  IconTrash,
  IconAlertCircle,
  IconList,
  IconRobot,
  IconCloud,
  IconKey,
  IconDatabase,
} from '@tabler/icons-react';
import { workspacesApi } from '../../api/workspaces';
import type { Workspace } from '../../types/workspace';
import { WorkspaceModal } from './WorkspaceModal';
import { WorkspaceDeleteModal } from './WorkspaceDeleteModal';
import { AgentsList } from '../../components/AgentsList';
import { WorkspaceProviders } from './WorkspaceProviders';
import { WorkspaceSecrets } from './WorkspaceSecrets';
import { WorkspaceCollections } from './WorkspaceCollections';

export function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit modal
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  // Load workspace data
  useEffect(() => {
    if (!workspaceId) return;

    const loadWorkspace = async () => {
      try {
        setLoading(true);
        const workspaceData = await workspacesApi.getById(workspaceId);
        setWorkspace(workspaceData);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace');
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [workspaceId]);

  const handleSave = async (data: { name: string; description: string }) => {
    if (!workspace) return;

    try {
      setSaving(true);
      const updated = await workspacesApi.update(workspace.id, data);
      setWorkspace(updated);
      closeEditModal();

      // Dispatch event to update sidebar
      window.dispatchEvent(new CustomEvent('workspace-updated', { detail: { workspace: updated } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workspace) return;

    try {
      setDeleting(true);
      await workspacesApi.delete(workspace.id);

      // Dispatch event to update sidebar
      window.dispatchEvent(new CustomEvent('workspace-deleted', { detail: { workspaceId: workspace.id } }));

      navigate('/workspaces');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Loader />
      </Box>
    );
  }

  if (!workspace) {
    return (
      <Box>
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          Workspace not found
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Group mb="lg" align="flex-start" justify="space-between">
        <Group align="flex-start" gap="xs">
          <Tooltip label="All workspaces">
            <ActionIcon variant="subtle" color="gray" size="md" component={Link} to="/workspaces">
              <IconList size={18} />
            </ActionIcon>
          </Tooltip>
          <Group gap="xs" align="baseline">
            <Text fw={500} size="lg">
              Workspace: {workspace.name}
            </Text>
            <Text c="dimmed" size="sm">
              — {workspace.description}
            </Text>
          </Group>
        </Group>
        <Group gap="xs">
            <Tooltip label="Edit workspace">
              <ActionIcon variant="subtle" color="cyan" size="md" onClick={openEditModal}>
                <IconEdit size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete workspace">
              <ActionIcon variant="subtle" color="red" size="md" onClick={openDeleteModal}>
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
        </Group>
      </Group>

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

      <Tabs defaultValue="agents">
        <Tabs.List mb="md">
          <Tabs.Tab value="agents" leftSection={<IconRobot size={16} />}>
            Agents{workspace.agentCount !== undefined && ` (${workspace.agentCount})`}
          </Tabs.Tab>
          <Tabs.Tab value="providers" leftSection={<IconCloud size={16} />}>
            Providers{workspace.providerCount !== undefined && ` (${workspace.providerCount})`}
          </Tabs.Tab>
          <Tabs.Tab value="secrets" leftSection={<IconKey size={16} />}>
            Secrets{workspace.secretCount !== undefined && ` (${workspace.secretCount})`}
          </Tabs.Tab>
          <Tabs.Tab value="collections" leftSection={<IconDatabase size={16} />}>
            Collections{workspace.collectionCount !== undefined && ` (${workspace.collectionCount})`}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="agents">
          <AgentsList
            workspaceId={workspaceId}
            showFilters={false}
            showPagination={false}
            showCreateButton={true}
          />
        </Tabs.Panel>

        <Tabs.Panel value="providers">
          <WorkspaceProviders workspaceId={workspaceId!} />
        </Tabs.Panel>

        <Tabs.Panel value="secrets">
          <WorkspaceSecrets workspaceId={workspaceId!} />
        </Tabs.Panel>

        <Tabs.Panel value="collections">
          <WorkspaceCollections workspaceId={workspaceId!} />
        </Tabs.Panel>
      </Tabs>

      <WorkspaceModal
        opened={editModalOpened}
        onClose={closeEditModal}
        workspace={workspace}
        onSave={handleSave}
        saving={saving}
      />

      <WorkspaceDeleteModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        workspace={workspace}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </Box>
  );
}
