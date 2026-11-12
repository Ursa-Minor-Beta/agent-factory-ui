import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  IconVariable,
  IconCalendarTime,
  IconWebhook,
} from '@tabler/icons-react';
import { workspacesApi } from '../../api/workspaces';
import type { Workspace } from '../../types/workspace';
import { WorkspaceModal } from '../../components/Workspace';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';
import { AgentsList } from '../../components/AgentsList';
import { ProvidersList } from '../../components/Providers';
import { SecretsList } from '../../components/Secrets';
import { VariablesList } from '../../components/Variables';
import { CollectionsList } from '../../components/Collections';
import { SchedulesList } from '../../components/Schedules';
import { WebhooksList } from '../../components/Webhooks';
import { routes } from '../../config/routes';

const VALID_TABS = ['agents', 'providers', 'secrets', 'variables', 'schedules', 'webhooks', 'collections'] as const;

export function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = VALID_TABS.includes(searchParams.get('tab') as typeof VALID_TABS[number])
    ? searchParams.get('tab')!
    : 'agents';

  const handleTabChange = (value: string | null) => {
    if (value) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', value);
        return next;
      }, { replace: true });
    }
  };

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit modal
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!workspaceId) return;
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
  }, [workspaceId]);

  // Load workspace data
  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

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

      navigate(routes.agents());
    } 
    catch (err) {
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
            <ActionIcon variant="subtle" color="gray" size="md" component={Link} to={routes.workspaces()}>
              <IconList size={18} />
            </ActionIcon>
          </Tooltip>
          <Group gap="xs" align="baseline">
            <Text fw={500} size="lg">
              Workspace: {workspace.name}
            </Text>
            {workspace.description && 
              <Text c="dimmed" size="sm">
                — {workspace.description}
              </Text>
            }
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

      <Tabs value={tab} onChange={handleTabChange}>
        <Tabs.List mb="md">
          <Tabs.Tab value="agents" leftSection={<IconRobot size={16} />}>
            Agents{workspace.agentCount !== undefined && ` (${workspace.agentCount})`}
          </Tabs.Tab>
          <Tabs.Tab value="schedules" leftSection={<IconCalendarTime size={16} />}>
            Schedules{workspace.scheduleCount !== undefined && ` (${workspace.scheduleCount})`}
          </Tabs.Tab>
          <Tabs.Tab value="providers" leftSection={<IconCloud size={16} />}>
            Providers{workspace.providerCount !== undefined && ` (${workspace.providerCount})`}
          </Tabs.Tab>
          <Tabs.Tab value="secrets" leftSection={<IconKey size={16} />}>
            Secrets{workspace.secretCount !== undefined && ` (${workspace.secretCount})`}
          </Tabs.Tab>
          <Tabs.Tab value="variables" leftSection={<IconVariable size={16} />}>
            Variables{workspace.variableCount !== undefined && ` (${workspace.variableCount})`}
          </Tabs.Tab>
          <Tabs.Tab value="webhooks" leftSection={<IconWebhook size={16} />}>
            Webhooks
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
            // showCreateButton={false}
            onCreate={loadWorkspace}
            onDelete={loadWorkspace}
          />
        </Tabs.Panel>

        <Tabs.Panel value="providers">
          <ProvidersList
            workspaceId={workspaceId}
            description="Workspace-scoped LLM providers. Falls back to global if not configured."
            excludeColumns={['workspace', 'createdAt', 'updatedAt']}
            onCreate={loadWorkspace}
            onDelete={loadWorkspace}
          />
        </Tabs.Panel>

        <Tabs.Panel value="secrets">
          <SecretsList
            workspaceId={workspaceId}
            description="Workspace-scoped secrets for {{secret:NAME}} syntax. Falls back to global if not found."
            excludeColumns={['workspace', 'updated']}
            onCreate={loadWorkspace}
            onDelete={loadWorkspace}
          />
        </Tabs.Panel>

        <Tabs.Panel value="variables">
          <VariablesList
            workspaceId={workspaceId}
            description="Workspace-scoped variables for {{var:NAME}} syntax. Falls back to global if not found."
            showSearch={false}
            columns={['name', 'value', 'description', 'created', 'actions']}
            onCreate={loadWorkspace}
            onDelete={loadWorkspace}
          />
        </Tabs.Panel>

        <Tabs.Panel value="webhooks">
          <WebhooksList
            workspaceId={workspaceId}
            description="Webhooks of this workspace's agents. POST to a URL to start the agent."
            columns={['agent', 'name', 'url', 'enabled', 'lastTriggered', 'actions']}
          />
        </Tabs.Panel>

        <Tabs.Panel value="collections">
          <CollectionsList
            workspaceId={workspaceId}
            description="Workspace-scoped memory collections. Falls back to global if not found."
            showSearch={false}
            columns={['name', 'description', 'records', 'fields', 'created', 'actions']}
            onCreate={loadWorkspace}
            onDelete={loadWorkspace}
          />
        </Tabs.Panel>

        <Tabs.Panel value="schedules">
          {tab === 'schedules' && (
            <SchedulesList
              workspaceId={workspaceId}
              description="Schedules of this workspace's agents"
              columns={['name', 'status', 'schedule', 'nextRun', 'lastRun', 'enabled', 'actions']}
              onCreate={loadWorkspace}
              onDelete={loadWorkspace}
            />
          )}
        </Tabs.Panel>
      </Tabs>

      <WorkspaceModal
        opened={editModalOpened}
        onClose={closeEditModal}
        workspace={workspace}
        onSave={handleSave}
        saving={saving}
      />

      <DeleteConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onDelete={handleDelete}
        deleting={deleting}
        title="Delete Workspace"
        entityName={`the workspace ${workspace?.name}`}
        subtitle="All agents, secrets, providers, and collections in this workspace will be permanently deleted."
        deleteButtonText="Delete Workspace"
      />
    </Box>
  );
}
