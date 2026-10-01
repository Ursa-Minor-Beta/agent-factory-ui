import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  Group,
  Loader,
  Alert,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconEdit,
  IconTrash,
  IconAlertCircle,
  IconArrowLeft,
} from '@tabler/icons-react';
import { workspacesApi } from '../../api/workspaces';
import type { Workspace, WorkspaceDeleteMode } from '../../types/workspace';
import { WorkspaceModal } from './WorkspaceModal';
import { WorkspaceDeleteModal } from './WorkspaceDeleteModal';
import { AgentsList } from '../../components/AgentsList';

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
  const [agentCount, setAgentCount] = useState(0);

  // Load workspace data
  useEffect(() => {
    if (!workspaceId) return;

    const loadWorkspace = async () => {
      try {
        setLoading(true);
        const [workspaceData, countData] = await Promise.all([
          workspacesApi.getById(workspaceId),
          workspacesApi.getAgentCount(workspaceId),
        ]);
        setWorkspace(workspaceData);
        setAgentCount(countData.count);
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

  const handleDelete = async (mode: WorkspaceDeleteMode) => {
    if (!workspace) return;

    try {
      setDeleting(true);
      await workspacesApi.delete(workspace.id, mode);

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
      <Group mb="lg" align="flex-start">
        {/* <ActionIcon variant="subtle" onClick={() => navigate('/workspaces')}>
          <IconArrowLeft size={20} />
        </ActionIcon> */}
        <Box>
          <Text fw={500} size="lg" mb="xs">
            Workspace {workspace.name}
          </Text>
          <Text c="dimmed" size="sm" mb="md">
            {workspace.description}
          </Text>
        </Box>
        <Box style={{ flex: 1 }} />
        <Tooltip label="Edit workspace">
          <ActionIcon variant="subtle" color="cyan" size="lg" onClick={openEditModal}>
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete workspace">
          <ActionIcon variant="subtle" color="red" size="lg" onClick={openDeleteModal}>
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
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

      {/* Agents list for this workspace */}
      <AgentsList
        workspaceId={workspaceId}
        showFilters={false}
        showPagination={false}
        showCreateButton={false}
      />

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
        agentCount={agentCount}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </Box>
  );
}
